import { describe, it, expect } from 'vitest'
import { SpexLexer } from '../src/lexer.js'

describe('SpexLexer', () => {
  describe('tokenization', () => {
    it('should tokenize keywords', () => {
      const result = SpexLexer.tokenize('create as from select generate import export')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'CreateTok',
        'AsTok',
        'FromTok',
        'SelectTok',
        'GenerateTok',
        'ImportTok',
        'ExportTok',
      ])
    })

    it('should tokenize keywords case-insensitively', () => {
      const result = SpexLexer.tokenize('CREATE AS FROM SELECT GENERATE IMPORT EXPORT')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'CreateTok',
        'AsTok',
        'FromTok',
        'SelectTok',
        'GenerateTok',
        'ImportTok',
        'ExportTok',
      ])
    })

    it('should tokenize symbols', () => {
      const result = SpexLexer.tokenize('->{}[]():;,.<>=')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'ArrowTok',
        'LCurly',
        'RCurly',
        'LBracket',
        'RBracket',
        'LParen',
        'RParen',
        'Colon',
        'Semicolon',
        'Comma',
        'Dot',
        'LAngle',
        'RAngle',
        'Equals',
      ])
    })

    it('should tokenize identifiers', () => {
      const result = SpexLexer.tokenize('foo bar _test _123 ABC')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(Array(5).fill('Identifier'))
      expect(result.tokens.map((t) => t.image)).toEqual(['foo', 'bar', '_test', '_123', 'ABC'])
    })

    it('should skip whitespace', () => {
      const result = SpexLexer.tokenize('foo   bar\t\nbaz')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(Array(3).fill('Identifier'))
    })

    it('should handle mixed input', () => {
      const result = SpexLexer.tokenize('CREATE Foo as ( name: string )')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'CreateTok',
        'Identifier',
        'AsTok',
        'LParen',
        'Identifier',
        'Colon',
        'Identifier',
        'RParen',
      ])
    })

    it('should handle keywords with word boundary', () => {
      const result = SpexLexer.tokenize(
        'createfoo foocreate asfoo fooas fooselect selectfoo foofrom fromfoo generatefoo foogenerate importfoo fooimport exportfoo fooexport'
      )
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(Array(14).fill('Identifier'))
    })

    it('should tokenize the text between braces', () => {
      const result = SpexLexer.tokenize('{hello\nworld}')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens).toHaveLength(1)
      expect(result.tokens[0]?.tokenType.name).toBe('SelectBlock')
      expect(result.tokens[0]?.image).toBe('{hello\nworld}')
    })

    it('should tokenize single-quoted strings', () => {
      const result = SpexLexer.tokenize("'hello world'")
      expect(result.errors).toHaveLength(0)
      expect(result.tokens).toHaveLength(1)
      expect(result.tokens[0]?.tokenType.name).toBe('StringLiteral')
      expect(result.tokens[0]?.image).toBe("'hello world'")
    })

    it('should tokenize double-quoted strings', () => {
      const result = SpexLexer.tokenize('"types.spex"')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens).toHaveLength(1)
      expect(result.tokens[0]?.tokenType.name).toBe('Instruction')
      expect(result.tokens[0]?.image).toBe('"types.spex"')
    })

    it('should tokenize numbers', () => {
      const result = SpexLexer.tokenize('-1 1 0.2 1e-2')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens).toHaveLength(4)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(Array(4).fill('NumberLiteral'))
      expect(result.tokens.map((t) => t.image)).toEqual(['-1', '1', '0.2', '1e-2'])
    })

    it('should tokenize booleans', () => {
      const result = SpexLexer.tokenize('true false')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens).toHaveLength(2)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(['BoolLiteral', 'BoolLiteral'])
      expect(result.tokens.map((t) => t.image)).toEqual(['true', 'false'])
    })

    it('should tokenize array brackets', () => {
      const result = SpexLexer.tokenize('string[]')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'Identifier',
        'LBracket',
        'RBracket',
      ])
      expect(result.tokens.map((t) => t.image)).toEqual(['string', '[', ']'])
    })
  })

  describe('error handling', () => {
    it('should return empty tokens for empty input', () => {
      const result = SpexLexer.tokenize('')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens).toHaveLength(0)
    })
  })
})
