type FilePurpose =
  | "source"
  | "test"
  | "docs"
  | "config"
  | "scripts"
  | "types"
  | "unknown";

type Parser =
  | "tree-sitter"
  | "markdown"
  | "config"
  | "fallback";

type Language =
  | "typescript"
  | "javascript"
  | "markdown"
  | "json"
  | "text"
  | "unknown";

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
  | "unknown";

type Chunk = {
  scanId: string;
  filePath: string;
  filePurpose: FilePurpose;
  language: Language;
  parser: Parser;
  chunkKind: ChunkKind;
  chunkName?: string;
  parentName?: string;
  startLine?: number;
  endLine?: number;
  startColumn?: number;
  endColumn?: number;
  text: string;
};

/*
  ChunkInput is the shared input shape every chunker (treeSitterChunker,
  markdownChunker, configChunker, fallbackChunker) accepts, and the shape
  chunkFile.ts is responsible for routing to the right one.

  scanService.ts assembles this object for one file by combining:
    - the file path from discoverFiles.ts
    - the file's raw content, read once from disk
    - the filePurpose and language assigned by classifyFile.ts

  Every chunker takes one ChunkInput and returns Chunk[]. Keeping this shape
  identical across chunkers is what lets chunkFile.ts stay a simple router
  instead of special-casing arguments per chunker.
*/
type ChunkInput = {
  scanId: string;
  filePath: string;
  content: string;
  filePurpose: FilePurpose;
  language: Language;
};

export type {
    FilePurpose,
    Parser,
    Language,
    ChunkKind,
    Chunk,
    ChunkInput
}

