import { describe, it, expect } from "vitest";
import { configChunker, canHandleConfig } from "../../../backend/src/chunking/configChunker.ts";
import type { ChunkInput } from "../../../backend/src/types/chunk.ts";

function makeInput(overrides: Partial<ChunkInput> = {}): ChunkInput {
    return {
        scanId: "scan_test",
        filePath: "docker-compose.yml",
        content: "",
        filePurpose: "config",
        language: "text",
        ...overrides,
    };
}

// See TESTING.md > Parsing and Chunking > Configuration
describe("configChunker", () => {
    it.todo("extracts package.json scripts as a chunk");
    it.todo("extracts package.json dependencies as a chunk");
    it.todo("extracts tsconfig compiler options as a chunk");
    it.todo("extracts tool configuration (eslint/prettier) as a chunk");
    it.todo("extracts environment-variable examples (.env.example) as a chunk");

    it("extracts a GitHub Actions workflow (.github/workflows/*.yml) as a ci_config chunk", () => {
        const input = makeInput({
            filePath: ".github/workflows/ci.yml",
            content: "name: CI\non:\n  push:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest\n",
        });

        expect(canHandleConfig(input)).toBe(true);

        const chunks = configChunker(input);

        expect(chunks).toHaveLength(1);
        expect(chunks[0].chunkKind).toBe("ci_config");
        expect(chunks[0].text).toBe(input.content);
    });

    it("extracts a docker-compose.yml as a compose_config chunk", () => {
        const input = makeInput({
            filePath: "docker-compose.yml",
            content: "services:\n  web:\n    image: node:20\n",
        });

        expect(canHandleConfig(input)).toBe(true);

        const chunks = configChunker(input);

        expect(chunks).toHaveLength(1);
        expect(chunks[0].chunkKind).toBe("compose_config");
        expect(chunks[0].text).toBe(input.content);
    });

    it("does not misclassify a non-root .github/workflows file as a ci_config chunk", () => {
        const input = makeInput({
            filePath: "packages/foo/.github/workflows/ci.yml",
            content: "name: CI\n",
            filePurpose: "unknown",
            language: "text",
        });

        expect(canHandleConfig(input)).toBe(false);
    });
});
