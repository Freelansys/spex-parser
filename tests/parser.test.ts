import { describe, it, expect } from 'vitest'
import { SpexParser } from '../src/parser.js'
import { SpexLexer } from '../src/lexer.js'

const parser = new SpexParser()

function parseInput(text: string) {
  const lexingResult = SpexLexer.tokenize(text)
  parser.input = lexingResult.tokens
  const cst = parser.spexFile() as any
  return { parser, cst }
}

describe('SpexParser', () => {
  describe('object declaration', () => {
    it('should parse named object declaration', () => {
      const testCase = 'create MyObject as Number;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse product object declaration', () => {
      const testCase = 'create MyProduct as (n: Number, s: String);'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse product object declaration with trailing commas', () => {
      const testCase = 'create MyProduct as (n: Number, s: String,);'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse product object declaration with exponential objects', () => {
      const testCase = 'create MyProduct as (f: Number -> String, n: Number);'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse product object declaration with subobjects', () => {
      const testCase =
        'create MyProduct as (p: from Number select { value is positive }, n: Number);'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse exponential object declaration with named object', () => {
      const testCase = 'create MyExponential as Number -> Unit;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse exponential object declaration with product objects', () => {
      const testCase = 'create MyExponential as (n: Number) -> (s: String);'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse exponential object declaration with exponential objects', () => {
      const testCase = 'create MyExponential as (f: Number -> String, n: Number) -> String;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse exponential object declaration with subobjects', () => {
      const testCase =
        'create MyExponential as from Number select { value is positive } -> from Number select { value is positive };'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse subobject declaration with text constraint', () => {
      const testCase = 'create PositiveNumber as from Number select { are positive };'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse subobject declaration with product objects', () => {
      const testCase =
        'create MySubobject as from (n: Number, s: String) select { have a positive @n };'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse subobject declaration with exponential objects', () => {
      const testCase =
        'create MySubobject as from (n: Number, s: String) -> Bool select { log the given input };'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse subobject declaration with subobjects', () => {
      const testCase =
        'create MySubobject as from from Number select { value is positive } select { value is odd };'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse array type declaration', () => {
      const testCase = 'create MyArray as string[];'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse array of product type', () => {
      const testCase = 'create MyArray as (n: Number)[];'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse nested array type', () => {
      const testCase = 'create MyArray as string[][];'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse object declaration with dotted name', () => {
      const testCase =
        'create SignUp as (user: types.EmailAddress, pass: types.Password) -> string;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse basic object string', () => {
      const testCase = 'create MyObject as string;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse basic object number', () => {
      const testCase = 'create MyObject as number;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse basic object bool', () => {
      const testCase = 'create MyObject as bool;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse basic object unit', () => {
      const testCase = 'create MyObject as unit;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse basic objects in product fields', () => {
      const testCase = 'create Config as (name: string, count: number, active: bool);'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should not allow overriding basic object string', () => {
      const testCase = 'create string as Number;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).not.toHaveLength(0)
    })

    it('should not allow overriding basic object number', () => {
      const testCase = 'create number as Number;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).not.toHaveLength(0)
    })

    it('should not allow overriding basic object bool', () => {
      const testCase = 'create bool as Number;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).not.toHaveLength(0)
    })

    it('should not allow overriding basic object unit', () => {
      const testCase = 'create unit as Number;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).not.toHaveLength(0)
    })
  })

  describe('import declaration', () => {
    it('should parse named import', () => {
      const testCase = 'import EmailAddress from "types.spex";'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse named import with alias', () => {
      const testCase = 'import EmailAddress from "types.spex" as Username;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse module import', () => {
      const testCase = 'import "types.spex" as types;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })
  })

  describe('export declaration', () => {
    it('should parse export declaration', () => {
      const testCase = 'export EmailAddress;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })
  })

  describe('generate declaration', () => {
    it('should parse generate declaration', () => {
      const testCase = 'generate Main;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })
  })

  describe('multiple declarations', () => {
    it('should parse multiple declarations', () => {
      const testCase = `
        create Todo as (id: string, title: string, completed: bool);
        create EmailAddress as from string select { are email addresses };
        export EmailAddress;
        generate Main;
      `
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })
  })
})
