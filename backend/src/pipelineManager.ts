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
  const workspace = await createTempDirectory(scanId);

  try {
    const repository = await validateRepository(input.repositoryUrl);

    const repositoryDirectory = await downloadSnapshot({
      owner: repository.owner,
      name: repository.name,
      commitSha: repository.commitSha,
      scanDirectory: workspace.scanDirectory,
      repositoryDirectory: workspace.repositoryDirectory,
    });

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
      await cleanupTempDirectory(workspace.scanDirectory);
    } catch {
      // Cleanup failures should not mask the scan result or original scan error.
    }
  }
}

export { runScan };
export type { RunScanInput, RunScanResult };
