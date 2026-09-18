# TypeORM Developer Onboarding Guide

## Project overview

TypeORM is a TypeScript/JavaScript object-relational mapping (ORM) library. It runs across Node.js, browsers, React Native, Electron, and several other JavaScript environments, and supports databases including PostgreSQL, MySQL/MariaDB, Microsoft SQL Server, Oracle, SQLite, MongoDB, SAP HANA, and Google Spanner. It supports both the **Data Mapper** and **Active Record** patterns.

At a high level, the library provides:

* Entity and column mapping
* Repositories and entity managers
* Query builders
* Relations
* Transactions
* Migrations and schema management
* Database-specific drivers
* Connection pooling, replication, caching, logging, and subscribers

The public feature set also includes both ESM and CommonJS support and a TypeORM CLI.

Architecturally, most development revolves around `DataSource`, `EntityManager`, repositories, query builders, metadata, drivers, persistence, schema building, and migrations.

---

## Prerequisites

The current repository declares:

| Tool    | Requirement                                     |
| ------- | ----------------------------------------------- |
| Node.js | `^20.19.0`, `^22.13.0`, or `>=24.11.0`          |
| pnpm    | `10.34.5`                                       |
| Git     | Required for the normal contribution workflow   |
| Docker  | Optional, but useful for running test databases |

The Node and pnpm requirements come directly from `package.json`. The developer guide also lists Git and Node as prerequisites and notes that database servers can either be installed locally or run using Docker.

Check your environment before continuing:

```bash
node --version
pnpm --version
git --version
docker --version   # optional
```

---

## Setup

### 1. Clone the repository

For contribution work, the repository recommends forking TypeORM, cloning your fork, and adding the main TypeORM repository as `upstream`.

A typical setup is:

```bash
git clone git@github.com:<your-github-username>/typeorm.git
cd typeorm

git remote add upstream https://github.com/typeorm/typeorm.git
```

If you only need a local checkout and do not plan to push changes to a fork, you can clone the upstream repository directly:

```bash
git clone https://github.com/typeorm/typeorm.git
cd typeorm
```

### 2. Install dependencies

```bash
pnpm install
```

This is the repository's documented dependency-installation command.

### 3. Create the test database configuration

Tests use a root-level `ormconfig.json`. Start from the supplied sample:

```bash
cp ormconfig.sample.json ormconfig.json
```

`ormconfig.sample.json` contains configurations for multiple database engines. For example, it includes local configurations for `better-sqlite3`, CockroachDB, MariaDB, MongoDB, MSSQL, MySQL, Oracle, PostgreSQL, SAP HANA, Spanner, and `sqljs`.
You do **not** need every database running during normal feature development. The developer guide explicitly recommends keeping only the configurations relevant to your work when you want a faster test cycle.

For an especially lightweight starting point, `better-sqlite3` and `sqljs` do not have external server connection settings in the sample config, making them convenient choices for database-agnostic work.

### 4. Start database services when needed

The repository provides a `docker-compose.yml` for its test databases. You can start everything:

```bash
docker compose up
```

or start only the database you need. For example:

```bash
docker compose up postgres-17
```

The project's developer guide documents both approaches.
The bundled Postgres 17 service, for example, listens on local port `5432` and uses the `username` / `password` credentials and `typeorm` database expected by the sample ORM configuration.

---

## Running it locally

TypeORM's root project is a **library**, rather than an application with a long-running `start` server. In day-to-day development, "running TypeORM" generally means compiling it and exercising it through tests or the included playground.

### Compile the project

```bash
pnpm run compile
```

The root script runs a clean followed by the TypeScript compiler:

```text
compile = gulp clean && tsc
```

Compiled source and tests are written to `build/compiled`.

### Watch while developing

For a faster edit/compile/test loop:

```bash
pnpm run compile -- --watch
```

Keep that process running and, in another terminal, execute:

```bash
pnpm run test:fast
```

This avoids the full clean-and-recompile performed by `pnpm run test`. The repository specifically recommends this workflow for faster development.

There is also a direct watch script:

```bash
pnpm run watch
```

The available root scripts include `compile`, `package`, `test`, `test:fast`, `typecheck`, `lint`, `format`, and `watch`.

### Build the distributable package

To see what would actually be shipped as the TypeORM package:

```bash
pnpm run package
```

The result is generated under:

```text
build/package/
```

### Run the included playground

If you want a concrete application to experiment with rather than running tests, the repository contains `playground/`, an ESM TypeORM example backed by an in-memory `sql.js` database.

```bash
cd playground
npm i
npm start
```

When started, the playground initializes the database, creates a `User` table, inserts a sample user, queries it, and prints the result.

### Run the documentation site

The documentation is a Docusaurus application. From the repository root:

```bash
pnpm run docs:dev
```

## The root script delegates to the `docs` package. The documentation project's own development command starts a local server with live updates.

## Project structure

