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

    it('should parse subobject declaration with a structured constraint', () => {
      const testCase = 'create double as from number -> number select ```\nreturn n * 2\n```;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse subobject declaration with a code constraint', () => {
      const testCase =
        'create double as from number -> number select ```python\nreturn @n * 2\n```;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse subobject declaration with a set operation base', () => {
      const testCase =
        'create MySubobject as from Web intersect TypeScript select { is an express app };'
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

    it('should parse basic object concept', () => {
      const testCase = 'create MyObject as concept;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse basic object environment', () => {
      const testCase = 'create MyObject as environment;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse basic object artifact', () => {
      const testCase = 'create MyObject as artifact;'
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

    it('should not allow overriding basic object concept', () => {
      const testCase = 'create concept as Number;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).not.toHaveLength(0)
    })

    it('should not allow overriding basic object environment', () => {
      const testCase = 'create environment as Number;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).not.toHaveLength(0)
    })

    it('should not allow overriding basic object artifact', () => {
      const testCase = 'create artifact as Number;'
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

  describe('generate declaration', () => {
    it('should parse generate declaration', () => {
      const testCase = 'generate Main;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse generate declaration with an environment', () => {
      const testCase = 'generate Main in Python;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse generate declaration with a dotted environment', () => {
      const testCase = 'generate Main in dev.Linux;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse generate declaration with an environment subobject', () => {
      const testCase = 'generate Main in from environment select { python };'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })
  })

  describe('literal object', () => {
    it('should parse string literal object', () => {
      const testCase = 'create Foo as "SpexFile";'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse number literal object', () => {
      const testCase = 'create Foo as 42;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse bool literal object', () => {
      const testCase = 'create Foo as true;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse product of literal objects', () => {
      const testCase = 'create Foo as (name: "John", age: 42);'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse exponential of literal objects', () => {
      const testCase = 'create Foo as "a" -> "b";'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should not parse literal with member suffix', () => {
      const testCase = 'create Foo as "a".b;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).not.toHaveLength(0)
    })
  })

  describe('set object', () => {
    it('should parse union object', () => {
      const testCase = 'create X as A UNION B;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse intersect object', () => {
      const testCase = 'create X as A INTERSECT B;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse except object', () => {
      const testCase = 'create X as A EXCEPT B;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse chained set operations', () => {
      const testCase = 'create X as A UNION B INTERSECT C;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse set operations on subobjects', () => {
      const testCase =
        'create X as from int select { are even } UNION from int select { are positive };'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse set operations with literals', () => {
      const testCase = 'create X as string EXCEPT "root";'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse set operations in product fields', () => {
      const testCase = 'create X as (a: A UNION B);'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse case-insensitively', () => {
      const testCase = 'CREATE X AS A union B;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should bind arrow tighter than set operations', () => {
      const testCase = 'create X as A -> B UNION C;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })
  })

  describe('coproduct object', () => {
    it('should parse a pipe object', () => {
      const testCase = 'create Shape as Point | Circle;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse chained pipes left-associatively', () => {
      const testCase = 'create X as A | B | C;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should bind arrow tighter than pipe', () => {
      const testCase = 'create X as A -> B | C;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should bind pipe tighter than set operations', () => {
      const testCase = 'create X as A UNION B | C;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse pipes in product fields', () => {
      const testCase = 'create X as (a: A | B, b: C);'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse pipes on subobjects', () => {
      const testCase = 'create X as from int select { are even } | from int select { are odd };'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse pipes with literals', () => {
      const testCase = 'create X as string | "number";'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })
  })

  describe('parenthesized object', () => {
    it('should parse a parenthesized coproduct', () => {
      const testCase = 'create X as (A | B);'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should override precedence with parentheses', () => {
      const testCase = 'create X as A -> (B | C);'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should group set operations with parentheses', () => {
      const testCase = 'create X as (A UNION B) EXCEPT C;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse nested parentheses', () => {
      const testCase = 'create X as ((A | B));'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse arrays of parenthesized objects', () => {
      const testCase = 'create X as (A | B)[];'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should still parse products inside parentheses', () => {
      const testCase = 'create X as (a: (B | C));'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })
  })

  describe('pattern object', () => {
    it('should parse a pattern object', () => {
      const testCase = 'create X as /\\d+/;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse a pattern object with flags', () => {
      const testCase = 'create X as /create\\b/i;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse patterns in product fields', () => {
      const testCase = 'create X as (name: string, pattern: /[a-z]+/i);'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse patterns in set operations', () => {
      const testCase = 'create X as /\\d+/ UNION /\\w+/;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })
  })

  describe('comments', () => {
    it('should parse declarations separated by single-line comments', () => {
      const testCase = `
        -- domain model
        create Todo as (id: string, title: string);
        -- create a new todo
        create CreateTodo as (title: string) -> Todo;
      `
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse declarations separated by block comments', () => {
      const testCase = `
        /* storage layer */
        create LoadTodos as (path: string) -> Todo[];
        /* entry point */
        create Main as string[] -> unit;
      `
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse inline block comments within a product declaration', () => {
      const testCase = 'create Config as (name: string /* the name */, count: number);'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse a file containing only comments', () => {
      const testCase = `
        -- this file is intentionally empty
        /* apart from these comments */
      `
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse a block comment spanning a single-line comment', () => {
      const testCase = `
        create Foo as string;
        /* comment one
        -- not a real comment, still part of the block
        comment two */
        generate Main;
      `
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })
  })

  describe('multiple declarations', () => {
    it('should parse multiple declarations', () => {
      const testCase = `
        create Todo as (id: string, title: string, completed: bool);
        create EmailAddress as from string select { are email addresses };
        generate Main;
      `
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })
  })

  describe('realize declaration', () => {
    it('should parse a realize declaration', () => {
      const testCase = 'realize Shape as Circle in environment;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse a realize declaration case-insensitively', () => {
      const testCase = 'REALIZE Shape AS Circle IN environment;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse a realize declaration with a product object', () => {
      const testCase = 'realize (x: number) as (y: string) in environment;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse a realize declaration with a decomposition', () => {
      const testCase = 'realize Concept as { db: SqlSchema, api: HttpApi } in environment;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse a realize declaration with a decomposition and trailing comma', () => {
      const testCase = 'realize Concept as { db: SqlSchema, api: HttpApi, } in environment;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse a realize declaration with an empty decomposition', () => {
      const testCase = 'realize Concept as {};'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse a realize declaration with a nested decomposition', () => {
      const testCase =
        'realize Concept as { storage: { open: OpenFile, query: SelectTodos }, main: Main } in environment;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse a realize declaration with product and subobject parts', () => {
      const testCase =
        'realize Concept as { point: (x: number, y: number), positive: from number select { are positive } };'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should not parse a realize declaration with an unterminated decomposition', () => {
      const testCase = 'realize Concept as { db: SqlSchema;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).not.toHaveLength(0)
    })

    it('should not parse a realize declaration with an unnamed decomposition part', () => {
      const testCase = 'realize Concept as { : SqlSchema };'
      const { parser } = parseInput(testCase)
      expect(parser.errors).not.toHaveLength(0)
    })

    it('should parse a realize declaration with exponential objects', () => {
      const testCase = 'realize string -> number as string -> string in environment;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse a realize declaration with a named environment', () => {
      const testCase = 'realize A as B in MyEnv;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse a realize declaration without an environment', () => {
      const testCase = 'realize A as B;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse a realize declaration mixed with other declarations', () => {
      const testCase = 'create A as string;\nrealize A as B in MyEnv;\ngenerate A;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })
  })

  describe('include declaration', () => {
    it('should parse include declaration', () => {
      const testCase = 'include "config.json" as config;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse include declaration case-insensitively', () => {
      const testCase = 'INCLUDE "config.json" AS config;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse include with single-quoted address', () => {
      const testCase = "include 'data/file.txt' as myfile;"
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse include with folder address', () => {
      const testCase = 'include "images/" as assets;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should parse include mixed with other declarations', () => {
      const testCase =
        'include "config.json" as config;\ncreate Todo as (id: string);\ngenerate Main;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).toHaveLength(0)
    })

    it('should not parse include without address', () => {
      const testCase = 'include as config;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).not.toHaveLength(0)
    })

    it('should not parse include without name', () => {
      const testCase = 'include "config.json" as ;'
      const { parser } = parseInput(testCase)
      expect(parser.errors).not.toHaveLength(0)
    })
  })
})
