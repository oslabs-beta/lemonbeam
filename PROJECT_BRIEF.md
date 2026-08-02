# LemonBeam Project Brief

## Purpose

This document is the source of truth for LemonBeam’s:

- problem
- solution
- MVP scope
- fixed guide format
- technical challenges
- user flow
- evaluation plan
- stretch goals

Other project concepts belong in their owning documents:

- `ARCHITECTURE.md` — system components, directory structure, parsing, chunking, orchestration, and component responsibilities
- `API_CONTRACT.md` — frontend and backend routes, requests, responses, status codes, and errors
- `DATABASE.md` — SQLite tables, columns, relationships, indexes, and lifecycle
- `TESTING.md` — testing tools, commands, organization, and detailed evaluation procedures
- `DECISIONS.md` — technical decisions and their reasoning
- `CONTRIBUTING.md` — Git workflow and contribution practices
- `AGENTS.md` — AI-agent behavior and boundaries

## Project Summary

LemonBeam 🍋 shines a fresh beam of light on an unfamiliar codebase.

It scans a public JavaScript or TypeScript repository and generates a fixed-format, source-backed starter guide for new contributors.

Instead of sending the entire repository to an LLM and hoping for a useful explanation, LemonBeam first discovers, classifies, parses, chunks, stores, and retrieves repository evidence. Each primary guide section receives only the evidence relevant to its purpose.

## Problem

Open-source repositories can be difficult for new contributors to understand and begin working in.

Important information is often scattered across:

- README files
- package scripts
- configuration files
- environment setup files
- folder structure
- tests
- source code

A new contributor may need to reconstruct this information manually before they can:

- understand what the project does
- install dependencies
- run the application
- run or understand the tests
- identify important folders and files
- find a reasonable place to begin exploring

A common workaround is to paste repository content into an AI assistant and ask for an explanation. That approach is inconsistent because the result depends on:

- which files are included
- how much context fits
- how the question is phrased
- what evidence the model happens to emphasize

The same repository can therefore produce different explanations for different users, and unsupported claims may be difficult to verify.

## Solution

LemonBeam is a web application that accepts the URL of a supported public GitHub repository and produces a fixed-format contributor guide.

LemonBeam:

1. validates the repository
2. identifies the default branch and exact commit SHA
3. downloads the corresponding repository snapshot
4. discovers and classifies relevant files
5. parses and chunks files using file-appropriate strategies
6. stores repository evidence and metadata in an isolated temporary SQLite database
7. retrieves the evidence relevant to each primary guide section
8. generates each primary section through its own bounded task and LLM call
9. validates citations
10. combines the generated sections
11. assembles uncertainty information
12. returns the completed Markdown guide
13. deletes temporary scan data

LemonBeam uses rule-based retrieval over SQLite metadata rather than vector similarity in the MVP.

For the same repository version and the same classification and retrieval rules, LemonBeam should use the same guide structure and source evidence. The exact LLM wording may vary between generations.

## Fixed Guide Format — MVP Version 1

The completed guide contains six displayed sections.

For the MVP, the first five sections are generated through one combined task and one LLM call, using a single general prompt built from evidence gathered across all five sections. Generating each section through its own separate task and prompt is a stretch goal (see "Five Separate Section-Generation Tasks" below), planned for after the MVP works end to end.

### 1. Project Overview

Explains:

- what the repository appears to do
- what kind of project it is
- the main technologies visible in the repository
- the likely entry points

Includes citations to the repository evidence used for the section.

### 2. Setup / Installation

Explains:

- prerequisites
- package manager
- dependency installation
- environment variables
- setup instructions found in the repository

Includes citations to the repository evidence used for the section.

### 3. Running Locally

Explains:

- development commands
- start and build scripts
- visible ports
- the local development workflow

Includes citations to the repository evidence used for the section.

### 4. Project Structure

Explains:

- important folders
- major files
- visible module boundaries
- how the codebase is organized

Includes citations to the repository evidence used for the section.

### 5. Testing

Explains:

- the test framework
- test commands
- test file locations
- setup files
- visible testing patterns

Includes citations to the repository evidence used for the section.

### 6. Uncertainties and Missing Information

Collects information LemonBeam could not confidently determine from repository evidence.

Examples may include:

- missing setup steps
- unclear environment variables
- unknown Node.js version
- missing test commands
- ambiguous entry points

For the MVP, this section is assembled from the files skipped during scanning and chunking (see `DECISIONS.md` > "Skipped Files Are Not Fatal, and Are Reported"). It does not require a separate LLM call. Once the five-separate-task stretch goal is built, this section will also incorporate uncertainty information returned by each of the five tasks, as originally designed.

