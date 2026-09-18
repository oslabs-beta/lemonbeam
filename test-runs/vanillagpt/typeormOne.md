
typeorm-raw-dump.txt 
Here's a GitHub repo  — write me an onboarding guide covering project overview, setup, running it locally, project structure, and testing. Give it to me in markdown format. 

# TypeORM Developer Onboarding Guide

## Project Overview

TypeORM is a TypeScript/JavaScript Object-Relational Mapping (ORM) library. It supports both **Data Mapper** and **Active Record** patterns and is designed to work across multiple runtimes, including Node.js, browsers, React Native, Expo, Electron, and related JavaScript environments.

The project supports a broad set of databases, including:

* MySQL / MariaDB
* PostgreSQL
* Microsoft SQL Server
* Oracle
* SAP HANA
* SQLite
* MongoDB
* Google Spanner
* CockroachDB and other compatible/derived databases

Its major features include repositories, entity managers, relations, migrations, transactions, schema management, query building, connection pooling, replication, caching, subscribers/listeners, and multi-database support.

At a high level, TypeORM converts entity definitions such as:

```ts
@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    firstName: string
}
```

into database operations exposed through APIs such as `DataSource`, `EntityManager`, repositories, and `QueryBuilder`.

---

## Prerequisites

You will need:

* Git
* Node.js
* pnpm
* At least one supported database if you plan to run database-backed tests
* Docker / Docker Compose if you prefer running test databases in containers

The repository currently declares these supported Node.js versions:

```text
^20.19.0 || ^22.13.0 || >=24.11.0
```

and declares:

```text
pnpm 10.34.5
```

as its package manager.

Using a Node version manager such as `nvm` or `fnm` is recommended by the project's developer documentation.

---

## Initial Setup

### 1. Clone the repository

If you are contributing through a fork:

```bash
git clone git@github.com:<your-github-username>/typeorm.git
cd typeorm

git remote add upstream https://github.com/typeorm/typeorm.git
```

The project's contributor workflow uses your fork as `origin` and the main TypeORM repository as `upstream`.

If you only need a local checkout, cloning the upstream repository directly is also sufficient.

### 2. Install dependencies

```bash
pnpm install
```

This installs the root development dependencies, including TypeScript, Mocha, Chai, ESLint, Prettier, database drivers, and the project's build tooling.

### 3. Create your database test configuration

Tests expect an `ormconfig.json` file at the repository root.

Start with the sample:

```bash
cp ormconfig.sample.json ormconfig.json
```

Then edit `ormconfig.json` so that it contains only the database configurations you intend to use locally, with credentials matching your environment.

The sample contains configurations for databases such as `better-sqlite3`, CockroachDB, MariaDB, MongoDB, SQL Server, MySQL, Oracle, PostgreSQL, SAP HANA, Spanner, and `sql.js`.

For a simple starting point, `better-sqlite3` or `sql.js` avoids having to maintain a separate database server.

---

## Running Database Services With Docker

Instead of installing databases directly on your machine, the repository provides a `docker-compose.yml`.

For example, the developer guide demonstrates starting PostgreSQL with:

```bash
docker compose up postgres-17
```

To start the configured database services more broadly:

```bash
docker compose up
```

Once the services are ready, make sure your `ormconfig.json` matches the corresponding Docker connection details before running tests. The developer guide notes that starting all database services can require substantial system resources.

---

## Running the Project Locally

TypeORM itself is a **library**, not a standalone web application. There is no root application server that needs to be started for normal core development.

Your normal development loop is to compile/watch the source and run tests.

### Compile the source

```bash
pnpm run compile
```

This cleans the previous build and compiles TypeScript. Compiled development output goes into:

```text
build/compiled/
```

The TypeScript configuration explicitly sets `build/compiled` as its output directory.

### Watch for source changes

For active development:

```bash
pnpm run watch
```

or:

```bash
pnpm run compile -- --watch
```

