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
  | EnumObject
  | LiteralObject
  | SetObject
  | CoproductObject
  | PatternLiteralObject
  | ExponentialPattern

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

export type ConstraintReference = {
  kind: 'ConstraintReference'
  name: string
}

export type ConstraintText = {
  kind: 'ConstraintText'
  text: string
}

export type ConstraintPart = ConstraintReference | ConstraintText

export type Constraint = {
  raw: string
  parts: ConstraintPart[]
}

export type SubObject = {
  kind: 'SubObject'
  base: ObjectExpression
  constraint: Constraint
}

export type ArrayObject = {
  kind: 'ArrayObject'
  base: ObjectExpression
}

export type EnumObject = {
  kind: 'EnumObject'
  values: string[]
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

export type PatternBlock = {
  raw: string
  parts: ConstraintPart[]
  start: number
  end: number
}

export type ExponentialPattern = {
  kind: 'ExponentialPattern'
  base: ObjectExpression
  exponent: ObjectExpression
  language: string
  body: string
  patterns: PatternBlock[]
}
