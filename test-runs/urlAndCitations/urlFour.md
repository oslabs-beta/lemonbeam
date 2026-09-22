# TypeORM Contributor Onboarding Guide

This guide covers how to understand, set up, build, run, and test the TypeORM repository locally. It targets the current `master` branch, which is the stable v1.x development line; the repository currently declares package version `1.1.1`.

## 1. Project Overview

[TypeORM](https://github.com/typeorm/typeorm) is an ORM for TypeScript and JavaScript. It supports both the **Data Mapper** and **Active Record** patterns and works with databases including PostgreSQL, MySQL/MariaDB, SQLite, Microsoft SQL Server, Oracle, MongoDB, SAP HANA, and Google Spanner. It also supports Node.js as well as several browser/mobile-oriented environments.

At a high level, TypeORM sits between application code and database-specific drivers:

```text
Application
    │
    ├── Entities / decorators
    │
    ├── Repository / EntityManager
    │
    └── QueryBuilder
            │
         DataSource
            │
      Database Driver
            │
    PostgreSQL / MySQL /
    SQLite / MSSQL / ...
```

A few concepts are especially useful when navigating the code:

* **`DataSource`** is the central database configuration/runtime object. It owns or coordinates the driver, entity manager, metadata, migrations, subscribers, logging, caching, and query runners.
* **`EntityManager`** exposes persistence operations that can work across entity types.
* **`Repository<Entity>`** provides the entity-specific API used for operations such as finding, saving, updating, and deleting records.
* **Query builders** build database queries while accounting for the selected driver. `SelectQueryBuilder`, for example, constructs SELECTs, joins, filters, ordering, limits, locking, and other SQL features.
* The package's public entry point in `src/index.ts` re-exports the commonly used decorators, errors, types, repositories, and other public APIs.

---

## 2. Prerequisites

The repository declares the following Node.js versions:

```text
^20.19.0 || ^22.13.0 || >=24.11.0
```

and pins the package manager to:

```text
pnpm 10.34.5
```

Use a compatible Node.js installation and pnpm version rather than whatever happens to be installed globally.

You will also need:

* Git.
* A database you intend to test against, **or Docker** for running database services.
* More database engines if you intend to exercise the full cross-database test suite.

The project supplies Docker Compose services for its supported test databases, so installing every DBMS directly on your machine is not necessary.

Check your environment:

```bash
node --version
pnpm --version
git --version
docker --version
docker compose version
```

---

## 3. Clone and Install

For contributors, the project documentation recommends forking TypeORM, cloning your fork, and configuring the main repository as `upstream`.

```bash
git clone git@github.com:<your-github-username>/typeorm.git
cd typeorm

git remote add upstream https://github.com/typeorm/typeorm.git
```

Install dependencies:

```bash
pnpm install
```

`pnpm install` is the repository's documented dependency-installation command.

A useful sanity check after installation is:

```bash
pnpm run typecheck
```

The repository also exposes scripts for compilation, linting, formatting, packaging, tests, documentation, and watch mode.

---

## 4. Configure the Test Databases

TypeORM's test harness reads database connections from a root-level `ormconfig.json`. Start by copying the provided sample:

```bash
cp ormconfig.sample.json ormconfig.json
```

### Important: disable databases you are not running

The sample contains configurations for numerous engines—including SQLite, PostgreSQL, MySQL, MariaDB, MSSQL, Oracle, CockroachDB, SAP HANA, Spanner, and others—and several entries are enabled by default.

The test utilities read this file and ignore connections whose `skip` property is `true`. Tests can additionally restrict themselves using `enabledDrivers` and `disabledDrivers`.

So for a simple first setup, enable only the database you actually intend to run.

For example, if starting with PostgreSQL, configure the other database objects with:

```json
{
  "skip": true
}
```

and leave the PostgreSQL connection enabled.

This keeps your first test run from failing merely because MySQL, Oracle, MSSQL, or another service is unavailable.

---

## 5. Running the Repository Locally

TypeORM is a **library**, not a standalone application server, so "running it locally" generally means:

1. starting one or more test databases;
2. compiling TypeORM;
3. running its tests;
4. optionally running the docs site or building a package for another project.

### Minimal local setup with PostgreSQL

The developer documentation specifically gives PostgreSQL 17 as a convenient single-service example:

```bash
docker compose up -d postgres-17
```

The supplied Compose service exposes PostgreSQL on port `5432` with:

```text
username: username
password: password
database: typeorm
```

matching the PostgreSQL entry in the sample ORM configuration.

Check that the container is running:

```bash
docker compose ps
```

Then compile the project:

```bash
pnpm run compile
```

The `compile` script runs the project's cleanup/build process followed by TypeScript compilation. TypeScript outputs compiled files under `build/compiled`.

### Run every Dockerized database

If you need broad cross-database testing:

```bash
docker compose up
```

The project documentation supports bringing up the full database set this way. Be aware that some services consume substantial resources; the developer guide specifically notes that the SQL Server container requires significant memory.

---

## 6. Project Structure

The repository's top level includes the following main areas:

```text
typeorm/
├── .github/               # GitHub workflows/project automation
├── docker/                # Supporting database/container resources
├── docs/                  # TypeORM documentation site
├── extra/                 # Ancillary project files
├── packages/              # Additional package code
├── playground/            # Manual/experimental development area
├── resources/             # Project resources
├── src/                   # Main TypeORM implementation
├── test/                  # Automated tests and test infrastructure
│
├── docker-compose.yml     # Local database services
├── ormconfig.sample.json  # Template DB configuration for tests
├── package.json           # Dependencies and development scripts
├── pnpm-lock.yaml
├── tsconfig.json
├── eslint.config.mjs
├── .mocharc.json
├── CONTRIBUTING.md
└── DEVELOPER.md
```

The main TypeScript configuration compiles `src`, `test`, and root TypeScript files into `build/compiled`. Directories including `docs`, `packages`, `playground`, and `build` are excluded from this primary compilation.

### `src/`: the core library

Some of the most useful areas to learn first are:

```text
src/
├── data-source/       # DataSource and connection configuration
├── entity-manager/    # EntityManager APIs
├── repository/        # Repository, BaseEntity, persistence APIs
├── query-builder/     # SELECT/INSERT/UPDATE/etc. query construction
├── driver/            # Database-specific behavior
├── decorator/         # @Entity, @Column, relation decorators, etc.
├── metadata*/         # Entity/column/relation metadata machinery
├── migration/         # Migration infrastructure
├── subscriber/        # Entity/database event subscribers
├── logger/            # Logging
├── cache/             # Query-result caching
└── index.ts           # Main public exports
```

A useful path through the architecture is:

```text
DataSource
   ↓
EntityManager
   ↓
Repository / QueryBuilder
   ↓
Driver
   ↓
Database
```

`DataSource.ts` itself is a helpful architectural starting point because it ties together the `DriverFactory`, `EntityManager`, metadata builders, migration executor, query builders, query runners, logger, cache, and subscribers.

### `test/`: tests and shared infrastructure

The tests use shared helpers from:

```text
test/utils/test-utils.ts
```

These helpers read `ormconfig.json`, decide which database drivers are enabled, create test `DataSource` instances, initialize schemas, reload databases, and clean up connections.

Tests that require entities commonly keep them alongside the test in an `entity/` directory. The developer guide's standard test pattern loads:

```text
./entity/*{.js,.ts}
```

relative to a test.

---

## 7. Testing

TypeORM uses **Mocha** as its test runner and **Chai** for assertions. The Mocha configuration recursively discovers compiled tests matching:

```text
./build/compiled/test/**/*.test.{js,ts}
```

and loads the common test setup from:

```text
./build/compiled/test/utils/test-setup.js
```

### Run the normal test suite

```bash
pnpm run test
```

The `test` script first recompiles the project and then invokes the normal Mocha test run.

This is the safer command to run before submitting a change.

### Run one group of tests

Mocha's `--grep` option is supported through the package script:

```bash
pnpm run test -- --grep "your test name"
```

For example:

```bash
pnpm run test -- --grep "query builder"
```

During development you can also temporarily use Mocha's `.only`:

```ts
describe.only("feature being worked on", () => {
    // ...
})
```

The project's developer documentation explicitly recommends `.only` or `--grep` when focusing on a specific test.

Remove `.only` before committing.

### Faster edit-test loop

`pnpm run test` does a fresh compile, which is useful for validation but unnecessarily slow while repeatedly editing one feature.

The project's recommended faster workflow is to keep TypeScript compiling in watch mode:

```bash
pnpm run compile -- --watch
```

Then, in another terminal:

```bash
pnpm run test:fast
```

`test:fast` invokes Mocha without triggering another full compile.

You can combine the fast path with grep:

```bash
pnpm run test:fast -- --grep "your test name"
```

A typical development session therefore looks like:

```text
Terminal 1
──────────
pnpm run compile -- --watch

Terminal 2
──────────
pnpm run test:fast -- --grep "feature name"
```

### Writing a database-backed test

The standard TypeORM test pattern uses `createTestingConnections`, resets the test databases before individual tests, and closes the connections afterward.

A simplified version looks like:

```ts
import { expect } from "chai"
import {
    closeTestingConnections,
    createTestingConnections,
    reloadTestingDatabases,
} from "../../../utils/test-utils"

describe("my feature", () => {
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

    it("does what is expected", async () => {
        for (const dataSource of dataSources) {
            // Arrange
            // Act
            // Assert
            expect(/* result */).to.equal(/* expected */)
        }
    })
})
```

This arrangement is important because a single test may execute against multiple configured database drivers rather than only one database.

---

## 8. Linting, Formatting, and Type Checking

The root package exposes the main quality commands directly:

```bash
# ESLint
pnpm run lint

# TypeScript without emitting files
pnpm run typecheck

# Check formatting without rewriting files
pnpm run format:ci

# Rewrite files using Prettier
pnpm run format
```

Before opening a PR, a useful validation sequence is:

```bash
pnpm run format:ci
pnpm run lint
pnpm run typecheck
pnpm run test
```

The contribution guidelines require code changes to include appropriate tests and ask contributors to run the test suite before submitting a PR.

---

## 9. Building a Local TypeORM Package

If your change needs to be tested inside another application, build the distributable package:

```bash
pnpm run package
```

The resulting package is placed under:

```text
build/package/
```

You can also create an installable tarball:

```bash
cd build/package
pnpm pack
```

This produces a TypeORM `.tgz` package that can be installed into another project for integration testing.

For example, from the downstream project:

```bash
npm install /path/to/typeorm/build/typeorm-<version>.tgz
```

This is useful when a change works in the TypeORM test suite but also needs verification against a real application.

---

## 10. Running the Documentation Site

The repository includes a dedicated documentation development script:

```bash
pnpm run docs:dev
```

Internally this changes into `docs/` and starts the documentation project's development server.

Use this when changing anything under `docs/` and you want to inspect the result locally.

---

## 11. Suggested First-Day Workflow

For a new contributor, a practical setup is:

```bash
# 1. Clone your fork
git clone git@github.com:<your-user>/typeorm.git
cd typeorm

# 2. Add the canonical repository
git remote add upstream https://github.com/typeorm/typeorm.git

# 3. Install dependencies
pnpm install

# 4. Create test configuration
cp ormconfig.sample.json ormconfig.json

# 5. Edit ormconfig.json:
#    - leave PostgreSQL enabled
#    - set skip: true for databases you are not running

# 6. Start PostgreSQL
docker compose up -d postgres-17

# 7. Compile and run tests
pnpm run test
```

Once that succeeds, use the faster development loop:

```bash
# Terminal 1
pnpm run compile -- --watch

# Terminal 2
pnpm run test:fast -- --grep "test or feature name"
```

Before submitting work:

```bash
pnpm run format:ci
pnpm run lint
pnpm run typecheck
pnpm run test
```

---

## 12. Contribution Workflow

Create changes on a feature branch rather than directly on `master`:

```bash
git checkout -b my-fix-branch master
```

Add or update the appropriate tests, run the suite, commit, and push your branch. TypeORM's contribution guide states that patches should include appropriate test cases and that PRs should target `typeorm:master`.

The project uses structured commit messages along the lines of:

```text
<type>: <subject>
```

with types including:

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

The contribution guide asks for imperative, present-tense subjects without a trailing period and recommends keeping commit-message lines within 100 characters.

---

## 13. Command Cheat Sheet

| Task                        | Command                                   |
| --------------------------- | ----------------------------------------- |
| Install dependencies        | `pnpm install`                            |
| Create test DB config       | `cp ormconfig.sample.json ormconfig.json` |
| Start PostgreSQL            | `docker compose up -d postgres-17`        |
| Start all DB containers     | `docker compose up`                       |
| Compile                     | `pnpm run compile`                        |
| Compile continuously        | `pnpm run compile -- --watch`             |
| Full test cycle             | `pnpm run test`                           |
| Tests without recompiling   | `pnpm run test:fast`                      |
| Filter tests                | `pnpm run test -- --grep "pattern"`       |
| Type-check                  | `pnpm run typecheck`                      |
| Lint                        | `pnpm run lint`                           |
| Check formatting            | `pnpm run format:ci`                      |
| Apply formatting            | `pnpm run format`                         |
| Build distributable package | `pnpm run package`                        |
| Run documentation locally   | `pnpm run docs:dev`                       |

These commands correspond to the scripts and workflows currently defined in the repository's `package.json` and developer documentation.

---

## 14. Where to Start Reading the Code

If this is your first time in the TypeORM codebase, a productive reading order is:

1. **`src/index.ts`** — understand what the package exposes publicly.
2. **`src/data-source/DataSource.ts`** — see how the major subsystems are assembled.
3. **`src/entity-manager/EntityManager.ts`** — understand general persistence operations.
4. **`src/repository/Repository.ts`** — understand the API most application code interacts with.
5. **`src/query-builder/QueryBuilder.ts` and `SelectQueryBuilder.ts`** — follow how high-level calls become database queries.
6. **`src/driver/`** — trace database-specific behavior once you understand the common abstraction.
7. **`test/utils/test-utils.ts`** — understand how the repository turns the same test case into tests against multiple database engines.

That route gives you the public surface first, then the central runtime object, then persistence/query abstractions, then database-specific implementation details and finally the test harness.
