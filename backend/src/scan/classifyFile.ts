// File purpose classifier. Called by scan/scanService.ts on each file
// scan/discoverFiles.ts returns (step 2 of discover -> classify -> chunk).
//
// TODO: for each file, decide its FilePurpose (source, test, docs, config,
// scripts, types, or unknown) and language, using multiple signals (path,
// filename, extension, package.json scripts/dependencies, nearby files) —
// not one rule alone. Files with insufficient evidence should stay
// "unknown" rather than being forced into the wrong category.
//
// OUTPUT SHAPE — OPEN QUESTION, resolve with the team before implementing:
// types/chunk.ts's ChunkInput is { scanId, filePath, content, filePurpose,
// language } and is meant to be the one shared shape every chunker takes.
// But the already-merged configChunker.ts expects a different shape it
// invented locally (ClassifiedFile: { scanId, filePath, purpose, language,
// extension, content }) — note "purpose" not "filePurpose", plus an
// "extension" field ChunkInput doesn't have. Before writing this file,
// confirm with the team (and whoever owns chunkFile.ts / configChunker.ts)
// whether this file should produce ChunkInput exactly, or whether
// ChunkInput itself needs an "extension" field added in types/chunk.ts.
// Do not silently invent a third shape.
export {}
