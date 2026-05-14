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
      const result = SpexLexer.tokenize('->{}[]():;,.')
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
        'StringTok',
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

    it('should tokenize path literals', () => {
      const result = SpexLexer.tokenize('"types.spex"')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens).toHaveLength(1)
      expect(result.tokens[0]?.tokenType.name).toBe('PathLiteral')
      expect(result.tokens[0]?.image).toBe('"types.spex"')
    })

    it('should tokenize array brackets', () => {
      const result = SpexLexer.tokenize('string[]')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'StringTok',
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
