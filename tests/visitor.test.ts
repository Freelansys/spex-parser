import { describe, it, expect } from 'vitest'
import { parseToAst, parseConstraint } from '../src/visitor.js'
import { SpexError } from '../src/errors.js'
import type {
  ObjectDeclaration,
  ImportDeclaration,
  GenerateDeclaration,
  RealizeDeclaration,
  Decomposition,
  IncludeDeclaration,
  Constraint,
} from '../src/ast.js'

function stripLocations(value: any): any {
  if (Array.isArray(value)) {
    return value.map(stripLocations)
  }
  if (value !== null && typeof value === 'object') {
    const out: any = {}
    for (const [key, child] of Object.entries(value)) {
      if (key === 'location') continue
      out[key] = stripLocations(child)
    }
    return out
  }
  return value
}

describe('SpexParserVisitor', () => {
  describe('lexing errors', () => {
    it('should throw on unexpected characters', () => {
      expect(() => parseToAst('create Foo as spex-parser;')).toThrow(
        'Lexing errors: unexpected character: ->-<'
      )
    })

    it('should throw on unclosed block comments', () => {
      expect(() => parseToAst('create Foo as string; /* unclosed')).toThrow(/Lexing errors:/)
    })

    it('should not throw when the input lexes cleanly', () => {
      expect(() => parseToAst('create Foo as string;')).not.toThrow()
    })

    it('should throw a SpexError with the offending position', () => {
      const error = (() => {
        try {
          parseToAst('create Foo as spex-parser;')
        } catch (e) {
          return e as SpexError
        }
        throw new Error('expected parseToAst to throw')
      })()

      expect(error).toBeInstanceOf(SpexError)
      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('SpexError')
      expect(error.phase).toBe('Lexing')
      expect(error.location).toEqual({
        start: { offset: 18, line: 1, column: 19 },
        end: { offset: 19, line: 1, column: 20 },
      })
      const underlying = error.underlying as Array<{ message: string }>
      expect(Array.isArray(underlying)).toBe(true)
      expect(underlying[0]!.message).toContain('unexpected character')
    })

    it('should null out the location when the lexer reports none', () => {
      const error = (() => {
        try {
          parseToAst('create Foo as string; // \u0000')
        } catch (e) {
          return e as SpexError
        }
        throw new Error('expected parseToAst to throw')
      })()

      expect(error).toBeInstanceOf(SpexError)
      // The NUL byte is a valid lexing error target but the reported
      // position may be undefined; the error must still be spex-structured.
      expect(error.phase).toBe('Lexing')
    })
  })

  describe('parsing errors', () => {
    it('should throw a SpexError with a message and the offending token position', () => {
      const error = (() => {
        try {
          parseToAst('create Foo as Number; extra')
        } catch (e) {
          return e as SpexError
        }
        throw new Error('expected parseToAst to throw')
      })()

      expect(error).toBeInstanceOf(SpexError)
      expect(error.phase).toBe('Parsing')
      expect(error.name).toBe('SpexError')
      expect(error.message).toContain('Parsing errors:')
      expect(error.location).not.toBeNull()
      expect(error.location!.start.line).toBe(1)
      // `extra` is the trailing, unexpected token: it starts right after
      // "create Foo as Number; " (offset 22) at column 23.
      expect(error.location!.start.offset).toBe(22)
      expect(error.location!.start.column).toBe(23)
      expect(error.location!.end.offset).toBe(27)
      expect(Array.isArray(error.underlying)).toBe(true)
    })
  })

  describe('object declaration', () => {
    it('should convert named object declaration to AST', () => {
      const testCase = 'create MyObject as Number;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyObject',
        object: {
          kind: 'NamedObject',
          name: 'Number',
        },
      })
    })

    it('should convert product object declaration to AST', () => {
      const testCase = 'create MyProduct as (n: Number, s: String);'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyProduct',
        object: {
          kind: 'ProductObject',
          fields: {
            n: { kind: 'NamedObject', name: 'Number' },
            s: { kind: 'NamedObject', name: 'String' },
          },
        },
      })
    })

    it('should convert product object declaration with trailing commas to AST', () => {
      const testCase = 'create MyProduct as (n: Number, s: String,);'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyProduct',
        object: {
          kind: 'ProductObject',
          fields: {
            n: { kind: 'NamedObject', name: 'Number' },
            s: { kind: 'NamedObject', name: 'String' },
          },
        },
      })
    })

    it('should convert product object declaration with exponential objects to AST', () => {
      const testCase = 'create MyProduct as (f: Number -> String, n: Number);'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyProduct',
        object: {
          kind: 'ProductObject',
          fields: {
            f: {
              kind: 'ExponentialObject',
              exponent: { kind: 'NamedObject', name: 'Number' },
              base: { kind: 'NamedObject', name: 'String' },
            },
            n: { kind: 'NamedObject', name: 'Number' },
          },
        },
      })
    })

    it('should convert product object declaration with subobjects to AST', () => {
      const testCase =
        'create MyProduct as (p: from Number select { value is positive }, n: Number);'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyProduct',
        object: {
          kind: 'ProductObject',
          fields: {
            p: {
              kind: 'SubObject',
              base: { kind: 'NamedObject', name: 'Number' },
              constraint: {
                type: 'NaturalLanguage',
                raw: 'value is positive',
                parts: [{ kind: 'ConstraintText', text: 'value is positive' }],
              },
            },
            n: { kind: 'NamedObject', name: 'Number' },
          },
        },
      })
    })

    it('should convert exponential object declaration with named object to AST', () => {
      const testCase = 'create MyExponential as Number -> Unit;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyExponential',
        object: {
          kind: 'ExponentialObject',
          exponent: { kind: 'NamedObject', name: 'Number' },
          base: { kind: 'NamedObject', name: 'Unit' },
        },
      })
    })

    it('should convert exponential object declaration with product objects to AST', () => {
      const testCase = 'create MyExponential as (n: Number) -> (s: String);'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyExponential',
        object: {
          kind: 'ExponentialObject',
          exponent: {
            kind: 'ProductObject',
            fields: {
              n: { kind: 'NamedObject', name: 'Number' },
            },
          },
          base: {
            kind: 'ProductObject',
            fields: {
              s: { kind: 'NamedObject', name: 'String' },
            },
          },
        },
      })
    })

    it('should convert exponential object declaration with exponential objects to AST', () => {
      const testCase = 'create MyExponential as (f: Number -> String, n: Number) -> String;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyExponential',
        object: {
          kind: 'ExponentialObject',
          exponent: {
            kind: 'ProductObject',
            fields: {
              f: {
                kind: 'ExponentialObject',
                exponent: { kind: 'NamedObject', name: 'Number' },
                base: { kind: 'NamedObject', name: 'String' },
              },
              n: { kind: 'NamedObject', name: 'Number' },
            },
          },
          base: { kind: 'NamedObject', name: 'String' },
        },
      })
    })

    it('should convert exponential object declaration with subobjects to AST', () => {
      const testCase =
        'create MyExponential as from Number select { value is positive } -> from Number select { value is positive };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyExponential',
        object: {
          kind: 'ExponentialObject',
          exponent: {
            kind: 'SubObject',
            base: { kind: 'NamedObject', name: 'Number' },
            constraint: {
              type: 'NaturalLanguage',
              raw: 'value is positive',
              parts: [{ kind: 'ConstraintText', text: 'value is positive' }],
            },
          },
          base: {
            kind: 'SubObject',
            base: { kind: 'NamedObject', name: 'Number' },
            constraint: {
              type: 'NaturalLanguage',
              raw: 'value is positive',
              parts: [{ kind: 'ConstraintText', text: 'value is positive' }],
            },
          },
        },
      })
    })

    it('should convert subobject declaration with named objects to AST', () => {
      const testCase = 'create PositiveNumber as from Number select { isPositive };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'PositiveNumber',
        object: {
          kind: 'SubObject',
          base: { kind: 'NamedObject', name: 'Number' },
          constraint: {
            type: 'NaturalLanguage',
            raw: 'isPositive',
            parts: [{ kind: 'ConstraintText', text: 'isPositive' }],
          },
        },
      })
    })

    it('should convert subobject declaration with a set operation base to AST', () => {
      const testCase =
        'create ExpressWebEnv as from Web intersect TypeScript select { is an express app };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'ExpressWebEnv',
        object: {
          kind: 'SubObject',
          base: {
            kind: 'SetIntersectionObject',
            left: { kind: 'NamedObject', name: 'Web' },
            right: { kind: 'NamedObject', name: 'TypeScript' },
          },
          constraint: {
            type: 'NaturalLanguage',
            raw: 'is an express app',
            parts: [{ kind: 'ConstraintText', text: 'is an express app' }],
          },
        },
      })
    })

    it('should convert subobject declaration with text constraint to AST', () => {
      const testCase = 'create PositiveNumber as from Number select { the number is positive };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'PositiveNumber',
        object: {
          kind: 'SubObject',
          base: { kind: 'NamedObject', name: 'Number' },
          constraint: {
            type: 'NaturalLanguage',
            raw: 'the number is positive',
            parts: [{ kind: 'ConstraintText', text: 'the number is positive' }],
          },
        },
      })
    })

    it('should convert subobject declaration with product objects to AST', () => {
      const testCase =
        'create MySubobject as from (n: Number, s: String) select { @n is positive };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MySubobject',
        object: {
          kind: 'SubObject',
          base: {
            kind: 'ProductObject',
            fields: {
              n: { kind: 'NamedObject', name: 'Number' },
              s: { kind: 'NamedObject', name: 'String' },
            },
          },
          constraint: {
            type: 'NaturalLanguage',
            raw: '@n is positive',
            parts: [
              { kind: 'ReferenceDirective', name: 'n' },
              { kind: 'ConstraintText', text: ' is positive' },
            ],
          },
        },
      })
    })

    it('should convert subobject declaration with exponential objects to AST', () => {
      const testCase =
        'create MySubobject as from (n: Number, s: String) -> Bool select { logs the given input };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MySubobject',
        object: {
          kind: 'SubObject',
          base: {
            kind: 'ExponentialObject',
            exponent: {
              kind: 'ProductObject',
              fields: {
                n: { kind: 'NamedObject', name: 'Number' },
                s: { kind: 'NamedObject', name: 'String' },
              },
            },
            base: { kind: 'NamedObject', name: 'Bool' },
          },
          constraint: {
            type: 'NaturalLanguage',
            raw: 'logs the given input',
            parts: [{ kind: 'ConstraintText', text: 'logs the given input' }],
          },
        },
      })
    })

    it('should convert subobject declaration with subobjects to AST', () => {
      const testCase =
        'create MySubobject as from from Number select { value is positive } select { value is odd };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MySubobject',
        object: {
          kind: 'SubObject',
          base: {
            kind: 'SubObject',
            base: { kind: 'NamedObject', name: 'Number' },
            constraint: {
              type: 'NaturalLanguage',
              raw: 'value is positive',
              parts: [{ kind: 'ConstraintText', text: 'value is positive' }],
            },
          },
          constraint: {
            type: 'NaturalLanguage',
            raw: 'value is odd',
            parts: [{ kind: 'ConstraintText', text: 'value is odd' }],
          },
        },
      })
    })

    it('should convert basic object string to AST', () => {
      const testCase = 'create MyObject as string;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyObject',
        object: {
          kind: 'NamedObject',
          name: 'string',
        },
      })
    })

    it('should convert basic object number to AST', () => {
      const testCase = 'create MyObject as number;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyObject',
        object: {
          kind: 'NamedObject',
          name: 'number',
        },
      })
    })

    it('should convert basic object bool to AST', () => {
      const testCase = 'create MyObject as bool;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyObject',
        object: {
          kind: 'NamedObject',
          name: 'bool',
        },
      })
    })

    it('should convert basic object unit to AST', () => {
      const testCase = 'create MyObject as unit;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyObject',
        object: {
          kind: 'NamedObject',
          name: 'unit',
        },
      })
    })

    it('should convert basic object concept to AST', () => {
      const testCase = 'create MyObject as concept;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyObject',
        object: {
          kind: 'NamedObject',
          name: 'concept',
        },
      })
    })

    it('should convert basic object environment to AST', () => {
      const testCase = 'create MyObject as environment;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyObject',
        object: {
          kind: 'NamedObject',
          name: 'environment',
        },
      })
    })

    it('should convert basic object artifact to AST', () => {
      const testCase = 'create MyObject as artifact;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyObject',
        object: {
          kind: 'NamedObject',
          name: 'artifact',
        },
      })
    })

    it('should convert array type declaration to AST', () => {
      const testCase = 'create MyArray as string[];'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyArray',
        object: {
          kind: 'ArrayObject',
          base: { kind: 'NamedObject', name: 'string' },
        },
      })
    })

    it('should convert array of product type to AST', () => {
      const testCase = 'create MyArray as (n: Number)[];'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'MyArray',
        object: {
          kind: 'ArrayObject',
          base: {
            kind: 'ProductObject',
            fields: {
              n: { kind: 'NamedObject', name: 'Number' },
            },
          },
        },
      })
    })

    it('should convert dotted name to AST', () => {
      const testCase =
        'create SignUp as (user: types.EmailAddress, pass: types.Password) -> string;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'SignUp',
        object: {
          kind: 'ExponentialObject',
          exponent: {
            kind: 'ProductObject',
            fields: {
              user: { kind: 'NamedObject', name: 'types.EmailAddress' },
              pass: { kind: 'NamedObject', name: 'types.Password' },
            },
          },
          base: { kind: 'NamedObject', name: 'string' },
        },
      })
    })
  })

  describe('import declaration', () => {
    it('should convert named import to AST', () => {
      const testCase = 'import EmailAddress from "types.spex";'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ImportDeclaration
      expect(decl).toMatchObject({
        kind: 'ImportDeclaration',
        name: 'EmailAddress',
        source: 'types.spex',
        alias: null,
      })
    })

    it('should convert named import with alias to AST', () => {
      const testCase = 'import EmailAddress from "types.spex" as Username;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ImportDeclaration
      expect(decl).toMatchObject({
        kind: 'ImportDeclaration',
        name: 'EmailAddress',
        source: 'types.spex',
        alias: 'Username',
      })
    })

    it('should convert module import to AST', () => {
      const testCase = 'import "types.spex" as types;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ImportDeclaration
      expect(decl).toMatchObject({
        kind: 'ImportDeclaration',
        name: null,
        source: 'types.spex',
        alias: 'types',
      })
    })

    it('should convert named import with single quoted source to AST', () => {
      const testCase = "import EmailAddress from 'types.spex' as Username;"
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ImportDeclaration
      expect(decl).toMatchObject({
        kind: 'ImportDeclaration',
        name: 'EmailAddress',
        source: 'types.spex',
        alias: 'Username',
      })
    })

    it('should unescape escaped characters in import sources', () => {
      const testCase = "import EmailAddress from 'dir\\\\types.spex';"
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ImportDeclaration
      expect(decl.source).toBe('dir\\types.spex')
    })
  })

  describe('generate declaration', () => {
    it('should convert generate declaration to AST', () => {
      const testCase = 'generate Main;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as GenerateDeclaration
      expect(decl).toMatchObject({
        kind: 'GenerateDeclaration',
        name: 'Main',
        environment: { kind: 'NamedObject', name: 'environment' },
      })
    })

    it('should convert generate declaration with an environment to AST', () => {
      const testCase = 'generate Main in Python;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as GenerateDeclaration
      expect(decl).toMatchObject({
        kind: 'GenerateDeclaration',
        name: 'Main',
        environment: { kind: 'NamedObject', name: 'Python' },
      })
    })
  })

  describe('literal object', () => {
    it('should convert string literal object to AST', () => {
      const testCase = 'create Foo as "SpexFile";'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toMatchObject({
        kind: 'ObjectDeclaration',
        name: 'Foo',
        object: {
          kind: 'StringLiteralObject',
          value: 'SpexFile',
        },
      })
    })

    it('should convert number literal object to AST', () => {
      const testCase = 'create Foo as 42;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'NumberLiteralObject',
        value: '42',
      })
    })

    it('should convert bool literal object to AST', () => {
      const ast = parseToAst('create Foo as true;')
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'BoolLiteralObject',
        value: true,
      })
    })

    it('should convert product of literal objects to AST', () => {
      const testCase = 'create Foo as (name: "John", age: 42);'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'ProductObject',
        fields: {
          name: { kind: 'StringLiteralObject', value: 'John' },
          age: { kind: 'NumberLiteralObject', value: '42' },
        },
      })
    })

    it('should unescape string literal object values', () => {
      const testCase = "create Foo as 'it\\'s';"
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'StringLiteralObject',
        value: "it's",
      })
    })
  })

  describe('set object', () => {
    it('should convert union object to AST', () => {
      const testCase = 'create X as A UNION B;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'SetUnionObject',
        left: { kind: 'NamedObject', name: 'A' },
        right: { kind: 'NamedObject', name: 'B' },
      })
    })

    it('should convert intersect object to AST', () => {
      const testCase = 'create X as A INTERSECT B;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'SetIntersectionObject',
        left: { kind: 'NamedObject', name: 'A' },
        right: { kind: 'NamedObject', name: 'B' },
      })
    })

    it('should convert except object to AST', () => {
      const testCase = 'create X as A EXCEPT B;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'SetDifferenceObject',
        left: { kind: 'NamedObject', name: 'A' },
        right: { kind: 'NamedObject', name: 'B' },
      })
    })

    it('should convert chained set operations left-associatively', () => {
      const testCase = 'create X as A UNION B EXCEPT C;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'SetDifferenceObject',
        left: {
          kind: 'SetUnionObject',
          left: { kind: 'NamedObject', name: 'A' },
          right: { kind: 'NamedObject', name: 'B' },
        },
        right: { kind: 'NamedObject', name: 'C' },
      })
    })

    it('should preserve mixed operation order', () => {
      const testCase = 'create X as A EXCEPT B UNION C;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'SetUnionObject',
        left: {
          kind: 'SetDifferenceObject',
          left: { kind: 'NamedObject', name: 'A' },
          right: { kind: 'NamedObject', name: 'B' },
        },
        right: { kind: 'NamedObject', name: 'C' },
      })
    })

    it('should convert set operations with literals to AST', () => {
      const testCase = 'create X as string EXCEPT "root";'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'SetDifferenceObject',
        left: { kind: 'NamedObject', name: 'string' },
        right: { kind: 'StringLiteralObject', value: 'root' },
      })
    })

    it('should convert set operations in product fields to AST', () => {
      const testCase = 'create X as (a: A UNION B);'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'ProductObject',
        fields: {
          a: {
            kind: 'SetUnionObject',
            left: { kind: 'NamedObject', name: 'A' },
            right: { kind: 'NamedObject', name: 'B' },
          },
        },
      })
    })
  })

  describe('coproduct object', () => {
    it('should convert pipe object to AST', () => {
      const testCase = 'create Shape as Point | Circle;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'CoproductObject',
        left: { kind: 'NamedObject', name: 'Point' },
        right: { kind: 'NamedObject', name: 'Circle' },
      })
    })

    it('should convert chained pipes left-associatively', () => {
      const testCase = 'create X as A | B | C;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'CoproductObject',
        left: {
          kind: 'CoproductObject',
          left: { kind: 'NamedObject', name: 'A' },
          right: { kind: 'NamedObject', name: 'B' },
        },
        right: { kind: 'NamedObject', name: 'C' },
      })
    })

    it('should bind arrow tighter than pipe', () => {
      const testCase = 'create X as A -> B | C;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'CoproductObject',
        left: {
          kind: 'ExponentialObject',
          base: { kind: 'NamedObject', name: 'B' },
          exponent: { kind: 'NamedObject', name: 'A' },
        },
        right: { kind: 'NamedObject', name: 'C' },
      })
    })

    it('should bind pipe tighter than set operations', () => {
      const testCase = 'create X as A UNION B | C;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'SetUnionObject',
        left: { kind: 'NamedObject', name: 'A' },
        right: {
          kind: 'CoproductObject',
          left: { kind: 'NamedObject', name: 'B' },
          right: { kind: 'NamedObject', name: 'C' },
        },
      })
    })

    it('should bind arrow tighter than set operations', () => {
      const testCase = 'create X as A -> B UNION C;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'SetUnionObject',
        left: {
          kind: 'ExponentialObject',
          base: { kind: 'NamedObject', name: 'B' },
          exponent: { kind: 'NamedObject', name: 'A' },
        },
        right: { kind: 'NamedObject', name: 'C' },
      })
    })

    it('should convert pipes in product fields to AST', () => {
      const testCase = 'create X as (a: A | B, b: C);'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'ProductObject',
        fields: {
          a: {
            kind: 'CoproductObject',
            left: { kind: 'NamedObject', name: 'A' },
            right: { kind: 'NamedObject', name: 'B' },
          },
          b: { kind: 'NamedObject', name: 'C' },
        },
      })
    })

    it('should convert pipes with literals to AST', () => {
      const testCase = 'create X as string | "number";'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'CoproductObject',
        left: { kind: 'NamedObject', name: 'string' },
        right: { kind: 'StringLiteralObject', value: 'number' },
      })
    })
  })

  describe('parenthesized object', () => {
    it('should strip grouping parentheses from the AST', () => {
      const testCase = 'create X as (A | B);'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'CoproductObject',
        left: { kind: 'NamedObject', name: 'A' },
        right: { kind: 'NamedObject', name: 'B' },
      })
    })

    it('should override arrow precedence with parentheses', () => {
      const testCase = 'create X as A -> (B | C);'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'ExponentialObject',
        base: {
          kind: 'CoproductObject',
          left: { kind: 'NamedObject', name: 'B' },
          right: { kind: 'NamedObject', name: 'C' },
        },
        exponent: { kind: 'NamedObject', name: 'A' },
      })
    })

    it('should group set operations with parentheses', () => {
      const testCase = 'create X as (A UNION B) EXCEPT C;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'SetDifferenceObject',
        left: {
          kind: 'SetUnionObject',
          left: { kind: 'NamedObject', name: 'A' },
          right: { kind: 'NamedObject', name: 'B' },
        },
        right: { kind: 'NamedObject', name: 'C' },
      })
    })

    it('should apply array brackets to the whole group', () => {
      const testCase = 'create X as (A | B)[];'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'ArrayObject',
        base: {
          kind: 'CoproductObject',
          left: { kind: 'NamedObject', name: 'A' },
          right: { kind: 'NamedObject', name: 'B' },
        },
      })
    })

    it('should convert the empty product to the unit object', () => {
      const testCase = 'create X as ();'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({ kind: 'NamedObject', name: 'unit' })
      const unitDecl = parseToAst('create X as unit;').declarations[0] as ObjectDeclaration
      expect(stripLocations(unitDecl)).toEqual(stripLocations(decl))
    })
  })

  describe('unit elision', () => {
    it('should drop unit fields from a product', () => {
      const testCase = 'create X as (id: string, foo: unit);'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'ProductObject',
        fields: {
          id: { kind: 'NamedObject', name: 'string' },
        },
      })
    })

    it('should collapse a product of only unit fields to the unit object', () => {
      const testCase = 'create X as (foo: unit, bar: unit);'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({ kind: 'NamedObject', name: 'unit' })
    })

    it('should drop fields whose value is an empty product', () => {
      const testCase = 'create X as (id: string, foo: ());'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'ProductObject',
        fields: {
          id: { kind: 'NamedObject', name: 'string' },
        },
      })
    })

    it('should keep fields that are not the unit object', () => {
      const testCase = 'create X as (id: string, nothing: (a: unit, b: bool));'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'ProductObject',
        fields: {
          id: { kind: 'NamedObject', name: 'string' },
          nothing: {
            kind: 'ProductObject',
            fields: {
              b: { kind: 'NamedObject', name: 'bool' },
            },
          },
        },
      })
    })
  })

  describe('pattern object', () => {
    it('should convert a pattern object to AST', () => {
      const testCase = 'create X as /\\d+/i;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'PatternLiteralObject',
        source: '\\d+',
        flags: 'i',
      })
    })

    it('should keep the pattern source verbatim', () => {
      const testCase = 'create X as /\\/\\*[\\s\\S]*?\\*\\//;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'PatternLiteralObject',
        source: '\\/\\*[\\s\\S]*?\\*\\/',
        flags: '',
      })
    })

    it('should record empty flags', () => {
      const testCase = 'create X as /[a-zA-Z_][a-zA-Z0-9_]*/;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'PatternLiteralObject',
        source: '[a-zA-Z_][a-zA-Z0-9_]*',
        flags: '',
      })
    })

    it('should convert patterns in product fields to AST', () => {
      const testCase = 'create X as (name: string, pattern: /[a-z]+/i);'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'ProductObject',
        fields: {
          name: { kind: 'NamedObject', name: 'string' },
          pattern: { kind: 'PatternLiteralObject', source: '[a-z]+', flags: 'i' },
        },
      })
    })
  })

  describe('parseConstraint', () => {
    it('should parse plain text constraint with no references', () => {
      const result = parseConstraint('value is positive')
      expect(result).toEqual<Constraint>({
        raw: 'value is positive',
        parts: [{ kind: 'ConstraintText', text: 'value is positive' }],
      })
    })

    it('should parse constraint with single reference', () => {
      const result = parseConstraint('@n is positive')
      expect(result).toEqual<Constraint>({
        raw: '@n is positive',
        parts: [
          { kind: 'ReferenceDirective', name: 'n' },
          { kind: 'ConstraintText', text: ' is positive' },
        ],
      })
    })

    it('should parse constraint with reference in the middle', () => {
      const result = parseConstraint('use @path for storage')
      expect(result).toEqual<Constraint>({
        raw: 'use @path for storage',
        parts: [
          { kind: 'ConstraintText', text: 'use ' },
          { kind: 'ReferenceDirective', name: 'path' },
          { kind: 'ConstraintText', text: ' for storage' },
        ],
      })
    })

    it('should parse constraint with dotted references', () => {
      const result = parseConstraint('return @z.real^2 + @z.imag^2')
      expect(result).toEqual<Constraint>({
        raw: 'return @z.real^2 + @z.imag^2',
        parts: [
          { kind: 'ConstraintText', text: 'return ' },
          { kind: 'ReferenceDirective', name: 'z.real' },
          { kind: 'ConstraintText', text: '^2 + ' },
          { kind: 'ReferenceDirective', name: 'z.imag' },
          { kind: 'ConstraintText', text: '^2' },
        ],
      })
    })

    it('should parse constraint with multiple references', () => {
      const result = parseConstraint('call @LoadTodos using @path')
      expect(result).toEqual<Constraint>({
        raw: 'call @LoadTodos using @path',
        parts: [
          { kind: 'ConstraintText', text: 'call ' },
          { kind: 'ReferenceDirective', name: 'LoadTodos' },
          { kind: 'ConstraintText', text: ' using ' },
          { kind: 'ReferenceDirective', name: 'path' },
        ],
      })
    })

    it('should parse constraint with reference at start', () => {
      const result = parseConstraint('@validate the input')
      expect(result).toEqual<Constraint>({
        raw: '@validate the input',
        parts: [
          { kind: 'ReferenceDirective', name: 'validate' },
          { kind: 'ConstraintText', text: ' the input' },
        ],
      })
    })

    it('should parse constraint with no @ symbols', () => {
      const result = parseConstraint('the user is authenticated')
      expect(result).toEqual<Constraint>({
        raw: 'the user is authenticated',
        parts: [{ kind: 'ConstraintText', text: 'the user is authenticated' }],
      })
    })

    it('should parse constraint with underscore in reference', () => {
      const result = parseConstraint('@todo_item is valid')
      expect(result).toEqual<Constraint>({
        raw: '@todo_item is valid',
        parts: [
          { kind: 'ReferenceDirective', name: 'todo_item' },
          { kind: 'ConstraintText', text: ' is valid' },
        ],
      })
    })

    it('should parse empty constraint', () => {
      const result = parseConstraint('')
      expect(result).toEqual<Constraint>({
        raw: '',
        parts: [],
      })
    })

    it('should preserve raw text exactly', () => {
      const result = parseConstraint('  @foo  ')
      expect(result.raw).toBe('  @foo  ')
    })
  })

  describe('comments inside select constraints', () => {
    it('should keep comment markers in the constraint raw text', () => {
      const testCase = 'create Foo as from string select { are valid -- like emails };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'SubObject',
        base: { kind: 'NamedObject', name: 'string' },
        constraint: {
          type: 'NaturalLanguage',
          raw: 'are valid -- like emails',
          parts: [{ kind: 'ConstraintText', text: 'are valid -- like emails' }],
        },
      })
    })

    it('should extract references alongside comment markers', () => {
      const testCase = 'create Foo as from string select { match /* strict */ @pattern };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'SubObject',
        base: { kind: 'NamedObject', name: 'string' },
        constraint: {
          type: 'NaturalLanguage',
          raw: 'match /* strict */ @pattern',
          parts: [
            { kind: 'ConstraintText', text: 'match /* strict */ ' },
            { kind: 'ReferenceDirective', name: 'pattern' },
          ],
        },
      })
    })
  })

  describe('escaped braces in select constraints', () => {
    it('should unescape an escaped close brace', () => {
      const testCase = 'create Foo as from string select { end with \\} };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'SubObject',
        base: { kind: 'NamedObject', name: 'string' },
        constraint: {
          type: 'NaturalLanguage',
          raw: 'end with }',
          parts: [{ kind: 'ConstraintText', text: 'end with }' }],
        },
      })
    })

    it('should unescape escaped open and close braces', () => {
      const testCase = 'create Foo as from string select { match \\{a\\} };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'SubObject',
        base: { kind: 'NamedObject', name: 'string' },
        constraint: {
          type: 'NaturalLanguage',
          raw: 'match {a}',
          parts: [{ kind: 'ConstraintText', text: 'match {a}' }],
        },
      })
    })

    it('should unescape escaped backslashes', () => {
      const testCase = 'create Foo as from string select { paths use \\\\ };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'SubObject',
        base: { kind: 'NamedObject', name: 'string' },
        constraint: {
          type: 'NaturalLanguage',
          raw: 'paths use \\',
          parts: [{ kind: 'ConstraintText', text: 'paths use \\' }],
        },
      })
    })

    it('should extract references next to escaped braces', () => {
      const testCase = 'create Foo as from string select { call @foo with \\} };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'SubObject',
        base: { kind: 'NamedObject', name: 'string' },
        constraint: {
          type: 'NaturalLanguage',
          raw: 'call @foo with }',
          parts: [
            { kind: 'ConstraintText', text: 'call ' },
            { kind: 'ReferenceDirective', name: 'foo' },
            { kind: 'ConstraintText', text: ' with }' },
          ],
        },
      })
    })
  })

  describe('realize declaration', () => {
    it('should convert a realize declaration to AST', () => {
      const testCase = 'realize Shape as Circle in environment;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as RealizeDeclaration
      expect(decl).toMatchObject({
        kind: 'RealizeDeclaration',
        object: { kind: 'NamedObject', name: 'Shape' },
        target: { kind: 'NamedObject', name: 'Circle' },
        environment: { kind: 'NamedObject', name: 'environment' },
      })
    })

    it('should convert a realize declaration with complex objects to AST', () => {
      const testCase = 'realize string -> number as { y: string } in MyEnv;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as RealizeDeclaration
      expect(decl).toMatchObject({
        kind: 'RealizeDeclaration',
        object: {
          kind: 'ExponentialObject',
          exponent: { kind: 'NamedObject', name: 'string' },
          base: { kind: 'NamedObject', name: 'number' },
        },
        target: {
          kind: 'Decomposition',
          parts: [{ name: 'y', object: { kind: 'NamedObject', name: 'string' } }],
        },
        environment: { kind: 'NamedObject', name: 'MyEnv' },
      })
    })

    it('should convert a realize declaration with a nested decomposition to AST', () => {
      const testCase =
        'realize TodoWeb as { storage: { open: OpenSqlite, query: SelectTodos }, main: Main } in MyEnv;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as RealizeDeclaration
      expect(decl).toMatchObject({
        target: {
          kind: 'Decomposition',
          parts: [
            {
              name: 'storage',
              object: {
                kind: 'Decomposition',
                parts: [
                  { name: 'open', object: { kind: 'NamedObject', name: 'OpenSqlite' } },
                  { name: 'query', object: { kind: 'NamedObject', name: 'SelectTodos' } },
                ],
              },
            },
            { name: 'main', object: { kind: 'NamedObject', name: 'Main' } },
          ],
        },
      })
    })

    it('should keep a product part value inside a decomposition', () => {
      const testCase = 'realize Point as { at: (x: number, y: number) };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as RealizeDeclaration
      expect(decl).toMatchObject({
        target: {
          kind: 'Decomposition',
          parts: [
            {
              name: 'at',
              object: {
                kind: 'ProductObject',
                fields: {
                  x: { kind: 'NamedObject', name: 'number' },
                  y: { kind: 'NamedObject', name: 'number' },
                },
              },
            },
          ],
        },
      })
    })

    it('should convert an empty decomposition to AST', () => {
      const testCase = 'realize Concept as {};'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as RealizeDeclaration
      expect(decl).toMatchObject({ target: { kind: 'Decomposition', parts: [] } })
    })

    it('should locate a decomposition in the source', () => {
      const testCase = 'realize Concept as { db: SqlSchema } in MyEnv;'
      const ast = parseToAst(testCase)
      const target = (ast.declarations[0] as RealizeDeclaration).target as Decomposition
      const source = testCase
      expect(source.slice(target.location.start.offset, target.location.end.offset)).toBe(
        '{ db: SqlSchema }'
      )
      expect(target.parts[0]?.location.start.line).toBe(1)
    })

    it('should reject a product as a realization target', () => {
      const testCase = 'realize Concept as (a: A, b: B) in MyEnv;'
      expect(() => parseToAst(testCase)).toThrow(SpexError)
      expect(() => parseToAst(testCase)).toThrow(/ambiguous realization target/)
    })

    it('should reject a product as a realization target behind parentheses', () => {
      const testCase = 'realize Concept as ((a: A));'
      expect(() => parseToAst(testCase)).toThrow(/ambiguous realization target/)
    })

    it('should report the location of a rejected realization target', () => {
      const testCase = 'create X as string;\nrealize Concept as (a: A);'
      let error: unknown
      try {
        parseToAst(testCase)
      } catch (e) {
        error = e
      }
      expect(error).toBeInstanceOf(SpexError)
      expect((error as SpexError).location?.start.line).toBe(2)
      expect((error as SpexError).phase).toBe('Parsing')
    })

    it('should accept a product as the realized object', () => {
      const testCase = 'realize (x: number, y: number) as PointImpl;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as RealizeDeclaration
      expect(decl).toMatchObject({
        object: { kind: 'ProductObject', fields: { x: {}, y: {} } },
        target: { kind: 'NamedObject', name: 'PointImpl' },
      })
    })

    it('should fall back to the base environment when omitted', () => {
      const testCase = 'realize A as B;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as RealizeDeclaration
      expect(decl).toMatchObject({
        kind: 'RealizeDeclaration',
        object: { kind: 'NamedObject', name: 'A' },
        target: { kind: 'NamedObject', name: 'B' },
        environment: { kind: 'NamedObject', name: 'environment' },
      })
    })

    it('should convert mixed declarations with realize to AST', () => {
      const testCase = 'create A as string;\nrealize A as B in MyEnv;'
      const ast = parseToAst(testCase)
      expect(ast.declarations).toHaveLength(2)
      const realizeDecl = ast.declarations[1] as RealizeDeclaration
      expect(realizeDecl).toMatchObject({
        kind: 'RealizeDeclaration',
        object: { kind: 'NamedObject', name: 'A' },
        target: { kind: 'NamedObject', name: 'B' },
        environment: { kind: 'NamedObject', name: 'MyEnv' },
      })
    })
  })

  describe('include declaration', () => {
    it('should convert include declaration to AST', () => {
      const testCase = 'include "config.json" as config;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as IncludeDeclaration
      expect(decl).toMatchObject({
        kind: 'IncludeDeclaration',
        name: 'config',
        address: 'config.json',
      })
    })

    it('should convert include declaration case-insensitively to AST', () => {
      const testCase = 'INCLUDE "config.json" AS config;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as IncludeDeclaration
      expect(decl).toMatchObject({
        kind: 'IncludeDeclaration',
        name: 'config',
        address: 'config.json',
      })
    })

    it('should convert include with single-quoted address to AST', () => {
      const testCase = "include 'data/file.txt' as myfile;"
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as IncludeDeclaration
      expect(decl).toMatchObject({
        kind: 'IncludeDeclaration',
        name: 'myfile',
        address: 'data/file.txt',
      })
    })

    it('should convert include with folder address to AST', () => {
      const testCase = 'include "images/" as assets;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as IncludeDeclaration
      expect(decl).toMatchObject({
        kind: 'IncludeDeclaration',
        name: 'assets',
        address: 'images/',
      })
    })

    it('should convert mixed declarations with include to AST', () => {
      const testCase = 'include "config.json" as config;\ncreate Todo as (id: string);'
      const ast = parseToAst(testCase)
      expect(ast.declarations).toHaveLength(2)
      const includeDecl = ast.declarations[0] as IncludeDeclaration
      expect(includeDecl).toMatchObject({
        kind: 'IncludeDeclaration',
        name: 'config',
        address: 'config.json',
      })
      const createDecl = ast.declarations[1] as ObjectDeclaration
      expect(createDecl.kind).toBe('ObjectDeclaration')
    })
  })

  describe('subobject with structured and code constraints', () => {
    it('should convert subobject with a structured constraint to AST', () => {
      const testCase = 'create double as from number -> number select ```\nreturn n * 2\n```;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'SubObject',
        base: {
          kind: 'ExponentialObject',
          exponent: { kind: 'NamedObject', name: 'number' },
          base: { kind: 'NamedObject', name: 'number' },
        },
        constraint: {
          type: 'Structured',
          raw: 'return n * 2',
          parts: [{ kind: 'ConstraintText', text: 'return n * 2' }],
        },
      })
    })

    it('should convert subobject with a code constraint to AST', () => {
      const testCase =
        'create double as from number -> number select ```python\nreturn @n * 2\n```;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'SubObject',
        base: {
          kind: 'ExponentialObject',
          exponent: { kind: 'NamedObject', name: 'number' },
          base: { kind: 'NamedObject', name: 'number' },
        },
        constraint: {
          type: 'Code',
          language: 'python',
          body: 'return @n * 2',
          parts: [
            { kind: 'ConstraintText', text: 'return ' },
            { kind: 'ReferenceDirective', name: 'n' },
            { kind: 'ConstraintText', text: ' * 2' },
          ],
        },
      })
    })

    it('should convert a code constraint in a product field to AST', () => {
      const testCase =
        'create Config as (handler: from (x: string) -> string select ```typescript\nreturn x.toUpperCase();\n```, port: number);'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl.object).toMatchObject({
        kind: 'ProductObject',
        fields: {
          handler: {
            kind: 'SubObject',
            base: {
              kind: 'ExponentialObject',
              exponent: {
                kind: 'ProductObject',
                fields: {
                  x: { kind: 'NamedObject', name: 'string' },
                },
              },
              base: { kind: 'NamedObject', name: 'string' },
            },
            constraint: {
              type: 'Code',
              language: 'typescript',
              body: 'return x.toUpperCase();',
              parts: [{ kind: 'ConstraintText', text: 'return x.toUpperCase();' }],
            },
          },
          port: { kind: 'NamedObject', name: 'number' },
        },
      })
    })
  })
})
