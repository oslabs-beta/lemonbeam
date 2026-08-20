// downloadSnapshot builds the codeload tarball URL from owner/name/commitSha
// downloadSnapshot does not send GITHUB_TOKEN or Authorization headers
// downloadSnapshot extracts the snapshot into workspace.repositoryDirectory
// downloadSnapshot returns the local repositoryDirectory path
// downloadSnapshot throws if the download response is not ok
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  downloadSnapshot,
  type DownloadSnapshotInput,
} from "../../../backend/src/github/downloadSnapshot.ts";

const snapshotTarball = Buffer.from(
  "H4sIAAAAAAAA/ysoys9KTS7RTUxKNjQy1megBTAwMDA3NVXAJg4FCmji5kYmJgoMpjRxDRooLS5JLAJaSak5MI9g89AgBgWo8R/k6uji66qXm0JNO4DhYQaKTyziYGBkqICSFgwMDU0NgeopjhNiwAiPf2UF14rE3IKcVIUASEoYaAeNglEwCkbBKKALAABlOjgzAAoAAA==",
  "base64",
);

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("downloadSnapshot", () => {
  const originalFetch = globalThis.fetch;
  const originalGitHubToken = process.env.GITHUB_TOKEN;
  const createdScanDirectories: string[] = [];

  beforeEach(() => {
    process.env.GITHUB_TOKEN = "secret-github-token";
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    process.env.GITHUB_TOKEN = originalGitHubToken;
    vi.restoreAllMocks();

    for (const scanDirectory of createdScanDirectories.splice(0)) {
      await rm(scanDirectory, { recursive: true, force: true });
    }
  });

  async function createInput(): Promise<DownloadSnapshotInput> {
    const scanDirectory = await mkdtemp(join(tmpdir(), "lemonbeam-download-test-"));
    const repositoryDirectory = join(scanDirectory, "repository");

    createdScanDirectories.push(scanDirectory);

    return {
      owner: "example",
      name: "project",
      commitSha: "abc123",
      scanDirectory,
      repositoryDirectory,
    };
  }

  it("downloads and extracts the exact repository snapshot", async () => {
    const input = await createInput();

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(snapshotTarball, {
        status: 200,
      }),
    );

    globalThis.fetch = fetchMock;

    await expect(downloadSnapshot(input)).resolves.toBe(input.repositoryDirectory);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://codeload.github.com/example/project/tar.gz/abc123",
    );

    expect(await exists(join(input.repositoryDirectory, "README.md"))).toBe(true);
  });

  it("does not send GITHUB_TOKEN when downloading the snapshot", async () => {
    const input = await createInput();

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(snapshotTarball, {
        status: 200,
      }),
    );

    globalThis.fetch = fetchMock;

    await downloadSnapshot(input);

    expect(fetchMock.mock.calls[0]?.[1]).toBeUndefined();
  });

  it("throws when the snapshot download fails", async () => {
    const input = await createInput();

    const fetchMock = vi.fn().mockResolvedValue(
      new Response("Not found", {
        status: 404,
      }),
    );

    globalThis.fetch = fetchMock;

    await expect(downloadSnapshot(input)).rejects.toThrow(
      "Failed to download repository snapshot",
    );
  });
});