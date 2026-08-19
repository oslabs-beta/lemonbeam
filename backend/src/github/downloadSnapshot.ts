// Downloads the exact repository snapshot (default branch + commit SHA
// already identified by github/validateRepository.ts) into this scan's
// temp directory (see utils/tempDirectory.ts), and returns the local
// folder path for scan/scanService.ts to analyze. Called by
// pipelineManager.ts, after validateRepository.ts and before scanService.ts.
//
// Downloads from the unauthenticated tarball URL
// codeload.github.com/{owner}/{repo}/tar.gz/{sha} — NOT the REST API, and
// does NOT use GITHUB_TOKEN. This is a plain file download and isn't
// subject to the REST API's rate limit at all (see DECISIONS.md > "GitHub
// Access Uses a Personal Access Token for Validation Calls").
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { x as extractTar } from "tar";


type DownloadSnapshotInput = {
    owner: string; 
    name: string; 
    commitSha: string; 
    scanDirectory: string; 
    repositoryDirectory: string; 
}; 

async function downloadSnapshot(input: DownloadSnapshotInput):Promise<string> {
    const tarballUrl = `https://codeload.github.com/${input.owner}/${input.name}/tar.gz/${input.commitSha}`;

    const response = await fetch(tarballUrl);

    if (!response.ok) {
        throw new Error("Failed to download repository snapshot");
    }

    await mkdir(input.repositoryDirectory, { recursive: true });

    const archivePath = join(input.scanDirectory, "snapshot.tar.gz"); 
    const archiveBuffer = Buffer.from(await response.arrayBuffer()); 

    await writeFile(archivePath, archiveBuffer);

    await extractTar({
        file: archivePath,
        cwd: input.repositoryDirectory, 
        strip: 1,
    });

    return input.repositoryDirectory; 
}
export { downloadSnapshot }; 
export type { DownloadSnapshotInput };
