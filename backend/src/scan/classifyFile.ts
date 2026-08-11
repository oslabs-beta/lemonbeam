// File purpose classifier. Called by scan/scanService.ts on each file
// scan/discoverFiles.ts returns (step 2 of discover -> classify -> chunk).
//
// TODO: for each file, decide its FilePurpose (source, test, docs, config,
// scripts, types, or unknown) and language, using multiple signals (path,
// filename, extension, package.json scripts/dependencies, nearby files) —
// not one rule alone. Files with insufficient evidence should stay
// "unknown" rather than being forced into the wrong category.
//
// OUTPUT SHAPE: produce types/chunk.ts's ChunkInput exactly —
// { scanId, filePath, content, filePurpose, language }. Confirmed against
// the merged chunkFile.ts/configChunker.ts, which both import ChunkInput
// directly from types/chunk.ts and only read filePurpose/filePath/content
// (configChunker.ts derives the file extension itself from filePath rather
// than expecting it on the input). Do not invent a different shape.
export {}
