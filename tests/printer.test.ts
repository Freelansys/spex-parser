import { readdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { describe, it, expect } from 'vitest'
import { parseToAst } from '../src/visitor.js'
import { printFile, printExpression } from '../src/printer.js'
import { SpexError } from '../src/errors.js'
import type { ObjectDeclaration, SubObject } from '../src/ast.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// The tree without the locations, which say where the text was, not what it says.
function shape(source: string): unknown {
  return JSON.parse(
    JSON.stringify(parseToAst(source).declarations, (key, value: unknown) =>
      key === 'location' ? undefined : value
    )
  )
}

function roundTrip(source: string): void {
  const printed = printFile(parseToAst(source).declarations)
  expect(shape(printed)).toEqual(shape(source))
  // Printing is stable: what it prints prints the same.
  expect(printFile(parseToAst(printed).declarations)).toBe(printed)
}

// The README's spex examples that are whole files; the rest are fragments.
function readmeExamples(): string[] {
  const readme = readFileSync(join(__dirname, '..', 'README.md'), 'utf-8')
  const blocks = [...readme.matchAll(/^```spex\n([\s\S]*?)^```$/gm)].map((m) => m[1]!)
  return blocks.filter((block) => {
    try {
      return parseToAst(block).declarations.length > 0
    } catch {
      return false
    }
  })
}

describe('Spex printer', () => {
  it.each(readdirSync(join(__dirname, 'props')).filter((file) => file.endsWith('.spex')))(
    'reads back %s as it was',
    (file) => {
      roundTrip(readFileSync(join(__dirname, 'props', file), 'utf-8'))
    }
  )

  it('reads back the README examples as they were', () => {
    const examples = readmeExamples()
    expect(examples.length).toBeGreaterThan(20)
    for (const example of examples) {
      roundTrip(example)
    }
  })

  it('prints nothing for an empty file', () => {
    expect(printFile([])).toBe('')
  })

  it('prints an expression on its own', () => {
    const decl = parseToAst('create X as (A union B) | C -> D[];')
      .declarations[0] as ObjectDeclaration
    expect(printExpression(decl.object)).toBe('(A union B) | C -> D[]')
  })

  it('refuses a fenced pattern whose body would close the fence', () => {
    const decl = parseToAst('create X as from number select ```python\nx = 1\n```;')
      .declarations[0] as ObjectDeclaration
    const object = decl.object as SubObject
    const broken: SubObject = {
      ...object,
      constraint: { type: 'Code', language: 'python', body: 'a\n```\nb', parts: [] },
    }
    expect(() => printExpression(broken)).toThrow(SpexError)
    expect(() => printExpression(broken)).toThrow('cannot contain ```')
  })

  it('reads back every declaration kind', () => {
    roundTrip(`
import "./a.spex" as M;
import Foo as Bar, Qux from "./b.spex";
import Baz from "./c.spex";
include "https://example.com/x" as X;
realize A as { a: B, b: { c: C, d: D } };
realize A as X in E intersect F;
realize A as X in E with X as entry;
realize A as { a: B, b: { c: C } } with b.c as entry;
realize A as (a: string);
realize A as {};
generate A in E;
generate A;
`)
  })

  it('reads back every expression kind and keeps their grouping', () => {
    roundTrip(`
create L as "a" | 1 | 2.5 | true | false | /x+\\/y/i;
create U as A union B except C intersect D;
create G as A union (B except C);
create P as (a: string, b: number[], c: (x: bool));
create Q as A -> B | C;
create R as A -> (B | C);
create S as (A -> B) -> C;
create T as A -> B -> C;
create V as (A | B)[];
create W as (A union B) | C;
create Y as string[][];
create Z as from (A -> B) union C select { x };
`)
  })

  it('reads back patterns, with what has to be escaped', () => {
    roundTrip(`
create A as from concept select {
  first line with @Ref and &param
  second line, a \\{brace\\} and a \\\\backslash
};
create F as from (path: string) -> Todo[] select \`\`\`
if &path == "" {
  return []
}
\`\`\`;
create G as from number select \`\`\`python
  return 1
\`\`\`;
create H as "quote \\" and \\\\ backslash";
`)
  })

  it('reads back subject to, named or not, and keeps it on the subobject', () => {
    roundTrip(`
create R as from (path: string) -> Todo[] select { reads @Todo entries } subject to [
  EmptyWhenMissing: { returns an empty list for a missing file },
  \`\`\`python
assert R("missing.json") == []
\`\`\`,
  { returns what @Insert wrote },
];
create E as from concept select { x } subject to [];
create U as from A select { x } subject to [{ y }] union B;
`)
  })
})
