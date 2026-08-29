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

    it("ignores additional build/cache/generated-output directories", async () => {
        const cacheDirs = [
            ".turbo", ".cache", ".parcel-cache", ".nyc_output",
            ".docusaurus", ".vercel", ".netlify", "storybook-static", ".yarn",
        ];
        for (const dirName of cacheDirs) {
            await mkdir(path.join(root, dirName), { recursive: true });
            await writeFile(path.join(root, dirName, "output.js"), "// generated");
        }
        await writeFile(path.join(root, "index.ts"), "export {}");

        const files = await discoverFiles(root);

        expect(files).toEqual(["index.ts"]);
    });

    it("ignores editor and OS directories", async () => {
        await mkdir(path.join(root, ".vscode"), { recursive: true });
        await writeFile(path.join(root, ".vscode", "settings.json"), "{}");
        await mkdir(path.join(root, ".idea"), { recursive: true });
        await writeFile(path.join(root, ".idea", "workspace.xml"), "<xml/>");
        await writeFile(path.join(root, "index.ts"), "export {}");

        const files = await discoverFiles(root);

        expect(files).toEqual(["index.ts"]);
    });

    it("ignores .DS_Store files", async () => {
        await writeFile(path.join(root, ".DS_Store"), "binary-ish junk");
        await writeFile(path.join(root, "index.ts"), "export {}");

        const files = await discoverFiles(root);

        expect(files).toEqual(["index.ts"]);
    });

    it("ignores lockfiles", async () => {
        await writeFile(path.join(root, "package-lock.json"), "{}");
        await writeFile(path.join(root, "yarn.lock"), "# yarn lockfile v1");
        await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: 6");
        await writeFile(path.join(root, "bun.lockb"), "binary-ish junk");
        await writeFile(path.join(root, "index.ts"), "export {}");

        const files = await discoverFiles(root);

        expect(files).toEqual(["index.ts"]);
    });

    it("ignores Yarn Plug'n'Play output files regardless of their exact name", async () => {
        await writeFile(path.join(root, ".pnp.cjs"), "// pnp loader");
        await writeFile(path.join(root, ".pnp.loader.mjs"), "// pnp loader");
        await writeFile(path.join(root, "index.ts"), "export {}");

        const files = await discoverFiles(root);

        expect(files).toEqual(["index.ts"]);
    });

    it("ignores media/decoration assets by extension, including text-based SVGs that aren't binary", async () => {
        await writeFile(path.join(root, "logo.svg"), "<svg></svg>");
        await writeFile(path.join(root, "screenshot.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        await writeFile(path.join(root, "banner.jpg"), Buffer.from([0xff, 0xd8, 0xff]));
        await writeFile(path.join(root, "index.ts"), "export {}");

        const files = await discoverFiles(root);

        expect(files).toEqual(["index.ts"]);
    });

    it("still skips binary files by content even when their extension isn't a known media type", async () => {
        await writeFile(path.join(root, "data.bin"), Buffer.from([0x00, 0x01, 0x02]));
        await writeFile(path.join(root, "index.ts"), "export {}");

        const files = await discoverFiles(root);

        expect(files).toEqual(["index.ts"]);
    });

    it("ignores i18n/locale data directories", async () => {
        const localeDirs = ["locales", "locale", "i18n", "translations"];
        for (const dirName of localeDirs) {
            await mkdir(path.join(root, dirName), { recursive: true });
            await writeFile(path.join(root, dirName, "en.json"), "{}");
        }
        await writeFile(path.join(root, "index.ts"), "export {}");

        const files = await discoverFiles(root);

        expect(files).toEqual(["index.ts"]);
    });

    it("keeps test, docs, and examples directories included", async () => {
        await mkdir(path.join(root, "test"), { recursive: true });
        await writeFile(path.join(root, "test", "app.test.ts"), "test('x', () => {});");
        await mkdir(path.join(root, "docs"), { recursive: true });
        await writeFile(path.join(root, "docs", "guide.md"), "# Guide");
        await mkdir(path.join(root, "examples"), { recursive: true });
        await writeFile(path.join(root, "examples", "basic.ts"), "// example");

        const files = await discoverFiles(root);

        expect(files).toContain("test/app.test.ts");
        expect(files).toContain("docs/guide.md");
        expect(files).toContain("examples/basic.ts");
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
