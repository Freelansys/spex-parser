import type { Location } from './ast.js'

// The phase of the pipeline in which a SpexError was raised.
export type SpexErrorPhase = 'Lexing' | 'Parsing'

// A syntax error raised while lexing or parsing a Spex file.
// Unlike a plain Error, it carries the source position of the offending
// input as structured data in `location` (when available) and keeps the
// underlying engine error(s) in `underlying` instead of only stringifying
// them into the message.
export class SpexError extends Error {
  readonly phase: SpexErrorPhase
  readonly location: Location | null
  readonly underlying: unknown

  constructor(
    phase: SpexErrorPhase,
    message: string,
    location: Location | null = null,
    underlying: unknown = null
  ) {
    super(message)
    this.name = 'SpexError'
    this.phase = phase
    this.location = location
    this.underlying = underlying
  }
}
