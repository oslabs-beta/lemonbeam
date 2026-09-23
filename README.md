# LemonBeam 🍋

LemonBeam shines a fresh beam of light on an unfamiliar codebase.

It scans a public JavaScript or TypeScript GitHub repository and generates a fixed-format contributor guide that helps new developers understand the project more quickly. Rather than sending an entire repository directly to an LLM, LemonBeam classifies repository files, creates meaningful chunks, retrieves only the evidence relevant to each guide section, and generates a source-backed guide with citations.

---

## Why LemonBeam?

Understanding an unfamiliar repository is difficult.

Important information is often scattered across:

- README files
- package.json scripts
- configuration files
- folder structure
- test suites
- source code

Developers often paste a repository into an AI assistant hoping for an explanation, but the results depend heavily on the prompt and available context.

LemonBeam takes a deterministic approach by:

- scanning the repository
- organizing repository evidence
- retrieving only the information relevant to each guide section
- generating a repeatable, source-backed contributor guide

---

## Features

### MVP

- Scan public GitHub JavaScript and TypeScript repositories
- Generate a fixed-format contributor guide
- Source-backed sections with citations
- Tree-sitter parsing for JavaScript and TypeScript
- Rule-based repository classification
- Deterministic SQLite retrieval
- React web interface

---

## Example Guide Structure

The generated guide includes:

- Repository Information
- Project Overview
- Prerequisites
- Installation and Environment Setup
- Running and Building
- Project Structure
- Testing
- Key Files and Entry Points
- Suggested Reading Order
- Uncertainties and Missing Information
- Source Citations

---

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Backend

- Node.js
- Express
- TypeScript
- SQLite
- Tree-sitter
- GitHub API
- OpenRouter API (BYOK)

---

## Repository Structure

~~~text
frontend/
backend/

README.md
PROJECT_BRIEF.md
ARCHITECTURE.md
DATABASE.md
API_CONTRACT.md
TESTING.md
DECISIONS.md
CONTRIBUTING.md
AGENTS.md
~~~

---

## Getting Started

### Prerequisites

- Node.js
- npm

### Installation

~~~bash
git clone https://github.com/oslabs-beta/lemonbeam.git

cd lemonbeam/frontend
npm install

cd ../backend
npm install
~~~

---

## Using the CLI

LemonBeam can be run directly from your terminal as a command-line tool to analyze any local project directory and generate an AI-powered documentation guide.

### 1. Configure Your Environment

Create a `.env` file in the root of your project directory and add your OpenRouter API key:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 2. Link LemonBeam Locally

If you are testing or running the tool locally from source, link it to your project:

```bash
npm link lemonbeam
```

### 3. Run the CLI

Navigate into the root of any project you want to scan and execute:

```bash
npx lemonbeam
```

### 4. Choose Your Output Format

When the scanning pipeline finishes, you'll be prompted interactively in your terminal:

- Type `y` to automatically save the generated guide as a markdown file in your project directory.
- Type `n` to print and view the generated guide right in your terminal.

---

## Using the MCP Server

LemonBeam can also run as a local [MCP](https://modelcontextprotocol.io) server, so an MCP-compatible client (Claude Desktop, Claude Code, or any other MCP client) can call it directly as a tool instead of going through the web UI or the CLI.

It exposes one tool, `generate_onboarding_guide`, which takes a single argument — a public GitHub repository URL — and returns the same source-backed guide the website generates. It does not accept local file paths.

Each person runs their own local copy of the server, using their own credentials — this mirrors LemonBeam's existing bring-your-own-key model (see `DECISIONS.md` > "User-Supplied OpenRouter API Key (BYOK)"), just supplied once at setup instead of once per scan.

### 1. Build the server

```bash
git clone https://github.com/oslabs-beta/lemonbeam.git
cd lemonbeam
npm install
npm run build
```

This compiles `mcp/index.ts` to `dist/mcp/index.js`, which is what your MCP client will actually run.

### 2. Get your credentials

- **`OPENROUTER_API_KEY`** (required) — from [openrouter.ai](https://openrouter.ai/keys). Nothing works without this; the server refuses to start if it's missing.
- **`GITHUB_TOKEN`** (optional, recommended) — a [GitHub personal access token](https://github.com/settings/tokens) with zero scopes selected (LemonBeam only ever reads public repository data). Without it, the server still runs, but GitHub API calls are capped at 60 requests/hour (roughly 12 scans/hour) instead of 5,000/hour.

### 3. Add it to your MCP client's config

Add an entry like this to your client's MCP server config (for example, Claude Desktop's `claude_desktop_config.json`, or a project's `.mcp.json` for Claude Code), using the absolute path to the file built in step 1:

```json
{
  "mcpServers": {
    "lemonbeam": {
      "command": "node",
      "args": ["/absolute/path/to/lemonbeam/dist/mcp/index.js"],
      "env": {
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here"
      }
    }
  }
}
```

Optional: to raise the GitHub rate limit, add `"GITHUB_TOKEN": "your_github_personal_access_token"` to `env`. Only add it with a real token — a placeholder value makes every scan fail.

Restart your MCP client, and `generate_onboarding_guide` will be available as a tool.

## Running the Project

### Frontend

```bash
cd frontend

npm run dev
```
### Backend

```bash

cd backend

npm run dev
```
---

## Running Tests

To run the automated test suite, use the following commands:

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```
---

## Documentation

PROJECT_BRIEF.md — project goals, MVP, user flow, and technical challenges
ARCHITECTURE.md — system architecture and backend design
DATABASE.md — temporary SQLite schema and relationships
API_CONTRACT.md — frontend/backend API specification
TESTING.md — testing strategy
DECISIONS.md — architectural decisions and rationale
CONTRIBUTING.md — contributor workflow
AGENTS.md — instructions for AI coding agents
---

## Contributing

Please read CONTRIBUTING.md before opening an issue or submitting a pull request.

---

## License

This project is currently under development.
License information will be added before the first public release.