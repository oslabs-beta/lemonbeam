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
function buildChunk(
  node: Parser.SyntaxNode, 
  chunkKind: ChunkKind,
  input: ChunkInput,
): Chunk {
// Tree-sitter grammars only define a "name" field for node types that
// actually name themselves (functions, classes, interfaces...). Nodes
// without one fall back to "(unknown)".
  const nameNode = node.childForFieldName("name");

  return {
    scanId: input.scanId,
    filePath: input.filePath,
    filePurpose: input.filePurpose,
    language: input.language,
    parser: "tree-sitter",
    chunkKind,
    chunkName: nameNode ? nameNode.text : "(unknown)",
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
    startColumn: node.startPosition.column,
    endColumn: node.endPosition.column,
    text: input.content.slice(node.startIndex, node.endIndex),
  }
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

    chunks.push(chunk);
  }

  // Special case: arrow functions assigned to a const/let/var.
  // These don't have their own top-level node type, so the table can't catch them —
  // we have to look inside the declaration to see if it's wrapping an arrow function.
  if (node.type === "lexical_declaration") {
    const declarator = node.namedChildren[0];
    const valueNode = declarator.childForFieldName("value");

    if (valueNode && valueNode.type === "arrow_function") {
      const nameNode = declarator.childForFieldName("name");

      chunks.push({
        scanId: input.scanId,
        filePath: input.filePath,
        filePurpose: input.filePurpose,
        language: input.language,
        parser: "tree-sitter",
        chunkKind: "arrow_function",
        chunkName: nameNode ? nameNode.text : "(unknown)",
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        startColumn: node.startPosition.column,
        endColumn: node.endPosition.column,
        text: input.content.slice(node.startIndex, node.endIndex),
      });
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

export { chunkWithTreeSitter };