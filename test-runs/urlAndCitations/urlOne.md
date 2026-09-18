# TypeORM Contributor Onboarding Guide

This guide covers how TypeORM is organized, how to set up a development environment, how to build and run the project locally, and how to work with its test suite.

> **Scope:** This guide targets the repository's current `master` branch, which TypeORM documents as the stable v1.x development line.

## 1. Project overview

[TypeORM](https://github.com/typeorm/typeorm) is an object-relational mapper for TypeScript and JavaScript. It supports Node.js as well as browser/mobile-style environments and works with databases including PostgreSQL, MySQL/MariaDB, SQLite, Microsoft SQL Server, Oracle, MongoDB, SAP HANA, and Google Spanner. It supports both **Data Mapper** and **Active Record** programming styles.

The core API centers around concepts such as:

* `DataSource` — database configuration and connection lifecycle.
* `EntityManager` — higher-level persistence operations.
* `Repository` — entity-specific data-access APIs.
* `QueryBuilder` — programmatic SQL/query construction.
* Entities and decorators — mapping TypeScript classes to database structures.
* Drivers — database-specific implementations.
* Migrations — schema change management.
* Subscribers/listeners — hooks into persistence lifecycle events.

The public API is assembled primarily through `src/index.ts`, which exports entities/decorators, repositories, managers, query builders, migrations, schema types, drivers, logging APIs, and other user-facing functionality.

`DataSource` is one of the central integration points: it owns the selected database driver, entity manager, metadata, migrations, subscribers, logging, query-result caching, and query runners.

---

## 2. Prerequisites

You will need:

* Git.
* A supported Node.js version.
* pnpm.
* Docker if you want the easiest way to run database-dependent tests.

The current `package.json` specifies:

```text
Node.js: ^20.19.0 || ^22.13.0 || >=24.11.0
pnpm:    10.34.5
```

The repository also configures pnpm as its required development package manager, so using the pinned version is the safest option.

Check your environment:

```bash
node --version
pnpm --version
git --version
```

If you intend to exercise database-specific functionality without Docker, you will need the corresponding local DBMS. The project documentation specifically calls out MySQL, MariaDB, PostgreSQL, Oracle, and SQL Server; alternatively, the repository provides Docker services for development and testing.

---

## 3. Clone and install

For read-only exploration, clone the main repository:

```bash
git clone https://github.com/typeorm/typeorm.git
cd typeorm
pnpm install
```

For contributing, the project recommends forking TypeORM, cloning your fork, and adding the official repository as `upstream`:

```bash
git clone git@github.com:<your-github-username>/typeorm.git
cd typeorm

git remote add upstream https://github.com/typeorm/typeorm.git
```

Then install dependencies:

```bash
pnpm install
```

These are the workflow and installation steps documented in `DEVELOPER.md`.

Verify the codebase compiles:

```bash
pnpm run compile
```

The `compile` script cleans the previous compiled output and runs TypeScript compilation. The repository also exposes scripts for linting, type checking, formatting, packaging, documentation development, and testing.

A useful initial sanity check is:

```bash
pnpm run typecheck
pnpm run lint
pnpm run compile
```

---

## 4. Configure databases for tests

TypeORM's tests use an `ormconfig.json` file in the repository root.

Create it from the sample:

```bash
cp ormconfig.sample.json ormconfig.json
```

This is the setup explicitly recommended by the project's developer guide.

`ormconfig.sample.json` contains configurations for multiple backends, including Better SQLite 3, CockroachDB, MariaDB, MongoDB, SQL Server, MySQL, Oracle, PostgreSQL, SAP HANA, Spanner, and `sql.js`. Each configuration can be enabled or skipped independently.

You normally do **not** need every database while developing one change. The developer guide recommends keeping only the database configurations relevant to your work when you want a faster test cycle.

For example, when working on PostgreSQL behavior, you can start the repository's PostgreSQL container:

```bash
docker compose up postgres-17
```

The supplied container exposes PostgreSQL on port `5432` and uses the database/user configuration expected by the sample development setup.

To bring up the complete database environment instead:

```bash
docker compose up
```

Be aware that running all databases is substantially heavier; the developer documentation specifically notes that the SQL Server container requires significant memory.

---

## 5. Running TypeORM locally

TypeORM is a **library**, rather than an application with a single development server. In practice, "running TypeORM locally" usually means one of four things: compiling it, watching source files, running its tests, or building a package that you consume from another application.

### Compile once

```bash
pnpm run compile
```

### Watch during development

The package provides a TypeScript watch script:

```bash
pnpm run watch
```

For test-driven development, the repository documentation recommends starting with a clean compilation in watch mode:

```bash
pnpm run compile -- --watch
```

After the initial compilation completes, leave that process running and use `test:fast` in another terminal. This avoids cleaning and rebuilding the entire codebase before every test run.

### Run the documentation site

```bash
pnpm run docs:dev
```

The root script changes into `docs/` and runs that project's development server.

### Build an installable TypeORM package

```bash
pnpm run package
```

The packaged library is generated under:

```text
build/package/
```

You can also create a tarball for testing inside another application:

```bash
cd build/package
pnpm pack
```

This produces a TypeORM `.tgz` package that can be installed into another project for integration testing.

---

## 6. Project structure

At the top level, the repository contains the main source, tests, documentation, Docker infrastructure, playground code, supporting packages, and project configuration.

```text
typeorm/
├── .github/             # GitHub Actions and repository automation
├── .husky/              # Git hooks
├── docker/              # Supporting Docker files/scripts
├── docs/                # TypeORM documentation site and documentation source
├── extra/               # Additional project resources/code
├── packages/            # Additional package-related code
├── playground/          # Development experiments/manual playgrounds
├── resources/           # Supporting project resources
├── src/                 # Main TypeORM implementation
├── test/                # Automated tests and test utilities
├── docker-compose.yml   # Local database services
├── ormconfig.sample.json
├── package.json
├── tsconfig.json
└── gulpfile.ts
```

### `src/`

This is the most important directory for core contributors.

Major areas include:

```text
src/
├── data-source/         # DataSource lifecycle/configuration
├── driver/              # Database-specific drivers
├── entity-manager/      # EntityManager implementation
├── repository/          # Repository and BaseEntity APIs
├── query-builder/       # SELECT/INSERT/UPDATE/DELETE query builders
├── metadata/            # Runtime entity metadata
├── metadata-builder/    # Builds and validates metadata
├── decorator/           # @Entity, @Column, relation decorators, etc.
├── migration/           # Migration execution and APIs
├── schema-builder/      # Database schema representation/manipulation
├── subscriber/          # Entity/query lifecycle subscribers
├── logger/              # Logging implementations
├── cache/               # Query-result caching
├── error/               # TypeORM-specific errors
└── util/                # Shared utilities
```

A good starting point for understanding the architecture is:

```text
src/index.ts
        ↓
src/data-source/DataSource.ts
        ↓
DriverFactory → database driver
EntityManagerFactory → EntityManager
metadata builders
repositories
query builders
migration executor
```

`src/index.ts` shows what TypeORM considers public API, while `DataSource.ts` provides a useful view of how drivers, managers, metadata, migrations, repositories, query builders, and caching fit together.

### `test/`

Automated tests live under `test/`, with shared testing infrastructure in `test/utils/`.

The test helpers create database connections from the project's test configuration and provide utilities for creating, reloading, and closing testing databases.

For a bug fix, find an existing functional or regression test close to the behavior you are changing before creating a completely new test structure. The contributor documentation specifically recommends using relevant functional tests as a starting point and referencing the GitHub issue number in regression tests where applicable.

---

## 7. Testing

### Full local test run

After configuring `ormconfig.json` and starting the relevant databases:

```bash
pnpm run test
```

The `test` script first recompiles TypeORM and then invokes the faster Mocha test command:

```text
compile → test:fast → mocha
```

Mocha is configured to execute compiled test files matching:

```text
./build/compiled/test/**/*.test.{js,ts}
```

It also loads:

```text
./build/compiled/test/utils/test-setup.js
```

and uses a 90-second test timeout.

### Recommended development loop

Running the complete build for every small code change is slow. The repository recommends using two terminals.

**Terminal 1 — compile/watch:**

```bash
pnpm run compile -- --watch
```

**Terminal 2 — execute tests without rebuilding:**

```bash
pnpm run test:fast
```

This lets TypeScript rebuild changed files while subsequent test runs skip the full clean-and-compile stage.

### Run a focused test

Mocha's grep filtering can be passed through the test command:

```bash
pnpm run test -- --grep "your test name"
```

When you already have watch compilation running, use the faster form:

```bash
pnpm run test:fast -- --grep "your test name"
```

You can also temporarily use Mocha's `describe.only(...)` or `it.only(...)` while debugging, although those markers should not be committed. The project's developer guide documents both approaches.

### Typical test structure

Tests commonly use TypeORM's shared connection helpers:

```ts
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

    it("should behave correctly", async () => {
        // assertions
    })
})
```

The exact test template in `DEVELOPER.md` creates testing connections, resets the databases before each case, and closes those connections afterward. It also supports colocating test entities under an `entity/` directory next to the test.

---

## 8. Code-quality commands

Useful commands from `package.json` include:

```bash
# TypeScript type checking without emitting files
pnpm run typecheck

# ESLint
pnpm run lint

# Format files
pnpm run format

# Verify formatting without modifying files
pnpm run format:ci

# Full compile
pnpm run compile

# Full test cycle
pnpm run test
```

These scripts are defined directly by the repository.

Before opening a pull request, a reasonable local check is:

```bash
pnpm run typecheck
pnpm run lint
pnpm run format:ci
pnpm run test
```

For database-specific changes, make sure the relevant database backend is enabled in `ormconfig.json` when running the tests.

---

## 9. Suggested first-contribution workflow

A practical workflow for a new contributor is:

1. Fork and clone the repository.
2. Install the Node/pnpm versions expected by `package.json`.
3. Run `pnpm install`.
4. Copy `ormconfig.sample.json` to `ormconfig.json`.
5. Enable only the database backends relevant to your change.
6. Start those databases with Docker if necessary.
7. Run `pnpm run compile`.
8. Locate the closest existing test to the code you plan to modify.
9. Start `pnpm run compile -- --watch`.
10. Make your source and test changes.
11. Repeatedly run `pnpm run test:fast -- --grep "..."`.
12. Before submitting, run type checking, linting, formatting checks, and the relevant broader test suite.

For major new features, the contributor guidelines recommend discussing the proposal in an issue before implementation; smaller features can be submitted directly as pull requests. Bug reports should include a minimal reproduction whenever possible.

---

## 10. Useful files to read first

If you are new to the codebase, start with these files in roughly this order:

```text
README.md
DEVELOPER.md
CONTRIBUTING.md
package.json
src/index.ts
src/data-source/DataSource.ts
test/utils/test-utils.ts
ormconfig.sample.json
docker-compose.yml
```

Together they explain the public surface of TypeORM, its development commands, the central runtime architecture, and how the cross-database test environment works.
