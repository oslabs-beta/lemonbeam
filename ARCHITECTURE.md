# LemonBeam Architecture

## Purpose

This document explains how LemonBeam’s major system components fit together and how repository data moves through the application.

It owns:

- the high-level system architecture
- component responsibilities
- the repository analysis pipeline
- parsing and chunking responsibilities
- guide-generation orchestration
- the backend directory structure
- the temporary scan lifecycle

Related documents own other concepts:

- `PROJECT_BRIEF.md` — product problem, MVP scope, guide format, user flow, evaluation goals, and stretch features
- `API_CONTRACT.md` — exact frontend and backend routes, requests, responses, status codes, and errors
- `DATABASE.md` — SQLite tables, columns, relationships, indexes, and detailed database lifecycle
- `DECISIONS.md` — technical decisions and the reasons behind them
- `TESTING.md` — testing strategy, tools, commands, and guide-quality evaluation
- `CONTRIBUTING.md` — Git workflow and contribution practices
- `AGENTS.md` — AI-agent behavior and boundaries

## System Overview

LemonBeam is a web application that analyzes an unfamiliar public JavaScript or TypeScript repository and produces a source-backed contributor guide.

The main components are:

1. **React and Vite frontend** — accepts a GitHub repository URL and displays the completed guide.
2. **Express backend** — receives scan requests and coordinates the full scan lifecycle.
3. **GitHub integration** — validates the repository, reads repository metadata, identifies the default branch and commit SHA, and provides access to the exact source snapshot.
4. **Repository analyzer** — discovers files, classifies them by purpose, and chooses the appropriate parsing and chunking strategy.
5. **SQLite scan workspace** — stores structured repository evidence and metadata for one scan.
6. **Guide orchestration** — retrieves evidence for each guide section and coordinates section generation.
7. **LLM provider** — generates each primary guide section from only the evidence selected for that section, using the OpenRouter API key supplied by the user for that scan. The MVP routes this through OpenRouter to a single fixed OpenAI model; letting the user pick among a few models is a stretch goal (see `PROJECT_BRIEF.md` > "Multiple LLM Provider Options").
8. **Citation validation and guide assembly** — validates source references, combines the generated sections, and assembles uncertainty information.
9. **Cleanup process** — deletes the downloaded repository, temporary SQLite database, and intermediate scan files.

## High-Level Component Flow

```text
User
  |
  v
React + Vite Frontend
  |
  | repository scan request
  v
Express Backend
  |
  +---------------------> GitHub
  |                        |
  |                        | validation, metadata,
  |                        | branch, commit SHA,
  |                        | exact source snapshot
  |                        v
  |                  Downloaded Repository
  |                        |
  v                        v
Repository Analyzer
  |
  | discover -> classify -> parse -> chunk
  v
Temporary SQLite Scan Workspace
  |
  | section-specific rule-based retrieval
  v
Guide Orchestration
  |
  | one evidence set and one prompt
  | for each generated section
  v
LLM Provider
  |
  | generated text, citations, uncertainties
  v
Citation Validation + Guide Assembly
  |
  v
Express Backend
  |
  v
React Frontend
  |
  v
Displayed / Downloadable Guide

After completion or failure:
Downloaded repository + temporary database + intermediate files -> deleted
```

## Component Responsibilities

### React and Vite Frontend

The frontend is responsible for the user-facing workflow.

It:

- accepts a public GitHub repository URL
- collects the user's OpenRouter API key, required because LemonBeam is bring-your-own-key (BYOK)
- sends the scan request, including the API key, to the Express backend
- never persists the API key beyond the active session
- displays scan progress or errors
- displays the completed guide
- allows the user to copy or download the generated output

The frontend does not analyze repositories or call the LLM directly. The frontend collects the API key on the user's behalf, but only the backend uses it to talk to OpenRouter.

Exact request and response formats belong in `API_CONTRACT.md`.

### Express Backend

The Express backend is the entry point for the scanning workflow.

It:

- receives scan requests from the frontend, including the user-supplied OpenRouter API key
- generates a unique scan ID and creates that scan's isolated temporary workspace (via `utils/tempDirectory.ts`) immediately after request validation succeeds, before contacting GitHub
- coordinates validation and repository download
- runs repository discovery, classification, parsing, and chunking
- stores chunks and metadata in SQLite
- starts guide generation, passing the user-supplied OpenRouter API key to the LLM provider for that request only
- returns the completed guide
- performs cleanup after success or failure

