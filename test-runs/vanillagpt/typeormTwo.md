typeorm-raw-dump.txt 
Here's a GitHub repo  — write me an onboarding guide covering project overview, setup, running it locally, project structure, and testing. Give it to me in markdown format. 

# TypeORM Developer Onboarding Guide

## Project overview

TypeORM is a TypeScript/JavaScript object-relational mapping (ORM) library. It runs across Node.js and several other JavaScript environments and supports both the **Data Mapper** and **Active Record** patterns. Its database support includes PostgreSQL, MySQL/MariaDB, Microsoft SQL Server, Oracle, SAP HANA, SQLite/sql.js, MongoDB, Google Spanner, and related drivers.

The package is published as `typeorm` and supports both ESM and CommonJS consumers. The repository also contains the CLI, documentation, database-specific drivers, migration/schema tooling, tests, and a small set of related packages.

At a high level, the core source is organized around these areas:

* `src/data-source/` — `DataSource` and connection lifecycle
* `src/entity-manager/` — entity operations through `EntityManager`
* `src/repository/` — repository APIs
* `src/query-builder/` — SQL/query construction
* `src/decorator/` — entity, column, relation, and other decorators
* `src/driver/` — database-specific driver implementations
* `src/metadata/` and `src/metadata-builder/` — entity metadata
* `src/schema-builder/` — schema synchronization/building
* `src/migration/` — migration support
* `src/persistence/` — persistence internals
* `src/subscriber/` — event subscribers

The project is TypeScript-based. Compilation outputs generated JavaScript and declarations under `build/compiled`. Decorator metadata and experimental decorators are enabled.

---

## Prerequisites

Install the following before getting started:

* **Git**
* **Node.js**
* **pnpm**
* **Docker** if you want to run database dependencies in containers

The repository currently declares:

```text
Node: ^20.19.0 || ^22.13.0 || >=24.11.0
pnpm: 10.34.5
```

Using the repository's declared pnpm version is recommended.

Database software is also required for whichever database drivers you intend to exercise. The developer documentation specifically calls out MySQL, MariaDB, PostgreSQL, Oracle, and SQL Server, with Docker available for running database services locally.

---

## Initial setup

### 1. Clone the repository

If you plan to contribute upstream, the documented workflow is to fork the repository, clone your fork, and add the main TypeORM repository as `upstream`:

```bash
git clone git@github.com:<your-github-username>/typeorm.git
cd typeorm

git remote add upstream https://github.com/typeorm/typeorm.git
```

If you only need a local development checkout, cloning the main repository directly is also sufficient.

### 2. Install dependencies

From the repository root:

```bash
pnpm install
```

### 3. Create your test database configuration

Tests read database connection information from a root-level `ormconfig.json`.

Start with the sample:

```bash
cp ormconfig.sample.json ormconfig.json
```

Then edit `ormconfig.json` so it only enables databases you actually have available.

The sample configuration contains entries for drivers such as `better-sqlite3`, CockroachDB, MariaDB, MongoDB, SQL Server, MySQL, Oracle, PostgreSQL, SAP HANA, Spanner, and sql.js.

For a quicker first setup, it is usually easier to enable only the database or databases relevant to the code you are changing. The test tooling runs tests against each enabled database configuration.

### 4. Optionally start databases with Docker

The repository includes `docker-compose.yml`. For example, the developer guide shows:

```bash
docker compose up postgres-17
```

Or, to start all configured database services:

```bash
docker compose up
```

Be aware that running every database is considerably heavier than running only the driver you need.

---

## Running the project locally

TypeORM is primarily a **library**, rather than an application with a single development server. The normal local workflow is therefore to compile/watch the source and exercise it through tests or the playground.

### Compile the code

```bash
pnpm run compile
```

This runs a clean followed by the TypeScript compiler:

```text
gulp clean && tsc
```

Compiled files are written under `build/compiled`.

### Watch source changes

For active development:

```bash
pnpm run compile -- --watch
```

or:

```bash
pnpm run watch
```

The first option is useful when pairing the compiler with `test:fast`; the developer guide recommends this workflow because a normal `pnpm test` performs a complete rebuild first.

### Build the distributable package

To generate the package that would be consumed by another application:

```bash
pnpm run package
```

The output is created under:

```text
build/package/
```

You can then link or copy that package into another project for manual integration testing.

### Optional: run the playground

The repository contains a `playground/` package using sql.js and the local TypeORM checkout.

Its scripts include:

```bash
cd playground
pnpm install
pnpm start
```

The playground's `start` command executes its TypeScript entry point with the ESM `ts-node` loader, and its TypeORM dependency points to the repository root via `file:..`.

---

## Project structure