Citations appear within the relevant generated sections and are not counted as a separate displayed section.

## MVP Scope

### Supported

- Web application
- Public GitHub repositories
- JavaScript and TypeScript projects
- Single-package repositories
- Default branch scans
- Repositories within defined size limits
- Markdown guide output
- Source citations within generated sections
- One combined generation task and one LLM call for the MVP, producing all five primary sections from a single general prompt
- Programmatically assembled uncertainties section
- Tree-sitter as one parsing method for supported JavaScript and TypeScript files
- Markdown, configuration, heuristic, regex, and fallback strategies where appropriate
- Rule-based retrieval using SQLite metadata
- Isolated temporary SQLite database for each scan

### Not Supported in the MVP

- Private repositories
- Monorepos
- GitLab or Bitbucket repositories
- Programming languages other than JavaScript and TypeScript
- User accounts
- Saved scan history
- CLI access
- Vector-based retrieval
- MCP integration
- HTML guide export

## Technical Challenges

### Parsing and Chunking Without Losing Meaning

Repository files must be divided into pieces small enough to retrieve and send to an LLM without separating related information.

LemonBeam uses different strategies depending on file type:

- Tree-sitter for supported JavaScript and TypeScript code
- test-specific Tree-sitter extraction for test files
- heading- and section-based chunking for Markdown
- structured or rule-based handling for configuration files
- fallback heuristics or regex for unsupported readable text when appropriate

The challenge is to create chunks that are small enough to retrieve efficiently while still preserving the context needed to understand the code or documentation.

### Classifying Inconsistent Repository Structures

Repositories do not all follow the same folder, filename, test, or configuration conventions.

LemonBeam uses multiple deterministic signals rather than relying on one rule. Signals may include:

- folder patterns
- filename patterns
- file extensions
- package scripts
- installed dependencies
- configuration files
- limited content patterns
- relationships between nearby files

Files with insufficient evidence should remain uncategorized rather than being forced into an incorrect category.

Monorepos remain outside the MVP scope.

### Retrieval Quality Without Vector Search

Each primary guide section depends on carefully defined retrieval rules.

Because retrieval is rule-based, a missing file category, chunk type, path rule, or content signal can leave an important gap in the generated section.

The challenge is to make each section’s evidence selection broad enough to find the necessary information while keeping the retrieved context focused.

### Keeping the Guide Trustworthy

Generated claims must be supported by repository evidence.

Each primary section includes citations so users can verify important claims against the analyzed repository.

When the evidence does not support a confident answer, LemonBeam should report uncertainty rather than guess.

### Scope and Cost Control

Each primary guide section runs as a bounded task with:

- section-specific retrieval
- a section-specific prompt
- one LLM call

The challenge is to provide enough evidence for a useful answer without turning LemonBeam into an open-ended “chat with your repository” tool or sending unnecessary repository content to the model.

## User Flow

### 1. Submit a Repository

The user enters the URL of a supported public GitHub repository and their own OpenAI API key, then submits both through the LemonBeam web application.

LemonBeam is bring-your-own-key (BYOK): the user's key is used only for that scan and is not stored by LemonBeam.

Example:

```text
https://github.com/example/project
```

### 2. Validate the Repository and Identify the Version

LemonBeam confirms that the repository:

- exists
- is public
- is hosted on GitHub
- is a supported JavaScript or TypeScript project
- is within the supported size limits
- is not an unsupported monorepo

LemonBeam then identifies:

- repository owner and name
- default branch
- exact commit SHA

Only after validation and version identification does LemonBeam download the repository snapshot.

### 3. Scan and Organize the Repository

LemonBeam temporarily downloads the exact repository snapshot to the backend.

It then:

- discovers relevant files
- applies ignore and file-safety rules
- classifies files by purpose
- selects the appropriate parsing and chunking strategy
- creates normalized chunks
- stores chunks and metadata in an isolated temporary SQLite database for that scan

### 4. Retrieve Evidence and Generate the Primary Sections

For the MVP, LemonBeam creates one combined generation task covering all five primary guide sections:

- Project Overview
- Setup / Installation
- Running Locally
- Project Structure
- Testing

That task:

1. retrieves the evidence relevant to all five sections
2. builds the single general MVP prompt
3. sends the prompt and selected evidence to the LLM in one call
4. receives the combined guide text, citations, and any uncertainty information
5. validates the returned citations

