export type SpexFile = {
  kind: 'SpexFile'
  declarations: Declaration[]
}

export type Declaration =
  | ObjectDeclaration
  | ImportDeclaration
  | GenerateDeclaration
  | PackageDeclaration
  | RealizeDeclaration
  | IncludeDeclaration

export type PackageKind = 'EXECUTABLE' | 'MODULE'

export type PackageDeclaration = {
  kind: 'PackageDeclaration'
  packageType: PackageKind
  name: string
  objectName: ObjectExpression
  environment: ObjectExpression
}

export type ObjectDeclaration = {
  kind: 'ObjectDeclaration'
  name: string
  object: ObjectExpression
}

export type ImportDeclaration = {
  kind: 'ImportDeclaration'
  name: string | null
  source: string
  alias: string | null
}

export type GenerateDeclaration = {
  kind: 'GenerateDeclaration'
  name: string
}

export type RealizeDeclaration = {
  kind: 'RealizeDeclaration'
  object: ObjectExpression
  target: ObjectExpression
  environment: ObjectExpression
}

export type IncludeDeclaration = {
  kind: 'IncludeDeclaration'
  name: string
  address: string
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
}

export type ProductObject = {
  kind: 'ProductObject'
  fields: Record<string, ObjectExpression>
}

export type ExponentialObject = {
  kind: 'ExponentialObject'
  base: ObjectExpression
  exponent: ObjectExpression
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
}

export type ArrayObject = {
  kind: 'ArrayObject'
  base: ObjectExpression
}

export type LiteralObject = StringLiteralObject | NumberLiteralObject | BoolLiteralObject

export type StringLiteralObject = {
  kind: 'StringLiteralObject'
  value: string
}

export type NumberLiteralObject = {
  kind: 'NumberLiteralObject'
  value: string
}

export type BoolLiteralObject = {
  kind: 'BoolLiteralObject'
  value: boolean
}

export type SetObject = SetUnionObject | SetIntersectionObject | SetDifferenceObject

export type SetUnionObject = {
  kind: 'SetUnionObject'
  left: ObjectExpression
  right: ObjectExpression
}

export type SetIntersectionObject = {
  kind: 'SetIntersectionObject'
  left: ObjectExpression
  right: ObjectExpression
}

export type SetDifferenceObject = {
  kind: 'SetDifferenceObject'
  left: ObjectExpression
  right: ObjectExpression
}

export type CoproductObject = {
  kind: 'CoproductObject'
  left: ObjectExpression
  right: ObjectExpression
}

// A pattern is a subobject of the string base object: the set of
// strings it matches.
export type PatternLiteralObject = {
  kind: 'PatternLiteralObject'
  source: string
  flags: string
}
