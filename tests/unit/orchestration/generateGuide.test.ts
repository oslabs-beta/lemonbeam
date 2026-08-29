// generateGuide makes exactly one generateGuideSection call, passing the
// supplied chunks and API key straight through
// generateGuide assembles the sixth "Uncertainties and Missing Information"
// section from skippedFiles, without a second LLM call
// generateGuide reports a clean scan when nothing was skipped
// generateGuide lists each skipped file with its reason when files were skipped
// generateGuide propagates a generateGuideSection failure unchanged, rather
// than returning a partial guide
//
// See TESTING.md > Orchestration
import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateGuide } from "../../../backend/src/orchestration/generateGuide.ts";
import type { Chunk } from "../../../backend/src/types/chunk.ts";
import type { SkippedFile } from "../../../backend/src/scan/scanService.ts";

const { generateGuideSectionMock } = vi.hoisted(() => ({
  generateGuideSectionMock: vi.fn(),
}));

vi.mock("../../../backend/src/orchestration/generateGuideSection.ts", () => ({
  generateGuideSection: generateGuideSectionMock,
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
    ...overrides,
  };
}

function makeSkippedFile(overrides: Partial<SkippedFile> = {}): SkippedFile {
  return {
    filePath: "assets/logo.png",
    reason: "binary file",
    ...overrides,
  };
}

describe("generateGuide", () => {
  beforeEach(() => {
    generateGuideSectionMock.mockReset();
    generateGuideSectionMock.mockResolvedValue({
      text: "# Project Overview\n\nDetails.",
      citations: [],
    });
  });

  it("calls generateGuideSection exactly once with the supplied chunks and API key", async () => {
    const chunks = [makeChunk()];

    await generateGuide(chunks, [], "test-api-key");

    expect(generateGuideSectionMock).toHaveBeenCalledTimes(1);
    expect(generateGuideSectionMock).toHaveBeenCalledWith({
      openRouterApiKey: "test-api-key",
      chunks,
    });
  });

  it("combines the generated text with the uncertainties section", async () => {
    const result = await generateGuide([makeChunk()], [], "test-api-key");

    expect(result.markdown.startsWith("# Project Overview\n\nDetails.")).toBe(true);
    expect(result.markdown).toContain("## Uncertainties and Missing Information");
  });

  it("reports a clean scan when no files were skipped", async () => {
    const result = await generateGuide([makeChunk()], [], "test-api-key");

    expect(result.markdown).toContain(
      "All files were scanned successfully — there is nothing to report in this section.",
    );
  });

  it("lists each skipped file with its reason when files were skipped", async () => {
    const skippedFiles = [
      makeSkippedFile({ filePath: "assets/logo.png", reason: "binary file" }),
      makeSkippedFile({ filePath: "vendor/bundle.min.js", reason: "exceeds 1MB size limit" }),
    ];

    const result = await generateGuide([makeChunk()], skippedFiles, "test-api-key");

    expect(result.markdown).toContain("- `assets/logo.png` — binary file");
    expect(result.markdown).toContain("- `vendor/bundle.min.js` — exceeds 1MB size limit");
    expect(result.markdown).not.toContain("All files were scanned successfully");
  });

  it("builds the uncertainties section without making a second LLM call", async () => {
    await generateGuide([makeChunk()], [makeSkippedFile()], "test-api-key");

    expect(generateGuideSectionMock).toHaveBeenCalledTimes(1);
  });

  it("propagates a generateGuideSection failure unchanged, instead of returning a partial guide", async () => {
    const llmError = new Error("OpenRouter rate limit exceeded");
    generateGuideSectionMock.mockRejectedValue(llmError);

    await expect(generateGuide([makeChunk()], [], "test-api-key")).rejects.toBe(llmError);
  });

  it("only passes budget-included chunks to generateGuideSection, and reports excluded ones in the uncertainties section", async () => {
    const includedChunk = makeChunk();
    // "source" scores 0 for every section under the current placeholder
    // rubric, so this chunk is always excluded regardless of budget.
    const excludedChunk = makeChunk({
      filePath: "src/App.tsx",
      filePurpose: "source",
      chunkKind: "function",
      chunkName: "App",
    });

    const result = await generateGuide([includedChunk, excludedChunk], [], "test-api-key");

    expect(generateGuideSectionMock).toHaveBeenCalledWith({
      openRouterApiKey: "test-api-key",
      chunks: [includedChunk],
    });
    expect(result.markdown).toContain(
      "- `src/App.tsx (App)` — excluded from evidence: did not fit within any relevant section's token budget",
    );
  });
});
