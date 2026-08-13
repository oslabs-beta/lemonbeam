import { describe, it } from "vitest";

// See TESTING.md > Parsing and Chunking > Markdown
describe("markdownChunker", () => {
    it.todo("splits a markdown file into chunks at heading boundaries");
    it.todo("includes each section's text in its chunk");
    it.todo("records accurate start/end line ranges per chunk");
    it.todo("handles a markdown file with no headings");
});
