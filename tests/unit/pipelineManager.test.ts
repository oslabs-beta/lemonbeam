// 1. sequences the scan and returns the trimmed sprint result
//    Proves:
//    - generates a scanId
//    - calls validateRepository with repositoryUrl
//    - calls downloadSnapshot with repository metadata + workspace paths
//    - calls scanRepository with repositoryDirectory + scanId
//    - returns scanId + repository metadata + chunks + skippedFiles
//    - does not return guide.markdown

// 2. creates the temp workspace before GitHub validation
//    Proves:
//    - createTempDirectory runs before validateRepository
//    - no GitHub request happens before workspace isolation exists

// 3. cleans up after a successful scan
//    Proves:
//    - cleanupTempDirectory is called after scanRepository succeeds
//    - cleanup receives the scan directory

// 4. cleans up when repository validation fails
//    Proves:
//    - cleanup still runs if validateRepository throws
//    - the original validation error still bubbles up

// 5. cleans up when snapshot download fails
//    Proves:
//    - cleanup still runs if downloadSnapshot throws
//    - the original download error still bubbles up

// 6. cleans up when repository scanning fails
//    Proves:
//    - cleanup still runs if scanRepository throws
//    - the original scan error still bubbles up
//    - cleanup failures do not mask the original scan error

import { describe, it, expect, beforeEach, vi } from "vitest";
import { runScan } from "../../backend/src/pipelineManager.ts";
import { createTempDirectory } from "../../backend/src/utils/tempDirectory.ts";
import { cleanupTempDirectory } from "../../backend/src/utils/cleanup.ts";
import { validateRepository } from "../../backend/src/github/validateRepository.ts";
import { downloadSnapshot } from "../../backend/src/github/downloadSnapshot.ts";
import { scanRepository } from "../../backend/src/scan/scanService.ts";

vi.mock("../../backend/src/utils/tempDirectory.ts", () => ({
  createTempDirectory: vi.fn(),
}));

vi.mock("../../backend/src/utils/cleanup.ts", () => ({
  cleanupTempDirectory: vi.fn(),
}));

vi.mock("../../backend/src/github/validateRepository.ts", () => ({
  validateRepository: vi.fn(),
}));

vi.mock("../../backend/src/github/downloadSnapshot.ts", () => ({
  downloadSnapshot: vi.fn(),
}));

vi.mock("../../backend/src/scan/scanService.ts", () => ({
  scanRepository: vi.fn(),
}));

const repositoryUrl = "https://github.com/example/project";
const openRouterApiKey = "sk-or-v1-test-key";

const workspace = {
  scanDirectory: "/tmp/lemonbeam/scan_test_123",
  repositoryDirectory: "/tmp/lemonbeam/scan_test_123/repository",
};

const repository = {
  owner: "example",
  name: "project",
  url: "https://github.com/example/project",
  defaultBranch: "main",
  commitSha: "abc123",
};

const scanResult = {
  chunks: [],
  skippedFiles: [{ filePath: "large-file.txt", reason: "File too large" }],
};

function mockSuccessfulPipeline() {
  vi.mocked(createTempDirectory).mockResolvedValueOnce(workspace);
  vi.mocked(validateRepository).mockResolvedValueOnce(repository);
  vi.mocked(downloadSnapshot).mockResolvedValueOnce(workspace.repositoryDirectory);
  vi.mocked(scanRepository).mockResolvedValueOnce(scanResult);
}

