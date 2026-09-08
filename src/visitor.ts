import type { ICstVisitor } from 'chevrotain'
import type {
  SpexFile,
  Declaration,
  ObjectDeclaration,
  ImportDeclaration,
  GenerateDeclaration,
  PackageDeclaration,
  RealizeDeclaration,
  IncludeDeclaration,
  EnumObject,
  LiteralObject,
  SetObject,
  CoproductObject,
  PatternLiteralObject,
  ExponentialPattern,
  PatternBlock,
  ObjectExpression,
  NamedObject,
  SubObject,
  ArrayObject,
  Constraint,
  ConstraintPart,
} from './ast.js'
import { SpexLexer } from './lexer.js'
import { SpexParser } from './parser.js'

const parserInstance = new SpexParser()
const BaseSpexVisitor = parserInstance.getBaseCstVisitorConstructor()

export const REFERENCE_PATTERN = /@([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)*)/g

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
    parts.push({ kind: 'ConstraintReference', name: match[1]! })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < raw.length) {
    parts.push({ kind: 'ConstraintText', text: raw.slice(lastIndex) })
  }

  return { raw, parts }
}

export class SpexParserVisitor extends BaseSpexVisitor implements ICstVisitor<any, any> {
  constructor() {
    super()
    this.validateVisitor()
  }

  spexFile(ctx: any): SpexFile {
    const declarations = ctx.declaration.map((decl: any) => this.visit(decl))
    return { kind: 'SpexFile', declarations }
  }

  declaration(ctx: any): Declaration {
    if (ctx.realizeDeclaration) {
      return this.visit(ctx.realizeDeclaration)
    }
    if (ctx.packageDeclaration) {
      return this.visit(ctx.packageDeclaration)
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

  enumObject(ctx: any): EnumObject {
    return {
      kind: 'EnumObject',
      values: ctx.StringLiteral.map((s: any) => stringLiteralValue(s.image)),
    }
  }

  literalObject(ctx: any): LiteralObject {
    if (ctx.StringLiteral) {
      return {
        kind: 'StringLiteralObject',
        value: stringLiteralValue(ctx.StringLiteral[0].image),
      }
    }
    if (ctx.NumberLiteral) {
      return { kind: 'NumberLiteralObject', value: ctx.NumberLiteral[0].image }
    }
    return { kind: 'BoolLiteralObject', value: ctx.TrueTok ? true : false }
  }

  objectDeclaration(ctx: any): ObjectDeclaration {
    return {
      kind: 'ObjectDeclaration',
      name: ctx.Identifier[0].image,
      object: this.visit(ctx.setObject),
    }
  }

  setObject(ctx: any): SetObject {
    const operands = ctx.coproductObject.map((expr: any) => this.visit(expr))
    let result: ObjectExpression = operands[0]
    for (let i = 1; i < operands.length; i++) {
      const op = ctx.op[i - 1].tokenType.name
      if (op === 'UnionTok') {
        result = { kind: 'SetUnionObject', left: result, right: operands[i] }
      } else if (op === 'IntersectTok') {
        result = { kind: 'SetIntersectionObject', left: result, right: operands[i] }
      } else {
        result = { kind: 'SetDifferenceObject', left: result, right: operands[i] }
      }
    }
    return result as SetObject
  }

  coproductObject(ctx: any): CoproductObject {
    const operands = ctx.objectExpression.map((expr: any) => this.visit(expr))
    let result: ObjectExpression = operands[0]
    for (let i = 1; i < operands.length; i++) {
      result = { kind: 'CoproductObject', left: result, right: operands[i] }
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
    } else if (ctx.enumObject) {
      expr = this.visit(ctx.enumObject)
    } else if (ctx.patternObject) {
      expr = this.visit(ctx.patternObject)
    } else if (ctx.lambdaObject) {
      expr = this.visit(ctx.lambdaObject)
    } else if (ctx.literalObject) {
      expr = this.visit(ctx.literalObject)
    } else {
      expr = this.visit(ctx.namedObject)
    }
    if (ctx.LBracket) {
      for (let i = 0; i < ctx.LBracket.length; i++) {
        expr = { kind: 'ArrayObject', base: expr } as ArrayObject
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
      return { kind: 'NamedObject', name: 'unit' }
    }
    return { kind: 'ProductObject', fields }
  }

  subObject(ctx: any): SubObject {
    const rawText: string = ctx.SelectBlock[0].image
    const rawConstraint = unescapeConstraint(rawText.slice(1, -1).trim())
    return {
      kind: 'SubObject',
      base: this.visit(ctx.base),
      constraint: parseConstraint(rawConstraint),
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
    }
  }

  packageDeclaration(ctx: any): PackageDeclaration {
    const packageType = ctx.ExecutableTok ? ('EXECUTABLE' as const) : ('MODULE' as const)
    return {
      kind: 'PackageDeclaration',
      packageType,
      name: ctx.Identifier[0].image,
      objectName: this.visit(ctx.setObject),
      environment: this.visit(ctx.environment),
    }
  }

  generateDeclaration(ctx: any): GenerateDeclaration {
    return {
      kind: 'GenerateDeclaration',
      name: ctx.Identifier[0].image,
    }
  }

  realizeDeclaration(ctx: any): RealizeDeclaration {
    return {
      kind: 'RealizeDeclaration',
      object: this.visit(ctx.object),
      target: this.visit(ctx.target),
      environment: ctx.environment
        ? this.visit(ctx.environment)
        : { kind: 'NamedObject', name: 'environment' },
    }
  }

  includeDeclaration(ctx: any): IncludeDeclaration {
    const address = stringLiteralValue(ctx.StringLiteral[0].image)
    const name = ctx.Identifier[0].image
    return {
      kind: 'IncludeDeclaration',
      name,
      address,
    }
  }

  lambdaObject(ctx: any): ExponentialPattern {
    const image: string = ctx.CodeBlock[0].image
    const firstNewline = image.indexOf('\n')
    const langEnd = image.indexOf('\n')
    const language = image.slice(3, langEnd)
    const body = image.slice(firstNewline + 1, -3).trimEnd()

    const patterns: PatternBlock[] = []
    let i = 0
    while (i < body.length) {
      if (body[i] === '@' && body[i + 1] === '{') {
        const start = i
        let depth = 1
        i += 2
        while (i < body.length && depth > 0) {
          if (body[i] === '\\') {
            i += 2
            continue
          }
          if (body[i] === '{') depth++
          if (body[i] === '}') depth--
          i++
        }
        const end = i
        const raw = body.slice(start + 2, end - 1).trim()
        patterns.push({
          raw,
          parts: parseConstraint(raw).parts,
          start,
          end,
        })
      } else {
        i++
      }
    }

    return {
      kind: 'ExponentialPattern',
      base: this.visit(ctx.exponent),
      exponent: this.visit(ctx.base),
      language,
      body,
      patterns,
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
    throw new Error(`Lexing errors: ${details}`)
  }

  parserInstance.input = lexingResult.tokens
  const cst = parserInstance.spexFile()

  if (parserInstance.errors.length > 0) {
    throw new Error(`Parsing errors: ${JSON.stringify(parserInstance.errors, null, 2)}`)
  }

  const visitor = new SpexParserVisitor()
  return visitor.visit(cst)
}