```text
typeorm/
├── src/                         # Main TypeORM implementation
│   ├── data-source/             # DataSource lifecycle/configuration
│   ├── entity-manager/          # EntityManager
│   ├── repository/              # Repository APIs
│   ├── query-builder/           # QueryBuilder implementation
│   ├── decorator/               # Entity/column/relation decorators
│   ├── driver/                  # Database-specific implementations
│   ├── metadata/                # Runtime entity metadata
│   ├── metadata-builder/        # Metadata construction
│   ├── schema-builder/          # Schema synchronization
│   ├── migration/               # Migration machinery
│   ├── persistence/             # Persistence internals
│   ├── subscriber/              # Event subscribers
│   ├── commands/                # CLI commands
│   └── index.ts                 # Primary public exports
│
├── test/
│   ├── functional/              # Feature/integration tests
│   ├── github-issues/           # Regression tests for GitHub issues
│   ├── other-issues/            # Other regression tests
│   ├── unit/                    # Focused unit tests
│   └── utils/                   # Shared test setup/helpers
│
├── docs/                        # Docusaurus documentation site
├── packages/
│   ├── codemod/                 # TypeORM migration codemods
│   └── legacy-naming-strategies/
│                               # Legacy naming strategies package
├── playground/                  # Small local TypeORM/sql.js example
├── docker/                      # Docker support files
├── docker-compose.yml           # Local database services
├── ormconfig.sample.json        # Sample database test configuration
├── DEVELOPER.md                 # Build/test development instructions
├── CONTRIBUTING.md              # Contribution/PR conventions
├── gulpfile.ts                  # Packaging and clean tasks
├── package.json                 # Root scripts/dependencies
├── tsconfig.json                # Main TypeScript configuration
└── .mocharc.json                # Mocha test configuration
```

The test suite strongly favors functional tests for behavior that needs to work consistently across multiple database implementations.

## The repository also contains `@typeorm/codemod`, described as codemods for migrating between TypeORM versions, and `@typeorm/legacy-naming-strategies`.

## Testing

### Run the normal test suite

```bash
pnpm run test
```

The root script is:

```text
pnpm run compile && pnpm run test:fast --
```

So a normal test run first cleans and recompiles the project, then invokes Mocha.

### Fast iteration

When you are repeatedly changing code, keep the compiler running:

```bash
pnpm run compile -- --watch
```

Then, in another terminal:

```bash
pnpm run test:fast
```

`test:fast` invokes Mocha without rebuilding everything first.

### Run a subset of tests

Filter by a matching `describe()` or `it()` name:

```bash
pnpm run test:fast -- --grep "your test name"
```

You can also temporarily use Mocha's `.only`:

```typescript
describe.only("my feature", () => {
    // ...
})
```

The developer guide documents both approaches for narrowing a local test run.

### How tests are discovered

Mocha is configured to execute compiled test files beneath:

```text
build/compiled/test/**/*.test.{js,ts}
```

The global test setup file is:

```text
build/compiled/test/utils/test-setup.js
```

The default timeout is 90 seconds.

### Typical functional test pattern

A functional test usually creates one `DataSource` per enabled database, resets the databases before each test, and runs the same assertions against all relevant drivers:

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

    it("should do something specific", () =>
        Promise.all(
            dataSources.map(async (dataSource) => {
                // assertions
            }),
        ))
})
```

Entities placed under an `entity/` directory alongside the test can be loaded using the pattern shown above.

The important implication is that core behavior should generally be **database-agnostic**. A test may execute once for every enabled connection in your `ormconfig.json`, so avoid assumptions about a particular SQL dialect unless the behavior itself is driver-specific.

### Coverage and CI

CI compiles the project first and runs database-specific test jobs across supported environments. Tests are run under `c8` to collect coverage, with separate jobs/configurations selecting the appropriate database entries from `ormconfig.sample.json`.

The CI matrix includes multiple Node versions and runs Linux and Windows database/test jobs.

---

## Code quality commands

Before opening a PR, useful checks include:

```bash
# Compile
pnpm run compile

# Type-check without emitting output
pnpm run typecheck

# Lint
pnpm run lint

# Apply Prettier formatting
pnpm run format

# Verify formatting without changing files
pnpm run format:ci

# Full tests
pnpm run test
```

These commands come directly from the root package scripts.

Changes submitted upstream are expected to include appropriate tests, and contributors are asked to run the full test suite before submitting a pull request.

---

## Recommended day-to-day workflow

```bash
# Terminal 1: continuously compile changes
pnpm run compile -- --watch

# Terminal 2: run the tests you're currently working on
pnpm run test:fast -- --grep "feature name"

# Before committing
pnpm run lint
pnpm run format:ci
pnpm run typecheck

# Before opening a PR
pnpm run test
```

When adding behavior, start by looking for an existing test in `test/functional/` that exercises the same subsystem. Put regression coverage close to the relevant feature, and make sure the test works against every applicable database configured locally. The repository's contributor guidelines require appropriate test coverage for patches.

## Quick-start summary

```bash
git clone git@github.com:<your-github-username>/typeorm.git
cd typeorm

pnpm install

cp ormconfig.sample.json ormconfig.json
# Edit ormconfig.json and enable/configure the DBs you want to test.

# If needed:
docker compose up postgres-17

# Build:
pnpm run compile

# Test:
pnpm run test

# Development loop:
pnpm run compile -- --watch
# in another terminal:
pnpm run test:fast
```

At that point you have the core TypeORM source compiled and a local environment ready for development and testing.