`routes/scans.ts` itself stays thin: it validates the request and calls `pipelineManager.ts`, then turns the result into the HTTP response. `pipelineManager.ts` is the file that actually sequences everything above — scan-ID/workspace creation, GitHub validation and download, repository analysis, guide generation, and cleanup — wrapped in a try/finally so cleanup always runs, even if an earlier step fails (see `DECISIONS.md` > "Thin Routes; `pipelineManager.ts` Sequences the Scan").

The OpenRouter API key is held in memory for the lifetime of the request only. It is never written to SQLite, logs, temporary files, or error responses.

### GitHub Integration

The GitHub integration connects LemonBeam to supported public repositories.

It is responsible for:

- validating that the repository exists
- confirming that the repository is public and hosted on GitHub
- retrieving repository metadata
- identifying the default branch
- identifying the exact commit SHA being analyzed
- providing access to the repository snapshot for that version

The commit SHA connects the generated guide and its citations to the exact repository version that LemonBeam analyzed.

The team is adding a `github/` area to the backend. Its internal filenames should be documented here after the team finalizes them rather than being invented in advance.

### Repository Analyzer

The repository analyzer is the part of the backend that turns repository files into structured evidence.

Its pipeline is:

```text
Discover files
-> apply ignore and safety rules
-> classify each file by purpose
-> choose a parsing and chunking strategy
-> create normalized chunks
-> store chunks and metadata in SQLite
```

The analyzer is composed primarily of the `scan/` and `chunking/` areas.

### File Discovery

`scan/discoverFiles.ts` walks through the downloaded repository and identifies files LemonBeam may inspect.

It should exclude content that should not be analyzed, including:

- dependency directories such as `node_modules`
- Git internals such as `.git`
- generated build output
- binary files
- files that exceed the supported size limits

### File Classification

`scan/classifyFile.ts` determines the likely purpose of each discovered file.

Possible purposes include:

- source
- test
- docs
- config
- scripts
- types
- unknown

Classification uses multiple deterministic signals rather than relying on one filename or folder rule. For the MVP, these signals are limited to paths, filenames, extensions, configuration files, and relationships between nearby files. `classifyFile.ts` does not read the content of the file it is classifying — see `DECISIONS.md` > "Path-Based Classification for the MVP, Content-Pattern Signals as a Stretch Goal" for why content-pattern signals are deferred and what building them later would require.

Low-confidence files should remain unknown rather than being forced into an incorrect category.

### Parsing and Chunking

Parsing and chunking are related but separate responsibilities.

- **Parsing** identifies the structure of a file.
- **Chunking** uses that structure, or another file-appropriate rule, to create useful retrievable pieces.

`chunking/chunkFile.ts` acts as the router. It chooses the correct strategy based on the file classification and file type.

LemonBeam uses these strategies:

| File purpose | Examples | Strategy | Result |
|---|---|---|---|
| Source | `src/index.ts`, `lib/utils.js` | Tree-sitter | Functions, classes, methods, arrow functions, types, interfaces, and enums |
| Tests | `*.test.ts`, `*.spec.ts`, `__tests__/` | Tree-sitter with test-specific extraction | Test suites, test cases, hooks, and helper functions |
| Documentation | `README.md`, `CONTRIBUTING.md`, `docs/*.md` | Markdown and heading-based chunking | Document sections grouped by headings |
| Configuration | `package.json`, `tsconfig.json`, tool configuration files | Structured or rule-based chunking | Scripts, dependencies, compiler settings, and tool configuration |
| Scripts | Build, release, or command scripts | Tree-sitter for JavaScript or TypeScript; fallback otherwise | Setup, build, release, or command behavior |
| Types | Type declarations and shared type files | Tree-sitter | Type aliases, interfaces, enums, and declaration blocks |
| Unknown text | Unclassified readable files | Fallback chunking or skip | Small line-based chunks when appropriate |

Tree-sitter is one parsing strategy. It is not used for every file type.

Every chunker returns the shared normalized chunk shape defined in `types/chunk.ts`. This document describes how chunks are produced; the source type and database schema own their exact field definitions.

