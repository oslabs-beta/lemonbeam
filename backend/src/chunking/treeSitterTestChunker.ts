import Parser from "tree-sitter";
import TypeScriptPackage from "tree-sitter-typescript";
import JavaScriptGrammar from "tree-sitter-javascript";
import type { Chunk, ChunkKind, ChunkInput } from "../types/chunk.js";
import { chunkWithTreeSitter, buildChunk } from "./treeSitterChunker.js";

const TypeScript = TypeScriptPackage.typescript;

// Maps a test-framework call's function name to the ChunkKind it represents.
const TEST_CALL_TO_KIND_LOOKUP: Record<string, ChunkKind> = {
  describe: "test_suite",
  it: "test_case",
  test: "test_case",
  beforeAll: "test_hook",
  beforeEach: "test_hook",
  afterEach: "test_hook",
  afterAll: "test_hook",
};

// Returns the plain function name being called, whether it's a direct call
// (it(...)) or a member-expression call (it.skip(...)). For member
// expressions, this returns the outer name ("it", not "skip") — .skip/.only
// variants are treated the same as the base call for now.
function getCalleeName(node: Parser.SyntaxNode): string | undefined {
  const callee = node.childForFieldName("function");

  if (callee === null) {
    return undefined;
  }

  if (callee.type === "identifier") {
    return callee.text;
  }

  if (callee.type === "member_expression") {
    const object = callee.childForFieldName("object");

    if (object === null) {
      return undefined;
    }

    if (object.type === "identifier") {
      return object.text;
    }

    return undefined;
  }

  return undefined;
}

// Extracts the text of a call's first string-literal argument — the
// "LoginForm" out of describe("LoginForm", () => {...}). Returns undefined
// for calls with no string argument (like the hooks, which take only a
// callback).
function getFirstStringArgument(node: Parser.SyntaxNode): string | undefined {
  const args = node.childForFieldName("arguments");

  if (args === null) {
    return undefined;
  }

  const firstArg = args.namedChildren[0];

  if (firstArg === undefined || firstArg.type !== "string") {
    return undefined;
  }

  const fragment = firstArg.namedChildren[0];

  if (fragment === undefined) {
    return undefined;
  }

  return fragment.text;
}

// Recursively visits every node looking specifically for describe/it/test/
// hook calls. Reuses buildChunk from treeSitterChunker.ts so chunk
// construction (position, text, scanId, etc.) stays identical to every
// other chunk kind LemonBeam produces.
function walkForTestConstructs(node: Parser.SyntaxNode, chunks: Chunk[], input: ChunkInput) {
  if (node.type === "call_expression") {
    const calleeName = getCalleeName(node);

    if (calleeName !== undefined) {
      const chunkKind = TEST_CALL_TO_KIND_LOOKUP[calleeName];

      if (chunkKind !== undefined) {
        let chunkName = getFirstStringArgument(node);

        if (chunkName === undefined) {
          chunkName = calleeName;
        }

        chunks.push(buildChunk(node, chunkKind, input, chunkName));
      }
    }
  }

  for (const child of node.namedChildren) {
    walkForTestConstructs(child, chunks, input);
  }
}

// Entry point for test files: combines the general matching
// chunkWithTreeSitter already does (functions, classes, the arrow-function
// const case, etc.) with test-specific detection of describe/it/test/hook
// calls.
function chunkTestFile(input: ChunkInput): Chunk[] {
  const generalChunks = chunkWithTreeSitter(input);

  const parser = new Parser();
  if (input.language === "typescript") {
    parser.setLanguage(TypeScript);
  } else if (input.language === "javascript") {
    parser.setLanguage(JavaScriptGrammar);
  }
  const tree = parser.parse(input.content);

  const testChunks: Chunk[] = [];
  walkForTestConstructs(tree.rootNode, testChunks, input);

  return [...generalChunks, ...testChunks];
}

export { chunkTestFile }