// generateGuideSection validates every citation in the model's output against
// the chunks it sent, and strips the ones that don't match:
//   a citation inside a supplied chunk's line range is kept
//   a citation to a file that was never supplied is stripped and recorded
//   a citation whose lines fall outside every supplied chunk is stripped
//   a range from one supplied chunk's start to a later one's end is reduced
//     to the file path alone, and repeated ones in a chain collapse to one
//   chained citations are validated one by one
//   path-only citations only need the file to have been supplied
//   path quirks seen in real output ("/.npmrc", "[ a.ts:1-2]") are normalised
//   markdown links, code spans and ordinary bracketed prose are left alone
//   generateGuideSection returns the cleaned text and the recorded citations
//
// See TESTING.md > Citations
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateGuideSection,
  validateCitations,
} from "../../../backend/src/orchestration/generateGuideSection.ts";
import type { Chunk } from "../../../backend/src/types/chunk.ts";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("../../../backend/src/utils/openaiClient.ts", () => ({
  MVP_MODEL: "test-model",
  getOpenRouterClient: () => ({ chat: { completions: { create: createMock } } }),
}));

function makeChunk(overrides: Partial<Chunk> = {}): Chunk {
  return {
    scanId: "scan_test",
    filePath: "package.json",
    filePurpose: "config",
    language: "json",
    parser: "config",
    chunkKind: "package_scripts",
    text: '{ "scripts": { "dev": "vite" } }',
    startLine: 1,
    endLine: 20,
    ...overrides,
  };
}

const chunks = [
  makeChunk({ filePath: "package.json", startLine: 1, endLine: 20 }),
  makeChunk({ filePath: "src/app.ts", startLine: 10, endLine: 40 }),
  makeChunk({ filePath: "src/app.ts", startLine: 41, endLine: 80 }),
  makeChunk({ filePath: "README.md", startLine: undefined, endLine: undefined }),
];

