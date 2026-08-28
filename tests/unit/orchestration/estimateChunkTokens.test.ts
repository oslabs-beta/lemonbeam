import { describe, expect, it } from "vitest";
import { estimateTokens } from "../../../backend/src/orchestration/estimateChunkTokens.ts";

describe("estimateTokens", () => {
  it("returns 0 for an empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("returns a positive token count for normal text", () => {
    expect(estimateTokens("Hello world")).toBeGreaterThan(0);
  });

  it("returns a larger token count for longer text", () => {
    const shortText = "Hello world";
    const longText = "Hello world ".repeat(100);

    expect(estimateTokens(longText)).toBeGreaterThan(estimateTokens(shortText));
  });

  it("returns a positive token count for code-like text", () => {
    const code = `
    function greet(name: string): string {
    return \`Hello, ${"${name}"}\`;
    }
    `;

    expect(estimateTokens(code)).toBeGreaterThan(0);
  });
});