The watch workflow is useful when repeatedly running `test:fast`, because you avoid recompiling the entire project for every test invocation.

### Build a distributable TypeORM package

```bash
pnpm run package
```

This creates a package under:

```text
build/package/
```

You can use that directory to test your local TypeORM build from another application.

To create a package tarball:

```bash
cd build/package
pnpm pack
```

The resulting `.tgz` can then be installed into another project for integration testing.

### Run the documentation site

The repository also exposes a docs development command:

```bash
pnpm run docs:dev
```

The root script changes into `docs/` and starts the documentation development environment.

---

## Useful Development Commands

| Command              | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `pnpm install`       | Install dependencies                                 |
| `pnpm run compile`   | Clean and compile TypeScript                         |
| `pnpm run watch`     | Continuously compile changes                         |
| `pnpm run package`   | Create the distributable package in `build/package/` |
| `pnpm run test`      | Compile and run the test suite                       |
| `pnpm run test:fast` | Run tests without recompiling                        |
| `pnpm run lint`      | Run ESLint                                           |
| `pnpm run format`    | Format the repository with Prettier                  |
| `pnpm run typecheck` | Type-check without emitting files                    |
| `pnpm run docs:dev`  | Start the documentation development environment      |

These commands are defined directly in the root `package.json`.

---

# Project Structure

The codebase is primarily organized by ORM responsibility.

```text
typeorm/
├── src/
│   ├── data-source/
│   ├── entity-manager/
│   ├── repository/
│   ├── query-builder/
│   ├── decorator/
│   ├── driver/
│   ├── metadata/
│   ├── schema-builder/
│   ├── migration/
│   ├── subscriber/
│   └── persistence/
│
├── test/
│   ├── functional/
│   ├── github-issues/
│   ├── unit/
│   └── utils/
│
├── docs/
├── packages/
├── docker/
├── playground/
├── build/                  # generated
│   ├── compiled/
│   └── package/
│
├── docker-compose.yml
├── ormconfig.sample.json
├── package.json
├── tsconfig.json
├── DEVELOPER.md
└── CONTRIBUTING.md
```

The main source areas are:

### `src/data-source/`

Contains `DataSource` management. `DataSource` is the main entry point for configured database connections.

### `src/entity-manager/`

Implements entity-management operations and the `EntityManager` API.

### `src/repository/`

Implements TypeORM's repository abstraction. Most user-facing entity persistence and lookup operations eventually interact with this layer.

### `src/query-builder/`

Implements `QueryBuilder`, which constructs SQL queries programmatically.

### `src/decorator/`

Contains TypeScript decorators such as entity, column, relation, and related metadata decorators.

### `src/driver/`

Contains database-specific implementations.

Code that genuinely depends on a particular database dialect or driver generally belongs here. Database drivers are responsible for concerns including connection management, query execution, type mapping, schema operations, and transactions.

### `src/metadata/`

Contains the internal representation and management of entity metadata.

### `src/schema-builder/`

Handles schema creation and synchronization.

### `src/migration/`

Contains TypeORM's migration infrastructure.

### `src/subscriber/`

Implements entity/database event subscriber functionality.

### `src/persistence/`

Contains the internal logic involved in persisting entity changes.

---

# Testing

## Test Stack

The main test runner is **Mocha**, with **Chai** used for assertions.

The Mocha configuration runs compiled tests matching:

```text
build/compiled/test/**/*.test.{js,ts}
```

and loads:

```text
build/compiled/test/utils/test-setup.js
```

before the suite. The configured test timeout is 90 seconds.

This is important: normal tests run against the **compiled build**, which is why `pnpm run test` compiles the project first.

---

## Test Directory Layout

Tests are divided into several categories:

```text
test/
├── functional/      # Feature/integration tests; preferred location
├── github-issues/   # Regression tests associated with GitHub issues
├── unit/            # Isolated unit tests
└── utils/           # Shared test infrastructure and helpers
```

