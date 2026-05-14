export { SpexLexer } from './lexer.js'
export { SpexParser } from './parser.js'
export { SpexParserVisitor, parseToAst } from './visitor.js'
export type {
  SpexFile,
  Declaration,
  ObjectDeclaration,
  ObjectExpression,
  NamedObject,
  ProductObject,
  ExponentialObject,
  SubObject,
} from './ast.js'
