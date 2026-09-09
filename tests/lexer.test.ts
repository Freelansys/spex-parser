import { describe, it, expect } from 'vitest'
import { SpexLexer } from '../src/lexer.js'

describe('SpexLexer', () => {
  describe('tokenization', () => {
    it('should tokenize keywords', () => {
      const result = SpexLexer.tokenize(
        'create as from select generate import realize in'
      )
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'CreateTok',
        'AsTok',
        'FromTok',
        'SelectTok',
        'GenerateTok',
        'ImportTok',
        'RealizeTok',
        'InTok',
      ])
    })

    it('should tokenize keywords case-insensitively', () => {
      const result = SpexLexer.tokenize(
        'CREATE AS FROM SELECT GENERATE IMPORT UNION INTERSECT EXCEPT REALIZE IN'
      )
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'CreateTok',
        'AsTok',
        'FromTok',
        'SelectTok',
        'GenerateTok',
        'ImportTok',
        'UnionTok',
        'IntersectTok',
        'ExceptTok',
        'RealizeTok',
        'InTok',
      ])
    })

    it('should tokenize symbols', () => {
      const result = SpexLexer.tokenize('->[]():;,.|')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'ArrowTok',
        'LBracket',
        'RBracket',
        'LParen',
        'RParen',
        'Colon',
        'Semicolon',
        'Comma',
        'Dot',
        'PipeTok',
      ])
    })

    it('should tokenize braces as separate symbols when not forming a block', () => {
      const result = SpexLexer.tokenize('}{')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(['RCurly', 'LCurly'])
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
        'createfoo foocreate asfoo fooas fooselect selectfoo foofrom fromfoo generatefoo foogenerate importfoo fooimport artifactfoo fooartifact conceptfoo fooconcept environmentfoo fooenvironment realizefoo foorealize info fooin'
      )
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(Array(22).fill('Identifier'))
    })

    it('should tokenize the concept and environment base types', () => {
      const result = SpexLexer.tokenize('concept environment')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'ConceptTok',
        'EnvironmentTok',
      ])
    })

    it('should tokenize the artifact base type', () => {
      const result = SpexLexer.tokenize('artifact')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(['ArtifactTok'])
    })

    it('should tokenize the text between braces', () => {
      const result = SpexLexer.tokenize('{hello\nworld}')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens).toHaveLength(1)
      expect(result.tokens[0]?.tokenType.name).toBe('SelectBlock')
      expect(result.tokens[0]?.image).toBe('{hello\nworld}')
    })

    it('should tokenize double quoted string literals', () => {
      const result = SpexLexer.tokenize('"types.spex"')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens).toHaveLength(1)
      expect(result.tokens[0]?.tokenType.name).toBe('StringLiteral')
      expect(result.tokens[0]?.image).toBe('"types.spex"')
    })

    it('should tokenize single quoted string literals', () => {
      const result = SpexLexer.tokenize("'types.spex'")
      expect(result.errors).toHaveLength(0)
      expect(result.tokens).toHaveLength(1)
      expect(result.tokens[0]?.tokenType.name).toBe('StringLiteral')
      expect(result.tokens[0]?.image).toBe("'types.spex'")
    })

    it('should tokenize string literals with escaped quotes', () => {
      const result = SpexLexer.tokenize("'it\\'s a \"quote\"'")
      expect(result.errors).toHaveLength(0)
      expect(result.tokens).toHaveLength(1)
      expect(result.tokens[0]?.tokenType.name).toBe('StringLiteral')
      expect(result.tokens[0]?.image).toBe("'it\\'s a \"quote\"'")
    })

    it('should tokenize string literals with escaped backslashes', () => {
      const result = SpexLexer.tokenize('"a\\\\b"')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens).toHaveLength(1)
      expect(result.tokens[0]?.tokenType.name).toBe('StringLiteral')
      expect(result.tokens[0]?.image).toBe('"a\\\\b"')
    })

    it('should tokenize number literals', () => {
      const result = SpexLexer.tokenize('42 3.14')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'NumberLiteral',
        'NumberLiteral',
      ])
      expect(result.tokens.map((t) => t.image)).toEqual(['42', '3.14'])
    })

    it('should tokenize bool literals', () => {
      const result = SpexLexer.tokenize('true false TRUE FALSE')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'TrueTok',
        'FalseTok',
        'TrueTok',
        'FalseTok',
      ])
    })

    it('should tokenize literal object declarations', () => {
      const result = SpexLexer.tokenize("create Foo as (name: \"John\", age: 42);")
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'CreateTok',
        'Identifier',
        'AsTok',
        'LParen',
        'Identifier',
        'Colon',
        'StringLiteral',
        'Comma',
        'Identifier',
        'Colon',
        'NumberLiteral',
        'RParen',
        'Semicolon',
      ])
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

  describe('select block escaping', () => {
    it('should tokenize an empty select block', () => {
      const result = SpexLexer.tokenize('{}')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(['SelectBlock'])
      expect(result.tokens[0]?.image).toBe('{}')
    })

    it('should tokenize a select block with an escaped close brace', () => {
      const result = SpexLexer.tokenize('{end with \\} }')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(['SelectBlock'])
      expect(result.tokens[0]?.image).toBe('{end with \\} }')
    })

    it('should tokenize a select block with escaped open and close braces', () => {
      const result = SpexLexer.tokenize('{match \\{a\\} }')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(['SelectBlock'])
      expect(result.tokens[0]?.image).toBe('{match \\{a\\} }')
    })

    it('should tokenize a select block with escaped backslashes', () => {
      const result = SpexLexer.tokenize('{a \\\\ b}')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(['SelectBlock'])
      expect(result.tokens[0]?.image).toBe('{a \\\\ b}')
    })

    it('should keep backslashes before ordinary characters', () => {
      const result = SpexLexer.tokenize('{\\d matches}')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(['SelectBlock'])
      expect(result.tokens[0]?.image).toBe('{\\d matches}')
    })

    it('should fall back to individual symbols when a select block is unterminated', () => {
      const result = SpexLexer.tokenize('{foo')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(['LCurly', 'Identifier'])
    })
  })

  describe('comments', () => {
    it('should skip single-line comments', () => {
      const result = SpexLexer.tokenize('create Foo as string; -- a comment')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'CreateTok',
        'Identifier',
        'AsTok',
        'StringTok',
        'Semicolon',
      ])
    })

    it('should skip single-line comment with no trailing newline', () => {
      const result = SpexLexer.tokenize('-- a comment')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens).toHaveLength(0)
    })

    it('should skip inline block comments', () => {
      const result = SpexLexer.tokenize('create /* inline */ Foo as string;')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'CreateTok',
        'Identifier',
        'AsTok',
        'StringTok',
        'Semicolon',
      ])
    })

    it('should skip multi-line block comments', () => {
      const result = SpexLexer.tokenize('/* line 1\nline 2 */ create Foo as string;')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'CreateTok',
        'Identifier',
        'AsTok',
        'StringTok',
        'Semicolon',
      ])
    })

    it('should skip block comments containing token-like content', () => {
      const result = SpexLexer.tokenize('/* create Bar as Number; */ create Foo as string;')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'CreateTok',
        'Identifier',
        'AsTok',
        'StringTok',
        'Semicolon',
      ])
    })

    it('should produce an error for an unclosed block comment', () => {
      const result = SpexLexer.tokenize('create Foo as string; /* unclosed')
      expect(result.errors).not.toHaveLength(0)
    })

    it('should not strip comment markers inside a select block', () => {
      const result = SpexLexer.tokenize('select { are valid -- like emails };')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'SelectTok',
        'SelectBlock',
        'Semicolon',
      ])
      expect(result.tokens[1]?.image).toBe('{ are valid -- like emails }')
    })

    it('should preserve block comment markers inside a select block', () => {
      const result = SpexLexer.tokenize('select { match /* strict */ pattern };')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'SelectTok',
        'SelectBlock',
        'Semicolon',
      ])
      expect(result.tokens[1]?.image).toBe('{ match /* strict */ pattern }')
    })
  })

  describe('pattern literal', () => {
    it('should tokenize a pattern literal with flags', () => {
      const result = SpexLexer.tokenize('/create\\b/i')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(['PatternLiteral'])
      expect(result.tokens[0]?.image).toBe('/create\\b/i')
    })

    it('should tokenize a pattern literal with an escaped slash', () => {
      const result = SpexLexer.tokenize('/\\/\\*[\\s\\S]*?\\*\\//')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(['PatternLiteral'])
      expect(result.tokens[0]?.image).toBe('/\\/\\*[\\s\\S]*?\\*\\//')
    })

    it('should tokenize a pattern literal with quotes in char classes', () => {
      const result = SpexLexer.tokenize("/'([^'\\\\]|\\\\.)*'|\"([^\"\\\\]|\\\\.)*\"/")
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(['PatternLiteral'])
      expect(result.tokens[0]?.image).toBe("/'([^'\\\\]|\\\\.)*'|\"([^\"\\\\]|\\\\.)*\"/")
    })

    it('should tokenize an empty pattern', () => {
      const result = SpexLexer.tokenize('//')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(['PatternLiteral'])
      expect(result.tokens[0]?.image).toBe('//')
    })

    it('should tokenize a pattern before following tokens', () => {
      const result = SpexLexer.tokenize('/\\d+/ foo;')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        'PatternLiteral',
        'Identifier',
        'Semicolon',
      ])
    })

    it('should not tokenize an unterminated pattern', () => {
      const result = SpexLexer.tokenize('/foo')
      expect(result.errors).not.toHaveLength(0)
    })

    it('should prefer a block comment over a pattern literal', () => {
      const result = SpexLexer.tokenize('/* comment */')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens).toHaveLength(0)
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
