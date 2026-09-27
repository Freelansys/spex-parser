// The position of a node in the source file. `line` and `column` are
// 1-based; `offset` is a 0-based character offset into the source text.
// The span is half-open: `end` points one character past the last character
// of the source text, so `source.slice(start.offset, end.offset)` yields the
// exact text the node covers.
export type Location = {
  start: { offset: number; line: number; column: number }
  end: { offset: number; line: number; column: number }
}

export type SpexFile = {
  kind: 'SpexFile'
  declarations: Declaration[]
  location: Location
}

export type Declaration =
  | ObjectDeclaration
  | ImportDeclaration
  | GenerateDeclaration
  | RealizeDeclaration
  | IncludeDeclaration

export type ObjectDeclaration = {
  kind: 'ObjectDeclaration'
  name: string
  object: ObjectExpression
  location: Location
}

export type ImportDeclaration = {
  kind: 'ImportDeclaration'
  name: string | null
  source: string
  alias: string | null
  location: Location
}

// A `generate` command asks the compiler to produce realizations of the named
// concept or artifact. Without an environment, realizations are produced in
// every environment in which the object is realized; the optional `in` clause
// focuses generation on a single environment.
export type GenerateDeclaration = {
  kind: 'GenerateDeclaration'
  name: string
  environment: ObjectExpression
  location: Location
}

// A `realize` target is either a named object or a decomposition. It is
// deliberately not an arbitrary object expression: a product in target
// position would read both as a product value and as a decomposition of the
// realized object.
export type RealizeTarget = NamedObject | Decomposition

// The parts a realized object is built from. Each part name is a handle other
// objects can `@ref`, and each part is realized by the given object. A part
// may itself be a decomposition, which groups the parts of a substructure.
export type DecompositionPart = {
  name: string
  object: ObjectExpression | Decomposition
  location: Location
}

export type Decomposition = {
  kind: 'Decomposition'
  parts: DecompositionPart[]
  location: Location
}

export type RealizeDeclaration = {
  kind: 'RealizeDeclaration'
  object: ObjectExpression
  target: RealizeTarget
  environment: ObjectExpression
  location: Location
}

export type IncludeDeclaration = {
  kind: 'IncludeDeclaration'
  name: string
  address: string
  location: Location
}

export type ObjectExpression =
  | NamedObject
  | ProductObject
  | ExponentialObject
  | SubObject
  | ArrayObject
  | LiteralObject
  | SetObject
  | CoproductObject
  | PatternLiteralObject

export type NamedObject = {
  kind: 'NamedObject'
  name: string
  location: Location
}

export type ProductObject = {
  kind: 'ProductObject'
  fields: Record<string, ObjectExpression>
  location: Location
}

export type ExponentialObject = {
  kind: 'ExponentialObject'
  base: ObjectExpression
  exponent: ObjectExpression
  location: Location
}

// A `@ref` directive in a constraint brings the named object into the
// generation context. It applies to natural-language, structured, and code
// constraints alike.
export type ReferenceDirective = {
  kind: 'ReferenceDirective'
  name: string
}

export type ConstraintText = {
  kind: 'ConstraintText'
  text: string
}

export type ConstraintPart = ReferenceDirective | ConstraintText

// A constraint with its `@ref` directives parsed out into parts.
export type Constraint = {
  raw: string
  parts: ConstraintPart[]
}

// Subobjects refine an object by selecting members that satisfy a
// constraint. Base objects are constrained in three ways:
//   - natural language:   SELECT { ... }
//   - structured:         SELECT ``` ... ```
//   - code:               SELECT ```lang ... ```
export type ConstraintType = 'NaturalLanguage' | 'Structured' | 'Code'

export type SubObjectConstraint =
  | {
      type: 'NaturalLanguage'
      raw: string
      parts: ConstraintPart[]
    }
  | {
      type: 'Structured'
      raw: string
      parts: ConstraintPart[]
    }
  | {
      type: 'Code'
      language: string
      body: string
      parts: ConstraintPart[]
    }

export type SubObject = {
  kind: 'SubObject'
  base: ObjectExpression
  constraint: SubObjectConstraint
  location: Location
}

export type ArrayObject = {
  kind: 'ArrayObject'
  base: ObjectExpression
  location: Location
}

export type LiteralObject = StringLiteralObject | NumberLiteralObject | BoolLiteralObject

export type StringLiteralObject = {
  kind: 'StringLiteralObject'
  value: string
  location: Location
}

export type NumberLiteralObject = {
  kind: 'NumberLiteralObject'
  value: string
  location: Location
}

export type BoolLiteralObject = {
  kind: 'BoolLiteralObject'
  value: boolean
  location: Location
}

export type SetObject = SetUnionObject | SetIntersectionObject | SetDifferenceObject

export type SetUnionObject = {
  kind: 'SetUnionObject'
  left: ObjectExpression
  right: ObjectExpression
  location: Location
}

export type SetIntersectionObject = {
  kind: 'SetIntersectionObject'
  left: ObjectExpression
  right: ObjectExpression
  location: Location
}

export type SetDifferenceObject = {
  kind: 'SetDifferenceObject'
  left: ObjectExpression
  right: ObjectExpression
  location: Location
}

export type CoproductObject = {
  kind: 'CoproductObject'
  left: ObjectExpression
  right: ObjectExpression
  location: Location
}

// A pattern is a subobject of the string base object: the set of
// strings it matches.
export type PatternLiteralObject = {
  kind: 'PatternLiteralObject'
  source: string
  flags: string
  location: Location
}