describe("runScan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sequences the scan and returns the trimmed sprint result", async () => {
    mockSuccessfulPipeline();

    const result = await runScan({ repositoryUrl, openRouterApiKey });
    const scanId = vi.mocked(createTempDirectory).mock.calls[0]?.[0];

    expect(scanId).toEqual(expect.stringMatching(/^scan_/));
    expect(validateRepository).toHaveBeenCalledWith(repositoryUrl);
    expect(downloadSnapshot).toHaveBeenCalledWith({
      owner: repository.owner,
      name: repository.name,
      commitSha: repository.commitSha,
      scanDirectory: workspace.scanDirectory,
      repositoryDirectory: workspace.repositoryDirectory,
    });
    expect(scanRepository).toHaveBeenCalledWith(
      workspace.repositoryDirectory,
      scanId,
    );

    expect(result).toEqual({
      scanId,
      repository,
      scanResult,
    });
    expect(result).not.toHaveProperty("guide");
  });

  it("creates the temp workspace before GitHub validation", async () => {
    mockSuccessfulPipeline();

    await runScan({ repositoryUrl, openRouterApiKey });

    const createOrder = vi.mocked(createTempDirectory).mock.invocationCallOrder[0];
    const validateOrder = vi.mocked(validateRepository).mock.invocationCallOrder[0];

    expect(createOrder).toBeLessThan(validateOrder);
  });

  it("cleans up after a successful scan", async () => {
    mockSuccessfulPipeline();

    await runScan({ repositoryUrl, openRouterApiKey });

    expect(cleanupTempDirectory).toHaveBeenCalledOnce();
    expect(cleanupTempDirectory).toHaveBeenCalledWith(workspace.scanDirectory);

    const scanOrder = vi.mocked(scanRepository).mock.invocationCallOrder[0];
    const cleanupOrder = vi.mocked(cleanupTempDirectory).mock
      .invocationCallOrder[0];

    expect(scanOrder).toBeLessThan(cleanupOrder);
  });

  it("cleans up when repository validation fails", async () => {
    const validationError = new Error("validation failed");

    vi.mocked(createTempDirectory).mockResolvedValueOnce(workspace);
    vi.mocked(validateRepository).mockRejectedValueOnce(validationError);

    await expect(runScan({ repositoryUrl, openRouterApiKey })).rejects.toBe(
      validationError,
    );

    expect(cleanupTempDirectory).toHaveBeenCalledWith(workspace.scanDirectory);
    expect(downloadSnapshot).not.toHaveBeenCalled();
    expect(scanRepository).not.toHaveBeenCalled();
  });

  it("cleans up when snapshot download fails", async () => {
    const downloadError = new Error("download failed");

    vi.mocked(createTempDirectory).mockResolvedValueOnce(workspace);
    vi.mocked(validateRepository).mockResolvedValueOnce(repository);
    vi.mocked(downloadSnapshot).mockRejectedValueOnce(downloadError);

    await expect(runScan({ repositoryUrl, openRouterApiKey })).rejects.toBe(
      downloadError,
    );

    expect(cleanupTempDirectory).toHaveBeenCalledWith(workspace.scanDirectory);
    expect(scanRepository).not.toHaveBeenCalled();
  });

  it("cleans up when repository scanning fails", async () => {
    const scanError = new Error("scan failed");

    vi.mocked(createTempDirectory).mockResolvedValueOnce(workspace);
    vi.mocked(validateRepository).mockResolvedValueOnce(repository);
    vi.mocked(downloadSnapshot).mockResolvedValueOnce(workspace.repositoryDirectory);
    vi.mocked(scanRepository).mockRejectedValueOnce(scanError);

    await expect(runScan({ repositoryUrl, openRouterApiKey })).rejects.toBe(
      scanError,
    );

    expect(cleanupTempDirectory).toHaveBeenCalledWith(workspace.scanDirectory);
  });

  it("does not mask the original scan error when cleanup also fails", async () => {
    const scanError = new Error("scan failed");
    const cleanupError = new Error("cleanup failed");

    vi.mocked(createTempDirectory).mockResolvedValueOnce(workspace);
    vi.mocked(validateRepository).mockResolvedValueOnce(repository);
    vi.mocked(downloadSnapshot).mockResolvedValueOnce(workspace.repositoryDirectory);
    vi.mocked(scanRepository).mockRejectedValueOnce(scanError);
    vi.mocked(cleanupTempDirectory).mockRejectedValueOnce(cleanupError);

    await expect(runScan({ repositoryUrl, openRouterApiKey })).rejects.toBe(
      scanError,
    );

    expect(cleanupTempDirectory).toHaveBeenCalledWith(workspace.scanDirectory);
  });
});
