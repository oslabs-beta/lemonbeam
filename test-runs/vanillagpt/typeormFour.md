typeorm-raw-dump.txt 
Here's a GitHub repo  — write me an onboarding guide covering project overview, setup, running it locally, project structure, and testing. Give it to me in markdown format. 

# TypeORM Contributor Onboarding Guide

## Project Overview

TypeORM is a TypeScript/JavaScript Object-Relational Mapping (ORM) library. It supports both **Data Mapper** and **Active Record** patterns and works across Node.js, browsers, React Native, Electron, and other JavaScript environments. It supports databases including PostgreSQL, MySQL/MariaDB, Microsoft SQL Server, Oracle, SAP HANA, SQLite, MongoDB, Google Spanner, and related drivers.

The core library provides features such as:

* Entities, columns, and relations
* Repositories and entity managers
* QueryBuilder
* Transactions
* Schema synchronization
* Migrations
* Query caching
* Connection pooling
* Database-specific drivers
* Event listeners and subscribers
* CLI tooling

This repository is primarily a **library**, not an application server. For local development, you normally compile or watch the TypeScript source and run tests against one or more databases.

### Main architecture

The most important areas of the core source are:

| Directory             | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `src/data-source/`    | `DataSource` lifecycle and connection management |
| `src/entity-manager/` | EntityManager and entity operations              |
| `src/repository/`     | Repository pattern implementation                |
| `src/query-builder/`  | SQL/query construction                           |
| `src/decorator/`      | Entity, column, and relation decorators          |
| `src/driver/`         | Database-specific drivers                        |
| `src/metadata/`       | Entity metadata                                  |
| `src/schema-builder/` | Schema creation and synchronization              |
| `src/migration/`      | Migration support                                |
| `src/subscriber/`     | Event subscribers                                |
| `src/persistence/`    | Entity persistence logic                         |

---

## Prerequisites

You will need:

* **Git**
* **Node.js**
* **pnpm**
* Docker or locally installed databases if you want to run database-backed tests

The current package configuration requires Node.js:

```text
^20.19.0 || ^22.13.0 || >=24.11.0
```

and specifies:

```text
pnpm 10.34.5
```

The developer documentation also recommends using a Node version manager such as `nvm` or `fnm`. Database servers such as MySQL, MariaDB, PostgreSQL, Oracle, and SQL Server may be needed depending on which drivers you test; Docker can provide many of them instead.

---

## Setup

### 1. Clone the repository

If you are contributing through a fork:

```bash
git clone git@github.com:<your-github-username>/typeorm.git
cd typeorm

git remote add upstream https://github.com/typeorm/typeorm.git
```

The project uses `master` as its main development branch.

### 2. Install dependencies

```bash
pnpm install
```

### 3. Create your local database configuration

Tests expect an `ormconfig.json` at the repository root.

Start with the sample:

```bash
cp ormconfig.sample.json ormconfig.json
```

`ormconfig.sample.json` contains configurations for drivers including Better SQLite 3, CockroachDB, MariaDB, MongoDB, SQL Server, MySQL, Oracle, PostgreSQL, SAP HANA, Spanner, and SQL.js.

You **do not need to run every database during normal development**. The test harness runs against databases enabled by your `ormconfig.json`, so trimming the file to only the database or databases relevant to your change makes the local feedback loop considerably faster.

For work that is not driver-specific, a local configuration using something lightweight such as `better-sqlite3` can be convenient.

---

## Running Databases with Docker

Instead of manually installing database servers, the repository includes `docker-compose.yml`.

For example, the developer guide shows starting PostgreSQL with:

```bash
docker compose up postgres-17
```

To start all configured database services:

```bash
docker compose up
```

After the required containers are healthy, run the test suite normally. Be aware that starting every database is resource-intensive; the documentation notes that the SQL Server container alone needs significant memory.

---

## Running TypeORM Locally

Because TypeORM itself is a library, there is no single application server to launch. Your normal development workflow is to compile the source, optionally keep the compiler running in watch mode, and run tests.

### Compile the project

```bash
pnpm run compile
```

The script performs a clean build with TypeScript:

```text
gulp clean && tsc
```

Compiled files are written to:

```text
build/compiled/
```

### Watch while developing

```bash
pnpm run watch
```

or, for the workflow recommended by the developer guide:

```bash
pnpm run compile -- --watch
```

Then run tests in another terminal using `test:fast`. This avoids recompiling the entire codebase before every test run.

### Build a distributable package

To test your local TypeORM build from another project:

```bash
pnpm run package
```

The distributable package is generated under:

```text
build/package/
```

You can link or copy that directory into another project.

You can also create a package tarball:

```bash
cd build/package
pnpm pack
```

This produces a `.tgz` package that can be installed into another application for integration testing.

### Run the documentation site

The repository also provides a separate docs development command:

```bash
pnpm run docs:dev
```

This delegates to the documentation project's development server.

---

## Project Structure

A simplified view of the repository looks like this:

```text
typeorm/
├── src/                    # Core TypeORM implementation
│   ├── data-source/        # DataSource management
│   ├── entity-manager/     # EntityManager
│   ├── repository/         # Repository APIs
│   ├── query-builder/      # QueryBuilder
│   ├── decorator/          # TypeORM decorators
│   ├── driver/             # Database-specific implementations
│   ├── metadata/           # Entity metadata
│   ├── schema-builder/     # Schema operations
│   ├── migration/          # Migrations
│   ├── subscriber/         # Event subscribers
│   └── persistence/        # Persistence internals
│
├── test/
│   ├── functional/         # Feature/integration tests
│   ├── github-issues/      # Regression tests for GitHub issues
│   ├── unit/               # Unit tests
│   └── utils/              # Shared testing helpers
│
├── docs/                   # Documentation site
├── packages/
│   └── codemod/            # @typeorm/codemod migration tooling
│
├── build/
│   ├── compiled/           # Compiled development output
│   └── package/            # Distribution package output
│
├── ormconfig.sample.json   # Example database/test configuration
├── docker-compose.yml      # Development database containers
├── package.json            # Scripts and dependencies
├── tsconfig.json           # Main TypeScript configuration
├── DEVELOPER.md            # Build/testing documentation
└── CONTRIBUTING.md         # Contribution guidelines
```

Tests are intentionally split between functional tests, issue-specific regression tests, unit tests, and common utilities. New feature behavior should generally go into the functional test suite rather than creating an issue-specific suite unless that structure is appropriate for the regression.

`packages/codemod/` is a separate package containing codemods used to migrate between TypeORM versions.

---

## Testing

### Test stack

The main test suite uses:

* **Mocha** as the test runner
* **Chai** for assertions
* **c8** for coverage

These are included as development dependencies.

Mocha runs compiled tests under:

```text
build/compiled/test/**/*.test.{js,ts}
```

and loads the shared test setup from:

```text
build/compiled/test/utils/test-setup.js
```

The configured test timeout is 90 seconds.

### Run the full suite

```bash
pnpm run test
```

`test` first compiles the project and then executes the tests:

```text
pnpm run compile && pnpm run test:fast --
```

Make sure `ormconfig.json` exists first. The testing utilities explicitly fail if the file cannot be found or contains no usable database configuration.

### Run tests without recompiling

Once the code is already compiled:

```bash
pnpm run test:fast
```

This is usually the best command while actively developing.

A productive two-terminal workflow is:

```bash
# Terminal 1
pnpm run compile -- --watch
```

```bash
# Terminal 2
pnpm run test:fast
```

### Run a subset of tests

Use Mocha's `--grep` option:

```bash
pnpm run test -- --grep "your test name"
```

During local development you can also temporarily use `describe.only(...)` or `it.only(...)`, but do not commit those exclusivity markers.

If the project is already being continuously compiled, use:

```bash
pnpm run test:fast -- --grep "your test name"
```

### Writing tests

Most database-backed tests follow this pattern:

```typescript
import { expect } from "chai"
import {
    closeTestingConnections,
    createTestingConnections,
    reloadTestingDatabases,
} from "../../../utils/test-utils"
import { DataSource } from "../../../../src/data-source/DataSource"

describe("description of the functionality you're testing", () => {
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

    it("should describe the expected behavior", () =>
        Promise.all(
            dataSources.map(async (dataSource) => {
                // test implementation
            }),
        ))
})
```

The important pattern is that a test can execute against every configured database using `dataSources.map(...)`. Entities placed under an `entity/` directory relative to the test can be loaded for that test.

For a regression tied to a GitHub issue, add a comment referencing the issue number.

---

## Other Useful Commands

```bash
# Compile TypeScript
pnpm run compile

# Continuously compile
pnpm run watch

# Full test: compile + test
pnpm run test

# Test without recompiling
pnpm run test:fast

# Lint the codebase
pnpm run lint

# Format files
pnpm run format

# Check formatting without modifying files
pnpm run format:ci

# Type-check without emitting files
pnpm run typecheck

# Build the distributable TypeORM package
pnpm run package

# Run documentation locally
pnpm run docs:dev
```

These commands are defined directly in the root `package.json`.

---

## Before Opening a Pull Request

Before submitting a change:

1. Add or update tests for the behavior you changed.

2. Run the relevant tests locally.

3. Run the complete suite when practical.

4. Run:

   ```bash
   pnpm run lint
   pnpm run typecheck
   ```

5. Ensure formatting is correct:

   ```bash
   pnpm run format:ci
   ```

6. Update documentation when changing a public API.

The contribution guide explicitly requires appropriate tests and asks contributors to run the TypeORM test suite before submitting a PR.

Commit messages follow a conventional format:

```text
<type>: <subject>
```

Common types include:

```text
build
chore
ci
docs
feat
fix
perf
refactor
revert
style
test
```

Subjects should use imperative present tense, start with a lowercase letter, and not end with a period.

---

## Recommended First-Day Workflow

For a new contributor, a minimal working setup is:

```bash
# 1. Install dependencies
pnpm install

# 2. Configure test databases
cp ormconfig.sample.json ormconfig.json

# 3. Edit ormconfig.json so only databases available locally are enabled

# 4. Compile
pnpm run compile

# 5. Run the tests relevant to your work
pnpm run test:fast -- --grep "feature name"
```

During active development:

```bash
# Terminal 1
pnpm run compile -- --watch

# Terminal 2
pnpm run test:fast -- --grep "feature name"
```

Before opening a PR, run the broader checks:

```bash
pnpm run test
pnpm run lint
pnpm run typecheck
pnpm run format:ci
```

The key thing to remember is that TypeORM supports many database engines. Changes in shared ORM behavior should therefore be written and tested with cross-database compatibility in mind rather than assuming the SQL semantics of a single driver.
