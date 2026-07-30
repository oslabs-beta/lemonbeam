import fs from "node:fs";
import Parser from "tree-sitter";
import TypeScriptPackage from "tree-sitter-typescript";
import JavaScriptGrammar from "tree-sitter-javascript";

const TypeScript = TypeScriptPackage.typescript

const filePath = "src/utils.ts";
const source = fs.readFileSync(filePath, "utf8");
const language = "typescript";

const parser = new Parser();

// Pick the grammar based on language before parsing.
if (language === "typescript") {
  parser.setLanguage(TypeScript);
} else if (language === "javascript") {
  parser.setLanguage(JavaScriptGrammar);
}

const tree = parser.parse(source);

// console.log(tree)

type FilePurpose =
  | "source"
  | "test"
  | "docs"
  | "config"
  | "scripts"
  | "types"
  | "unknown"

type Language =
  | "typescript"
  | "javascript"
  | "markdown"
  | "json"
  | "text"
  | "unknown"

  // Every kind of code construct we know how to chunk.
type ChunkKind =
  | "function"
  | "class"
  | "method"
  | "constructor"
  | "arrow_function"
  | "type"
  | "interface"
  | "enum"
  | "test_suite"
  | "test_case"
  | "test_hook"
  | "markdown_section"
  | "package_scripts"
  | "dependencies"
  | "compiler_options"
  | "tool_config"
  | "text_block"
  | "unknown"

type Chunk = {
  scanId: string
  filePath: string
  filePurpose: FilePurpose
  language: Language
  parser: "tree-sitter" | "markdown" | "config" | "fallback"
  chunkKind: ChunkKind
  chunkName?: string
  parentName?: string
  startLine?: number
  endLine?: number
  startColumn?: number
  endColumn?: number
  text: string
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
  chunkKind: ChunkKind
): Chunk {
  const nameNode = node.childForFieldName("name");

  return {
    scanId: "test-scan",
    filePath,
    filePurpose: "source",
    language,
    parser: "tree-sitter",
    chunkKind,
    chunkName: nameNode ? nameNode.text : "(unknown)",
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
    startColumn: node.startPosition.column,
    endColumn: node.endPosition.column,
    text: source.slice(node.startIndex, node.endIndex),
  }
}

// Recursively visits every node in the syntax tree, one level at a time.
function walk(node: Parser.SyntaxNode, chunks: Chunk[]) {
  // Table lookup: does this node's type map to a ChunkKind?
  let chunkKind = TYPE_TO_KIND_LOOKUP[node.type];

  if (chunkKind) {
    const chunk = buildChunk(node, chunkKind);

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
        scanId: "test-scan",
        filePath,
        filePurpose: "source",
        language,
        parser: "tree-sitter",
        chunkKind: "arrow_function",
        chunkName: nameNode ? nameNode.text : "(unknown)",
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        startColumn: node.startPosition.column,
        endColumn: node.endPosition.column,
        text: source.slice(node.startIndex, node.endIndex),
      });
    }
  }

  // Base case: no children left, so recursion stops here.
  if (node.namedChildren.length === 0) {
    return;
  }

  // Recurse into every child, regardless of whether this node matched anything above.
  for (const child of node.namedChildren) {
    walk(child, chunks);
  }
}

// Entry point: parses the whole tree and returns every chunk found in this file.
function chunkFile(): Chunk[] {
  const chunks: Chunk[] = [];
  walk(tree.rootNode, chunks);
  return chunks;
}

const output = chunkFile();
console.log(JSON.stringify(output, null, 2));

export {}
