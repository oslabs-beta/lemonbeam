import { describe, it, expect } from "vitest";
import { classifyFile } from "../../../backend/src/scan/classifyFile.ts";

describe("classifyFile", () => {
  it("classifies a .ts file with no other signals as source", () => {
    const result = classifyFile("backend/src/scan/discoverFiles.ts");
    expect(result).toEqual({ filePurpose: "source", language: "typescript" });
  });

  it("classifies a file with .test. in its name as test", () => {
    const result = classifyFile("backend/src/scan/discoverFiles.test.ts");
    expect(result.filePurpose).toBe("test");
  });

  it("classifies a file inside a __tests__ directory as test", () => {
    const result = classifyFile("src/__tests__/helpers.ts");
    expect(result.filePurpose).toBe("test");
  });

  it("classifies a markdown file as docs", () => {
    const result = classifyFile("README.md");
    expect(result).toEqual({ filePurpose: "docs", language: "markdown" });
  });

  it("classifies package.json as config", () => {
    const result = classifyFile("package.json");
    expect(result).toEqual({ filePurpose: "config", language: "json" });
  });

  it("classifies tsconfig.json as config", () => {
    const result = classifyFile("tsconfig.json");
    expect(result.filePurpose).toBe("config");
  });

  it("classifies a file in a scripts directory as scripts", () => {
    const result = classifyFile("scripts/build.js");
    expect(result.filePurpose).toBe("scripts");
  });

  it("classifies a .d.ts file as types", () => {
    const result = classifyFile("src/index.d.ts");
    expect(result.filePurpose).toBe("types");
  });

  it("classifies a file in a types directory as types", () => {
    const result = classifyFile("backend/src/types/chunk.ts");
    expect(result.filePurpose).toBe("types");
  });

  it("classifies a file with no recognizable extension or pattern as unknown", () => {
    const result = classifyFile("LICENSE");
    expect(result).toEqual({ filePurpose: "unknown", language: "text" });
  });

  it("classifies docker-compose.yml as config", () => {
    const result = classifyFile("docker-compose.yml");
    expect(result.filePurpose).toBe("config");
  });

  it("classifies docker-compose.override.yaml as config", () => {
    const result = classifyFile("docker-compose.override.yaml");
    expect(result.filePurpose).toBe("config");
  });

  it("classifies a GitHub Actions workflow as config regardless of filename", () => {
    const result = classifyFile(".github/workflows/ci.yml");
    expect(result.filePurpose).toBe("config");
  });

  it("classifies a CircleCI config as config", () => {
    const result = classifyFile(".circleci/config.yml");
    expect(result.filePurpose).toBe("config");
  });

  it("classifies .travis.yml, .gitlab-ci.yml, and azure-pipelines.yml as config", () => {
    expect(classifyFile(".travis.yml").filePurpose).toBe("config");
    expect(classifyFile(".gitlab-ci.yml").filePurpose).toBe("config");
    expect(classifyFile("azure-pipelines.yml").filePurpose).toBe("config");
  });

  it("does not classify an unrelated yml file as config", () => {
    const result = classifyFile(".github/ISSUE_TEMPLATE/bug_report.yml");
    expect(result.filePurpose).toBe("unknown");
  });
});
