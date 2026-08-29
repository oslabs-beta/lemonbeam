import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { scanRepository } from "../../../backend/src/scan/scanService.ts";

describe("scanRepository", () => {
    let root: string;

    beforeEach(async () => {
        root = await mkdtemp(path.join(tmpdir(), "scanService-test-"));
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    it("discovers, classifies, and chunks every file in a small repository", async () => {
        await writeFile(
            path.join(root, "add.ts"),
            "export function add(a: number, b: number) {\n  return a + b;\n}\n",
        );
        await writeFile(path.join(root, "README.md"), "# Fixture\n\nSome docs.\n");

        const result = await scanRepository(root, "scan_test");

        expect(result.skippedFiles).toEqual([]);
        expect(result.chunks.every((chunk) => chunk.scanId === "scan_test")).toBe(true);
        expect(
            result.chunks.some(
                (chunk) =>
                    chunk.filePath === "add.ts" &&
                    chunk.chunkKind === "function" &&
                    chunk.chunkName === "add",
            ),
        ).toBe(true);
        expect(
            result.chunks.some(
                (chunk) => chunk.filePath === "README.md" && chunk.chunkKind === "markdown_section",
            ),
        ).toBe(true);
    });

    it("skips a file that fails to chunk and keeps processing the rest", async () => {
        await writeFile(path.join(root, "package.json"), "{ not valid json");
        await writeFile(
            path.join(root, "add.ts"),
            "export function add(a: number, b: number) {\n  return a + b;\n}\n",
        );

        const result = await scanRepository(root, "scan_test");

        expect(result.skippedFiles).toHaveLength(1);
        expect(result.skippedFiles[0]?.filePath).toBe("package.json");
        expect(result.skippedFiles[0]?.reason).toBeTruthy();
        expect(result.chunks.some((chunk) => chunk.filePath === "add.ts")).toBe(true);
    });

    it("caps CHANGELOG.md content instead of chunking the whole file", async () => {
        const marker = "SHOULD_NOT_APPEAR_PAST_THE_CAP";
        const changelog = "# Changelog\n\n## v1.0.0\n\nInitial release.\n" + "x".repeat(3000) + marker;
        await writeFile(path.join(root, "CHANGELOG.md"), changelog);

        const result = await scanRepository(root, "scan_test");

        const changelogChunks = result.chunks.filter((chunk) => chunk.filePath === "CHANGELOG.md");
        expect(changelogChunks.length).toBeGreaterThan(0);
        expect(changelogChunks.every((chunk) => !chunk.text.includes(marker))).toBe(true);
    });

    it("caps LICENSE content instead of chunking the whole file", async () => {
        const marker = "SHOULD_NOT_APPEAR_PAST_THE_CAP";
        const license = "MIT License\n\n" + "Permission is hereby granted. ".repeat(200) + marker;
        await writeFile(path.join(root, "LICENSE"), license);

        const result = await scanRepository(root, "scan_test");

        const licenseChunks = result.chunks.filter((chunk) => chunk.filePath === "LICENSE");
        expect(licenseChunks.length).toBeGreaterThan(0);
        expect(licenseChunks.every((chunk) => !chunk.text.includes(marker))).toBe(true);
    });

    it("does not cap a short CHANGELOG.md that's already under the cap", async () => {
        const changelog = "# Changelog\n\n## v1.0.0\n\nInitial release.\n";
        await writeFile(path.join(root, "CHANGELOG.md"), changelog);

        const result = await scanRepository(root, "scan_test");

        const changelogChunks = result.chunks.filter((chunk) => chunk.filePath === "CHANGELOG.md");
        expect(changelogChunks.some((chunk) => chunk.text.includes("Initial release."))).toBe(true);
    });

    it("returns empty chunks and skippedFiles for an empty repository", async () => {
        const result = await scanRepository(root, "scan_test");

        expect(result).toEqual({ chunks: [], skippedFiles: [] });
    });
});
