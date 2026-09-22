# TypeORM Contributor Onboarding Guide

## Project overview

TypeORM is a TypeScript-based object-relational mapping (ORM) library. It supports multiple database engines—including MySQL/MariaDB, PostgreSQL, Microsoft SQL Server, Oracle, SAP HANA, SQLite, MongoDB, and Google Spanner—and supports both the **Active Record** and **Data Mapper** patterns. It targets multiple JavaScript environments, including Node.js, browsers, React Native, and Electron.

Architecturally, TypeORM is split into components for connection/data-source management, repositories, entity management, query building, decorators and metadata, database drivers, migrations, schema management, subscribers, and persistence. The codebase also makes heavy use of the Repository, Decorator, and Builder patterns.

One important distinction for new contributors: **this repository is a library, not a standalone application**. You generally do not start TypeORM as a server. Local development means compiling or watching the library, running its test suite against one or more databases, or starting the documentation development server.

---

## Prerequisites

You will need:

* Git
* Node.js
* pnpm
* One or more databases required by the area you are testing, or Docker to run those databases locally

The contributor guide explicitly lists Git, Node.js, and database installations as prerequisites and recommends the repository's Docker configuration as an alternative to installing database servers directly.

The current package metadata expects **pnpm 10.34.5** and supports Node.js `^20.19.0`, `^22.13.0`, or `>=24.11.0`.

Check your environment:

```bash
node --version
pnpm --version
git --version
```

---

## Setup

### 1. Clone the repository

The project's contributor workflow recommends working from a fork and keeping the main TypeORM repository configured as an `upstream` remote.

```bash
git clone git@github.com:<your-github-username>/typeorm.git
cd typeorm

git remote add upstream https://github.com/typeorm/typeorm.git
```

If you do not need a fork, cloning the main repository directly is sufficient for read-only exploration.

### 2. Install dependencies

```bash
pnpm install
```

This is the installation command specified by the development guide.

### 3. Create the test database configuration

Tests use a root-level `ormconfig.json`. Start with the supplied sample:

```bash
cp ormconfig.sample.json ormconfig.json
```

Then edit `ormconfig.json` to match the database services available on your machine.

The sample configuration contains entries for several engines, including `better-sqlite3`, CockroachDB, MariaDB, MongoDB, SQL Server, MySQL, Oracle, PostgreSQL, SAP HANA, Spanner, and SQL.js.
You do **not** need to run every database during normal development. Tests execute against the databases configured in `ormconfig.json`, and the development guide explicitly suggests keeping only the relevant database configurations when you want a faster local cycle.

### 4. Start a database

For example, to run the repository's PostgreSQL service:

```bash
docker compose up postgres-17
```

The development guide provides this as the example Docker workflow.

To start all database services defined by the repository:

```bash
docker compose up
```

The full Docker environment is intended for running the test suite against the supported DBMSs.

For day-to-day work, starting only the database relevant to your change is usually more manageable.

---

## Running the project locally

Because TypeORM is a library, the main local-development workflows are compilation, watch mode, tests, documentation, and building a package.

### Compile the source

```bash
pnpm run compile
```

The script cleans the previous build and runs TypeScript compilation.

### Watch for source changes

```bash
pnpm run watch
```

or, following the testing guide's recommended development loop:

```bash
pnpm run compile -- --watch
```

Watch mode lets TypeScript recompile changed code instead of rebuilding the entire project before every test run.

### Run the documentation site

```bash
pnpm run docs:dev
```

The root package script enters `docs/` and starts its development server.

### Build the distributable package

If you need to test your local TypeORM changes from another application:

```bash
pnpm run package
```

This generates the distributable package under:

```text
build/package/
```

The development guide notes that this directory can be linked or copied into another application for integration testing.

You can also create an installable archive:

```bash
cd build/package
pnpm pack
```

The resulting `.tgz` can then be installed into another project for realistic consumer-side testing.

---

## Project structure

The most important directories for a new contributor are:

```text
typeorm/
├── src/
│   ├── data-source/       # DataSource / connection management
│   ├── entity-manager/    # EntityManager operations
│   ├── repository/        # Repository implementation
│   ├── query-builder/     # QueryBuilder and SQL construction
│   ├── decorator/         # Entity/column/relation decorators
│   ├── driver/            # Database-specific implementations
│   ├── metadata/          # Entity metadata
│   ├── schema-builder/    # Schema creation and synchronization
│   ├── migration/         # Migration infrastructure
│   ├── subscriber/        # Entity/event subscribers
│   └── persistence/       # Persistence internals
│
├── test/
│   ├── functional/        # Feature/integration tests; preferred location
│   ├── github-issues/     # Regression tests tied to GitHub issues
│   ├── unit/              # Focused unit tests
│   └── utils/             # Shared test infrastructure
│
├── docs/                  # Documentation site
├── build/                 # Generated build/package output
├── docker-compose.yml     # Local database services
├── ormconfig.sample.json  # Template test DB configuration
├── DEVELOPER.md           # Development/build/test instructions
└── package.json           # Commands and dependency configuration
```

