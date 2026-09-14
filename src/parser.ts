import { CstParser } from 'chevrotain'
import {
  allTokens,
  CreateTok,
  AsTok,
  FromTok,
  SelectTok,
  GenerateTok,
  ImportTok,
  UnionTok,
  IntersectTok,
  ExceptTok,
  RealizeTok,
  InTok,
  IncludeTok,
  ArrowTok,
  PipeTok,
  SelectBlock,
  CodeBlock,
  LBracket,
  RBracket,
  LParen,
  RParen,
  Colon,
  Comma,
  Semicolon,
  Dot,
  Identifier,
  StringLiteral,
  NumberLiteral,
  TrueTok,
  FalseTok,
  PatternLiteral,
  StringTok,
  NumberTok,
  BoolTok,
  UnitTok,
  ArtifactTok,
  ConceptTok,
  EnvironmentTok,
} from './lexer.js'

export class SpexParser extends CstParser {
  constructor() {
    super(allTokens, { nodeLocationTracking: 'full' })
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
        GATE: this.BACKTRACK(this.realizeDeclaration),
        ALT: () => this.SUBRULE(this.realizeDeclaration),
      },
      {
        GATE: this.BACKTRACK(this.objectDeclaration),
        ALT: () => this.SUBRULE(this.objectDeclaration),
      },
      {
        GATE: this.BACKTRACK(this.importDeclaration),
        ALT: () => this.SUBRULE(this.importDeclaration),
      },
      {
        GATE: this.BACKTRACK(this.includeDeclaration),
        ALT: () => this.SUBRULE(this.includeDeclaration),
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
    this.SUBRULE(this.setObject)
    this.CONSUME(Semicolon)
  })

  private setObject = this.RULE('setObject', () => {
    this.SUBRULE(this.coproductObject)
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(UnionTok, { LABEL: 'op' }) },
        { ALT: () => this.CONSUME(IntersectTok, { LABEL: 'op' }) },
        { ALT: () => this.CONSUME(ExceptTok, { LABEL: 'op' }) },
      ])
      this.SUBRULE2(this.coproductObject)
    })
  })

  private coproductObject = this.RULE('coproductObject', () => {
    this.SUBRULE(this.objectExpression)
    this.MANY(() => {
      this.CONSUME(PipeTok, { LABEL: 'op' })
      this.SUBRULE2(this.objectExpression)
    })
  })

  private literalObject = this.RULE('literalObject', () => {
    this.OR([
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(NumberLiteral) },
      { ALT: () => this.CONSUME(TrueTok) },
      { ALT: () => this.CONSUME(FalseTok) },
    ])
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
        ALT: () => this.SUBRULE(this.literalObject),
      },
      {
        ALT: () => this.SUBRULE(this.patternObject),
      },
      {
        GATE: this.BACKTRACK(this.subObject),
        ALT: () => this.SUBRULE(this.subObject),
      },
      {
        GATE: this.BACKTRACK(this.parenthesizedObject),
        ALT: () => this.SUBRULE(this.parenthesizedObject),
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

  private parenthesizedObject = this.RULE('parenthesizedObject', () => {
    this.CONSUME(LParen)
    this.SUBRULE(this.setObject)
    this.CONSUME(RParen)
  })

  private patternObject = this.RULE('patternObject', () => {
    this.CONSUME(PatternLiteral)
  })

  private namedObject = this.RULE('namedObject', () => {
    this.OR([
      { ALT: () => this.CONSUME(Identifier) },
      { ALT: () => this.CONSUME(StringTok) },
      { ALT: () => this.CONSUME(NumberTok) },
      { ALT: () => this.CONSUME(BoolTok) },
      { ALT: () => this.CONSUME(UnitTok) },
      { ALT: () => this.CONSUME(ArtifactTok) },
      { ALT: () => this.CONSUME(ConceptTok) },
      { ALT: () => this.CONSUME(EnvironmentTok) },
    ])
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
      this.SUBRULE(this.setObject)
      this.OPTION(() => this.CONSUME(Comma))
    })
    this.CONSUME(RParen)
  })

  private subObject = this.RULE('subObject', () => {
    this.CONSUME(FromTok)
    this.SUBRULE(this.setObject, { LABEL: 'base' })
    this.CONSUME(SelectTok)
    this.OR([{ ALT: () => this.CONSUME(SelectBlock) }, { ALT: () => this.CONSUME(CodeBlock) }])
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
    this.CONSUME(StringLiteral)
    this.OPTION(() => {
      this.CONSUME(AsTok)
      this.CONSUME2(Identifier)
    })
  })

  private moduleImport = this.RULE('moduleImport', () => {
    this.CONSUME(StringLiteral)
    this.CONSUME(AsTok)
    this.CONSUME(Identifier)
  })

  private generateDeclaration = this.RULE('generateDeclaration', () => {
    this.CONSUME(GenerateTok)
    this.CONSUME(Identifier)
    this.OPTION(() => {
      this.CONSUME(InTok)
      this.SUBRULE(this.setObject, { LABEL: 'environment' })
    })
    this.CONSUME(Semicolon)
  })

  private realizeDeclaration = this.RULE('realizeDeclaration', () => {
    this.CONSUME(RealizeTok)
    this.SUBRULE(this.setObject, { LABEL: 'object' })
    this.CONSUME(AsTok)
    this.SUBRULE2(this.setObject, { LABEL: 'target' })
    this.OPTION(() => {
      this.CONSUME(InTok)
      this.SUBRULE3(this.setObject, { LABEL: 'environment' })
    })
    this.CONSUME(Semicolon)
  })

  private includeDeclaration = this.RULE('includeDeclaration', () => {
    this.CONSUME(IncludeTok)
    this.CONSUME(StringLiteral)
    this.CONSUME(AsTok)
    this.CONSUME(Identifier)
    this.CONSUME(Semicolon)
  })
}
