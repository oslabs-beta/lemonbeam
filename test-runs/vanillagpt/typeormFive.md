typeorm-raw-dump.txt 
Here's a GitHub repo  — write me an onboarding guide covering project overview, setup, running it locally, project structure, and testing. Give it to me in markdown format. 

# TypeORM Contributor Onboarding Guide

## Project Overview

TypeORM is a TypeScript/JavaScript Object-Relational Mapping (ORM) library. It supports both **Data Mapper** and **Active Record** patterns and works across Node.js, browser-oriented environments, React Native, Electron, and other JavaScript platforms. It supports databases including PostgreSQL, MySQL/MariaDB, Microsoft SQL Server, Oracle, SAP HANA, SQLite, MongoDB, and Google Spanner.

The core library includes functionality for:

* Entity and column mapping
* Repositories and entity managers
* Relations and cascades
* Query building
* Transactions
* Migrations and schema management
* Connection pooling and replication
* Query caching and logging
* Event subscribers
* Multiple databases and database types
* ESM and CommonJS consumers

The repository's current package metadata identifies the project as TypeORM `1.1.1`.

---

## Prerequisites

Install the following before working on the project:

* Git
* Node.js
* pnpm
* Docker, recommended if you need database-backed tests
* Alternatively, locally installed database servers for whichever drivers you plan to test

The repository currently expects:

```text
Node.js: ^20.19.0 || ^22.13.0 || >=24.11.0
pnpm:    ^10.34.5
```

These versions come directly from the root `package.json`.

For database testing, the developer documentation lists MySQL, MariaDB, PostgreSQL, Oracle, and Microsoft SQL Server among the databases that may be needed, with Docker provided as the convenient alternative.

---

## Initial Setup

### 1. Clone the repository

If you plan to contribute upstream, the project recommends working from a fork:

```bash
git clone git@github.com:<your-github-username>/typeorm.git
cd typeorm

git remote add upstream https://github.com/typeorm/typeorm.git
```

If you only need a local development copy, cloning the main repository directly is sufficient.

### 2. Install dependencies

From the repository root:

```bash
pnpm install
```

### 3. Create the test database configuration

Tests read database connections from a root-level `ormconfig.json`.

Start with the provided sample:

```bash
cp ormconfig.sample.json ormconfig.json
```

Edit `ormconfig.json` to match the database servers you actually have available.

The sample contains configurations for drivers including:

* `better-sqlite3`
* CockroachDB
* MariaDB
* MongoDB
* SQL Server
* MySQL
* Oracle
* PostgreSQL
* SAP HANA
* Spanner
* `sqljs`

You do **not** need every database running while developing a specific change. Tests execute against the connections defined/enabled by `ormconfig.json`, and the developer guide explicitly recommends narrowing that configuration when working on database-agnostic code.

---

## Running the Project Locally

TypeORM is a library, not a standalone application server, so there is no single `pnpm start` process for the main package. Local development generally means **compiling the library, watching source changes, running its tests, or running its documentation site**.

### Compile the source

```bash
pnpm run compile
```

The command cleans the previous build and runs TypeScript compilation:

```text
gulp clean && tsc
```

Compiled files go into:

```text
build/compiled/
```

### Watch for source changes

For active development:

```bash
pnpm run watch
```

or:

```bash
pnpm run compile -- --watch
```

The latter is particularly useful when repeatedly running `test:fast`, because TypeScript recompiles changed files while the test runner can operate against the existing build.

### Build the distributable package

To produce the package that would ultimately be consumed by applications:

```bash
pnpm run package
```

Output is written to:

```text
build/package/
```

You can also create a tarball from that package:

```bash
cd build/package
pnpm pack
```

This is useful when you want to install your local TypeORM build into another application for integration testing.

---

## Running Databases with Docker

Instead of installing database servers directly on your machine, you can use the repository's `docker-compose.yml`.

For example, to start PostgreSQL 17:

```bash
docker compose up postgres-17
```

The developer guide uses this as its basic Docker example.

The Compose file contains services for databases such as:

```text
mysql-5
mysql-9
mariadb-10
mariadb-12
postgres-14
postgres-17
mssql
cockroachdb
oracle
spanner
hanaexpress
mongodb
```

For example, the bundled PostgreSQL configuration exposes port `5432` with the default test database credentials used by the sample ORM configuration.

To start all configured database containers:

```bash
docker compose up
```

Be aware that running every database is resource-intensive. The developer documentation specifically notes that SQL Server requires significant RAM, while the SAP HANA Compose service itself notes a 10 GB Docker memory requirement.

For most day-to-day work, start only the databases relevant to your change.

---

## Project Structure

A simplified view of the repository is:

```text
typeorm/
├── src/                    # Main TypeORM source
│   ├── data-source/        # DataSource management
│   ├── entity-manager/     # EntityManager operations
│   ├── repository/         # Repository implementation
│   ├── query-builder/      # SQL/query construction
│   ├── decorator/          # Entity/column/relation decorators
│   ├── driver/             # Database-specific drivers
│   ├── metadata/           # Entity metadata
│   ├── schema-builder/     # Schema creation/update
│   ├── migration/          # Migration infrastructure
│   ├── subscriber/         # Event subscribers
│   └── persistence/        # Entity persistence logic
│
├── test/
│   ├── functional/         # Feature/integration tests; preferred location
│   ├── github-issues/      # Regression tests tied to issues
│   ├── unit/               # Unit tests
│   └── utils/              # Shared test infrastructure
│
├── docs/                   # Docusaurus documentation site
├── packages/               # Additional TypeORM packages/tools
│   └── codemod/            # Version-migration codemods
├── playground/             # Development/examples playground
├── docker/                 # Supporting Docker assets
│
├── docker-compose.yml      # Local database services
├── ormconfig.sample.json   # Template database config for tests
├── package.json
├── tsconfig.json
├── DEVELOPER.md
└── CONTRIBUTING.md
```

