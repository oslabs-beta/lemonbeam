typeorm-raw-dump.txt 
Here's a GitHub repo  — write me an onboarding guide covering project overview, setup, running it locally, project structure, and testing. Give it to me in markdown format. 

# TypeORM Contributor Onboarding Guide

Welcome to TypeORM. This guide covers the pieces you need to understand the repository, get a development environment running, navigate the codebase, and run tests locally.

## Project Overview

TypeORM is a TypeScript/JavaScript Object-Relational Mapping (ORM) library. It supports a broad set of databases, including MySQL/MariaDB, PostgreSQL, Microsoft SQL Server, Oracle, SAP HANA, SQLite, MongoDB, Google Spanner, and related drivers.

It supports both **Data Mapper** and **Active Record** patterns and targets multiple environments, including Node.js, browsers, React Native, and Electron.

At a high level, the library is built around:

* **`DataSource`** — database connection and configuration management
* **`EntityManager`** — general entity operations
* **Repositories** — Data Mapper-style persistence
* **QueryBuilder** — programmatic SQL/query construction
* **Decorators and metadata** — entity, column, and relation definitions
* **Drivers** — database-specific implementations
* **Schema builders and migrations** — database schema management
* **Persistence and subscribers** — writes and lifecycle events

The main architectural areas are documented directly in the repository.

> **Important:** TypeORM is a library rather than a standalone server application. "Running it locally" generally means compiling the library, running its test suite, starting the documentation site, or packaging it and using that package from another application.

---

## Prerequisites

You will need:

* Git
* Node.js
* pnpm
* A database relevant to the code you are working on, or Docker

The current `package.json` requires:

```text
Node.js: ^20.19.0 || ^22.13.0 || >=24.11.0
pnpm:    10.34.5
```

The repository also enforces pnpm as its development package manager.

Docker is recommended if you need to run tests against databases such as PostgreSQL, MySQL, MariaDB, Oracle, or SQL Server without installing them directly.

---

## Initial Setup

### 1. Fork and clone the repository

For contribution work, the project recommends working from a fork and keeping the official repository as an `upstream` remote:

```bash
git clone git@github.com:<your-github-username>/typeorm.git
cd typeorm

git remote add upstream https://github.com/typeorm/typeorm.git
```

If you only need a local checkout and do not intend to submit changes, cloning the main repository directly is also sufficient.

### 2. Install dependencies

From the repository root:

```bash
pnpm install
```

### 3. Create your test database configuration

Tests read their database connections from a root-level `ormconfig.json`.

Create it from the sample:

```bash
cp ormconfig.sample.json ormconfig.json
```

The sample includes configurations for multiple database engines, including `better-sqlite3`, CockroachDB, MariaDB, MongoDB, SQL Server, MySQL, Oracle, PostgreSQL, SAP HANA, Spanner, and sql.js.

You **do not need every database running for normal development**. Tests run against the database configurations enabled in `ormconfig.json`, so it is usually faster to keep only the driver or drivers relevant to your work.

For example, while working on PostgreSQL-specific behavior, configure PostgreSQL and disable or remove unrelated connections.

### 4. Start database services

You can use locally installed database servers or Docker.

For example:

```bash
docker compose up postgres-17
```

To start all database services defined by the project:

```bash
docker compose up
```

The developer guide explicitly supports Docker as an alternative to installing all DBMSs locally.

---

## Running TypeORM Locally

Because this is a library, there are several useful development modes.

### Compile the project

```bash
pnpm run compile
```

This cleans the previous build and runs the TypeScript compiler. Compiled code goes into:

```text
build/compiled/
```

The root scripts define `compile` as `gulp clean && tsc`.

### Watch for source changes

For continuous TypeScript compilation:

```bash
pnpm run watch
```

This is useful when making source changes while repeatedly running tests.

### Build a distributable TypeORM package

```bash
pnpm run package
```

The packaged library is written to:

```text
build/package/
```

You can link or install this package from another application when you want to test TypeORM changes in a real project.

### Start the documentation site

```bash
pnpm run docs:dev
```

The root command starts the Docusaurus development server in `docs/`; the documentation package exposes the corresponding `docusaurus start` command.