| Path                    | What you'll find there                                            |
| ----------------------- | ----------------------------------------------------------------- |
| `src/`                  | Main TypeORM library source                                       |
| `src/data-source/`      | `DataSource` lifecycle and connection management                  |
| `src/entity-manager/`   | Entity management operations                                      |
| `src/repository/`       | Repository implementation                                         |
| `src/query-builder/`    | SQL/query construction                                            |
| `src/decorator/`        | Entity, column, and relation decorators                           |
| `src/driver/`           | Database-specific driver implementations                          |
| `src/metadata/`         | Entity metadata                                                   |
| `src/schema-builder/`   | Schema creation and modification                                  |
| `src/migration/`        | Migration infrastructure                                          |
| `src/persistence/`      | Entity persistence machinery                                      |
| `test/functional/`      | Preferred home for feature/integration tests                      |
| `test/github-issues/`   | Regression tests associated with GitHub issues                    |
| `test/unit/`            | Unit tests                                                        |
| `test/utils/`           | Shared testing infrastructure                                     |
| `docs/`                 | Docusaurus documentation website                                  |
| `packages/codemod/`     | `@typeorm/codemod`, used for automated TypeORM-version migrations |
| `playground/`           | Runnable ESM + `sql.js` example                                   |
| `build/compiled/`       | TypeScript compiler output                                        |
| `build/package/`        | Generated distributable TypeORM package                           |
| `ormconfig.sample.json` | Template database configurations used by the tests                |
| `docker-compose.yml`    | Local database services for development/testing                   |

The core `src` responsibilities are documented in the repository's developer instructions. Tests are explicitly divided into functional, GitHub-issue, unit, and utility areas, with functional tests preferred for new behavior.

## The documentation directory is a Docusaurus site, while `packages/codemod` contains the automated migration utility for TypeORM version upgrades.

## Testing

### Run the full configured test suite

```bash
pnpm run test
```

`test` first compiles the project and then invokes the faster Mocha test runner:

```text
pnpm run compile && pnpm run test:fast --
```

Tests run for the databases enabled in your `ormconfig.json`, which is why trimming that file to the databases relevant to your change can substantially speed up development.

### Run tests without recompiling

After compiling once—or while the compiler is running in watch mode—use:

```bash
pnpm run test:fast
```

The intended quick-development loop is therefore:

```bash
# Terminal 1
pnpm run compile -- --watch

# Terminal 2
pnpm run test:fast
```

### Run a specific test or group

Mocha's `--grep` argument can filter tests by matching their `describe()` or `it()` names:

```bash
pnpm run test:fast -- --grep "your test name"
```

The repository documents grep-based test selection and also supports temporary Mocha `.only` annotations during development.

### How tests are discovered

Mocha runs against the **compiled** test tree:

```text
./build/compiled/test/**/*.test.{js,ts}
```

It also loads:

```text
./build/compiled/test/utils/test-setup.js
```

The configured test timeout is 90 seconds.

This is worth remembering when debugging: if you change TypeScript source but use `test:fast` without recompiling, Mocha may still be executing stale code in `build/compiled`.

### Writing tests

New feature and integration coverage should normally go under:

```text
test/functional/
```

Use `test/github-issues/` when a regression test is specifically organized around an existing issue, and `test/unit/` for isolated component tests. The repository explicitly says functional tests are preferred over per-issue tests.

The standard integration-test pattern uses `createTestingConnections()`, resets databases with `reloadTestingDatabases()` before each test, and closes connections afterward. Tests commonly iterate over the configured data sources so the same behavior is checked across database engines.

Entity fixtures placed in an `entity/` directory beside the test can be automatically loaded:

```text
test/functional/<feature>/
├── entity/
│   └── ExampleEntity.ts
└── example.test.ts
```

---

## Useful development commands

| Command                              | Purpose                                    |
| ------------------------------------ | ------------------------------------------ |
| `pnpm install`                       | Install dependencies                       |
| `pnpm run compile`                   | Clean and compile TypeScript               |
| `pnpm run compile -- --watch`        | Compile and watch during test development  |
| `pnpm run test`                      | Recompile and run tests                    |
| `pnpm run test:fast`                 | Run tests without recompiling              |
| `pnpm run test:fast -- --grep "..."` | Run a focused set of tests                 |
| `pnpm run typecheck`                 | Type-check without emitting files          |
| `pnpm run lint`                      | Run ESLint                                 |
| `pnpm run format`                    | Format the repository with Prettier        |
| `pnpm run package`                   | Produce `build/package/`                   |
| `pnpm run docs:dev`                  | Start the documentation development server |

These commands are defined by the root package scripts.

---

## Recommended first-day workflow

```bash
# 1. Install
pnpm install

# 2. Configure the databases you actually want to test
cp ormconfig.sample.json ormconfig.json

# 3. Optionally start a DB
docker compose up postgres-17

# 4. Confirm the checkout builds
pnpm run compile

# 5. Run an initial test
pnpm run test:fast -- --grep "<relevant feature>"

# 6. During active development
pnpm run compile -- --watch

# In another terminal
pnpm run test:fast -- --grep "<relevant feature>"

# 7. Before submitting changes
pnpm run typecheck
pnpm run lint
pnpm run test
```

For code changes, the project's contribution template expects new or updated tests and documentation when applicable.