The major `src/` components and their responsibilities are documented in the repository's contributor instructions.

### `src/driver/`

Database-specific behavior belongs here. Drivers are responsible for concerns including connection management, query execution, schema synchronization, type mapping, and transaction handling. Code outside this directory should generally remain database-agnostic where possible.

### `test/`

Tests are divided into functional, GitHub regression, unit, and utility areas. The project specifically prefers **functional tests** over creating a per-issue test when there is a sensible functional location.

### `docs/`

The documentation website uses Docusaurus. To work on it independently:

```bash
cd docs
pnpm install
pnpm run start
```

The development server opens the docs locally and supports live updates.

The root package also exposes:

```bash
pnpm run docs:dev
```

which runs the docs site's start command.

---

## Testing

### Test stack

The main suite uses:

* Mocha
* Chai
* TypeScript
* Shared TypeORM database-test helpers

Mocha runs compiled tests matching:

```text
./build/compiled/test/**/*.test.{js,ts}
```

with a 90-second test timeout and the shared test setup file loaded first.

### Run the full test suite

```bash
pnpm run test
```

This effectively does:

```text
compile → test:fast
```

The root scripts define:

```text
test      = pnpm run compile && pnpm run test:fast --
test:ci   = mocha --bail
test:fast = mocha
```

Use the full suite before submitting a PR.

### Faster development loop

Recompiling everything before every test run is unnecessary during active development.

Terminal 1:

```bash
pnpm run compile -- --watch
```

Terminal 2:

```bash
pnpm run test:fast
```

This keeps TypeScript compiling changes incrementally while Mocha operates against the current compiled output.

### Run a subset of tests

Filter by a Mocha `describe()` or `it()` string:

```bash
pnpm run test:fast -- --grep "pattern"
```

You can also temporarily use:

```typescript
describe.only(...)
```

or:

```typescript
it.only(...)
```

during development, but remove `.only` before committing. The project documentation explicitly supports Mocha's `--grep` workflow.

---

## Writing Tests

For most new functionality, start under:

```text
test/functional/
```

A typical test:

1. Creates testing connections.
2. Loads entities belonging to the test.
3. Creates/drops the test schema as appropriate.
4. Resets databases between cases.
5. Executes the same assertions across the configured database connections.
6. Closes all connections afterward.

The repository's standard pattern looks roughly like:

```typescript
import { expect } from "chai"
import {
    closeTestingConnections,
    createTestingConnections,
    reloadTestingDatabases,
} from "../../../utils/test-utils"
import { DataSource } from "../../../../src/data-source/DataSource"

describe("description of functionality", () => {
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
                // Arrange / act / assert
            }),
        ))
})
```

Entities placed in an `entity/` directory beside the test can be loaded using the project's normal test convention. Tests should generally work across the configured databases unless the behavior is intentionally database-specific.

When adding a regression test for a GitHub issue, include the issue number in a comment or otherwise clearly associate the test with the regression.

---

## Useful Development Commands

| Command                              | Purpose                                             |
| ------------------------------------ | --------------------------------------------------- |
| `pnpm install`                       | Install root dependencies                           |
| `pnpm run compile`                   | Clean and compile TypeScript                        |
| `pnpm run watch`                     | Watch TypeScript sources                            |
| `pnpm run package`                   | Build the distributable package                     |
| `pnpm run test`                      | Compile and run the full test suite                 |
| `pnpm run test:fast`                 | Run tests without recompiling                       |
| `pnpm run test:fast -- --grep "..."` | Run matching tests                                  |
| `pnpm run lint`                      | Run ESLint                                          |
| `pnpm run format`                    | Format the repository with Prettier                 |
| `pnpm run format:ci`                 | Check formatting without rewriting                  |
| `pnpm run typecheck`                 | Run TypeScript type checking without emitting files |
| `pnpm run docs:dev`                  | Start the documentation development site            |

These scripts are defined by the root package.

---

## Before Opening a Pull Request

At minimum:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
```

You should also run:

```bash
pnpm run format
```

as appropriate for changed files.

PRs that change behavior are expected to include corresponding tests. The contribution guide states that patches should include appropriate test cases and that the full TypeORM test suite should pass before submission.

For public API changes, update the documentation as well.

Commit messages follow a Conventional Commits-style format:

```text
<type>: <subject>

<body>

<footer>
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

Subjects should use imperative present tense, start lowercase, and omit a trailing period.

---

## Recommended First-Day Workflow

A practical way to get productive without bringing up every supported database is:

```bash
# 1. Install the project
pnpm install

# 2. Create your test configuration
cp ormconfig.sample.json ormconfig.json

# 3. Edit ormconfig.json so it contains/enables only
#    databases you actually intend to run.

# 4. Compile once and keep TypeScript watching
pnpm run compile -- --watch
```

Then, in another terminal:

```bash
# Run the relevant tests
pnpm run test:fast -- --grep "relevant test name"
```

When your change is ready:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
```

For database-specific work, start the relevant service first, for example:

```bash
docker compose up postgres-17
```

The most important architectural principle to keep in mind is that TypeORM is a **multi-database library**: unless a feature is deliberately driver-specific, both implementation and tests should avoid depending on one SQL dialect or database engine.