### SQLite Scan Workspace

SQLite acts as a structured evidence workspace between repository analysis and guide generation.

**Not built for the MVP:** `scanService.ts` returns chunks and skipped files in memory instead (see `DECISIONS.md` > "In-Memory Chunk Storage for the MVP, SQLite as a Stretch Goal"). This section describes the stretch-goal design that `DATABASE.md` already specifies.

For each scan, LemonBeam creates an isolated temporary SQLite database. It stores the repository evidence and metadata needed for retrieval.

At a high level, stored information may include:

- repository version metadata
- file paths and classifications
- parser and chunk information
- line ranges
- chunk content
- classification or retrieval signals
- generated section results, citations, or uncertainties when needed

The database is not a permanent user-history database. It belongs to one scan and is deleted during cleanup.

The detailed schema belongs in `DATABASE.md`.

### Rule-Based Retrieval

LemonBeam retrieves evidence using deterministic rules over SQLite metadata rather than vector similarity.

Each generated section receives only the evidence selected for that section.

Retrieval may use signals such as:

- file purpose
- file path
- file type or language
- chunk kind
- chunk name
- package scripts
- dependencies
- configuration metadata
- relevant content patterns

Retrieval logic currently belongs to the database and guide-generation flow described by `db/chunkStore.ts` and `orchestration/generateGuideSection.ts`.

A separate retrieval layer should not be added to this document unless the team formally changes the backend structure.

### Guide Orchestration

For the MVP, LemonBeam creates **one combined generation task and one LLM call** that produces all five primary guide sections at once, from a single general prompt built with evidence gathered across all five sections.

Splitting this into one generation task and one LLM call **per** primary section is a stretch goal (see `PROJECT_BRIEF.md` > "Five Separate Section-Generation Tasks" and `DECISIONS.md` > "One Combined Generation Call for the MVP, Five Tasks as a Stretch Goal").

The exact guide format belongs in `PROJECT_BRIEF.md`.

The MVP orchestration flow is:

```text
Retrieve evidence across all five primary sections
-> estimate each chunk's token cost and score it against every section
-> select a token-budgeted subset per section (see DECISIONS.md >
   "Token-Budgeted, Section-Scored Evidence Selection (Token Ceiling Fix)")
-> build the single general MVP prompt from the selected evidence
-> make one LLM call
-> return combined guide text, citations, and any uncertainties
-> validate citations
-> assemble the sixth Uncertainties section from skipped files and
   budget-excluded chunks
-> return the final guide
```

The stretch-goal orchestration flow (one task per section) is:

```text
Load the section definitions
-> start one task for each primary section
-> retrieve evidence for that section
-> build the matching fixed prompt
-> make one LLM call per section, in parallel
-> return section text, citations, and uncertainties
-> validate citations
-> sort and combine completed sections
-> assemble the uncertainties section
-> return the final guide
```

The orchestration files are:

```text
orchestration/
├── guideSections.ts
├── estimateChunkTokens.ts
├── selectEvidence.ts
├── scoreChunkForSections.ts
├── generateGuideSection.ts
└── generateGuide.ts
```

For the MVP, these files still divide the same responsibilities — retrieval, evidence selection, prompt building, the LLM call, citation validation, and assembly — just for one combined task instead of five.

#### `guideSections.ts`

Defines the primary guide section(s) LemonBeam generates and connects each to its position and prompt behavior. For the MVP, this describes one combined task producing all five sections; the stretch goal restores five independently defined sections.

#### `estimateChunkTokens.ts`

Estimates a chunk's token cost using tiktoken, computed once per chunk before section scoring and selection run. Pure measurement — no knowledge of sections, budgets, or scoring (see DECISIONS.md > "Token-Budgeted, Section-Scored Evidence Selection (Token Ceiling Fix)").

#### `selectEvidence.ts`

Given all chunks retrieved for a scan, a fixed per-section token budget, and a chunk-scoring function, picks each section's highest-scoring chunks up to its budget, then returns the deduplicated union across all five sections as `included`, and everything no section picked as `excluded`. Takes scoring as an injected function so the selection algorithm and the scoring rubric can be built and tested independently.

#### `scoreChunkForSections.ts`