### Optional: run the playground example

The repository also contains an ESM SQLite example under `playground/`.

```bash
cd playground
npm install
npm start
```

It uses `sql.js`, so the example runs against an in-memory SQLite database and is useful for quickly seeing TypeORM in a small application.

---

## Project Structure

A simplified view of the repository is:

```text
typeorm/
├── src/                         # Main TypeORM implementation
│   ├── data-source/             # DataSource and connection management
│   ├── entity-manager/          # EntityManager
│   ├── repository/              # Repository implementation
│   ├── query-builder/           # QueryBuilder implementation
│   ├── decorator/               # Entity/column/relation decorators
│   ├── driver/                  # Database-specific drivers
│   ├── metadata/                # Runtime entity metadata
│   ├── metadata-args/           # Metadata collected by decorators
│   ├── metadata-builder/        # Builds runtime metadata
│   ├── schema-builder/          # Schema synchronization/manipulation
│   ├── migration/               # Migration infrastructure
│   ├── persistence/             # Entity persistence logic
│   ├── subscriber/              # Event subscribers
│   ├── commands/                # TypeORM CLI commands
│   └── index.ts                 # Main public exports
│
├── test/
│   ├── functional/              # Preferred feature/integration tests
│   ├── github-issues/           # Regression tests associated with issues
│   ├── unit/                    # Focused unit tests
│   └── utils/                   # Shared testing infrastructure
│
├── docs/                        # Docusaurus documentation website
│
├── packages/
│   ├── codemod/                 # TypeORM codemod tooling
│   └── legacy-naming-strategies/
│
├── playground/                  # Small runnable TypeORM example
├── docker/                      # Database-related Docker resources
├── docker-compose.yml           # Local database services
├── ormconfig.sample.json        # Example test database configuration
├── DEVELOPER.md                 # Build/test contributor documentation
├── CONTRIBUTING.md              # Contribution and PR guidelines
├── package.json
└── tsconfig.json
```

The central `src/` responsibilities are described in the repository's architecture documentation.

### Where should I make a change?

As a rough guide:

| Change                        | Start here                               |
| ----------------------------- | ---------------------------------------- |
| Database connection behavior  | `src/data-source/`                       |
| Repository APIs               | `src/repository/`                        |
| EntityManager APIs            | `src/entity-manager/`                    |
| SQL/query generation          | `src/query-builder/`                     |
| Entity/column decorators      | `src/decorator/`                         |
| Database-specific behavior    | `src/driver/<database>/`                 |
| Entity metadata               | `src/metadata/`, `src/metadata-builder/` |
| Schema synchronization        | `src/schema-builder/`                    |
| Migrations                    | `src/migration/`                         |
| Insert/update/remove behavior | `src/persistence/`                       |
| CLI behavior                  | `src/commands/`                          |
| Documentation                 | `docs/`                                  |

Driver-specific behavior should generally remain inside `src/driver/`, while database-agnostic changes should be tested across multiple database implementations.

---

## Testing

TypeORM primarily uses **Mocha** with **Chai** assertions.

Tests are divided into:

* `test/functional/` — feature and integration tests; generally the preferred location
* `test/github-issues/` — regression coverage for specific issues
* `test/unit/` — isolated unit tests
* `test/utils/` — shared connection/database test helpers

### Run the full test suite

```bash
pnpm run test
```

The root script is effectively:

```text
compile → test:fast → Mocha
```

Specifically:

```json
"test": "pnpm run compile && pnpm run test:fast --",
"test:fast": "mocha"
```

The full command is the appropriate final check before submitting a PR.

### Run tests without recompiling

During development:

```bash
pnpm run test:fast
```

This skips the compilation step, making it considerably faster after the code has already been built.

A productive development loop is:

```bash
# Terminal 1
pnpm run watch

# Terminal 2
pnpm run test:fast
```

The project's developer documentation explicitly recommends a watch build plus `test:fast` for rapid iteration.

### Run a specific test

Mocha's `--grep` can select tests by their `describe()` or `it()` description:

```bash
pnpm run test:fast -- --grep "query builder"
```

You can also run the full compile-first command with a filter:

```bash
pnpm run test -- --grep "query builder"
```