Generating each section through its own separate task, retrieval pass, and LLM call is a stretch goal, planned once the MVP works end to end (see "Five Separate Section-Generation Tasks" under Stretch Goals).

### 5. Assemble the Guide

LemonBeam:

- sorts the five generated sections into the fixed order
- combines them into one guide
- collects uncertainty information from the five tasks
- assembles the Uncertainties and Missing Information section

### 6. Return the Guide

The completed guide is returned to the frontend.

The user can:

- read the guide in the browser
- copy the Markdown
- download `guide.md`

### 7. Use the Guide

The user reads the guide to understand:

- what the repository does
- how to install it
- how to run it
- how it is organized
- how testing is set up
- which files and entry points appear important
- what information remains uncertain

### 8. Delete Temporary Data

After the guide is returned, LemonBeam deletes:

- the downloaded repository snapshot
- the temporary SQLite database
- intermediate processing files

## Simplified User Flow

```text
Submit public GitHub URL
-> validate repository
-> identify default branch and commit SHA
-> download the exact repository snapshot
-> discover and classify files
-> parse and chunk files
-> store evidence in a temporary SQLite database
-> retrieve evidence for all five primary sections
-> make one combined LLM call (five separate section-specific calls is a stretch goal)
-> validate citations
-> assemble five generated sections plus uncertainties
-> return the Markdown guide
-> delete temporary scan data
```

## Evaluation Plan

A generated guide is successful when a new contributor can use it to move from:

> “I do not understand this repository”

to:

> “I understand what it does and know how to begin working with it.”

The guide should help a user perform or answer the following tasks.

### Understand the Project

The user should be able to:

- explain what the project appears to do
- identify the major technologies
- identify the major folders
- identify likely entry points or key files

### Set Up and Run the Project

The user should be able to:

- identify the package manager
- install dependencies using the documented repository instructions
- identify required environment setup
- run the application when the repository provides sufficient instructions

### Understand Testing

The user should be able to:

- identify the test framework
- locate test files
- find the test command
- run the tests when the repository provides sufficient instructions
- understand when testing information is missing or unclear

### Verify the Guide

The user should be able to:

- follow citations to the supporting repository evidence
- confirm that important setup, running, structure, and testing claims are source-backed
- distinguish supported conclusions from reported uncertainty

Detailed testing procedures, tools, test organization, and evaluation implementation belong in `TESTING.md`.

## Stretch Goals

The following features are outside the MVP and may be considered after the MVP works end to end.

### Five Separate Section-Generation Tasks

Replace the MVP's single combined generation task with five independent tasks — one for each primary guide section — each with its own retrieval pass, its own tuned prompt, and its own LLM call, as originally designed. Run the five calls in parallel (not sequentially) so one failed section does not block the others. This restores per-section citation precision and lets each section be tested and improved independently, at the cost of five prompts to write and tune instead of one.

### Asynchronous Scan Processing

Replace the single blocking `POST /api/scans` request with an asynchronous flow: the endpoint starts the scan and returns immediately with a scan ID, a new status mechanism (polling endpoint or server-sent events) reports progress, and the frontend displays progress until the guide is ready. This removes the request-timeout ceiling that constrains the MVP's repository size limits (see `DECISIONS.md` > "Repository Size Limits for the MVP"); it is a prerequisite for raising those limits, not vector-based retrieval.

### SQLite-Backed Evidence Storage

Persist chunks and skipped-file records to each scan's SQLite database, as designed in `DATABASE.md`, instead of holding them in memory for the lifetime of one request (see `DECISIONS.md` > "In-Memory Chunk Storage for the MVP, SQLite as a Stretch Goal"). Most useful once "Five Separate Section-Generation Tasks" needs per-section filtered retrieval, or "Asynchronous Scan Processing" needs scan data to outlive a single request.

### Vector-Based Retrieval

Add vector-based retrieval alongside rule-based metadata retrieval and compare guide quality against the deterministic approach.

### Monorepo Support

Support repositories containing multiple packages, multiple `package.json` files, or multiple separate applications.

### Additional Programming Languages

Extend repository analysis beyond JavaScript and TypeScript to other language ecosystems.

### Guide Regeneration

Detect when a repository has changed and regenerate the affected guide content.

### Private Repository Support

Allow users to authorize LemonBeam to scan private GitHub repositories securely.

### CLI

Allow developers to scan a local repository from the terminal and store generated output in a local `.lemonbeam` directory.

### MCP Integration

Expose LemonBeam’s repository retrieval and guide information as tools that external AI assistants can query.

### HTML Guide Export

Generate and return a downloadable HTML version of the guide in addition to the Markdown guide.