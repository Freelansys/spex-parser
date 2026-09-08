import { createToken, Lexer, type CustomPatternMatcherReturn } from 'chevrotain'

export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
})

// Comments (SQL-style)
export const LineComment = createToken({
  name: 'LineComment',
  pattern: /--[^\r\n]*/,
  group: Lexer.SKIPPED,
})
export const BlockComment = createToken({
  name: 'BlockComment',
  pattern: /\/\*[\s\S]*?\*\//,
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
export const PackageTok = createToken({
  name: 'PackageTok',
  pattern: /package\b/i,
})
export const ExecutableTok = createToken({
  name: 'ExecutableTok',
  pattern: /executable\b/i,
})
export const ModuleTok = createToken({
  name: 'ModuleTok',
  pattern: /module\b/i,
})
export const EnumTok = createToken({
  name: 'EnumTok',
  pattern: /enum\b/i,
})
export const UnionTok = createToken({
  name: 'UnionTok',
  pattern: /union\b/i,
})
export const IntersectTok = createToken({
  name: 'IntersectTok',
  pattern: /intersect\b/i,
})
export const ExceptTok = createToken({
  name: 'ExceptTok',
  pattern: /except\b/i,
})
export const RealizeTok = createToken({
  name: 'RealizeTok',
  pattern: /realize\b/i,
})
export const InTok = createToken({
  name: 'InTok',
  pattern: /in\b/i,
})
export const IncludeTok = createToken({
  name: 'IncludeTok',
  pattern: /include\b/i,
})
export const LambdaTok = createToken({
  name: 'LambdaTok',
  pattern: /lambda\b/i,
})

// Symbols
export const ArrowTok = createToken({ name: 'ArrowTok', pattern: /->/ })
export const PipeTok = createToken({ name: 'PipeTok', pattern: /\|/ })
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

// Brace text block (for SELECT { ... })
export const SelectBlock = createToken({
  name: 'SelectBlock',
  line_breaks: true,
  pattern: (text: string, startOffset: number): CustomPatternMatcherReturn | null => {
    let i = startOffset
    if (text[i] !== '{') return null
    for (i++; i < text.length; i++) {
      if (text[i] === '\\') {
        i++
        continue
      }
      if (text[i] === '}') {
        return [text.slice(startOffset, i + 1)]
      }
    }
    return null
  },
})

// Regex literal (JS-style): /pattern/flags
export const PatternLiteral = createToken({
  name: 'PatternLiteral',
  line_breaks: true,
  pattern: (text: string, startOffset: number): CustomPatternMatcherReturn | null => {
    if (text[startOffset] !== '/') return null
    let inClass = false
    let i = startOffset + 1
    while (i < text.length) {
      const ch = text[i]
      if (ch === '\\') {
        i += 2
        continue
      }
      if (inClass) {
        if (ch === ']') inClass = false
      } else if (ch === '[') {
        inClass = true
      } else if (ch === '/') {
        let j = i + 1
        while (j < text.length && /[a-z]/.test(text[j] ?? '')) j++
        return [text.slice(startOffset, j)]
      }
      i++
    }
    return null
  },
})

// Code block: ```language\n...content...```
export const CodeBlock = createToken({
  name: 'CodeBlock',
  line_breaks: true,
  pattern: (text: string, startOffset: number): CustomPatternMatcherReturn | null => {
    if (text[startOffset] !== '`' || text[startOffset + 1] !== '`' || text[startOffset + 2] !== '`')
      return null
    let i = startOffset + 3
    // require at least one language identifier character
    if (i >= text.length || !/[a-zA-Z0-9_]/.test(text[i]!)) return null
    const langStart = i
    while (i < text.length && text[i] !== '\n' && text[i] !== '\r') i++
    if (i === langStart) return null // no language identifier
    if (i >= text.length) return null
    // skip line ending
    if (text[i] === '\r' && text[i + 1] === '\n') i += 2
    else i++
    // find closing ```
    while (i < text.length - 2) {
      if (text[i] === '\\') {
        i += 2
        continue
      }
      if (text[i] === '`' && text[i + 1] === '`' && text[i + 2] === '`') {
        return [text.slice(startOffset, i + 3)]
      }
      i++
    }
    return null
  },
})

// Literals
export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /'([^'\\]|\\.)*'|"([^"\\]|\\.)*"/,
})
export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /\d+(\.\d+)?/,
})
export const TrueTok = createToken({
  name: 'TrueTok',
  pattern: /true\b/i,
})
export const FalseTok = createToken({
  name: 'FalseTok',
  pattern: /false\b/i,
})

// Basic objects (native types)
export const StringTok = createToken({
  name: 'StringTok',
  pattern: /string\b/i,
})
export const NumberTok = createToken({
  name: 'NumberTok',
  pattern: /number\b/i,
})
export const BoolTok = createToken({
  name: 'BoolTok',
  pattern: /bool\b/i,
})
export const UnitTok = createToken({
  name: 'UnitTok',
  pattern: /unit\b/i,
})
export const ConceptTok = createToken({
  name: 'ConceptTok',
  pattern: /concept\b/i,
})
export const EnvironmentTok = createToken({
  name: 'EnvironmentTok',
  pattern: /environment\b/i,
})

// Identifiers
export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
})

export const allTokens = [
  WhiteSpace,
  LineComment,
  BlockComment,

  CreateTok,
  AsTok,
  FromTok,
  SelectTok,
  GenerateTok,
  ImportTok,
  PackageTok,
  ExecutableTok,
  ModuleTok,
  EnumTok,
  UnionTok,
  IntersectTok,
  ExceptTok,
  RealizeTok,
  InTok,
  IncludeTok,
  LambdaTok,

  ArrowTok,
  PipeTok,
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
  StringLiteral,
  NumberLiteral,
  TrueTok,
  FalseTok,
  PatternLiteral,
  CodeBlock,

  StringTok,
  NumberTok,
  BoolTok,
  UnitTok,
  ConceptTok,
  EnvironmentTok,

  Identifier,
]

export const SpexLexer = new Lexer(allTokens)
