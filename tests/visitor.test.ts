import { describe, it, expect } from 'vitest'
import { parseToAst } from '../src/visitor.js'
import type {
  ObjectDeclaration,
  ImportDeclaration,
  ExportDeclaration,
  GenerateDeclaration,
} from '../src/ast.js'

describe('SpexParserVisitor', () => {
  describe('object declaration', () => {
    it('should convert named object declaration to AST', () => {
      const testCase = 'create MyObject as Number;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toEqual({
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
      expect(decl).toEqual({
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
      expect(decl).toEqual({
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
      expect(decl).toEqual({
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
      expect(decl).toEqual({
        kind: 'ObjectDeclaration',
        name: 'MyProduct',
        object: {
          kind: 'ProductObject',
          fields: {
            p: {
              kind: 'SubObject',
              base: { kind: 'NamedObject', name: 'Number' },
              constraint: 'value is positive',
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
      expect(decl).toEqual({
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
      expect(decl).toEqual({
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
      expect(decl).toEqual({
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
      expect(decl).toEqual({
        kind: 'ObjectDeclaration',
        name: 'MyExponential',
        object: {
          kind: 'ExponentialObject',
          exponent: {
            kind: 'SubObject',
            base: { kind: 'NamedObject', name: 'Number' },
            constraint: 'value is positive',
          },
          base: {
            kind: 'SubObject',
            base: { kind: 'NamedObject', name: 'Number' },
            constraint: 'value is positive',
          },
        },
      })
    })

    it('should convert subobject declaration with named objects to AST', () => {
      const testCase = 'create PositiveNumber as from Number select { isPositive };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toEqual({
        kind: 'ObjectDeclaration',
        name: 'PositiveNumber',
        object: {
          kind: 'SubObject',
          base: { kind: 'NamedObject', name: 'Number' },
          constraint: 'isPositive',
        },
      })
    })

    it('should convert subobject declaration with text constraint to AST', () => {
      const testCase = 'create PositiveNumber as from Number select { the number is positive };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toEqual({
        kind: 'ObjectDeclaration',
        name: 'PositiveNumber',
        object: {
          kind: 'SubObject',
          base: { kind: 'NamedObject', name: 'Number' },
          constraint: 'the number is positive',
        },
      })
    })

    it('should convert subobject declaration with product objects to AST', () => {
      const testCase =
        'create MySubobject as from (n: Number, s: String) select { @n is positive };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toEqual({
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
          constraint: '@n is positive',
        },
      })
    })

    it('should convert subobject declaration with exponential objects to AST', () => {
      const testCase =
        'create MySubobject as from (n: Number, s: String) -> Bool select { logs the given input };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toEqual({
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
          constraint: 'logs the given input',
        },
      })
    })

    it('should convert subobject declaration with subobjects to AST', () => {
      const testCase =
        'create MySubobject as from from Number select { value is positive } select { value is odd };'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toEqual({
        kind: 'ObjectDeclaration',
        name: 'MySubobject',
        object: {
          kind: 'SubObject',
          base: {
            kind: 'SubObject',
            base: { kind: 'NamedObject', name: 'Number' },
            constraint: 'value is positive',
          },
          constraint: 'value is odd',
        },
      })
    })

    it('should convert array type declaration to AST', () => {
      const testCase = 'create MyArray as string[];'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ObjectDeclaration
      expect(decl).toEqual({
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
      expect(decl).toEqual({
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
      expect(decl).toEqual({
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
      expect(decl).toEqual({
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
      expect(decl).toEqual({
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
      expect(decl).toEqual({
        kind: 'ImportDeclaration',
        name: null,
        source: 'types.spex',
        alias: 'types',
      })
    })
  })

  describe('export declaration', () => {
    it('should convert export declaration to AST', () => {
      const testCase = 'export EmailAddress;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as ExportDeclaration
      expect(decl).toEqual({
        kind: 'ExportDeclaration',
        name: 'EmailAddress',
      })
    })
  })

  describe('generate declaration', () => {
    it('should convert generate declaration to AST', () => {
      const testCase = 'generate Main;'
      const ast = parseToAst(testCase)
      const decl = ast.declarations[0] as GenerateDeclaration
      expect(decl).toEqual({
        kind: 'GenerateDeclaration',
        name: 'Main',
      })
    })
  })
})
