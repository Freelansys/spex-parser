import { describe, it, expect } from 'vitest'
import { parseToAst } from '../src/visitor.js'
import { constantOf } from '../src/constants.js'
import type { ObjectDeclaration } from '../src/ast.js'

function firstObject(text: string) {
  const ast = parseToAst(text)
  return (ast.declarations[0] as ObjectDeclaration).object
}

describe('constantOf', () => {
  it('should identify string literals as constants', () => {
    expect(constantOf(firstObject('create K as "SpexFile";'))).toEqual({
      kind: 'StringConstant',
      value: 'SpexFile',
    })
  })

  it('should identify number literals as constants', () => {
    expect(constantOf(firstObject('create K as 42;'))).toEqual({
      kind: 'NumberConstant',
      value: '42',
    })
  })

  it('should identify bool literals as constants', () => {
    expect(constantOf(firstObject('create K as true;'))).toEqual({
      kind: 'BoolConstant',
      value: true,
    })
    expect(constantOf(firstObject('create K as false;'))).toEqual({
      kind: 'BoolConstant',
      value: false,
    })
  })

  it('should identify products of constants as constants', () => {
    expect(constantOf(firstObject('create K as (name: "John", age: 42);'))).toEqual({
      kind: 'ProductConstant',
      fields: {
        name: { kind: 'StringConstant', value: 'John' },
        age: { kind: 'NumberConstant', value: '42' },
      },
    })
  })

  it('should reject products with non-constant fields', () => {
    expect(constantOf(firstObject('create K as (name: "John", age: number);'))).toBeNull()
  })

  it('should identify exponentials of constants as constants', () => {
    expect(constantOf(firstObject('create K as "a" -> "b";'))).toEqual({
      kind: 'ExponentialConstant',
      base: { kind: 'StringConstant', value: 'b' },
      exponent: { kind: 'StringConstant', value: 'a' },
    })
  })

  it('should reject exponentials with non-constant sides', () => {
    expect(constantOf(firstObject('create K as number -> "b";'))).toBeNull()
  })

  it('should reject nested non-constants', () => {
    expect(
      constantOf(firstObject('create K as (a: (b: "x", c: string));'))
    ).toBeNull()
  })

  it('should reject named types', () => {
    expect(constantOf(firstObject('create K as string;'))).toBeNull()
  })

  it('should reject subobjects', () => {
    expect(constantOf(firstObject('create K as from string select { are positive };'))).toBeNull()
  })

  it('should reject arrays', () => {
    expect(constantOf(firstObject('create K as string[];'))).toBeNull()
  })

  it('should reject set objects', () => {
    expect(constantOf(firstObject('create K as "a" UNION "b";'))).toBeNull()
    expect(constantOf(firstObject('create K as string EXCEPT "root";'))).toBeNull()
  })

  it('should treat the empty product the same as unit', () => {
    expect(constantOf(firstObject('create K as ();'))).toBeNull()
    expect(constantOf(firstObject('create K as unit;'))).toBeNull()
  })

  it('should reject patterns', () => {
    expect(constantOf(firstObject('create K as /\\d+/;'))).toBeNull()
  })

  it('should reject coproducts', () => {
    expect(constantOf(firstObject('create K as "a" | "b";'))).toBeNull()
  })
})
