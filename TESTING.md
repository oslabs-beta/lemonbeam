# LemonBeam Testing

## Purpose

This document is the source of truth for LemonBeam’s testing strategy.

It defines:

- what must be tested
- the different levels of testing
- how tests are organized
- how test commands are documented
- how generated guides are evaluated
- which testing-tool decisions are still open

Related concepts belong in their owning documents:

- `PROJECT_BRIEF.md` — product scope, guide format, user flow, and evaluation goals
- `ARCHITECTURE.md` — system components and responsibilities
- `API_CONTRACT.md` — API routes, requests, responses, status codes, and errors
- `DATABASE.md` — SQLite schema, relationships, indexes, and lifecycle
- `DECISIONS.md` — important choices and their reasoning
- `CONTRIBUTING.md` — pull-request and pre-merge expectations
- `AGENTS.md` — AI-agent behavior and review boundaries

When testing tools, commands, or organization change, update this document and the relevant `package.json` files in the same pull request.

## Testing Goals

LemonBeam’s tests should give the team confidence that:

- supported repositories are accepted
- unsupported repositories are rejected correctly
- files are discovered and classified consistently
- each file type is parsed and chunked using the correct strategy
- chunks are stored and retrieved correctly
- simultaneous scans remain isolated
- each guide section receives only relevant evidence
- the guide contains five LLM-generated sections
- the uncertainties section is assembled programmatically
- citations refer to repository evidence
- temporary scan data is deleted
- the frontend and backend follow the API contract
- the generated guide helps a new contributor understand and use the repository

## Testing Tools

The exact testing libraries have not yet been finalized by the team.

Do not add tool names to this document until the team has selected them and added them to the repository.

The chosen tools must support the following needs:

- TypeScript unit testing
- mocking external services
- Express route and API testing
- React component testing
- browser or end-to-end testing, if the team chooses to include it
- test coverage reporting, if the team chooses to track coverage

Once tools are selected, document them here and add the actual dependencies and runnable commands to the relevant `package.json`.

## Test Commands

This document must not invent commands.

Use only commands that are actually defined in the repository’s `package.json` files.

Pull requests should list the exact commands that were actually run.

## Test Levels

LemonBeam uses four testing levels.

### 1. Unit Tests

Unit tests verify one function or module in isolation.

Examples include:

- URL validation
- file-purpose classification rules
- ignore rules
- parser or chunker selection
- Markdown section splitting
- configuration extraction
- fallback chunking
- chunk normalization
- citation validation helpers
- uncertainty aggregation
- cleanup path selection

Unit tests should use small, controlled fixtures.

### 2. Integration Tests

Integration tests verify that multiple backend components work together.

Examples include:

- discovering, classifying, chunking, and storing a fixture repository
- writing files and chunks to SQLite
- retrieving evidence for a guide section
- generating one guide section from controlled evidence
- validating returned citations
- assembling five primary sections and the uncertainty section
- cleaning up a completed or failed scan
- confirming two scan requests use separate directories and databases

Integration tests should use temporary test directories and test databases.

They must not write to a shared production or development database path.

### 3. API and Frontend Tests

API tests verify that the Express backend follows `API_CONTRACT.md`.

Frontend tests verify that the React application handles the supported API behavior correctly.

Examples include:

- accepting `POST /api/scans`
- rejecting missing `repositoryUrl`
- rejecting invalid URLs
- rejecting unknown request fields under strict validation
- returning the correct error shape
- returning repository metadata and `guide.markdown`
- displaying backend errors
- preventing duplicate submissions while one request is active
- displaying the completed Markdown guide
- supporting copy and Markdown download behavior

The API contract is the source of truth for request bodies, responses, status codes, and error codes.

### 4. Guide Evaluation

Guide evaluation measures whether LemonBeam’s final output is useful, accurate, and source-backed.

This is different from testing whether an individual function returns the expected value.

Guide evaluation should use unfamiliar supported JavaScript or TypeScript repositories.

## Test Organization

Tests should be organized by responsibility and test level.

The exact test-directory names may be finalized when the team chooses its test tools, but the organization should follow these categories:

```text
Unit tests
├── scan and classification
├── chunking
├── database helpers
├── orchestration helpers
└── citation and uncertainty helpers

Integration tests
├── repository analysis pipeline
├── SQLite storage and retrieval
├── section generation
├── guide assembly
├── concurrent scan isolation
└── cleanup

API and frontend tests
├── request validation
├── status and error responses
├── successful scan response
├── frontend submission behavior
└── guide display and download

Guide evaluation
├── repository fixtures or selected repositories
├── generated guides
└── evaluation notes
```

Tests should mirror the responsibilities defined in `ARCHITECTURE.md`.

Avoid placing unrelated test concerns in one large file.

## Fixtures

Tests should use small fixture repositories or fixture files that represent the repository structures LemonBeam supports.

