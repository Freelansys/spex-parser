import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parseToAst } from '../src/visitor.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('end-to-end', () => {
  it('should parse todo.spex file', () => {
    const code = readFileSync(join(__dirname, 'props/todo.spex'), 'utf-8')
    const ast = parseToAst(code)
    expect(ast.kind).toBe('SpexFile')
    expect(ast.declarations.length).toBe(14)
  })
})