/*
  Chunk Object Property Guide

  The Chunk object is the shared output shape that every LemonBeam chunker must
  return. It does not matter whether the chunk came from Tree-sitter parsing,
  Markdown heading parsing, config-file parsing, or fallback text splitting.
  Every chunker should return an array of Chunk objects: Chunk[].

  This shared shape matters because all chunks eventually get saved into SQLite.
  If every chunker returns the same object shape, the database layer, retrieval
  layer, guide-generation layer, and citation-validation layer can all work with
  chunks in one consistent way.

  ---------------------------------------------------------------------------
  scanId: string
  ---------------------------------------------------------------------------

  The unique ID for the scan that produced this chunk.

  LemonBeam scans one repository at a time. Each time a user submits a GitHub
  repository URL, the backend should create a unique scanId for that scan.

  Example:
    scanId: "scan_12345"

  Why this matters:
  - Lets SQLite group chunks by scan.
  - Prevents chunks from different scans from getting mixed together.
  - Lets the backend retrieve only the chunks for the current repository scan.

  ---------------------------------------------------------------------------
  filePath: string
  ---------------------------------------------------------------------------

  The path to the file inside the scanned repository.

  This should be repo-relative, not an absolute path on your computer.

  Good:
    filePath: "src/App.tsx"
    filePath: "README.md"
    filePath: "backend/src/index.ts"

  Avoid:
    filePath: "/Users/yourname/dev/project/src/App.tsx"

  Why this matters:
  - Keeps citations clean and useful.
  - Avoids exposing local machine paths.
  - Lets the generated guide point users back to the original repo file.

  ---------------------------------------------------------------------------
  filePurpose: string
  ---------------------------------------------------------------------------

  The broad category of the file this chunk came from.

  Examples:
    filePurpose: "source"
    filePurpose: "test"
    filePurpose: "docs"
    filePurpose: "config"
    filePurpose: "scripts"
    filePurpose: "types"
    filePurpose: "unknown"

  This usually comes from classifyFile.ts before the file reaches a chunker.

  Why this matters:
  - Helps LemonBeam retrieve the right evidence for each guide section.
  - For example, the Testing section probably wants chunks from test files.
  - The Setup section probably wants config chunks from package.json.
  - The Project Structure section may want source, config, and docs chunks.

  ---------------------------------------------------------------------------
  language: string
  ---------------------------------------------------------------------------

  The language or file format of the chunk.

  Examples:
    language: "typescript"
    language: "javascript"
    language: "markdown"
    language: "json"
    language: "text"
    language: "unknown"

  Why this matters:
  - Helps the backend understand how the chunk was interpreted.
  - Helps prompts describe evidence accurately.
  - Helps future retrieval logic filter by language or format.

  ---------------------------------------------------------------------------
  parser: string
  ---------------------------------------------------------------------------

  The chunking strategy that created this chunk.

  Examples:
    parser: "tree-sitter"
    parser: "markdown"
    parser: "config"
    parser: "fallback"

  Why this matters:
  - Makes debugging easier.
  - Lets the team see which chunker produced a chunk.
  - Helps identify whether a chunk came from structured parsing or a simpler
    heuristic/fallback strategy.

  ---------------------------------------------------------------------------
  chunkKind: string
  ---------------------------------------------------------------------------

  The specific kind of chunk.

  Examples from Tree-sitter:
    chunkKind: "function"
    chunkKind: "class"
    chunkKind: "method"
    chunkKind: "constructor"
    chunkKind: "interface"
    chunkKind: "type"
    chunkKind: "test_case"
    chunkKind: "test_suite"

  Examples from Markdown:
    chunkKind: "markdown_section"

  Examples from config parsing:
    chunkKind: "package_scripts"
    chunkKind: "dependencies"
    chunkKind: "compiler_options"
    chunkKind: "tool_config"

  Examples from fallback parsing:
    chunkKind: "text_block"

  Why this matters:
  - Gives LemonBeam more detail than filePurpose alone.
  - Lets retrieval ask for specific evidence, like package scripts or test cases.
  - Helps the guide generator explain what kind of source-backed evidence it is
    using.

  ---------------------------------------------------------------------------
  chunkName?: string
  ---------------------------------------------------------------------------

  The name of the chunk, if it has one.

  Examples:
    chunkName: "App"
    chunkName: "handleSubmit"
    chunkName: "User"
    chunkName: "Installation"
    chunkName: "scripts"

  This field is optional because not every chunk has a natural name.

  For example:
  - A function chunk can use the function name.
  - A class chunk can use the class name.
  - A Markdown section can use the heading text.
  - A package.json scripts chunk can use "scripts".
  - A fallback text block may not have a useful name.

  Why this matters:
  - Makes chunks easier to identify in logs, SQLite, and prompts.
  - Helps generated guides say things like “The App component...” or
    “The Installation section...”
  - Improves citation readability.

  ---------------------------------------------------------------------------
  parentName?: string
  ---------------------------------------------------------------------------

  The name of the parent structure that contains this chunk, if there is one.

  Examples:
    A method inside a class:
      chunkKind: "method"
      chunkName: "render"
      parentName: "DashboardPage"

    A test case inside a test suite:
      chunkKind: "test_case"
      chunkName: "shows an error when login fails"
      parentName: "LoginForm"

    A subsection inside a Markdown section:
      chunkKind: "markdown_section"
      chunkName: "Environment Variables"
      parentName: "Setup"

  This field is optional because many chunks do not have a parent.

  Why this matters:
  - Preserves context.
  - Helps explain where a chunk belongs.
  - Helps distinguish two chunks with the same name in different parent scopes.

  ---------------------------------------------------------------------------
  startLine?: number
  ---------------------------------------------------------------------------

  The starting line number of this chunk in the original file.

  Example:
    startLine: 12

  This field is optional because some chunkers may not be able to calculate it
  immediately, but the goal should be to include it whenever possible.

  Why this matters:
  - Needed for source citations.
  - Helps users find the evidence in the original file.
  - Helps citation validation confirm that generated claims point to real source
    locations.

  ---------------------------------------------------------------------------
  endLine?: number
  ---------------------------------------------------------------------------

  The ending line number of this chunk in the original file.

  Example:
    endLine: 48

  Why this matters:
  - Pairs with startLine to define the full source range.
  - Lets LemonBeam cite a specific chunk instead of an entire file.
  - Helps avoid vague citations like “see src/App.tsx” when the relevant code is
    only a few lines.

  ---------------------------------------------------------------------------
  startColumn?: number
  ---------------------------------------------------------------------------

  The starting column number of this chunk in the original file.

  Example:
    startColumn: 0

  This is especially useful for Tree-sitter because AST nodes usually include
  both line and column positions.

  Why this matters:
  - Gives more precise source location data.
  - May help future UI features highlight exact code ranges.
  - Useful for debugging parser output.

  ---------------------------------------------------------------------------
  endColumn?: number
  ---------------------------------------------------------------------------

  The ending column number of this chunk in the original file.

  Example:
    endColumn: 1

  Why this matters:
  - Completes the exact source location with startColumn.
  - Useful for precise code references.
  - Helpful if LemonBeam later adds inline source previews or highlighting.

  ---------------------------------------------------------------------------
  text: string
  ---------------------------------------------------------------------------

  The actual content of the chunk.

  Examples:
    text: "function App() { ... }"
    text: "## Installation\nRun npm install..."
    text: "\"scripts\": { \"dev\": \"vite\" }"

  Why this matters:
  - This is the evidence the guide generator will use.
  - This is what may be sent to the LLM in a bounded prompt.
  - This is the source-backed content LemonBeam uses to avoid guessing.

  Important:
  - The text should come from the original repository file.
  - Do not put model-generated summaries here.
  - Do not put unrelated metadata here.
  - Keep the original source content as intact as reasonably possible.

  ---------------------------------------------------------------------------
  Big Picture
  ---------------------------------------------------------------------------

  Each chunk should answer:

    What scan did this come from?
      scanId

    What file did this come from?
      filePath

    What kind of file was it?
      filePurpose, language

    How was it chunked?
      parser

    What kind of chunk is it?
      chunkKind

    What is it called?
      chunkName, parentName

    Where is it in the original file?
      startLine, endLine, startColumn, endColumn

    What source text does it contain?
      text

  As long as every chunker returns this shape, the rest of LemonBeam can treat
  all repository evidence consistently.
*/