Useful fixtures include:

- a small TypeScript project
- a small JavaScript project
- a repository with tests
- a repository with no test command
- a repository with Markdown setup instructions
- a repository with environment-variable documentation
- a repository with configuration files
- a malformed JavaScript or TypeScript file
- an unknown readable text file
- a repository that resembles an unsupported monorepo
- a repository that exceeds a configured test size limit

Fixtures should be:

- small
- deterministic
- committed without secrets
- easy to understand
- focused on one or a few behaviors

Do not rely only on live GitHub repositories for automated tests because external repositories can change.

## External Services

GitHub and the LLM provider are external services.

Automated unit and integration tests should use controlled fixtures or mocked service responses where appropriate.

Tests should not require real API keys unless the team explicitly creates a separate manual or integration-testing workflow for live services.

Live-service testing must never expose or commit:

- GitHub tokens
- OpenRouter API keys
- private repository data

## Required Backend Coverage

### Repository Validation

Test that LemonBeam correctly handles:

- a valid public GitHub URL
- a malformed URL
- a non-GitHub URL
- a missing repository URL
- unexpected request fields
- a repository that does not exist
- a repository that is not publicly accessible
- an unsupported language
- an unsupported monorepo
- a repository over the configured size limit

### File Discovery

Test that LemonBeam:

- finds supported files
- returns repository-relative paths
- ignores `node_modules`
- ignores `.git`
- ignores generated build output
- skips binary files
- skips files over supported limits
- does not escape the repository root

### File Classification

Test the deterministic signals used to classify:

- source files
- test files
- documentation
- configuration
- scripts
- type files
- unknown files

Test that low-confidence files remain `unknown`.

### Parsing and Chunking

Test each strategy separately.

Also test the scan-level resilience behavior: when a chunker fails on one file, `scanService.ts` skips that file, continues scanning the rest of the repository, and records the file path and reason so it can be reported in the final Uncertainties section (see `DECISIONS.md` > "Skipped Files Are Not Fatal, and Are Reported"). A single bad file must not abort the scan.

#### Tree-sitter

Verify extraction of supported structures such as:

- functions
- methods
- classes
- arrow functions
- interfaces
- types
- enums

#### Test-Specific Extraction

Verify extraction of visible test structures such as:

- suites
- test cases
- hooks
- helper functions

#### Markdown

Verify:

- heading boundaries
- section text
- line ranges
- files with no headings

#### Configuration

Verify extraction of relevant structured information such as:

- package scripts
- dependencies
- compiler settings
- tool configuration
- environment-variable examples

#### Fallback

Verify:

- small readable text files can be chunked
- unsupported or unsuitable files can be skipped
- parsing failure does not silently create incorrect chunks

### Chunk Normalization

Every chunker should return the shared shape defined in:

```text
backend/src/types/chunk.ts
```

Test required fields, optional fields, line ranges, parser values, and chunk text.

### SQLite

Not applicable to the MVP (in-memory chunk storage — see `DECISIONS.md` > "In-Memory Chunk Storage for the MVP, SQLite as a Stretch Goal"). Once SQLite storage is built as a stretch goal, test that:

- every scan receives its own database file
- `scan_metadata` contains one row
- files are inserted without duplicates
- chunks reference valid file rows
- foreign keys are enabled
- deleting a file deletes its chunks
- classification scores respect their constraints
- empty chunk text is rejected
- retrieval queries return the intended evidence
- one scan cannot read another scan’s data

### Orchestration

For the MVP (one combined generation task), test that LemonBeam:

- retrieves evidence across all five primary sections before building the prompt
- builds the single general MVP prompt
- makes exactly one LLM call
- parses the response into the fixed section order
- collects citations from the combined response
- assembles the sixth uncertainty section from skipped-file data, without another LLM call
- returns a clear scan-level error (not a partial guide) if the one LLM call fails, using `LLM_SERVICE_ERROR` / `EXTERNAL_SERVICE_ERROR` (see `DECISIONS.md` > "One Combined Generation Call for the MVP, Five Tasks as a Stretch Goal")

Once the five-separate-task stretch goal is built, also test that LemonBeam:

- creates five primary section tasks, running in parallel
- uses the correct prompt for each section
- retrieves evidence separately for each section
- makes one generation call per primary section
- preserves the fixed section order
- collects citations and uncertainties from each task
- handles one failed section task by returning the remaining sections normally and reporting the failed section as an uncertainty, not by failing the whole guide (see `DECISIONS.md` > "Skipped Files Are Not Fatal, and Are Reported")

### Citations

Test that:

- a returned citation refers to supplied repository evidence
- file paths and line ranges come from stored metadata
- unsupported citation identifiers are rejected
- unsupported claims are represented as uncertainty rather than invented evidence

### Cleanup and Isolation

Test that:

