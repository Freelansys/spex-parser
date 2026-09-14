import type { ICstVisitor, IToken } from 'chevrotain'
import type { ILexingError } from 'chevrotain'
import { SpexError } from './errors.js'
import type {
  Location,
  SpexFile,
  Declaration,
  ObjectDeclaration,
  ImportDeclaration,
  GenerateDeclaration,
  RealizeDeclaration,
  IncludeDeclaration,
  LiteralObject,
  SetObject,
  CoproductObject,
  PatternLiteralObject,
  ObjectExpression,
  NamedObject,
  SubObject,
  SubObjectConstraint,
  ArrayObject,
  Constraint,
  ConstraintPart,
} from './ast.js'
import { SpexLexer } from './lexer.js'
import { SpexParser } from './parser.js'

const parserInstance = new SpexParser()
const BaseSpexVisitor = parserInstance.getBaseCstVisitorConstructor()

export const REFERENCE_PATTERN = /@([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)*)/g

// Collect every token reachable in a CST children dictionary.
function collectTokens(children: any, out: IToken[]): void {
  for (const value of Object.values(children)) {
    if (!Array.isArray(value)) continue
    for (const element of value) {
      if (element === undefined || element === null || typeof element !== 'object') continue
      if (element.tokenTypeIdx !== undefined) {
        out.push(element)
      } else if (element.children && typeof element.children === 'object') {
        collectTokens(element.children, out)
      }
    }
  }
}

// The source span of a single token. `end` is exclusive (half-open).
function tokenLocation(token: IToken): Location {
  return {
    start: {
      offset: token.startOffset,
      line: token.startLine ?? 1,
      column: token.startColumn ?? 1,
    },
    end: {
      offset: (token.endOffset ?? token.startOffset + token.image.length - 1) + 1,
      line: token.endLine ?? token.startLine ?? 1,
      column: (token.endColumn ?? (token.startColumn ?? 1) + token.image.length - 1) + 1,
    },
  }
}

// The source span of a CST rule, derived from its first and last tokens.
// Falls back to the primary (first) token when a CST rule covers no tokens,
// e.g. an empty file. `end` is exclusive (half-open).
function locationOf(children: any): Location {
  const tokens: IToken[] = []
  collectTokens(children, tokens)
  if (tokens.length === 0) {
    return {
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 0, line: 1, column: 1 },
    }
  }
  const first = tokens.reduce((a, b) => (a.startOffset <= b.startOffset ? a : b))
  const last = tokens.reduce((a, b) => {
    const aEnd = (a.endOffset ?? a.startOffset + a.image.length - 1) + 1
    const bEnd = (b.endOffset ?? b.startOffset + b.image.length - 1) + 1
    return bEnd >= aEnd ? b : a
  })
  return {
    start: tokenLocation(first).start,
    end: tokenLocation(last).end,
  }
}

// The source span of a lexing error. The lexer reports an offset, line and
// column, and the length of the offending input; we mirror the Location
// shape used across the AST.
function lexingErrorLocation(error: ILexingError): Location | null {
  if (error.line === undefined || error.column === undefined) {
    return null
  }
  return {
    start: { offset: error.offset, line: error.line, column: error.column },
    end: {
      offset: error.offset + error.length,
      line: error.line,
      column: error.column + error.length,
    },
  }
}

function unescapeConstraint(text: string): string {
  return text.replace(/\\([\\{}])/g, '$1')
}

function stringLiteralValue(image: string): string {
  const inner = image.slice(1, -1)
  return inner.replace(/\\([\\'"])/g, '$1')
}

export function parseConstraint(raw: string): Constraint {
  const parts: ConstraintPart[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = REFERENCE_PATTERN.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ kind: 'ConstraintText', text: raw.slice(lastIndex, match.index) })
    }
    parts.push({ kind: 'ReferenceDirective', name: match[1]! })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < raw.length) {
    parts.push({ kind: 'ConstraintText', text: raw.slice(lastIndex) })
  }

  return { raw, parts }
}

function extractCodeLanguage(image: string): string {
  const langEnd = image.indexOf('\n')
  if (langEnd === -1) return ''
  return image.slice(3, langEnd).trim()
}

function extractCodeBody(image: string): string {
  const firstNewline = image.indexOf('\n')
  return image.slice(firstNewline + 1, -3).trimEnd()
}

function codeConstraint(image: string): SubObjectConstraint {
  const language = extractCodeLanguage(image)
  const body = extractCodeBody(image)
  if (language === '') {
    return {
      type: 'Structured',
      raw: body,
      parts: parseConstraint(body).parts,
    }
  }
  return {
    type: 'Code',
    language,
    body,
    parts: parseConstraint(body).parts,
  }
}

export class SpexParserVisitor extends BaseSpexVisitor implements ICstVisitor<any, any> {
  constructor() {
    super()
    this.validateVisitor()
  }

  spexFile(ctx: any): SpexFile {
    const declarations = ctx.declaration.map((decl: any) => this.visit(decl))
    return { kind: 'SpexFile', declarations, location: locationOf(ctx) }
  }