For temporary local debugging, `describe.only(...)` or `it.only(...)` can also limit execution, but these should not be committed.

### How database tests work

The test helpers read the root `ormconfig.json`.

Each enabled database configuration becomes a test `DataSource`, which is why many functional tests follow this shape:

```typescript
let dataSources: DataSource[]

before(
    async () =>
        (dataSources = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            schemaCreate: true,
            dropSchema: true,
        })),
)

beforeEach(() => reloadTestingDatabases(dataSources))
after(() => closeTestingConnections(dataSources))

it("should do something", () =>
    Promise.all(
        dataSources.map(async (dataSource) => {
            // assertion
        }),
    ))
```

That pattern allows the same behavior to be exercised against multiple database drivers. Entity files placed under an `entity/` directory next to the test can be loaded by the test setup.

### Mocha configuration

The root Mocha configuration runs compiled test files matching:

```text
build/compiled/test/**/*.test.{js,ts}
```

It also loads the shared test setup and uses a 90-second timeout.

### Choosing where to add a test

Prefer:

```text
test/functional/<relevant-feature>/
```

for general behavior.

Use `test/github-issues/` when preserving a regression tied closely to a particular GitHub issue. When fixing a specific regression, the developer guide recommends referencing the issue number in the test.

For most functional tests:

1. Create or reuse the appropriate feature directory.
2. Put test-only entities in an adjacent `entity/` directory.
3. Use `createTestingConnections()`.
4. Reset database state with `reloadTestingDatabases()`.
5. Run assertions for every configured `DataSource`.
6. Close connections afterward.

---

## Other Useful Checks

Before submitting changes, run the relevant quality checks:

```bash
# TypeScript type checking without output
pnpm run typecheck

# ESLint
pnpm run lint

# Format files
pnpm run format

# Verify formatting without modifying files
pnpm run format:ci

# Full tests
pnpm run test
```

These commands are defined by the root package scripts.

---

## Suggested Development Workflow

A normal feature or bug-fix workflow looks like this:

```bash
# Update your local master
git checkout master
git pull --ff upstream master

# Create a branch
git checkout -b fix/my-change

# Start continuous compilation
pnpm run watch
```

Then, in another terminal:

```bash
pnpm run test:fast -- --grep "relevant tests"
```

Once the implementation is ready:

```bash
pnpm run typecheck
pnpm run lint
pnpm run format:ci
pnpm run test
```

The contribution guide requires appropriate tests for code changes and asks contributors to run the full suite before submitting a PR.

---

## Quick Reference

| Task                        | Command                                   |
| --------------------------- | ----------------------------------------- |
| Install dependencies        | `pnpm install`                            |
| Create DB config            | `cp ormconfig.sample.json ormconfig.json` |
| Start PostgreSQL via Docker | `docker compose up postgres-17`           |
| Start all Docker DBs        | `docker compose up`                       |
| Compile                     | `pnpm run compile`                        |
| Watch TypeScript            | `pnpm run watch`                          |
| Build distributable package | `pnpm run package`                        |
| Run full tests              | `pnpm run test`                           |
| Run tests without compile   | `pnpm run test:fast`                      |
| Run matching tests          | `pnpm run test:fast -- --grep "pattern"`  |
| Type-check                  | `pnpm run typecheck`                      |
| Lint                        | `pnpm run lint`                           |
| Format                      | `pnpm run format`                         |
| Check formatting            | `pnpm run format:ci`                      |
| Start docs locally          | `pnpm run docs:dev`                       |

## First-Day Checklist

* [ ] Install a supported Node.js version and pnpm
* [ ] Fork/clone TypeORM
* [ ] Run `pnpm install`
* [ ] Copy `ormconfig.sample.json` to `ormconfig.json`
* [ ] Enable only the database drivers you need
* [ ] Start the required database service(s)
* [ ] Run `pnpm run compile`
* [ ] Run `pnpm run test`
* [ ] Locate the relevant area under `src/`
* [ ] Locate similar tests under `test/functional/`
* [ ] Use `pnpm run watch` + `pnpm run test:fast` while developing
* [ ] Run typecheck, lint, formatting checks, and the full test suite before opening a PR
