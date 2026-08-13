import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { discoverFiles } from "../../../backend/src/scan/discoverFiles.ts";

describe("discoverFiles", () => {
    let root: string;

    beforeEach(async () => {
        root = await mkdtemp(path.join(tmpdir(), "discoverFiles-test-"));
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    it("finds files nested in subdirectories", async () => {
        await mkdir(path.join(root, "src"), { recursive: true });
        await writeFile(path.join(root, "src", "app.ts"), "export const x = 1;");

        const files = await discoverFiles(root);

        expect(files).toContain("src/app.ts");
    });

    it("returns repository-relative paths, not absolute ones", async () => {
        await writeFile(path.join(root, "index.ts"), "export {}");

        const files = await discoverFiles(root);

        expect(files).toEqual(["index.ts"]);
    });

    it("ignores node_modules", async () => {
        await mkdir(path.join(root, "node_modules", "some-pkg"), { recursive: true });
        await writeFile(path.join(root, "node_modules", "some-pkg", "index.js"), "module.exports = {};");
        await writeFile(path.join(root, "index.ts"), "export {}");

        const files = await discoverFiles(root);

        expect(files).toEqual(["index.ts"]);
    });

    it("ignores .git", async () => {
        await mkdir(path.join(root, ".git"), { recursive: true });
        await writeFile(path.join(root, ".git", "HEAD"), "ref: refs/heads/main");
        await writeFile(path.join(root, "index.ts"), "export {}");

        const files = await discoverFiles(root);

        expect(files).toEqual(["index.ts"]);
    });

    it("ignores generated build output directories", async () => {
        await mkdir(path.join(root, "dist"), { recursive: true });
        await writeFile(path.join(root, "dist", "bundle.js"), "console.log('built');");
        await writeFile(path.join(root, "index.ts"), "export {}");

        const files = await discoverFiles(root);

        expect(files).toEqual(["index.ts"]);
    });

    it("skips env files that may contain secrets", async () => {
        await writeFile(path.join(root, ".env"), "API_KEY=secret");
        await writeFile(path.join(root, "index.ts"), "export {}");

        const files = await discoverFiles(root);

        expect(files).toEqual(["index.ts"]);
    });

    it("skips binary files", async () => {
        await writeFile(path.join(root, "image.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00]));
        await writeFile(path.join(root, "index.ts"), "export {}");

        const files = await discoverFiles(root);

        expect(files).toEqual(["index.ts"]);
    });

    it("skips files over the size limit", async () => {
        await writeFile(path.join(root, "huge.txt"), "a".repeat(1_000_001));
        await writeFile(path.join(root, "index.ts"), "export {}");

        const files = await discoverFiles(root);

        expect(files).toEqual(["index.ts"]);
    });

    it("does not follow symlinks that escape the repository root", async () => {
        const outsideDir = await mkdtemp(path.join(tmpdir(), "discoverFiles-outside-"));
        const secretFile = path.join(outsideDir, "secret.txt");
        await writeFile(secretFile, "outside content");
        await symlink(secretFile, path.join(root, "sneaky-link.txt"));
        await writeFile(path.join(root, "index.ts"), "export {}");

        const files = await discoverFiles(root);

        expect(files).toEqual(["index.ts"]);

        await rm(outsideDir, { recursive: true, force: true });
    });
});