describe("validateCitations", () => {
  describe("valid citations", () => {
    it("keeps a citation whose range sits inside a supplied chunk", () => {
      const input = "Run it with npm [package.json:5-8].";

      const result = validateCitations(input, chunks);

      expect(result.text).toBe(input);
      expect(result.citations).toEqual([
        { raw: "[package.json:5-8]", filePath: "package.json", startLine: 5, endLine: 8, valid: true },
      ]);
    });

    it("accepts a range equal to the chunk's exact bounds", () => {
      const result = validateCitations("x [package.json:1-20]", chunks);

      expect(result.citations[0]?.valid).toBe(true);
    });

    it("accepts a single-line range written as start-start", () => {
      const result = validateCitations("x [package.json:7-7]", chunks);

      expect(result.citations[0]?.valid).toBe(true);
    });

    it("treats path:line as shorthand for path:line-line", () => {
      const result = validateCitations("x [package.json:7]", chunks);

      expect(result.citations[0]).toMatchObject({ startLine: 7, endLine: 7, valid: true });
    });

    it("finds each citation in text that has several", () => {
      const result = validateCitations("A [package.json:1-5]. B [src/app.ts:12-30].", chunks);

      expect(result.citations.map((citation) => citation.raw)).toEqual([
        "[package.json:1-5]",
        "[src/app.ts:12-30]",
      ]);
    });
  });

  describe("invalid citations", () => {
    it("strips a citation to a file that was never supplied and records why", () => {
      const result = validateCitations("Uses Docker [Dockerfile:1-9].", chunks);

      expect(result.text).toBe("Uses Docker.");
      expect(result.citations).toEqual([
        { raw: "[Dockerfile:1-9]", filePath: "Dockerfile", startLine: 1, endLine: 9, valid: false, reason: "unknown_file" },
      ]);
    });

    it("strips a range that runs past the end of the only chunk", () => {
      const result = validateCitations("x [package.json:18-30].", chunks);

      expect(result.text).toBe("x.");
      expect(result.citations[0]).toMatchObject({ valid: false, reason: "range_outside_chunks" });
    });

    it("strips a range that starts before the chunk", () => {
      const result = validateCitations("x [src/app.ts:5-12].", chunks);

      expect(result.citations[0]).toMatchObject({ valid: false, reason: "range_outside_chunks" });
    });

    it("strips a range that starts inside a chunk but ends past every chunk", () => {
      const result = validateCitations("x [src/app.ts:60-120].", chunks);

      expect(result.text).toBe("x.");
      expect(result.citations[0]).toMatchObject({ valid: false, reason: "range_outside_chunks" });
    });

    it("strips an inverted range", () => {
      const result = validateCitations("x [package.json:9-3].", chunks);

      expect(result.citations[0]).toMatchObject({ valid: false, reason: "invalid_range" });
    });

    it("strips a range starting at line 0", () => {
      const result = validateCitations("x [package.json:0-3].", chunks);

      expect(result.citations[0]).toMatchObject({ valid: false, reason: "invalid_range" });
    });

    it("strips a line range cited against a chunk that has no line range", () => {
      const result = validateCitations("x [README.md:1-10].", chunks);

      expect(result.text).toBe("x.");
      expect(result.citations[0]).toMatchObject({ valid: false, reason: "range_unverifiable" });
    });

    it("leaves the claim in place when its only citation is stripped", () => {
      const result = validateCitations("Uses Docker [Dockerfile:1-9]", chunks);

      expect(result.text).toBe("Uses Docker");
    });
  });

  describe("ranges that span several supplied chunks", () => {
    it("downgrades a range from one chunk's start to a later chunk's end to the file path", () => {
      const result = validateCitations("Uses Vite [src/app.ts:30-50].", chunks);

      expect(result.text).toBe("Uses Vite [src/app.ts].");
    });

    it("records the downgrade as valid, keeping what the model wrote", () => {
      const result = validateCitations("x [src/app.ts:30-50].", chunks);

      expect(result.citations).toEqual([
        { raw: "[src/app.ts:30-50]", filePath: "src/app.ts", startLine: 30, endLine: 50, valid: true, downgraded: true },
      ]);
    });

    it("downgrades a range that spans a gap between two supplied chunks", () => {
      const gapped = [
        makeChunk({ filePath: "a.js", startLine: 5, endLine: 8 }),
        makeChunk({ filePath: "a.js", startLine: 10, endLine: 13 }),
        makeChunk({ filePath: "a.js", startLine: 15, endLine: 18 }),
        makeChunk({ filePath: "a.js", startLine: 20, endLine: 23 }),
      ];

      const result = validateCitations("x [a.js:5-23].", gapped);

      expect(result.text).toBe("x [a.js].");
    });

    it("does not touch a range that sits inside one chunk", () => {
      const result = validateCitations("x [src/app.ts:12-30].", chunks);

      expect(result.text).toBe("x [src/app.ts:12-30].");
      expect(result.citations[0]).not.toHaveProperty("downgraded");
    });

    it("collapses repeated downgrades of the same file in a chain", () => {
      const result = validateCitations("x [src/app.ts:30-50][src/app.ts:12-60].", chunks);

      expect(result.text).toBe("x [src/app.ts].");
    });

    it("keeps different files in a chain when one is downgraded", () => {
      const result = validateCitations("x [src/app.ts:30-50][package.json:1-5].", chunks);

      expect(result.text).toBe("x [src/app.ts][package.json:1-5].");
    });

    it("downgrades to the normalised path when the model wrote a leading slash", () => {
      const result = validateCitations("x [/src/app.ts:30-50].", chunks);

      expect(result.text).toBe("x [src/app.ts].");
    });

    it("does not collapse identical bracketed text unless something was downgraded", () => {
      const input = "x [package.json:1-5][package.json:1-5].";

      const result = validateCitations(input, chunks);

      expect(result.text).toBe(input);
    });
  });

  describe("chained citations", () => {
    it("keeps a chain when every link is valid", () => {
      const input = "Vite build [package.json:1-5][src/app.ts:12-30].";

      const result = validateCitations(input, chunks);

      expect(result.text).toBe(input);
      expect(result.citations.every((citation) => citation.valid)).toBe(true);
    });

    it("strips only the invalid link of a chain (bad first)", () => {
      const result = validateCitations("x [Dockerfile:1-9][package.json:1-5].", chunks);

      expect(result.text).toBe("x [package.json:1-5].");
      expect(result.citations.map((citation) => citation.valid)).toEqual([false, true]);
    });

    it("strips only the invalid link of a chain (bad last)", () => {
      const result = validateCitations("x [package.json:1-5][Dockerfile:1-9].", chunks);

      expect(result.text).toBe("x [package.json:1-5].");
    });

    it("strips an invalid link in the middle of a chain", () => {
      const result = validateCitations("x [package.json:1-5][Dockerfile:1-9][src/app.ts:12-30].", chunks);

      expect(result.text).toBe("x [package.json:1-5][src/app.ts:12-30].");
    });

    it("validates space-separated citations independently", () => {
      const result = validateCitations("x [package.json:1-5] [Dockerfile:1-9].", chunks);

      expect(result.text).toBe("x [package.json:1-5].");
    });
  });

  describe("path-only citations", () => {
    it("keeps a path-only citation to a supplied file", () => {
      const result = validateCitations("Read the docs [README.md].", chunks);

      expect(result.text).toBe("Read the docs [README.md].");
      expect(result.citations).toEqual([{ raw: "[README.md]", filePath: "README.md", valid: true }]);
    });

    it("keeps a path-only citation to a file whose chunks do have line ranges", () => {
      const result = validateCitations("x [package.json].", chunks);

      expect(result.citations[0]?.valid).toBe(true);
    });

    it("strips a path-only citation to a file that was never supplied", () => {
      const result = validateCitations("x [.github/workflows/ci.yml].", chunks);

      expect(result.text).toBe("x.");
      expect(result.citations[0]).toMatchObject({ valid: false, reason: "unknown_file" });
      expect(result.citations[0]).not.toHaveProperty("startLine");
    });

    it("recognises an extensionless supplied file such as Makefile", () => {
      const withMakefile = [...chunks, makeChunk({ filePath: "Makefile", startLine: undefined, endLine: undefined })];

      const result = validateCitations("x [Makefile].", withMakefile);

      expect(result.citations).toEqual([{ raw: "[Makefile]", filePath: "Makefile", valid: true }]);
    });
  });

  describe("path normalisation", () => {
    it("accepts a leading slash", () => {
      const result = validateCitations("x [/package.json:1-5].", chunks);

      expect(result.citations[0]).toMatchObject({ filePath: "package.json", valid: true });
    });

    it("accepts a leading ./", () => {
      const result = validateCitations("x [./src/app.ts:12-30].", chunks);

      expect(result.citations[0]).toMatchObject({ filePath: "src/app.ts", valid: true });
    });

    it("accepts stray whitespace inside the brackets", () => {
      const result = validateCitations("x [ package.json:1-5 ].", chunks);

      expect(result.citations[0]).toMatchObject({ filePath: "package.json", valid: true });
    });

    it("accepts an en dash in the range", () => {
      const result = validateCitations("x [package.json:1–5].", chunks);

      expect(result.citations[0]).toMatchObject({ startLine: 1, endLine: 5, valid: true });
    });

    it("parses a path that itself contains brackets", () => {
      const withRoute = [...chunks, makeChunk({ filePath: "pages/[id].tsx", startLine: 1, endLine: 30 })];

      const result = validateCitations("x [pages/[id].tsx:2-9].", withRoute);

      expect(result.citations).toEqual([
        { raw: "[pages/[id].tsx:2-9]", filePath: "pages/[id].tsx", startLine: 2, endLine: 9, valid: true },
      ]);
    });
  });

  describe("things that are not citations", () => {
    it("leaves markdown links alone", () => {
      const input = "See [the docs](https://example.com/a.html) and [readme.md](./README.md).";

      const result = validateCitations(input, chunks);

      expect(result.text).toBe(input);
      expect(result.citations).toEqual([]);
    });

    it("leaves ordinary bracketed prose alone", () => {
      const input = "Options are [optional], see step [1], or [e.g.] a flag, or [x] done.";

      const result = validateCitations(input, chunks);

      expect(result.text).toBe(input);
      expect(result.citations).toEqual([]);
    });

    it("leaves brackets inside inline code alone", () => {
      const input = "Use `[Dockerfile:1-9]` and `arr[0]` literally.";

      const result = validateCitations(input, chunks);

      expect(result.text).toBe(input);
      expect(result.citations).toEqual([]);
    });

    it("leaves brackets inside fenced code alone", () => {
      const input = "Example:\n```\nsee [Dockerfile:1-9]\n```\nDone.";

      const result = validateCitations(input, chunks);

      expect(result.text).toBe(input);
      expect(result.citations).toEqual([]);
    });

    it("returns empty text and no citations for empty input", () => {
      expect(validateCitations("", chunks)).toEqual({ text: "", citations: [] });
    });
  });
});

describe("generateGuideSection", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("returns the cleaned text and the recorded citations from the model's output", async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: "Vite [package.json:1-5]. Docker [Dockerfile:1-9]." } }],
    });

    const result = await generateGuideSection({ openRouterApiKey: "test-key", chunks });

    expect(result.text).toBe("Vite [package.json:1-5]. Docker.");
    expect(result.citations).toHaveLength(2);
    expect(result.citations.map((citation) => citation.valid)).toEqual([true, false]);
  });

  it("returns no citations when the model's output has none", async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: "No sources here." } }] });

    const result = await generateGuideSection({ openRouterApiKey: "test-key", chunks });

    expect(result).toEqual({ text: "No sources here.", citations: [] });
  });

  it("validates against the chunks it was given, not a different set", async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: "x [src/app.ts:12-30]." } }] });
    const onlyPackageJson = [makeChunk({ filePath: "package.json" })];

    const result = await generateGuideSection({ openRouterApiKey: "test-key", chunks: onlyPackageJson });

    expect(result.citations[0]).toMatchObject({ valid: false, reason: "unknown_file" });
  });
});
