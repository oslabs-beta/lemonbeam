import { describe, it, expect, afterEach } from "vitest";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createTempDirectory } from "../../../backend/src/utils/tempDirectory.ts";
import { cleanupTempDirectory } from "../../../backend/src/utils/cleanup.ts";

// createTempDirectory creates scanDirectory
// createTempDirectory creates repositoryDirectory
// cleanupTempDirectory deletes the scan directory
// cleanupTempDirectory refuses to delete /tmp/lemonbeam
// cleanupTempDirectory refuses to delete outside paths

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function makeScanId(): string { 
    return `scan_test_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const createdScanDirectories: string[] = [];

async function createTestWorkspace() {
  const workspace = await createTempDirectory(makeScanId());
  createdScanDirectories.push(workspace.scanDirectory);
  return workspace;
}

describe("temp workspace utilities", () => {
    afterEach(async () => {
        for (const scanDirectory of createdScanDirectories.splice(0)) {
            await cleanupTempDirectory(scanDirectory);
        }
    });

    it("creates the scan directory", async () => {
        const workspace = await createTestWorkspace();
        expect(await exists(workspace.scanDirectory)).toBe(true); 
    });

    it("creates the repository directory inside the scan directory", async () => {
        const workspace = await createTestWorkspace();

        expect(await exists(workspace.repositoryDirectory)).toBe(true);
        expect(workspace.repositoryDirectory).toBe(join(workspace.scanDirectory, "repository"));
    });

    it("deletes the scan directory", async () => {
        const workspace = await createTestWorkspace();

        await cleanupTempDirectory(workspace.scanDirectory);

        expect(await exists(workspace.scanDirectory)).toBe(false);
    });

    it("refuses to delete the shared lemonbeam temp parent", async () => {
        const lemonbeamTempRoot = resolve(tmpdir(), "lemonbeam");

        await expect(cleanupTempDirectory(lemonbeamTempRoot)).rejects.toThrow(
        "Refusing to clean up directory outside the scan temp workspace",
        );
    });

    it("refuses to delete paths outside the lemonbeam temp workspace", async () => {
        const outsideDirectory = await mkdtemp(join(tmpdir(), "outside-lemonbeam-test-"));

        try {
        await expect(cleanupTempDirectory(outsideDirectory)).rejects.toThrow(
            "Refusing to clean up directory outside the scan temp workspace",
        );

        expect(await exists(outsideDirectory)).toBe(true);
        } finally {
        await rm(outsideDirectory, { recursive: true, force: true });
        }
    });

});