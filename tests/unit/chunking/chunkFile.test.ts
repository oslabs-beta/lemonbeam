import { describe, it } from "vitest";

// Router: verify it selects the correct chunker for a given ChunkInput and
// never throws itself, even when the chosen chunker does.
describe("chunkFile", () => {
    it.todo("routes config files (package.json, tsconfig*.json, etc.) to configChunker");
    it.todo("routes markdown-language files to markdownChunker");
    it.todo("routes typescript/javascript-language files to the tree-sitter chunker");
    it.todo("falls back to fallbackChunker for anything no other chunker claims");
    it.todo("returns { ok: true, chunks } when the matched chunker succeeds");
    it.todo("returns { ok: false, reason, filePath } when the matched chunker throws, instead of throwing itself");
});
