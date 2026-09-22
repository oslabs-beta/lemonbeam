# TypeORM Contributor Onboarding Guide

Repository: `typeorm/typeorm`

## 1. Project overview

TypeORM is an object-relational mapper for TypeScript and JavaScript. It supports both **Data Mapper** and **Active Record** patterns and works across Node.js and several browser/mobile/runtime environments. Supported database families include PostgreSQL, MySQL/MariaDB, SQLite, Microsoft SQL Server, Oracle, SAP HANA, MongoDB, Google Spanner, and others.

At a high level, TypeORM sits between application code and database drivers:

```text
Application
    │
    ├── Entities / Entity Schemas
    │
    ├── Repository / EntityManager
    │
    ├── QueryBuilder
    │
    ▼
 TypeORM core
    │
    ├── Metadata
    ├── Persistence / schema logic
    ├── Query runners
    └── Database drivers
            │
            ▼
        Database
```

`DataSource` is one of the main entry points into the library. From it, callers can obtain repositories, managers and query builders. `EntityManager` provides operations across entities, while repositories expose operations for a particular entity. Query builders eventually delegate execution through a database driver/query runner.

The public API is assembled from `src/index.ts`, which exports core pieces such as `DataSource`, `Driver`, `QueryBuilder`, `SelectQueryBuilder`, `InsertQueryBuilder`, `UpdateQueryBuilder`, and their associated types/results.

---

## 2. Prerequisites

The current repository expects:

* **Git**
* **Node.js:** `^20.19.0`, `^22.13.0`, or `>=24.11.0`
* **pnpm:** the repository currently declares `pnpm@10.34.5`
* A database if you plan to run database-backed integration tests; Docker can be used instead of installing several DBMSs directly.

Check your environment:

```bash
node --version
pnpm --version
git --version
```

For contribution work, the project recommends working from a fork and keeping the main TypeORM repository as an `upstream` remote.

```bash
git clone git@github.com:<your-github-username>/typeorm.git
cd typeorm

git remote add upstream https://github.com/typeorm/typeorm.git
```

If you only need a local read-only development checkout:

```bash
git clone https://github.com/typeorm/typeorm.git
cd typeorm
```

---

## 3. Install dependencies

Install the repository dependencies with:

```bash
pnpm install
```

`pnpm` is the expected package manager rather than npm or Yarn, and its required version is declared in `package.json`.

Next, create the local test database configuration:

```bash
cp ormconfig.sample.json ormconfig.json
```

The test utilities look for `ormconfig.json` in the project and fail with an explicit error when it cannot be found.

`ormconfig.json` controls which database configurations participate in the test suite. Each connection can include a `skip` flag; the test utilities filter out connections where `skip` is `true`.

For a lightweight development setup, configure only the database or databases relevant to your change instead of trying to run every supported backend. The project's developer guide explicitly recommends narrowing the configuration when the work is not database-specific.

---

## 4. Running the project locally

TypeORM is primarily a **library**, so there is not a single application server that represents "running TypeORM." The normal local workflow is to compile the library and exercise it through its tests or package build.

### Compile

```bash
pnpm run compile
```

The `compile` script cleans the previous build and invokes TypeScript:

```text
gulp clean && tsc
```

For active development, use watch mode:

```bash
pnpm run compile -- --watch
```

The developer documentation recommends this together with `test:fast` because it avoids rebuilding the entire codebase before every test invocation.

There is also a plain TypeScript watch command:

```bash
pnpm run watch
```

and a no-output type-check:

```bash
pnpm run typecheck
```

Both are defined in the repository's package scripts.

### Build the distributable package

To produce the package in the same general form consumers install:

```bash
pnpm run package
```

The output is written to:

```text
build/package/
```

You can also create an installable tarball:

```bash
cd build/package
pnpm pack
```

The developer guide recommends this approach when you want to install your modified TypeORM build into another application for manual integration testing.

### Run the documentation site

If your change involves documentation, the root package also exposes:

```bash
pnpm run docs:dev
```

which starts the development command in the `docs` project.

---

## 5. Local databases with Docker

Many TypeORM tests exercise actual database behavior. The repository provides a root `docker-compose.yml` with services for databases including MySQL, MariaDB, PostgreSQL, SQL Server, CockroachDB, Oracle, Spanner, SAP HANA, and MongoDB.

For example, the developer guide recommends starting PostgreSQL with:

```bash
docker compose up postgres-17
```

To bring up all configured database services:

```bash
docker compose up
```

This can consume substantial resources, so for day-to-day work it is usually more convenient to start only the database involved in your change. The TypeORM developer documentation notes that tests require the relevant DBMS to be available either locally or through Docker.

Once your database is running, make sure its credentials and port agree with the corresponding entry in `ormconfig.json`.

---

## 6. Project structure

The root repository contains the main implementation under `src`, tests under `test`, documentation under `docs`, Docker support, supporting packages, and build/configuration files.

A useful mental model is:

```text
typeorm/
├── src/                   # Main TypeORM implementation
│   ├── data-source/       # DataSource and connection lifecycle
│   ├── driver/            # Database-specific drivers
│   ├── entity-manager/    # EntityManager APIs
│   ├── repository/        # Repository APIs
│   ├── query-builder/     # SQL/query construction
│   ├── metadata/          # Entity/column/relation metadata
│   ├── metadata-builder/  # Builds runtime metadata
│   ├── decorator/         # TypeORM decorators
│   ├── persistence/       # Persist/update/remove execution
│   ├── migration/         # Migration infrastructure
│   ├── schema-builder/    # Database schema synchronization
│   ├── query-runner/      # Per-connection query execution
│   ├── subscriber/        # Entity/event subscribers
│   └── index.ts           # Main public exports
│
├── test/                  # Mocha test suites and test infrastructure
│   └── utils/             # Shared test DB setup/teardown utilities
│
├── docs/                  # TypeORM documentation site
├── packages/              # Additional package-related code
├── playground/            # Development/experimental examples
├── docker/                # Docker helper/configuration assets
│
├── docker-compose.yml     # Local DB services
├── ormconfig.sample.json  # Template test DB configuration
├── .mocharc.json          # Mocha configuration
├── tsconfig.json          # Main TypeScript configuration
├── gulpfile.ts            # Build/package tasks
├── package.json           # Scripts, dependencies and runtime requirements
├── DEVELOPER.md           # Build/test instructions
└── CONTRIBUTING.md        # Contribution process
```

The most important areas to learn first are:

**`src/data-source/`**
Owns the central `DataSource` abstraction and provides access to managers, repositories, metadata, query builders and query runners.

**`src/entity-manager/` and `src/repository/`**
These are major user-facing persistence APIs. `EntityManager` works across entity types; a `Repository` is associated with one entity target and delegates much of its work through an `EntityManager`.

**`src/query-builder/`**
Contains the query-building infrastructure. The base `QueryBuilder` tracks query state and delegates execution to a `QueryRunner`, while specialized builders implement SELECT, INSERT, UPDATE and other operations.

**`src/driver/`**
Contains database-specific behavior. Code here is especially important when a bug only occurs on one DBMS.

**`test/utils/test-utils.ts`**
Central test infrastructure for creating connections, filtering enabled/disabled drivers, loading `ormconfig.json`, resetting databases and closing test connections.

---

## 7. Testing

TypeORM uses **Mocha** for its main test suite. The Mocha configuration searches the compiled tree for:

```text
./build/compiled/test/**/*.test.{js,ts}
```

and loads the shared test setup from:

```text
./build/compiled/test/utils/test-setup.js
```

The default test timeout is 90 seconds.

### Run the normal test suite

```bash
pnpm run test
```

Under the hood, this performs:

```text
pnpm run compile
pnpm run test:fast --
```

so a normal test run always starts from a fresh compilation.

Tests are executed against the database configurations enabled in your `ormconfig.json`.

### Fast development loop

For repeated code/test cycles, use two terminals.

Terminal 1:

```bash
pnpm run compile -- --watch
```

Terminal 2:

```bash
pnpm run test:fast
```

`test:fast` invokes Mocha without first triggering the full clean-and-compile operation, which is why the developer guide recommends it while TypeScript compilation is already running in watch mode.

### Run a subset of tests

Use Mocha's grep filtering:

```bash
pnpm run test -- --grep "your test name"
```

or, when you are already compiling in watch mode:

```bash
pnpm run test:fast -- --grep "your test name"
```

During local development you can also temporarily use:

```ts
describe.only(...)
```

or:

```ts
it.only(...)
```

The project's developer documentation explicitly describes both approaches.

### Writing a database-backed test

Most database-dependent tests use shared helpers such as:

```ts
createTestingConnections(...)
reloadTestingDatabases(...)
closeTestingConnections(...)
```

A typical lifecycle is:

