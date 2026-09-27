export { SpexLexer } from './lexer.js'
export { SpexParser } from './parser.js'
export { SpexParserVisitor, parseToAst, parseConstraint } from './visitor.js'
export { SpexError } from './errors.js'
export type { SpexErrorPhase } from './errors.js'
export { constantOf } from './constants.js'
export type { Constant } from './constants.js'
export type {
  Location,
  SpexFile,
  Declaration,
  ObjectDeclaration,
  ImportDeclaration,
  GenerateDeclaration,
  RealizeDeclaration,
  RealizeTarget,
  Decomposition,
  DecompositionPart,
  IncludeDeclaration,
  ObjectExpression,
  NamedObject,
  ProductObject,
  ExponentialObject,
  SubObject,
  ArrayObject,
  LiteralObject,
  StringLiteralObject,
  NumberLiteralObject,
  BoolLiteralObject,
  SetObject,
  SetUnionObject,
  SetIntersectionObject,
  SetDifferenceObject,
  CoproductObject,
  PatternLiteralObject,
  Constraint,
  ConstraintType,
  SubObjectConstraint,
  ConstraintPart,
  ReferenceDirective,
  ConstraintText,
} from './ast.js'