- each scan uses a unique scan ID
- each scan uses a unique temporary directory
- each scan uses a unique SQLite path
- simultaneous scans do not mix files, chunks, retrieval results, or guide output
- cleanup deletes only the intended scan directory
- cleanup does not delete the shared parent directory
- database connections are closed before deletion
- failed scans do not leave abandoned temporary data
- `pipelineManager.ts` guarantees cleanup runs via try/finally regardless of which step in the scan failed

## Guide Evaluation Plan

A guide should be evaluated against the exact repository version identified by its commit SHA.

The evaluator should not judge the guide only by how polished the writing sounds.

The evaluator should check whether the guide is accurate, useful, complete enough for the MVP, and supported by citations.

### Evaluation Tasks

Using the generated guide, a new contributor should be able to:

1. explain what the project appears to do
2. identify the major technologies
3. identify the package manager
4. install dependencies when the repository provides instructions
5. identify required environment setup
6. run the application when the repository provides enough information
7. identify major folders
8. identify likely entry points or important files
9. identify the test framework
10. locate test files
11. find and run the test command when one exists
12. verify important claims using citations
13. recognize information that LemonBeam correctly reports as uncertain

### Evaluation Criteria

#### Project Understanding

Check whether the guide correctly explains:

- the repository’s apparent purpose
- the type of application or package
- major technologies
- likely entry points

#### Setup Accuracy

Check whether:

- the package manager is correct
- install commands come from repository evidence
- prerequisites are supported by evidence
- environment variables are identified accurately
- missing setup information is reported as uncertainty

#### Running Accuracy

Check whether:

- development, start, and build commands are correct
- ports are included only when supported
- the guide does not invent local-running steps

#### Structure Accuracy

Check whether:

- important folders are represented
- major files are identified accurately
- module boundaries are not invented
- the explanation is understandable to a newcomer

#### Testing Accuracy

Check whether:

- the test framework is correct
- the test command is correct
- test locations are correct
- missing testing information is reported clearly

#### Citation Correctness

For each important claim, verify that:

- the cited file exists at the recorded commit
- the cited line range contains relevant evidence
- the claim does not overstate what the evidence proves
- the citation belongs to the repository version analyzed

#### Unsupported Claims

Record any claim that:

- has no citation
- is not supported by its citation
- invents a file, script, dependency, command, port, or environment variable
- presents uncertainty as fact

#### Missing Important Information

Record important repository evidence that should have appeared in the relevant guide section but was missed.

#### Newcomer Usefulness

Ask whether the guide helps a contributor move from:

> “I do not understand this repository”

to:

> “I understand what it does and know how to begin working with it.”

## Evaluation Record

Each evaluated repository should record:

```md
# Guide Evaluation

## Repository

- URL:
- Default branch:
- Commit SHA:
- Evaluation date:

## Guide Sections

### 1. Project Overview

- Accurate:
- Useful to a newcomer:
- Missing information:
- Notes:

### 2. Setup / Installation

- Accurate:
- Useful to a newcomer:
- Missing information:
- Notes:

### 3. Running Locally

- Accurate:
- Useful to a newcomer:
- Missing information:
- Notes:

### 4. Project Structure

- Accurate:
- Useful to a newcomer:
- Missing information:
- Notes:

### 5. Testing

- Accurate:
- Useful to a newcomer:
- Missing information:
- Notes:

### 6. Uncertainties and Missing Information

- Were genuine uncertainties reported:
- Were any supported facts incorrectly marked uncertain:
- Were any uncertainties presented as facts:
- Notes:

## Citation Evaluation

- Did important claims include citations:
- Did the cited files exist:
- Did the cited line ranges support the claims:
- Were any citations incorrect or misleading:
- Notes:

## Problems Found

- Unsupported claims:
- Incorrect citations:
- Missing important information:
- Incorrect uncertainties:
- Other issues:

## Overall Outcome

- Could a new contributor explain what the project does:
- Could they install and run it when sufficient instructions existed:
- Could they understand the project structure:
- Could they understand the testing setup:
- Could they verify important claims:
- Overall notes:
```

The team can later add a numeric scoring system if it decides that scores would improve comparison across repositories.

## Pull-Request Expectations

Before merging a change, contributors should:

- run the applicable commands defined in `package.json`
- run tests for the affected area
- add or update tests when behavior changes
- include manual verification when automated coverage is not yet available
- document the exact commands and steps in the pull request
- explain why a relevant test was not run

The pull-request format and general workflow belong in `CONTRIBUTING.md`.

## Open Testing Decisions

The team still needs to finalize:

- the TypeScript test runner
- the React component-testing tool
- the Express/API testing tool
- whether to use a browser end-to-end tool
- the final test-directory layout
- canonical test and coverage commands
- whether guide evaluation uses pass/fail results, numeric scores, or both

Once the team makes these decisions, update this document and record major reasoning in `DECISIONS.md`.