```text
before()      → create test DataSources
beforeEach()  → reset database state
tests         → exercise behavior against each DataSource
after()       → close the connections
```

The repository's recommended test template follows exactly this structure.

The shared test helpers can restrict a suite to particular database types using `enabledDrivers` and can exclude specific databases with `disabledDrivers`. This is useful for genuinely driver-specific behavior, although cross-driver tests should generally exercise every compatible configured backend.

For regression tests tied to a GitHub issue, the developer guide asks contributors to mention the issue number in the test.

---

## 8. Code-quality commands

Before submitting a change, useful root-level commands include:

```bash
# TypeScript type checking without emitting files
pnpm run typecheck

# ESLint
pnpm run lint

# Format code
pnpm run format

# Verify formatting without modifying files
pnpm run format:ci

# Full compile + test
pnpm run test
```

These commands are defined directly in the root `package.json`.

The contribution guide states that patches should include appropriate test cases and asks contributors to run the full test suite before submitting a PR.

---

## 9. Recommended first-day workflow

A practical onboarding sequence is:

```bash
# 1. Clone
git clone https://github.com/typeorm/typeorm.git
cd typeorm

# 2. Check the required runtime
node --version
pnpm --version

# 3. Install dependencies
pnpm install

# 4. Create the test configuration
cp ormconfig.sample.json ormconfig.json

# 5. Edit ormconfig.json so only the database(s)
#    you actually have available are enabled.

# 6. If needed, start a database
docker compose up postgres-17

# 7. Compile
pnpm run compile

# 8. Run tests
pnpm run test
```

Once that works, switch to the faster development loop:

```bash
# Terminal 1
pnpm run compile -- --watch

# Terminal 2
pnpm run test:fast -- --grep "feature you are working on"
```

The clone/install/configure/database/test workflow comes directly from TypeORM's developer documentation; the watch + `test:fast` combination is its recommended faster edit/test cycle.

---

## 10. Where to start when debugging

When investigating a bug, tracing from the public API inward is usually the easiest way to navigate this codebase:

```text
DataSource
   │
   ├── Repository
   │      │
   │      └── EntityManager
   │
   └── QueryBuilder
             │
             ▼
          Driver
             │
             ▼
         QueryRunner
             │
             ▼
          Database
```

For example, repository operations are connected to an `EntityManager`, and repositories can create query builders through that manager. Query builders then produce database-specific SQL and execute it through a query runner.

A useful rule of thumb:

* **API behavior problem:** start in `repository/`, `entity-manager/`, or `find-options/`.
* **Generated SQL problem:** start in `query-builder/`.
* **Only one database is affected:** inspect the corresponding `driver/`.
* **Entity/decorator interpretation problem:** inspect metadata and metadata-building code.
* **Schema synchronization problem:** inspect schema-builder and driver-specific schema/query-runner code.
* **Regression:** find the closest existing functional test and reproduce it there first.

---

## 11. Contribution checklist

Before opening a PR:

* Add or update tests for the behavior you changed.
* Run the relevant targeted tests while developing.
* Run `pnpm run typecheck`.
* Run `pnpm run lint`.
* Check formatting.
* Run the full applicable test suite.
* If the change is database-specific, verify it against the relevant DBMS.
* For a regression, reference the related issue in the test where appropriate.

The project explicitly requires appropriate tests for submitted patches and asks contributors to run the complete TypeORM test suite before submitting their PR.

For substantial new features, the contribution guide recommends opening an issue/proposal first; small features can be submitted directly as pull requests.

---

## Quick command reference

```bash
pnpm install                         # Install dependencies

cp ormconfig.sample.json ormconfig.json
                                      # Create local test DB config

pnpm run compile                    # Clean + compile TypeScript
pnpm run compile -- --watch         # Recommended compile/watch loop
pnpm run watch                      # TypeScript watch
pnpm run typecheck                  # Type checking only

pnpm run test                       # Compile + run tests
pnpm run test:fast                  # Run Mocha without rebuilding
pnpm run test:fast -- --grep "foo"  # Target specific tests

pnpm run lint                       # ESLint
pnpm run format                     # Apply Prettier formatting
pnpm run format:ci                  # Verify formatting

pnpm run package                    # Build distributable package
pnpm run docs:dev                   # Run docs development command

docker compose up postgres-17       # Start one test DB
docker compose up                   # Start all configured DB services
```

The scripts above come from the root package configuration, while the database/test workflow is documented in `DEVELOPER.md`.