The core `src/` responsibilities are documented directly in the repository's architecture notes.

Tests are divided into functional, GitHub-issue regression, unit, and utility directories. The repository specifically recommends **functional tests** over adding a per-issue test when possible.

### Where should I make a change?

A useful mental map is:

* Database-specific behavior → `src/driver/`
* Query generation → `src/query-builder/`
* Repository APIs → `src/repository/`
* Entity operations → `src/entity-manager/`
* Decorators → `src/decorator/`
* Metadata interpretation → `src/metadata/`
* Schema synchronization → `src/schema-builder/`
* Migration infrastructure → `src/migration/`

Driver-specific code is intentionally isolated under `src/driver/`; database-agnostic code is expected to behave consistently across multiple engines.

---

## Testing

### How tests work

TypeORM's testing utilities create a `DataSource` for each configured database. A typical test:

1. Calls `createTestingConnections(...)`.
2. Recreates or reloads the test database before each test.
3. Executes the same assertions for every configured `DataSource`.
4. Closes the connections afterward.

The repository's standard template uses `createTestingConnections`, `reloadTestingDatabases`, `closeTestingConnections`, and `Promise.all(dataSources.map(...))` for this pattern.

Tests should generally work across all supported databases unless the feature is inherently database-specific. Test-specific entity classes can live in an `entity/` directory next to the test file and be loaded automatically.

### Run the full test suite

```bash
pnpm run test
```

The `test` script first compiles the project and then invokes the fast Mocha test command.

The development documentation recommends this command before submitting a PR.

### Run a specific test

Use Mocha's `--grep` support:

```bash
pnpm run test -- --grep "your test name"
```

You can also temporarily use `describe.only(...)` or `it.only(...)` while developing, but remove those before committing.

### Fast development loop

Running `pnpm run test` repeatedly recompiles the entire project. The recommended faster workflow is:

Terminal 1:

```bash
pnpm run compile -- --watch
```

Terminal 2:

```bash
pnpm run test:fast
```

For a targeted test:

```bash
pnpm run test:fast -- --grep "pattern"
```

The repository explicitly recommends watch compilation plus `test:fast` for a quicker edit/test cycle. The documented command summary also lists the full-suite, fast, grep, and watch workflows.

### Adding a test

Prefer putting new feature or integration coverage under:

```text
test/functional/
```

A common skeleton looks like:

```typescript
import { expect } from "chai"
import {
    closeTestingConnections,
    createTestingConnections,
    reloadTestingDatabases,
} from "../../../utils/test-utils"

describe("feature being tested", () => {
    let dataSources

    before(async () => {
        dataSources = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            schemaCreate: true,
            dropSchema: true,
        })
    })

    beforeEach(() => reloadTestingDatabases(dataSources))
    after(() => closeTestingConnections(dataSources))

    it("should describe the expected behavior", () =>
        Promise.all(
            dataSources.map(async (dataSource) => {
                // Arrange
                // Act
                // Assert
            }),
        ))
})
```

This follows the test lifecycle recommended in the project's development documentation.

If the test covers a regression reported on GitHub, include the corresponding issue number in a comment.

---

## Other useful development commands

The root `package.json` exposes the following contributor commands:

```bash
# Compile TypeScript
pnpm run compile

# Type-check without emitting files
pnpm run typecheck

# Run ESLint
pnpm run lint

# Format the repository
pnpm run format

# Check formatting without changing files
pnpm run format:ci

# Watch TypeScript
pnpm run watch

# Build the publishable package
pnpm run package
```

A reasonable pre-PR check is therefore:

```bash
pnpm run typecheck
pnpm run lint
pnpm run format:ci
pnpm run test
```

---

## Suggested first-day workflow

For a new contributor, the shortest path to a working environment is:

```bash
# 1. Clone
git clone git@github.com:<your-github-username>/typeorm.git
cd typeorm

# 2. Install dependencies
pnpm install

# 3. Set up test configuration
cp ormconfig.sample.json ormconfig.json

# 4. Edit ormconfig.json so it contains only DBs you can run

# 5. Start a DB, for example PostgreSQL
docker compose up postgres-17

# 6. Compile
pnpm run compile

# 7. Run the test suite
pnpm run test
```

After that, use the faster two-terminal workflow while making changes:

```bash
# Terminal 1
pnpm run compile -- --watch

# Terminal 2
pnpm run test:fast -- --grep "feature I'm changing"
```

The key thing to remember is that **your `ormconfig.json` controls which databases the tests exercise**, so keeping that file focused on the engines relevant to your current change can dramatically simplify local development.