  declaration(ctx: any): Declaration {
    if (ctx.realizeDeclaration) {
      return this.visit(ctx.realizeDeclaration)
    }
    if (ctx.objectDeclaration) {
      return this.visit(ctx.objectDeclaration)
    }
    if (ctx.importDeclaration) {
      return this.visit(ctx.importDeclaration)
    }
    if (ctx.includeDeclaration) {
      return this.visit(ctx.includeDeclaration)
    }
    return this.visit(ctx.generateDeclaration)
  }

  literalObject(ctx: any): LiteralObject {
    const location = locationOf(ctx)
    if (ctx.StringLiteral) {
      return {
        kind: 'StringLiteralObject',
        value: stringLiteralValue(ctx.StringLiteral[0].image),
        location,
      }
    }
    if (ctx.NumberLiteral) {
      return { kind: 'NumberLiteralObject', value: ctx.NumberLiteral[0].image, location }
    }
    return { kind: 'BoolLiteralObject', value: ctx.TrueTok ? true : false, location }
  }

  objectDeclaration(ctx: any): ObjectDeclaration {
    return {
      kind: 'ObjectDeclaration',
      name: ctx.Identifier[0].image,
      object: this.visit(ctx.setObject),
      location: locationOf(ctx),
    }
  }

  setObject(ctx: any): SetObject {
    const operands = ctx.coproductObject.map((expr: any) => this.visit(expr))
    let result: ObjectExpression = operands[0]
    for (let i = 1; i < operands.length; i++) {
      const op = ctx.op[i - 1].tokenType.name
      if (op === 'UnionTok') {
        result = {
          kind: 'SetUnionObject',
          left: result,
          right: operands[i],
          location: locationOf(ctx),
        }
      } else if (op === 'IntersectTok') {
        result = {
          kind: 'SetIntersectionObject',
          left: result,
          right: operands[i],
          location: locationOf(ctx),
        }
      } else {
        result = {
          kind: 'SetDifferenceObject',
          left: result,
          right: operands[i],
          location: locationOf(ctx),
        }
      }
    }
    return result as SetObject
  }

  coproductObject(ctx: any): CoproductObject {
    const operands = ctx.objectExpression.map((expr: any) => this.visit(expr))
    let result: ObjectExpression = operands[0]
    for (let i = 1; i < operands.length; i++) {
      result = {
        kind: 'CoproductObject',
        left: result,
        right: operands[i],
        location: locationOf(ctx),
      }
    }
    return result as CoproductObject
  }

  objectExpression(ctx: any): ObjectExpression {
    if (ctx.base) {
      const exponent = this.visit(ctx.base)
      if (ctx.exponent) {
        return {
          kind: 'ExponentialObject',
          base: this.visit(ctx.exponent),
          exponent,
          location: locationOf(ctx),
        }
      }
      return exponent
    }
    throw new Error('Invalid object expression')
  }

  objectOperand(ctx: any): ObjectExpression {
    let expr: ObjectExpression
    if (ctx.subObject) {
      expr = this.visit(ctx.subObject)
    } else if (ctx.parenthesizedObject) {
      expr = this.visit(ctx.parenthesizedObject)
    } else if (ctx.productObject) {
      expr = this.visit(ctx.productObject)
    } else if (ctx.patternObject) {
      expr = this.visit(ctx.patternObject)
    } else if (ctx.literalObject) {
      expr = this.visit(ctx.literalObject)
    } else {
      expr = this.visit(ctx.namedObject)
    }
    if (ctx.LBracket) {
      for (let i = 0; i < ctx.LBracket.length; i++) {
        expr = { kind: 'ArrayObject', base: expr, location: locationOf(ctx) } as ArrayObject
      }
    }
    return expr
  }

  parenthesizedObject(ctx: any): ObjectExpression {
    return this.visit(ctx.setObject)
  }

  patternObject(ctx: any): PatternLiteralObject {
    const image: string = ctx.PatternLiteral[0].image
    const lastSlash = image.lastIndexOf('/')
    return {
      kind: 'PatternLiteralObject',
      source: image.slice(1, lastSlash),
      flags: image.slice(lastSlash + 1),
      location: locationOf(ctx),
    }
  }

  namedObject(ctx: any): NamedObject {
    let parts: string[]
    if (ctx.StringTok) {
      parts = [ctx.StringTok[0].image, ...(ctx.Identifier ?? []).map((id: any) => id.image)]
    } else if (ctx.NumberTok) {
      parts = [ctx.NumberTok[0].image, ...(ctx.Identifier ?? []).map((id: any) => id.image)]
    } else if (ctx.BoolTok) {
      parts = [ctx.BoolTok[0].image, ...(ctx.Identifier ?? []).map((id: any) => id.image)]
    } else if (ctx.UnitTok) {
      parts = [ctx.UnitTok[0].image, ...(ctx.Identifier ?? []).map((id: any) => id.image)]
    } else if (ctx.ArtifactTok) {
      parts = [ctx.ArtifactTok[0].image, ...(ctx.Identifier ?? []).map((id: any) => id.image)]
    } else if (ctx.ConceptTok) {
      parts = [ctx.ConceptTok[0].image, ...(ctx.Identifier ?? []).map((id: any) => id.image)]
    } else if (ctx.EnvironmentTok) {
      parts = [ctx.EnvironmentTok[0].image, ...(ctx.Identifier ?? []).map((id: any) => id.image)]
    } else {
      parts = ctx.Identifier.map((id: any) => id.image)
    }
    return {
      kind: 'NamedObject',
      name: parts.join('.'),
      location: locationOf(ctx),
    }
  }

