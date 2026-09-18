# TypeORM Contributor Onboarding Guide

This guide covers the essentials for getting productive in the TypeORM repository: what the project does, how to set up a development environment, how to run the project locally, where important code lives, and how to run and write tests.

## 1. Project overview

[TypeORM](https://github.com/typeorm/typeorm) is an object-relational mapper for TypeScript and modern JavaScript. It supports Node.js as well as browser and hybrid/mobile environments, and supports databases including PostgreSQL, MySQL/MariaDB, Microsoft SQL Server, Oracle, SQLite, MongoDB, SAP HANA, and Google Spanner. TypeORM supports both the Data Mapper and Active Record patterns.

At a high level, TypeORM provides:

* Entities and decorators for mapping classes to database tables.
* `DataSource` for database configuration and connection lifecycle.
* `EntityManager` and repositories for persistence operations.
* Query builders for constructing SQL queries programmatically.
* Database-specific drivers.
* Migrations, transactions, relations, caching, logging, subscribers, and schema-management functionality.
* A CLI and both CommonJS/ESM package outputs.

The `DataSource` is one of the central abstractions in the codebase. It owns the configured database driver, entity manager, metadata, migrations, subscribers, query runners, and related infrastructure.

The package is currently published as `typeorm`; the repository's `package.json` describes it as a TypeScript/ES2023+ Data Mapper ORM.

---

## 2. Prerequisites

You will need:

* Git
* Node.js
* pnpm
* Docker, recommended if you need database-backed integration tests

The repository currently requires:

```text
Node.js: ^20.19.0 || ^22.13.0 || >=24.11.0
pnpm:    ^10.34.5
```

The repository declares `pnpm@10.34.5` as its package manager and rejects an incompatible package manager version through `devEngines`.

The official developer guide also lists database servers such as MySQL, MariaDB, PostgreSQL, Oracle, and SQL Server as prerequisites when running tests against those platforms. Docker can be used instead for most of them.

Check your environment:

```bash
node --version
pnpm --version
git --version
docker --version
```

---

## 3. Clone and install

If you intend to contribute, the project recommends working from a fork and configuring the official repository as `upstream`.

```bash
git clone git@github.com:<your-github-username>/typeorm.git
cd typeorm

git remote add upstream https://github.com/typeorm/typeorm.git
```

If you only want to inspect or build the project locally:

```bash
git clone https://github.com/typeorm/typeorm.git
cd typeorm
```

Install dependencies:

```bash
pnpm install
```

`pnpm install` is the installation command documented by the project's developer guide.

---

## 4. Configure databases

Tests use an `ormconfig.json` file derived from the checked-in sample:

```bash
cp ormconfig.sample.json ormconfig.json
```

Then edit `ormconfig.json` to match the databases you want to test. The test runner executes tests against the enabled database configurations, so you do **not** need every supported database running for day-to-day work; the developer guide explicitly suggests keeping only the configurations relevant to your change.

The sample configuration includes, among others, `better-sqlite3`, CockroachDB, MariaDB, MongoDB, SQL Server, MySQL, Oracle, PostgreSQL, SAP HANA, Spanner, and `sql.js`.

### Simple first-time setup

For a low-friction initial test run, consider enabling only `better-sqlite3` or `sql.js` and setting unrelated configurations to:

```json
"skip": true
```

Both are represented in the sample configuration, and `better-sqlite3` is already a development dependency.

### Using Docker

The repository contains a `docker-compose.yml` with database services for development and testing. For example, the developer guide shows starting PostgreSQL with:

```bash
docker compose up postgres-17
```

That service exposes PostgreSQL on port `5432` with the credentials used by the sample ORM configuration:

```text
username: username
password: password
database: typeorm
```

You can also launch all configured database containers:

```bash
docker compose up
```

The developer guide documents this as the way to bring up the DBMS services needed for the full local test suite.

For normal feature development, starting only the database relevant to your work will generally be much faster.

---

## 5. Build and run locally

TypeORM is primarily a **library**, rather than an application server, so "running TypeORM locally" usually means compiling it, running its tests, or packaging it and using that package from another application.

### Compile

```bash
pnpm run compile
```

The `compile` script cleans the previous build and runs TypeScript:

```text
gulp clean && tsc
```

### Development watch mode

For an edit/compile loop:

```bash
pnpm run watch
```

or, following the developer guide's faster testing workflow:

```bash
pnpm run compile -- --watch
```

The repository's `watch` script runs `tsc --watch`; the developer guide recommends a watch build together with `test:fast` when iterating on tests.

### Build the distributable package

```bash
pnpm run package
```

The resulting package is written to:

```text
build/package/
```

The packaging pipeline builds separate Node/browser outputs and creates the ESM entry point before assembling `build/package`.

If you want to test your modified TypeORM inside another application, you can also create an npm-compatible tarball:

```bash
cd build/package
pnpm pack
```

You can then install the generated `.tgz` from your test application. This workflow is explicitly documented for testing a local TypeORM build in another project.

### Run the documentation site

The repository also contains a Docusaurus documentation application. From the repository root:

```bash
pnpm run docs:dev
```

The root command enters `docs/` and invokes its `start` script; the documentation package defines `start` as `docusaurus start`.

---

## 6. Project structure

The top-level repository contains the main library, tests, documentation, packaging/build configuration, Docker configuration, and supporting packages/tools.

```text
typeorm/
├── .github/              # GitHub workflows/project configuration
├── docker/               # Supporting Docker resources
├── docs/                 # TypeORM documentation website
├── extra/                # Additional packaging/runtime resources
├── packages/             # Additional packages in the repository
├── playground/           # Development/playground area
├── src/                  # Main TypeORM source code
├── test/                 # Automated tests and test infrastructure
│
├── docker-compose.yml    # Local database services
├── gulpfile.ts           # Packaging/build tasks
├── ormconfig.sample.json # Sample test database configuration
├── package.json          # Dependencies and development scripts
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.node.json
└── tsconfig.browser.json
```

The root layout is visible directly in the repository.

### `src/` — core library

Most changes to TypeORM itself happen here. Important areas include:

```text
src/
├── data-source/      # DataSource and connection configuration
├── driver/           # Database-specific driver implementations
├── entity-manager/   # EntityManager APIs
├── repository/       # Repository abstractions
├── query-builder/    # SELECT/INSERT/UPDATE/etc. query builders
├── decorator/        # Entity/column/relation decorators
├── migration/        # Migration infrastructure
├── metadata/         # Runtime entity metadata
├── logger/           # Query/runtime logging
├── query-runner/     # Single-connection query execution
├── subscriber/       # Entity lifecycle subscribers
└── index.ts          # Main public exports
```

The main entry point exposes core APIs such as `DataSource`, database drivers, `QueryBuilder` variants, decorators, repository APIs, and related types.

A useful mental model for following a database operation is:

```text
Application
    ↓
Repository / EntityManager
    ↓
QueryBuilder
    ↓
DataSource
    ↓
Driver / QueryRunner
    ↓
Database
```

For example, a `Repository` delegates query-building and persistence behavior through its `EntityManager`, while `DataSource` creates managers, drivers, query runners, and query builders.

### `test/` — tests

Tests live under `test/`, while shared database-test infrastructure lives under `test/utils/`. The project's test template imports helpers including:

```ts
createTestingConnections()
reloadTestingDatabases()
closeTestingConnections()
```

from `test/utils/test-utils`.

Compiled tests are discovered recursively using:

```text
./build/compiled/test/**/*.test.{js,ts}
```

according to `.mocharc.json`.

### `docs/` — documentation website

`docs/` is a standalone private Docusaurus package. It provides commands for starting, building, serving, and deploying the TypeORM documentation site.

### Build/configuration files

`package.json` is the best place to check available development commands. Current scripts include:

```bash
pnpm run compile
pnpm run docs:dev
pnpm run format
pnpm run format:ci
pnpm run lint
pnpm run package
pnpm run test
pnpm run test:ci
pnpm run test:fast
pnpm run typecheck
pnpm run watch
```

---

## 7. Testing

TypeORM uses **Mocha** as its test runner and **Chai** for assertions.

### Run the normal test suite

```bash
pnpm run test
```

This performs a clean compilation and then starts the tests:

```text
pnpm run compile && pnpm run test:fast --
```

The normal test command is the safest choice before submitting a change because it ensures tests run against freshly compiled code.

### Faster test loop

Once you already have a current compilation running in watch mode:

Terminal 1:

```bash
pnpm run compile -- --watch
```

Terminal 2:

```bash
pnpm run test:fast
```

`test:fast` calls Mocha directly and avoids rebuilding the whole project each time. This workflow is specifically recommended in the developer documentation for faster iteration.

### Run selected tests

Mocha's `--grep` option can select tests by their `describe` or `it` names:

```bash
pnpm run test -- --grep "your test name"
```

While developing a test you can also temporarily use:

```ts
describe.only(...)
```

or:

```ts
it.only(...)
```

The project documents this technique for focused test development; make sure `.only` is removed before committing.

### Test configuration

Mocha is configured to:

* recursively discover compiled `*.test.js`/`*.test.ts` files;
* load the repository test setup file;
* detect global leaks;
* use a 90-second timeout;
* terminate the process after the suite completes.

### Writing tests

The project's recommended pattern looks roughly like this:

```ts
import { expect } from "chai"
import {
    closeTestingConnections,
    createTestingConnections,
    reloadTestingDatabases,
} from "../../../utils/test-utils"
import { DataSource } from "../../../../src/data-source/DataSource"

describe("some feature", () => {
    let dataSources: DataSource[]

    before(async () => {
        dataSources = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            schemaCreate: true,
            dropSchema: true,
        })
    })

    beforeEach(() => reloadTestingDatabases(dataSources))

    after(() => closeTestingConnections(dataSources))

    it("does the expected thing", () =>
        Promise.all(
            dataSources.map(async (dataSource) => {
                // exercise behavior

                expect(/* actual */).to.equal(/* expected */)
            }),
        ))
})
```

This mirrors the test structure recommended by the project's developer documentation. Test-local entities can be placed in an `entity/` directory alongside the test.

When adding a regression test for an existing GitHub issue, the maintainers ask contributors to include the issue number in a comment near the test.

---

## 8. Code quality checks

Before opening a PR, it is useful to run:

```bash
pnpm run typecheck
pnpm run lint
pnpm run format:ci
pnpm run test
```

The corresponding scripts use TypeScript's no-emit type checking, ESLint, Prettier, and the compiled Mocha suite.

To automatically format files:

```bash
pnpm run format
```

---

## 9. Suggested first contribution workflow

A practical development loop is:

```bash
# 1. Update master
git checkout master
git pull --ff upstream master

# 2. Create a branch
git checkout -b my-fix-branch master

# 3. Start a compile watcher
pnpm run compile -- --watch

# 4. In another terminal, run focused tests
pnpm run test:fast -- --grep "relevant test"

# 5. Before committing
pnpm run typecheck
pnpm run lint
pnpm run format:ci
pnpm run test
```

The contribution guide asks contributors to make changes on a dedicated branch, include appropriate tests, run the full test suite, and then open a PR against TypeORM's `master` branch.

For a major new feature, the project asks contributors to open an issue and discuss the proposal before implementation; smaller features can be submitted directly as a pull request.

---

## 10. Quick-reference commands

| Task                       | Command                                   |
| -------------------------- | ----------------------------------------- |
| Install dependencies       | `pnpm install`                            |
| Create test DB config      | `cp ormconfig.sample.json ormconfig.json` |
| Compile                    | `pnpm run compile`                        |
| Watch TypeScript           | `pnpm run watch`                          |
| Full test cycle            | `pnpm run test`                           |
| Tests without rebuilding   | `pnpm run test:fast`                      |
| Focus tests                | `pnpm run test -- --grep "name"`          |
| Type-check                 | `pnpm run typecheck`                      |
| Lint                       | `pnpm run lint`                           |
| Check formatting           | `pnpm run format:ci`                      |
| Auto-format                | `pnpm run format`                         |
| Package TypeORM            | `pnpm run package`                        |
| Run docs locally           | `pnpm run docs:dev`                       |
| Start PostgreSQL for tests | `docker compose up postgres-17`           |
| Start all Docker DBs       | `docker compose up`                       |

The package scripts are defined in the root `package.json`; database setup and testing workflows are documented in `DEVELOPER.md`.

## 11. Where to start reading the code

For a first pass through the codebase, a useful reading order is:

1. `src/index.ts` — see the public TypeORM API.
2. `src/data-source/DataSource.ts` — understand initialization, drivers, managers, metadata, transactions, and query runners.
3. `src/entity-manager/EntityManager.ts` — understand the general persistence API.
4. `src/repository/Repository.ts` — see the entity-specific convenience layer.
5. `src/query-builder/` — understand query construction and execution.
6. `src/driver/` — move here when working on database-specific behavior.
7. `test/utils/test-utils.ts` — understand how the same tests are executed across multiple database engines.

These components are closely connected: repositories delegate through entity managers, query builders operate against a `DataSource`, and the `DataSource` owns the configured driver and query-runner infrastructure.

---

**Primary repository references:** `README.md`, `DEVELOPER.md`, `CONTRIBUTING.md`, `package.json`, `.mocharc.json`, `docker-compose.yml`, `ormconfig.sample.json`, and the core source files on the current `master` branch.
