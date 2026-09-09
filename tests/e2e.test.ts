import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parseToAst } from '../src/visitor.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const fixtures: [string, number][] = [
  ['todo.spex', 17],
  ['python_cli_env.spex', 3],
  ['typescript_cli_env.spex', 3],
  ['flask_web_env.spex', 3],
  ['express_web_env.spex', 3],
  ['python_todo_cli.spex', 15],
  ['typescript_todo_cli.spex', 15],
  ['flask_todo_web.spex', 21],
  ['express_todo_web.spex', 21],
]

describe('end-to-end', () => {
  it.each(fixtures)('should parse %s', (file, expectedDeclarations) => {
    const code = readFileSync(join(__dirname, 'props', file), 'utf-8')
    const ast = parseToAst(code)
    expect(ast.kind).toBe('SpexFile')
    expect(ast.declarations.length).toBe(expectedDeclarations)
  })
})