  productObject(ctx: any): ObjectExpression {
    const names = ctx.Identifier ?? []
    const fields: Record<string, ObjectExpression> = {}
    for (let i = 0; i < names.length; i++) {
      const name = names[i].image
      const value = this.visit(ctx.setObject[i])
      if (value.kind === 'NamedObject' && value.name === 'unit') {
        continue
      }
      fields[name] = value
    }
    if (Object.keys(fields).length === 0) {
      return { kind: 'NamedObject', name: 'unit', location: locationOf(ctx) }
    }
    return { kind: 'ProductObject', fields, location: locationOf(ctx) }
  }

  subObject(ctx: any): SubObject {
    const base = this.visit(ctx.base)
    if (ctx.CodeBlock) {
      return {
        kind: 'SubObject',
        base,
        constraint: codeConstraint(ctx.CodeBlock[0].image),
        location: locationOf(ctx),
      }
    }
    const rawText: string = ctx.SelectBlock[0].image
    const rawConstraint = unescapeConstraint(rawText.slice(1, -1).trim())
    return {
      kind: 'SubObject',
      base,
      constraint: {
        type: 'NaturalLanguage',
        raw: rawConstraint,
        parts: parseConstraint(rawConstraint).parts,
      },
      location: locationOf(ctx),
    }
  }

  importDeclaration(ctx: any): ImportDeclaration {
    if (ctx.namedImport) {
      return this.visit(ctx.namedImport)
    }
    return this.visit(ctx.moduleImport)
  }

  namedImport(ctx: any): ImportDeclaration {
    const name = ctx.Identifier[0].image
    const source = stringLiteralValue(ctx.StringLiteral[0].image)
    const alias = ctx.Identifier[1] ? ctx.Identifier[1].image : null
    return {
      kind: 'ImportDeclaration',
      name,
      source,
      alias,
      location: locationOf(ctx),
    }
  }

  moduleImport(ctx: any): ImportDeclaration {
    const source = stringLiteralValue(ctx.StringLiteral[0].image)
    const alias = ctx.Identifier[0].image
    return {
      kind: 'ImportDeclaration',
      name: null,
      source,
      alias,
      location: locationOf(ctx),
    }
  }

  generateDeclaration(ctx: any): GenerateDeclaration {
    return {
      kind: 'GenerateDeclaration',
      name: ctx.Identifier[0].image,
      environment: ctx.environment
        ? this.visit(ctx.environment)
        : { kind: 'NamedObject', name: 'environment', location: locationOf(ctx) },
      location: locationOf(ctx),
    }
  }

  realizeDeclaration(ctx: any): RealizeDeclaration {
    return {
      kind: 'RealizeDeclaration',
      object: this.visit(ctx.object),
      target: this.visit(ctx.target),
      environment: ctx.environment
        ? this.visit(ctx.environment)
        : { kind: 'NamedObject', name: 'environment', location: locationOf(ctx) },
      location: locationOf(ctx),
    }
  }

  includeDeclaration(ctx: any): IncludeDeclaration {
    const address = stringLiteralValue(ctx.StringLiteral[0].image)
    const name = ctx.Identifier[0].image
    return {
      kind: 'IncludeDeclaration',
      name,
      address,
      location: locationOf(ctx),
    }
  }
}

export function parseToAst(text: string): SpexFile {
  const lexingResult = SpexLexer.tokenize(text)

  if (lexingResult.errors.length > 0) {
    const details = lexingResult.errors
      .map((e) => {
        const where =
          e.line !== undefined && e.column !== undefined
            ? ` (line ${e.line}, column ${e.column})`
            : ''
        return e.message + where
      })
      .join('; ')
    throw new SpexError(
      'Lexing',
      `Lexing errors: ${details}`,
      lexingErrorLocation(lexingResult.errors[0]!),
      lexingResult.errors
    )
  }

  parserInstance.input = lexingResult.tokens
  const cst = parserInstance.spexFile()

  if (parserInstance.errors.length > 0) {
    const details = parserInstance.errors
      .map((e) => {
        const where =
          e.token !== undefined
            ? ` (line ${e.token.startLine ?? 1}, column ${e.token.startColumn ?? 1})`
            : ''
        return `${e.name}: ${e.message}` + where
      })
      .join('; ')
    const primary = parserInstance.errors[0]
    const location = primary?.token ? tokenLocation(primary.token) : null
    throw new SpexError('Parsing', `Parsing errors: ${details}`, location, parserInstance.errors)
  }

  const visitor = new SpexParserVisitor()
  return visitor.visit(cst)
}
