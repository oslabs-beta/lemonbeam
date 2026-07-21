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
- OpenAI or Anthropic API

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
git clone <repository-url>

cd lemonbeam/frontend
npm install

cd ../backend
npm install
~~~

---

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

Automated test commands are not yet defined in the repository’s `package.json` scripts.

See `TESTING.md` for the planned testing strategy and for when runnable test commands are added.

---

## Documentation

- `PROJECT_BRIEF.md` — project goals, MVP, user flow, and technical challenges
- `ARCHITECTURE.md` — system architecture and backend design
- `DATABASE.md` — temporary SQLite schema and relationships
- `API_CONTRACT.md` — frontend/backend API specification
- `TESTING.md` — testing strategy
- `DECISIONS.md` — architectural decisions and rationale
- `CONTRIBUTING.md` — contributor workflow
- `AGENTS.md` — instructions for AI coding agents

---

## Contributing

Please read `CONTRIBUTING.md` before opening an issue or submitting a pull request.

---

## License

This project is currently under development.
License information will be added before the first public release.