export type SpexFile = {
  kind: 'SpexFile'
  declarations: Declaration[]
}

export type Declaration =
  | ObjectDeclaration
  | ImportDeclaration
  | ExportDeclaration
  | GenerateDeclaration

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

export type ExportDeclaration = {
  kind: 'ExportDeclaration'
  name: string
}

export type GenerateDeclaration = {
  kind: 'GenerateDeclaration'
  name: string
}

export type ObjectExpression =
  | NamedObject
  | ProductObject
  | ExponentialObject
  | SubObject
  | ArrayObject

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

export type SubObject = {
  kind: 'SubObject'
  base: ObjectExpression
  constraint: string
}

export type ArrayObject = {
  kind: 'ArrayObject'
  base: ObjectExpression
}
