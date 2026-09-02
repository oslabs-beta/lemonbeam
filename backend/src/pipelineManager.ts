// Pipeline manager: sequences one scan from validated request data through
// guide generation.
//
// routes/scans.ts stays thin: it validates the HTTP request, calls this file,
// and formats the HTTP response. This file owns the backend scan order.
//
// Current pipeline scope:
// 1. generates a unique scan ID
// 2. calls utils/tempDirectory.ts to create this scan's isolated temp
//    directory before any GitHub request is made
// 3. calls github/validateRepository.ts to confirm the repository exists, is
//    public, is JavaScript/TypeScript, is not a monorepo, is within the MVP
//    size limit, and resolves default branch + commit SHA
// 4. calls github/downloadSnapshot.ts to download the exact snapshot into the
//    scan's temp directory using the unauthenticated codeload tarball URL;
//    GITHUB_TOKEN is used only by validateRepository.ts for REST API calls
// 5. calls scan/scanService.ts to discover, classify, and chunk the downloaded
//    repository, returning { chunks, skippedFiles } in memory for the MVP
// 6. calls orchestration/generateGuide.ts once for the MVP, passing chunks,
//    skippedFiles, and the request's openRouterApiKey
// 7. wraps the workflow in try/finally so utils/cleanup.ts always attempts to
//    delete the temp workspace on success or failure
// 8. returns what routes/scans.ts needs for the 200 response: scanId,
//    repository metadata, and guide.markdown
//
// If guide generation fails outright, the whole scan fails; no partial guide is
// returned for the MVP. No retry logic is required here.
//
// This file does not itself talk to Express, GitHub internals, scanning,
// chunking, prompt construction, or LLM providers. It only sequences the owning
// modules.
//
// See DECISIONS.md > "Thin Routes; `pipelineManager.ts` Sequences the Scan"
// and ARCHITECTURE.md > "Express Backend" / "End-to-End Scan Lifecycle".
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { createTempDirectory } from "./utils/tempDirectory.js";
import { cleanupTempDirectory } from "./utils/cleanup.js";
import { validateRepository } from "./github/validateRepository.js";
import { downloadSnapshot } from "./github/downloadSnapshot.js";
import { scanRepository } from "./scan/scanService.js";
import { generateGuide } from "./orchestration/generateGuide.js";
import type { GuideResult } from "./orchestration/generateGuide.js";
import type { ValidatedRepository } from "./github/validateRepository.js";

type RunScanInput = {
  repositoryUrl: string;
  openRouterApiKey: string;
};

type RunScanResult = {
  scanId: string;
  repository: ValidatedRepository;
  guide: GuideResult;
};

async function runScan(input: RunScanInput): Promise<RunScanResult> {
  const scanId = `scan_${randomUUID()}`;

  // Intelligent check: Is this a local path or a remote URL?
  const isLocalPath =
    path.isAbsolute(input.repositoryUrl) ||
    input.repositoryUrl.startsWith(".") ||
    fs.existsSync(input.repositoryUrl);

  let repository: ValidatedRepository;
  let repositoryDirectory: string;
  let workspace:
    | { scanDirectory: string; repositoryDirectory: string }
    | undefined;

  try {
    if (isLocalPath) {
      const resolvedPath = path.resolve(input.repositoryUrl);

      if (
        !fs.existsSync(resolvedPath) ||
        !fs.statSync(resolvedPath).isDirectory()
      ) {
        throw new Error(
          `Local repository path must be an existing directory: ${resolvedPath}`,
        );
      }

      const folderName = path.basename(resolvedPath);
      console.log(`📂 Scanning local directory: ${resolvedPath}`);

      repository = {
        owner: "local",
        name: folderName,
        url: resolvedPath,
        defaultBranch: "HEAD",
        commitSha: "local",
      };

      repositoryDirectory = resolvedPath;
    } else {
      // Only create the temp workspace if it's a remote GitHub repository
      workspace = await createTempDirectory(scanId);

      console.log(`🌐 Fetching remote repository: ${input.repositoryUrl}`);
      repository = await validateRepository(input.repositoryUrl);

      repositoryDirectory = await downloadSnapshot({
        owner: repository.owner,
        name: repository.name,
        commitSha: repository.commitSha,
        scanDirectory: workspace.scanDirectory,
        repositoryDirectory: workspace.repositoryDirectory,
      });
    }

    const scanResult = await scanRepository(repositoryDirectory, scanId);
    const guide = await generateGuide(
      scanResult.chunks,
      scanResult.skippedFiles,
      input.openRouterApiKey,
    );

    return {
      scanId,
      repository,
      guide,
    };
  } finally {
    try {
      // Only clean up if a workspace was actually created
      if (workspace) {
        await cleanupTempDirectory(workspace.scanDirectory);
      }
    } catch {
      // Cleanup failures should not mask the scan result or original scan error.
    }
  }
}

export { runScan };
export type { RunScanInput, RunScanResult };