The rule-based rubric scoring one chunk against every guide section (via `filePurpose`, `chunkKind`, and Markdown heading text), rather than assigning a chunk to a single section. Not yet implemented as of this writing; `selectEvidence.ts` is developed against a placeholder scoring function in the meantime.

#### `generateGuideSection.ts`

Runs the shared generation process:

1. retrieve relevant chunks from SQLite
2. use the matching prompt builder
3. send the selected evidence and prompt to the LLM
4. receive the resulting text, citations, and uncertainties
5. validate the returned citations
6. return the result

For the MVP this runs once, for the combined task. In the stretch goal, it runs once per section, in parallel.

#### `generateGuide.ts`

Coordinates the complete guide:

1. reads the section definition(s)
2. selects a token-budgeted evidence subset via `selectEvidence.ts` before generation starts
3. starts the generation task(s)
4. waits for the result(s)
5. sorts the sections into the fixed order
6. combines them into the final guide
7. assembles the Uncertainties section from skipped-file data and budget-excluded chunks (and, once the stretch goal is built, from each task's own uncertainty results too)

### Prompt Builders

For the MVP, one general prompt file, `prompts/mvpGuidePrompt.ts`, covers all five primary sections.

The stretch goal restores one prompt builder per section:

```text
prompts/
├── overviewPrompt.ts
├── setupPrompt.ts
├── runningPrompt.ts
├── structurePrompt.ts
└── testingPrompt.ts
```

Prompt builders define what the guide should explain and how the model should use the supplied evidence.

They should not retrieve files or directly access the repository. Their input is the evidence selected by the guide-generation flow.

### LLM Provider

The LLM provider generates guide prose from:

- a fixed section-specific prompt
- the repository chunks selected for that section
- source identifiers that can be cited

The model does not receive the entire repository.

The model may vary the exact wording of a section, but it should not invent unsupported repository facts.

#### API Key Sourcing

LemonBeam is bring-your-own-key (BYOK). The OpenRouter API key used for a scan comes from the request submitted by the user for that scan, not from a shared server-side credential.

- The key is validated for format before the scan starts, and validated against OpenRouter before it is used for generation.
- The key lives in memory only for the duration of the request that supplied it. It is never persisted to SQLite, written to logs, or returned in a response.
- A server-side `OPENROUTER_API_KEY` environment variable may still exist for local development convenience, but hosted/production usage relies on the per-request user-supplied key.
- For the MVP, every request is routed to a single fixed OpenAI model through OpenRouter. Exposing a choice of models to the user is a stretch goal (see `PROJECT_BRIEF.md` > "Multiple LLM Provider Options").

### Citation Validation

Generated sections must remain source-backed.

Citation validation checks that the model refers only to evidence supplied to that section task.

Repository claims should be connected to stored evidence such as:

- a source identifier
- a repository file path
- a line range
- the corresponding chunk

Missing or unclear information should be returned as uncertainty instead of being guessed.

### Uncertainty Assembly

The Uncertainties and Missing Information section is not produced through another independent LLM call.

Each primary section task may return uncertainty information. `generateGuide.ts` collects those uncertainty items, along with the list of files skipped earlier during discovery, classification, or chunking (see `DECISIONS.md` > "Skipped Files Are Not Fatal, and Are Reported") and the chunks `selectEvidence.ts` excluded for exceeding a section's token budget (see `DECISIONS.md` > "Token-Budgeted, Section-Scored Evidence Selection (Token Ceiling Fix)"), and assembles them into the final section.

The exact guide-section wording and ordering belong in `PROJECT_BRIEF.md`.

### Cleanup

LemonBeam uses temporary scan data.

After a guide is returned, LemonBeam deletes:

- the downloaded repository snapshot
- the temporary SQLite database
- intermediate processing files

Cleanup should also run after a failed scan so abandoned repository data and databases are not left behind.

The team is adding a `utils/` area for shared helper behavior. Exact filenames should be documented here after the team finalizes them.

## End-to-End Scan Lifecycle

Steps 2 through 12 below are sequenced by `pipelineManager.ts`, wrapped in a try/finally so step 12 (cleanup) always runs. `routes/scans.ts` only receives the request (step 1) and sends the response `pipelineManager.ts` returns (step 11).

### 1. Submit

The user submits a public GitHub repository URL through the frontend.

### 2. Validate and Identify the Version

The backend uses the GitHub integration to validate the repository and identify its default branch and exact commit SHA.

### 3. Create an Isolated Scan Workspace

The backend creates a unique workspace for the scan. The downloaded repository, temporary database, and intermediate files belong only to that scan.

`routes/scans.ts` generates the scan ID and calls `utils/tempDirectory.ts` to create this workspace right after request validation succeeds, before any GitHub request is made.

### 4. Download the Exact Repository Snapshot

LemonBeam downloads the repository state associated with the identified branch and commit.

### 5. Discover and Classify Files

The analyzer discovers relevant files, applies ignore rules, and classifies each file by purpose.

### 6. Parse and Chunk Files

`chunkFile.ts` selects the appropriate parser and chunker. Each strategy returns normalized chunks.

### 7. Store Repository Evidence

The chunks and their metadata are written to the scan’s temporary SQLite database.

### 8. Retrieve Evidence for Each Section

Each section task queries SQLite for the evidence relevant to its purpose.

### 9. Generate Primary Sections

Each task builds its prompt and makes one LLM call using only its selected evidence.

### 10. Validate and Assemble

LemonBeam validates citations, sorts the generated sections, combines them, and assembles the uncertainty information.

### 11. Return the Guide

The backend returns the completed guide to the frontend for display, copying, or download.

### 12. Delete Temporary Data

The repository snapshot, temporary database, and intermediate files are deleted.

## Backend Directory Structure

The agreed backend structure is shown below. The `github/` and `utils/` areas are included at the folder level because the team has agreed to add them, but their internal filenames have not yet been finalized. `pipelineManager.ts` is a new top-level file (not a folder) that sequences an entire scan; see "Express Backend" below and `DECISIONS.md` > "Thin Routes; `pipelineManager.ts` Sequences the Scan".

The temporary per-scan databases are runtime artifacts and are not represented as one shared committed database file.

```text
backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── pipelineManager.ts
│   │
│   ├── routes/
│   │   └── scans.ts
│   │
│   ├── github/
│   │
│   ├── scan/
│   │   ├── scanService.ts
│   │   ├── discoverFiles.ts
│   │   └── classifyFile.ts
│   │
│   ├── chunking/
│   │   ├── chunkFile.ts
│   │   ├── treeSitterChunker.ts
│   │   ├── treeSitterTestChunker.ts
│   │   ├── markdownChunker.ts
│   │   ├── configChunker.ts
│   │   └── fallbackChunker.ts
│   │
│   ├── db/
│   │   ├── database.ts
│   │   ├── schema.sql
│   │   └── chunkStore.ts
│   │
│   ├── orchestration/
│   │   ├── guideSections.ts
│   │   ├── estimateChunkTokens.ts
│   │   ├── selectEvidence.ts
│   │   ├── scoreChunkForSections.ts
│   │   ├── generateGuideSection.ts
│   │   └── generateGuide.ts
│   │
│   ├── prompts/
│   │   ├── overviewPrompt.ts
│   │   ├── setupPrompt.ts
│   │   ├── runningPrompt.ts
│   │   ├── structurePrompt.ts
│   │   └── testingPrompt.ts
│   │
│   ├── types/
│   │   └── chunk.ts
│   │
│   └── utils/
│
├── package.json
├── tsconfig.json
├── .env
└── .gitignore
```

## Architectural Boundaries

To keep responsibilities clear:

- Routes receive and return HTTP data; they do not analyze repositories. `pipelineManager.ts`, not the route, sequences the whole scan and guarantees cleanup runs via try/finally.
- GitHub integration handles GitHub-specific validation, metadata, and snapshot access.
- Scan files discover and classify repository files.
- Chunking files parse and divide files into normalized evidence.
- Database files create the SQLite workspace and store or retrieve scan evidence.
- Orchestration files coordinate section generation and guide assembly.
- Prompt files build prompts; they do not retrieve repository data.
- The frontend does not call GitHub or the LLM directly.
- The LLM does not receive the full repository.
- Temporary scan data is not treated as permanent application data.
- The user-supplied OpenRouter API key is used only for the duration of one scan request and is never persisted, logged, or stored in SQLite.

Changes to these boundaries should be recorded in `DECISIONS.md` and reflected here.