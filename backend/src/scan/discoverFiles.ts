// Repo file discovery. Called by scan/scanService.ts (step 1 of its
// discover -> classify -> chunk sequence).
//
// TODO: walk the downloaded repository's local folder and return the files
// worth analyzing:
// - skip node_modules, .git, and generated build output directories
// - skip binary files
// - skip any individual file over ~1MB (see DECISIONS.md > "Repository Size
//   Limits for the MVP")
// - the whole repository (after the ignores above) should already have been
//   confirmed under ~25-50MB by github/validateRepository.ts before
//   download; this file doesn't need to re-check total size, just per-file
//   size
// - never return a path that escapes the repository root
// - return repository-relative paths, not absolute local filesystem paths
//   (see types/chunk.ts > ChunkInput.filePath)
export {}
