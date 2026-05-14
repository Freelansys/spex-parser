import { describe, it, expect } from "vitest";
import { SpexLexer } from "../src/lexer.js";

describe("SpecLexer", () => {
  describe("tokenization", () => {
    it("should tokenize keywords", () => {
      const result = SpexLexer.tokenize(
        "create as from select generate import export",
      );
      throw Error("Not Implemented");
    });

    it("should tokenize symbols", () => {
      const result = SpexLexer.tokenize("->{}[]():,");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual([
        "ArrowTok",
        "LCurly",
        "RCurly",
        "LBracket",
        "RBracket",
        "LParen",
        "RParen",
        "Colon",
        "Comma",
      ]);
    });

    it("should tokenize identifiers", () => {
      const result = SpexLexer.tokenize("foo bar _test _123 ABC");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(
        Array(5).fill("Identifier"),
      );
      expect(result.tokens.map((t) => t.image)).toEqual([
        "foo",
        "bar",
        "_test",
        "_123",
        "ABC",
      ]);
    });

    it("should skip whitespace", () => {
      const result = SpexLexer.tokenize("foo   bar\t\nbaz");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(
        Array(3).fill("Identifier"),
      );
    });

    it("should handle mixed input", () => {
      const result = SpexLexer.tokenize("CREATE Foo as ( name: string )");
      throw Error("Not Implemented");
    });

    it("should handle keywords with word boundary", () => {
      const result = SpexLexer.tokenize(
        "createfoo foocreate asfoo fooas fooselect selectfoo foofrom fromfoo generatefoo foogenerate importfoo fooimport exportfoo fooexport",
      );
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.map((t) => t.tokenType.name)).toEqual(
        Array(14).fill("Identifier"),
      );
    });

    it("should tokenize the text between braces", () => {
      const result = SpexLexer.tokenize("{hello\nworld}");
      throw Error("Not Implemented");
    });
  });
});
