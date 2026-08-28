// Tree-sitter chunking stratety described in ARCHITECTURE.md
// The chunkFile() function below is this file's only public entry point
// it's what the chunking router (chunkFile.ts) will call for source, script,
// and type files. Test-specific extraction is a separate strategy.

import Parser from "tree-sitter";
import TypeScriptPackage from "tree-sitter-typescript";
import JavaScriptGrammar from "tree-sitter-javascript";
import type { Chunk, ChunkKind, ChunkInput } from "../types/chunk.js";

// tree-sitter-typescript bundles two grammars under one import (.typescript
// and .tsx); LemonBeam only parses plain TypeScript, not TSX.
const TypeScript = TypeScriptPackage.typescript

// Entry point: parses the whole tree and returns every chunk found in this file.
function chunkWithTreeSitter(input: ChunkInput): Chunk[] {
  const parser = new Parser();

  // Pick the grammar based on language before parsing.
  if (input.language === "typescript") {
    parser.setLanguage(TypeScript);
  } else if (input.language === "javascript") {
    parser.setLanguage(JavaScriptGrammar);
  }

  const tree = parser.parse(input.content);

  const chunks: Chunk[] = [];
  walk(tree.rootNode, chunks, input);
  return chunks;
}

// Maps a tree-sitter node type to the ChunkKind label we want to store.
// Covers the "clean" cases where node type alone tells us what we're looking at.
const TYPE_TO_KIND_LOOKUP: Record <string, ChunkKind> = {
  class_declaration: "class",
  method_definition: "method",
  function_declaration: "function",
  interface_declaration: "interface",
  type_alias_declaration: "type",
  enum_declaration: "enum",
}

// Builds a single Chunk object from a matched node + its resolved kind.
// chunkName is optional: when omitted, falls back to the node's own "name"
// field (works for declarations like functions/classes). Callers that
// resolve a name a different way (e.g. a string-literal call argument)
// can pass one in directly.
function buildChunk(
  node: Parser.SyntaxNode, 
  chunkKind: ChunkKind,
  input: ChunkInput,
  chunkName?: string,
): Chunk {

let resolvedName: string;

  if (chunkName !== undefined) {
    resolvedName = chunkName;
  } else {
    const nameNode = node.childForFieldName("name");
    if (nameNode !== null) {
    resolvedName = nameNode.text;
    } else {
    resolvedName = "(unknown)";
    }
  }
  return {
    scanId: input.scanId,
    filePath: input.filePath,
    filePurpose: input.filePurpose,
    language: input.language,
    parser: "tree-sitter",
    chunkKind,
    chunkName: resolvedName,
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
    startColumn: node.startPosition.column,
    endColumn: node.endPosition.column,
    text: input.content.slice(node.startIndex, node.endIndex),
  }
}

// Placeholder token estimator. Swap for the real tiktoken-based
// estimateTokens() once it lands
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const MAX_TOKENS_PER_CHUNK = 500;

// How many consecutive body statements get grouped into one split chunk.
// Fixed count, not token-aware — simpler than packing by running token
// total, at the cost of not guaranteeing every split chunk stays under
// MAX_TOKENS_PER_CHUNK if a group's statements happen to be large.
const STATEMENTS_PER_CHUNK = 3;

// OSP-43: if a matched node's chunk is over the token cap, split it into
// chunks of STATEMENTS_PER_CHUNK consecutive body statements each,
// instead of emitting the whole thing as one arbitrarily large chunk.
// `fullChunk` is the chunk already built for `node` (so name resolution
// and constructor relabeling are already applied) — this only decides
// whether to keep it as-is or break it apart.
function splitOversizedChunk(
  node: Parser.SyntaxNode,
  fullChunk: Chunk,
  input: ChunkInput,
): Chunk[] {
  if (estimateTokens(fullChunk.text) <= MAX_TOKENS_PER_CHUNK) {
    return [fullChunk];
  }

  const body = node.childForFieldName("body");

  if (body === null || body.namedChildren.length === 0) {
    return [fullChunk];
  }

  const splitChunks: Chunk[] = [];

  for (let i = 0; i < body.namedChildren.length; i += STATEMENTS_PER_CHUNK) {
    const firstChild = body.namedChildren[i];
    const lastIndex = Math.min(i + STATEMENTS_PER_CHUNK - 1, body.namedChildren.length - 1);
    const lastChild = body.namedChildren[lastIndex];
    const partName = fullChunk.chunkName + " (part " + (splitChunks.length + 1) + ")";

    splitChunks.push({
      scanId: input.scanId,
      filePath: input.filePath,
      filePurpose: input.filePurpose,
      language: input.language,
      parser: "tree-sitter",
      chunkKind: fullChunk.chunkKind,
      chunkName: partName,
      startLine: firstChild.startPosition.row + 1,
      endLine: lastChild.endPosition.row + 1,
      startColumn: firstChild.startPosition.column,
      endColumn: lastChild.endPosition.column,
      text: input.content.slice(firstChild.startIndex, lastChild.endIndex),
    });
  }

  return splitChunks;
}

// Recursively visits every node in the syntax tree, one level at a time.
function walk(node: Parser.SyntaxNode, chunks: Chunk[], input: ChunkInput) {
  // Table lookup: does this node's type map to a ChunkKind?
  let chunkKind = TYPE_TO_KIND_LOOKUP[node.type];

  if (chunkKind) {
    const chunk = buildChunk(node, chunkKind, input);

    // Constructors are method_definition nodes named "constructor" —
    // relabel them so they get their own distinct chunkKind.
    if (chunk.chunkName === "constructor") {
      chunk.chunkKind = "constructor";
    }

    // Don't push an oversized chunk as one arbitrarily large
    // piece — splitOversizedChunk hands back the chunk unchanged if it's
    // already under the cap, or several smaller part-chunks if it isn't.
    const splitChunks = splitOversizedChunk(node, chunk, input);
    for (const splitChunk of splitChunks) {
      chunks.push(splitChunk);
    }
  }

  // Special case: arrow functions assigned to a const/let/var.
  // These don't have their own top-level node type, so the table can't catch them —
  // we have to look inside the declaration to see if it's wrapping an arrow function.
  if (node.type === "lexical_declaration") {
    const declarator = node.namedChildren[0];
    const valueNode = declarator.childForFieldName("value");

    if (valueNode && valueNode.type === "arrow_function") {
      const nameNode = declarator.childForFieldName("name");

      // OSP-43: build this chunk through buildChunk (instead of listing
      // every field by hand) so it goes through the same cap-and-split
      // check as every other chunk kind below.
      const resolvedName = nameNode ? nameNode.text : "(unknown)";
      const chunk = buildChunk(node, "arrow_function", input, resolvedName);

      // Pass valueNode (the arrow_function itself), not node (the
      // lexical_declaration wrapper) — lexical_declaration has no "body"
      // field, so splitOversizedChunk's childForFieldName("body") lookup
      // would always come back null and silently skip splitting.
      const splitChunks = splitOversizedChunk(valueNode, chunk, input);
      for (const splitChunk of splitChunks) {
        chunks.push(splitChunk);
      }
    }
  }

  // Base case: no children left, so recursion stops here.
  if (node.namedChildren.length === 0) {
    return;
  }

  // Recurse into every child, regardless of whether this node matched anything above.
  for (const child of node.namedChildren) {
    walk(child, chunks, input);
  }
}

export { chunkWithTreeSitter, buildChunk };