import { createToken, Lexer } from 'chevrotain'

export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
})

// Keywords (case-insensitive)
export const CreateTok = createToken({
  name: 'CreateTok',
  pattern: /create\b/i,
})
export const AsTok = createToken({
  name: 'AsTok',
  pattern: /as\b/i,
})
export const FromTok = createToken({
  name: 'FromTok',
  pattern: /from\b/i,
})
export const SelectTok = createToken({
  name: 'SelectTok',
  pattern: /select\b/i,
})
export const GenerateTok = createToken({
  name: 'GenerateTok',
  pattern: /generate\b/i,
})
export const ImportTok = createToken({
  name: 'ImportTok',
  pattern: /import\b/i,
})
export const ExportTok = createToken({
  name: 'ExportTok',
  pattern: /export\b/i,
})

// Symbols
export const ArrowTok = createToken({ name: 'ArrowTok', pattern: /->/ })
export const LCurly = createToken({ name: 'LCurly', pattern: /{/ })
export const RCurly = createToken({ name: 'RCurly', pattern: /}/ })
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ })
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ })
export const LParen = createToken({ name: 'LParen', pattern: /\(/ })
export const RParen = createToken({ name: 'RParen', pattern: /\)/ })
export const Colon = createToken({ name: 'Colon', pattern: /:/ })
export const Comma = createToken({ name: 'Comma', pattern: /,/ })
export const Semicolon = createToken({ name: 'Semicolon', pattern: /;/ })
export const Dot = createToken({ name: 'Dot', pattern: /\./ })
export const LAngle = createToken({ name: 'LAngle', pattern: /</ })
export const RAngle = createToken({ name: 'RAngle', pattern: />/ })
export const Equals = createToken({ name: 'Equals', pattern: /=/ })

// Brace text block (for SELECT { ... })
export const SelectBlock = createToken({
  name: 'SelectBlock',
  pattern: /\{[^}]+\}/,
})

// Literals
export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /'([^'\\]|\\.)*'/,
})
export const Instruction = createToken({
  name: 'Instruction',
  pattern: /"([^"\\]|\\.)*"/,
})
export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /-?((\.[0-9]+)|([0-9]+(\.[0-9]*)?))([eE][+-]?[0-9]+)?/,
})
export const BoolLiteral = createToken({
  name: 'BoolLiteral',
  pattern: /\b(true|false)\b/i,
})

// Identifiers
export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
})

export const allTokens = [
  WhiteSpace,

  CreateTok,
  AsTok,
  FromTok,
  SelectTok,
  GenerateTok,
  ImportTok,
  ExportTok,

  ArrowTok,
  SelectBlock,
  LCurly,
  RCurly,
  LBracket,
  RBracket,
  LParen,
  RParen,
  Colon,
  Comma,
  Semicolon,
  Dot,
  LAngle,
  RAngle,
  Equals,

  StringLiteral,
  Instruction,
  NumberLiteral,
  BoolLiteral,

  Identifier,
]

export const SpexLexer = new Lexer(allTokens)
