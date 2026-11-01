import type {
  Declaration,
  Decomposition,
  ObjectExpression,
  RealizeTarget,
  SubObjectConstraint,
  SubjectToConstraint,
} from './ast.js'
import { SpexError } from './errors.js'
import { CodeBlock, SpexLexer } from './lexer.js'

// Spex source from its AST. The printer is the inverse of `parseToAst` up to
// locations and comments: parsing what it prints gives back the same tree, and
// printing that tree again gives back the same text.

// Spex source for a whole file: its declarations, one blank line apart.
export function printFile(declarations: readonly Declaration[]): string {
  return declarations.map(printDeclaration).join('\n\n') + (declarations.length > 0 ? '\n' : '')
}

export function printDeclaration(declaration: Declaration): string {
  switch (declaration.kind) {
    case 'ObjectDeclaration':
      return `create ${declaration.name} as ${printExpression(declaration.object)};`
    case 'RealizeDeclaration': {
      const entry = declaration.entry !== null ? ` with ${declaration.entry} as entry` : ''
      return `realize ${printExpression(declaration.object)} as ${printTarget(
        declaration.target
      )}${printEnvironment(declaration.environment)}${entry};`
    }
    case 'GenerateDeclaration':
      return `generate ${declaration.name}${printEnvironment(declaration.environment)};`
    case 'ImportDeclaration': {
      if (declaration.specifiers !== null) {
        const names = declaration.specifiers
          .map((s) => (s.alias !== null ? `${s.name} as ${s.alias}` : s.name))
          .join(', ')
        return `import ${names} from ${quote(declaration.source)};`
      }
      const namespace = declaration.namespace !== null ? ` as ${declaration.namespace}` : ''
      return `import ${quote(declaration.source)}${namespace};`
    }
    case 'IncludeDeclaration':
      return `include ${quote(declaration.address)} as ${declaration.name};`
  }
}

// How tightly an expression binds, loosest first. The grammar reads set
// operations, then `|`, then `->`, then an operand: a name, a literal, a
// product, a `from ... select`, or anything with `[]` after it.
const SET = 0
const CHOICE = 1
const ARROW = 2
const OPERAND = 3

function precedence(expression: ObjectExpression): number {
  switch (expression.kind) {
    case 'SetUnionObject':
    case 'SetIntersectionObject':
    case 'SetDifferenceObject':
      return SET
    case 'CoproductObject':
      return CHOICE
    case 'ExponentialObject':
      return ARROW
    default:
      return OPERAND
  }
}

// An expression, parenthesized when it binds more loosely than `minimum`.
function printAt(expression: ObjectExpression, minimum: number): string {
  const printed = printExpression(expression)
  return precedence(expression) < minimum ? `(${printed})` : printed
}

export function printExpression(expression: ObjectExpression): string {
  switch (expression.kind) {
    case 'NamedObject':
      return expression.name
    case 'StringLiteralObject':
      return quote(expression.value)
    case 'NumberLiteralObject':
      return expression.value
    case 'BoolLiteralObject':
      return expression.value ? 'true' : 'false'
    case 'PatternLiteralObject':
      return `/${expression.source}/${expression.flags}`
    case 'ArrayObject':
      return `${printAt(expression.base, OPERAND)}[]`
    case 'ProductObject': {
      const fields = Object.entries(expression.fields)
      // `()` reads back as `unit`, so an empty product is written as one.
      if (fields.length === 0) return 'unit'
      return `(${fields.map(([name, field]) => `${name}: ${printExpression(field)}`).join(', ')})`
    }
    // The parser keeps the result as `base` and the parameters as `exponent`,
    // and `->` groups to the right: `A -> B -> C` is `A -> (B -> C)`.
    case 'ExponentialObject':
      return `${printAt(expression.exponent, OPERAND)} -> ${printAt(expression.base, ARROW)}`
    // The chains below group to the left, so only the right operand needs
    // parentheses when it is a chain of the same kind.
    case 'CoproductObject':
      return `${printAt(expression.left, CHOICE)} | ${printAt(expression.right, ARROW)}`
    case 'SetUnionObject':
      return `${printAt(expression.left, SET)} union ${printAt(expression.right, CHOICE)}`
    case 'SetIntersectionObject':
      return `${printAt(expression.left, SET)} intersect ${printAt(expression.right, CHOICE)}`
    case 'SetDifferenceObject':
      return `${printAt(expression.left, SET)} except ${printAt(expression.right, CHOICE)}`
    case 'SubObject':
      return `from ${printExpression(expression.base)} select ${printPattern(
        expression.constraint
      )}${printSubjectTo(expression.constraints)}`
  }
}

// ` subject to [...]`, one constraint a line, or nothing when there are none.
function printSubjectTo(constraints: SubjectToConstraint[]): string {
  if (constraints.length === 0) return ''
  const items = constraints.map(
    (constraint) =>
      `  ${constraint.name === null ? '' : `${constraint.name}: `}${printPattern(
        constraint.pattern
      )},`
  )
  return ` subject to [\n${items.join('\n')}\n]`
}

function printTarget(target: RealizeTarget): string {
  return target.kind === 'Decomposition' ? printDecomposition(target, '') : printExpression(target)
}

function printDecomposition(decomposition: Decomposition, indent: string): string {
  if (decomposition.parts.length === 0) return '{}'
  const inner = `${indent}  `
  const parts = decomposition.parts.map((part) => {
    const object =
      part.object.kind === 'Decomposition'
        ? printDecomposition(part.object, inner)
        : printExpression(part.object)
    return `${inner}${part.name}: ${object},`
  })
  return `{\n${parts.join('\n')}\n${indent}}`
}

// ` in E`, or nothing for the bare `environment` a realization defaults to.
function printEnvironment(environment: ObjectExpression): string {
  return environment.kind === 'NamedObject' && environment.name === 'environment'
    ? ''
    : ` in ${printExpression(environment)}`
}

// A pattern. Prose goes in braces, where `\`, `{` and `}` are escaped; a
// structured or code pattern goes in a fence, which is written as it is.
function printPattern(pattern: SubObjectConstraint): string {
  switch (pattern.type) {
    case 'NaturalLanguage':
      return `{\n  ${pattern.raw.replace(/[\\{}]/g, '\\$&')}\n}`
    case 'Structured':
      return fence('', pattern.raw)
    case 'Code':
      return fence(pattern.language, pattern.body)
  }
}

// A fenced block. A fence has no escapes, so a body that would close it early
// (one containing ``` not preceded by a backslash) cannot be printed.
function fence(language: string, body: string): string {
  const printed = `\`\`\`${language}\n${body}\n\`\`\``
  const tokens = SpexLexer.tokenize(printed).tokens
  if (tokens.length !== 1 || tokens[0]!.tokenType !== CodeBlock || tokens[0]!.image !== printed) {
    throw new SpexError('Printing', 'A fenced pattern cannot contain ``` in its body')
  }
  return printed
}

// A string literal the lexer reads back as `value`.
function quote(value: string): string {
  return `"${value.replace(/[\\"]/g, '\\$&')}"`
}