For new behavior, the repository recommends preferring `test/functional/` instead of creating a new per-issue test unless the issue-specific organization is actually useful.

---

## Run the Full Test Suite

First make sure `ormconfig.json` exists and points at databases that are actually available.

Then run:

```bash
pnpm run test
```

Internally, this performs roughly:

```text
compile → test:fast → mocha
```

Tests are run against the database configurations enabled in your `ormconfig.json`. For faster local development, keep only the database configurations relevant to the code you are changing.

---

## Fast Development Test Loop

Running the normal test command repeatedly can be slow because it recompiles the project.

A faster workflow is:

**Terminal 1**

```bash
pnpm run compile -- --watch
```

**Terminal 2**

```bash
pnpm run test:fast
```

`test:fast` invokes Mocha directly and assumes that your compiled files are already up to date.

---

## Run Specific Tests

Mocha's `--grep` option lets you select tests based on their `describe()` or `it()` description.

For example:

```bash
pnpm run test -- --grep "repository"
```

During the fast watch workflow:

```bash
pnpm run test:fast -- --grep "repository"
```

The project's development documentation also mentions temporarily using Mocha's `describe.only()` or `it.only()` during development, but remember to remove `.only` before committing.

---

## Writing Tests

A typical functional test follows this pattern:

```ts
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

    it("should do something specific", () =>
        Promise.all(
            dataSources.map(async (dataSource) => {
                const result = /* exercise feature */

                expect(result).to.equal(/* expected */)
            }),
        ))
})
```

The important pattern is that a test often creates **multiple `DataSource` instances** and executes the same assertions against every configured database.

Entities placed beneath an `entity/` directory next to the test can be automatically loaded by the test setup.

When writing cross-database functionality:

* Avoid assuming one SQL dialect.
* Run database-independent behavior against multiple drivers.
* Keep genuinely driver-specific behavior under `src/driver/`.
* Use `DataSource.options.type` when a test legitimately needs to distinguish databases.
* Be aware that SQL syntax and database capabilities differ between drivers.

---

# Linting, Formatting, and Type Checking

Before submitting a change, run:

```bash
pnpm run lint
pnpm run typecheck
pnpm run format
```

The repository uses ESLint and Prettier, while TypeScript is configured to catch issues including implicit `any`, missing returns, and unused locals. Decorator metadata and experimental decorators are enabled because they are fundamental to TypeORM's entity API.

The repository also uses Husky/lint-staged as part of its development workflow.

---

# Recommended First-Day Workflow

For a new contributor, a practical setup is:

```bash
# 1. Install
pnpm install

# 2. Create local test configuration
cp ormconfig.sample.json ormconfig.json

# 3. Start one database if necessary
docker compose up postgres-17

# 4. Make sure the project compiles
pnpm run compile

# 5. Run tests
pnpm run test

# 6. Start the fast development cycle
pnpm run compile -- --watch
```

Then, in another terminal:

```bash
pnpm run test:fast -- --grep "feature you are working on"
```

Before opening a PR:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
```

## If your change modifies a public API, update the relevant documentation as well. The project expects code changes to include appropriate tests, and its contributor workflow requires tests to pass before changes are merged.

## Where to Start in the Codebase

If you're investigating:

* **Database connection/configuration issues** → start in `src/data-source/`
* **`find`, `save`, repository behavior** → `src/repository/` and `src/entity-manager/`
* **Generated SQL** → `src/query-builder/`
* **A particular database behaving differently** → `src/driver/<database>/`
* **Decorators such as `@Column` or relations** → `src/decorator/`, then metadata handling
* **Schema synchronization** → `src/schema-builder/`
* **Migration behavior** → `src/migration/`
* **Entity lifecycle events** → `src/subscriber/`
* **An existing feature/regression** → search `test/functional/` and `test/github-issues/` first

The repository's architecture documentation identifies these as the main internal boundaries of the project.
