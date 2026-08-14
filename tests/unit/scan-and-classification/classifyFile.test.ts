import { describe, it, expect } from "vitest";
import { classifyFile } from "../../../backend/src/scan/classifyFile.ts";

describe("classifyFile", () => {
  it("classifies a .ts file with no other signals as source", () => {
    const result = classifyFile("backend/src/scan/discoverFiles.ts", [], null);
    expect(result).toEqual({ filePurpose: "source", language: "typescript" });
  });

  it("classifies a file with .test. in its name as test", () => {
    const result = classifyFile("backend/src/scan/discoverFiles.test.ts", [], null);
    expect(result.filePurpose).toBe("test");
  });

  it("classifies a file inside a __tests__ directory as test", () => {
    const result = classifyFile("src/__tests__/helpers.ts", [], null);
    expect(result.filePurpose).toBe("test");
  });

  it("classifies a markdown file as docs", () => {
    const result = classifyFile("README.md", [], null);
    expect(result).toEqual({ filePurpose: "docs", language: "markdown" });
  });

  it("classifies package.json as config", () => {
    const result = classifyFile("package.json", [], null);
    expect(result).toEqual({ filePurpose: "config", language: "json" });
  });

  it("classifies tsconfig.json as config", () => {
    const result = classifyFile("tsconfig.json", [], null);
    expect(result.filePurpose).toBe("config");
  });

  it("classifies a file in a scripts directory as scripts", () => {
    const result = classifyFile("scripts/build.js", [], null);
    expect(result.filePurpose).toBe("scripts");
  });

  it("classifies a file referenced in package.json's scripts as scripts, even outside a scripts directory", () => {
    const packageJson = { scripts: { build: "node build.js" } };
    const result = classifyFile("build.js", [], packageJson);
    expect(result.filePurpose).toBe("scripts");
  });

  it("classifies a .d.ts file as types", () => {
    const result = classifyFile("src/index.d.ts", [], null);
    expect(result.filePurpose).toBe("types");
  });

  it("classifies a file in a types directory as types", () => {
    const result = classifyFile("backend/src/types/chunk.ts", [], null);
    expect(result.filePurpose).toBe("types");
  });

  it("classifies a file with no recognizable extension or pattern as unknown", () => {
    const result = classifyFile("LICENSE", [], null);
    expect(result).toEqual({ filePurpose: "unknown", language: "text" });
  });

  it("does not force a low-confidence file into an incorrect category", () => {
    const result = classifyFile("docker-compose.yml", [], null);
    expect(result.filePurpose).toBe("unknown");
  });
});
