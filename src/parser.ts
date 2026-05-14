import { CstParser } from 'chevrotain'
import {
  allTokens,
  CreateTok,
  AsTok,
  FromTok,
  SelectTok,
  GenerateTok,
  ImportTok,
  ExportTok,
  ArrowTok,
  SelectBlock,
  LCurly,
  RCurly,
  LBracket,
  RBracket,
  LParen,
  RParen,
  Colon,
  Comma,
  Semicolon,
  Dot,
  Equals,
  Identifier,
  StringLiteral,
  Instruction,
  NumberLiteral,
  BoolLiteral,
} from './lexer.js'

export class SpexParser extends CstParser {
  constructor() {
    super(allTokens)
    this.performSelfAnalysis()
  }

  public spexFile = this.RULE('spexFile', () => {
    this.MANY(() => {
      this.SUBRULE(this.declaration)
    })
  })

  private declaration = this.RULE('declaration', () => {
    this.OR([
      {
        GATE: this.BACKTRACK(this.objectDeclaration),
        ALT: () => this.SUBRULE(this.objectDeclaration),
      },
      {
        GATE: this.BACKTRACK(this.importDeclaration),
        ALT: () => this.SUBRULE(this.importDeclaration),
      },
      {
        GATE: this.BACKTRACK(this.exportDeclaration),
        ALT: () => this.SUBRULE(this.exportDeclaration),
      },
      {
        ALT: () => this.SUBRULE(this.generateDeclaration),
      },
    ])
  })

  private objectDeclaration = this.RULE('objectDeclaration', () => {
    this.CONSUME(CreateTok)
    this.CONSUME(Identifier)
    this.CONSUME(AsTok)
    this.SUBRULE(this.objectExpression)
    this.CONSUME(Semicolon)
  })

  private objectExpression = this.RULE('objectExpression', () => {
    this.SUBRULE(this.objectOperand, { LABEL: 'base' })
    this.OPTION(() => {
      this.CONSUME(ArrowTok)
      this.SUBRULE2(this.objectExpression, { LABEL: 'exponent' })
    })
  })

  private objectOperand = this.RULE('objectOperand', () => {
    this.OR([
      {
        GATE: this.BACKTRACK(this.subObject),
        ALT: () => this.SUBRULE(this.subObject),
      },
      {
        GATE: this.BACKTRACK(this.productObject),
        ALT: () => this.SUBRULE(this.productObject),
      },
      {
        ALT: () => this.SUBRULE(this.namedObject),
      },
    ])
    this.MANY(() => {
      this.CONSUME(LBracket)
      this.CONSUME(RBracket)
    })
  })

  private namedObject = this.RULE('namedObject', () => {
    this.CONSUME(Identifier)
    this.MANY(() => {
      this.CONSUME(Dot)
      this.CONSUME2(Identifier)
    })
  })

  private productObject = this.RULE('productObject', () => {
    this.CONSUME(LParen)
    this.MANY(() => {
      this.CONSUME(Identifier)
      this.CONSUME(Colon)
      this.SUBRULE(this.objectExpression)
      this.OPTION(() => this.CONSUME(Comma))
    })
    this.CONSUME(RParen)
  })

  private subObject = this.RULE('subObject', () => {
    this.CONSUME(FromTok)
    this.SUBRULE(this.objectExpression, { LABEL: 'base' })
    this.CONSUME(SelectTok)
    this.CONSUME(SelectBlock)
  })

  private importDeclaration = this.RULE('importDeclaration', () => {
    this.CONSUME(ImportTok)
    this.OR([
      {
        GATE: this.BACKTRACK(this.namedImport),
        ALT: () => this.SUBRULE(this.namedImport),
      },
      {
        ALT: () => this.SUBRULE(this.moduleImport),
      },
    ])
    this.CONSUME(Semicolon)
  })

  private namedImport = this.RULE('namedImport', () => {
    this.CONSUME(Identifier)
    this.CONSUME(FromTok)
    this.CONSUME(Instruction)
    this.OPTION(() => {
      this.CONSUME(AsTok)
      this.CONSUME2(Identifier)
    })
  })

  private moduleImport = this.RULE('moduleImport', () => {
    this.CONSUME(Instruction)
    this.CONSUME(AsTok)
    this.CONSUME(Identifier)
  })

  private exportDeclaration = this.RULE('exportDeclaration', () => {
    this.CONSUME(ExportTok)
    this.CONSUME(Identifier)
    this.CONSUME(Semicolon)
  })

  private generateDeclaration = this.RULE('generateDeclaration', () => {
    this.CONSUME(GenerateTok)
    this.CONSUME(Identifier)
    this.CONSUME(Semicolon)
  })
}
