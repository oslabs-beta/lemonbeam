import { describe, it } from "vitest";

// See TESTING.md > Parsing and Chunking > Fallback
describe("fallbackChunker", () => {
    it.todo("chunks small readable text files into simple line chunks");
    it.todo("skips unsupported or unsuitable files rather than producing garbage chunks");
    it.todo("does not silently produce incorrect chunks when parsing fails");
});
