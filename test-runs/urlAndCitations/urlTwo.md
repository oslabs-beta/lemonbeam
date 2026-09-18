# TypeORM Contributor Onboarding Guide

> This guide targets the current `master` branch of `typeorm/typeorm`. At the time of review, the root package reports version `1.1.1`.

## Project overview

TypeORM is a TypeScript/JavaScript object-relational mapper (ORM). It supports both **Data Mapper** and **Active Record** styles and works with databases including PostgreSQL, MySQL/MariaDB, SQLite, SQL Server, Oracle, MongoDB, SAP HANA, Google Spanner, and others. It exposes higher-level abstractions for entities, repositories, relations, migrations, transactions, query building, schema management, and database-specific drivers.

The repository is primarily a **library**, rather than an application with a server process that you start. Local development therefore usually means:

1. compiling TypeScript,
2. starting one or more database services,
3. running tests against those databases, and
4. optionally building a publishable TypeORM package to test inside another application.

At the center of the codebase is `DataSource`, which owns database configuration, the driver, entity metadata, the entity manager, migrations, subscribers, query runners, and query builders. The public exports also expose repositories, metadata objects, schema-building APIs, query builders, migrations, and subscriber APIs.

---

## Prerequisites

You will need:

* **Git**
* **Node.js**
* **pnpm**
* **Docker** if you want to run the supported test databases without installing them directly

The current package requires:

```text
Node.js: ^20.19.0 || ^22.13.0 || >=24.11.0
pnpm:    10.34.5
```

The repository explicitly pins pnpm `10.34.5` and treats an incompatible pnpm version as an error.

Using a Node version manager such as `nvm` or `fnm` is recommended by the project's developer documentation.

---

## Setup

### 1. Fork and clone

For contribution work, the project recommends forking the repository, cloning your fork, and adding the main repository as `upstream`.

```bash
git clone git@github.com:<your-github-username>/typeorm.git
cd typeorm

git remote add upstream https://github.com/typeorm/typeorm.git
```

If you only want to explore the code and do not plan to submit a PR, cloning the upstream repository directly is sufficient.

### 2. Install dependencies

```bash
pnpm install
```

This is the installation command specified in the project's developer guide.

### 3. Create your test database configuration

Tests read database connections from a root-level `ormconfig.json`. Start with the provided sample:

```bash
cp ormconfig.sample.json ormconfig.json
```

The sample contains configurations for numerous databases. Tests operate against the database configurations that are enabled, so for normal development it is much faster to configure only the database or databases relevant to your change.

For example, the checked-in PostgreSQL configuration expects:

```json
{
  "skip": false,
  "type": "postgres",
  "host": "localhost",
  "port": 5432,
  "username": "username",
  "password": "password",
  "database": "typeorm",
  "logging": false
}
```

Those credentials correspond to the project's Docker Compose PostgreSQL service.

Do not commit your local `ormconfig.json` changes unless they are intentionally part of your contribution.

---

## Running TypeORM locally

### Compile the project

Run:

```bash
pnpm run compile
```

The `compile` script cleans the previous build and invokes TypeScript. TypeScript emits compiled files into:

```text
build/compiled/
```

Both `src` and `test` are included in the main TypeScript compilation.

### Start a database

You do not necessarily need every database TypeORM supports.

For a straightforward PostgreSQL development environment, start the supplied PostgreSQL 17 service:

```bash
docker compose up postgres-17
```

The project specifically documents this workflow. The Compose configuration exposes PostgreSQL on port `5432` using database `typeorm`, username `username`, and password `password`.

You can also launch the entire database matrix:

```bash
docker compose up
```

This starts services for multiple database engines used by the test suite. Be aware that this is substantially heavier; for example, the developer guide notes additional memory requirements for SQL Server, and the Compose file includes database services ranging from MySQL and MariaDB through PostgreSQL, SQL Server, CockroachDB, Oracle, Spanner, SAP HANA, and MongoDB.

### Development/watch loop

For active coding, the project's developer guide recommends compiling in watch mode:

```bash
pnpm run compile -- --watch
```

Then, after the initial compilation finishes, run:

```bash
pnpm run test:fast
```

This avoids the clean + full rebuild performed by the ordinary `test` command and produces a much quicker edit/test cycle.

### Build an installable TypeORM package

If you need to test your changes from a real application rather than only through the repository's test suite:

```bash
pnpm run package
```

The resulting package is placed under:

```text
build/package/
```

The packaging pipeline creates Node and browser builds and assembles the package contents there.

You can also create a tarball:

```bash
cd build/package
pnpm pack
```

You can then install the resulting `.tgz` file into another application for integration testing.

---

## Project structure

A useful mental model of the repository is:

```text
typeorm/
├── src/                 # Core TypeORM library
│   ├── data-source/     # DataSource and connection configuration
│   ├── driver/          # Database-specific drivers
│   ├── entity-manager/  # EntityManager APIs
│   ├── metadata/        # Entity/relation metadata
│   ├── query-builder/   # SELECT/INSERT/UPDATE/DELETE query builders
│   ├── query-runner/    # Low-level connection/query execution
│   ├── repository/      # Repository, BaseEntity, tree/Mongo repositories
│   ├── migration/       # Migration infrastructure
│   ├── schema-builder/  # Database schema representation/manipulation
│   └── subscriber/      # Entity/query lifecycle subscribers
│
├── test/                # Automated test suites and shared test utilities
│   └── utils/
│       └── test-utils.ts
│
├── docs/                # TypeORM documentation site
├── docker/              # Supporting files for database containers
├── packages/            # Additional package-related code
├── playground/          # Development/experimental playground
├── extra/               # Additional build/package assets and shims
├── docker-compose.yml   # Local test database services
├── ormconfig.sample.json
├── .mocharc.json        # Mocha configuration
├── tsconfig.json        # Main TypeScript compilation
├── gulpfile.ts          # Packaging/build tasks
├── DEVELOPER.md         # Build/test documentation
└── CONTRIBUTING.md      # Contribution rules
```

The root currently contains `src`, `test`, `docs`, `docker`, `packages`, `playground`, `extra`, and the associated build/test configuration files.

Within `src`, the public exports make the major architectural boundaries especially clear: `DataSource` and drivers provide database connectivity; `EntityManager` and `Repository` provide persistence APIs; metadata describes mapped entities; query builders construct operations; and migration, schema-builder, query-runner, and subscriber modules support the surrounding infrastructure.

The main TypeScript configuration compiles `src`, `test`, and root TypeScript files into `build/compiled`, while directories such as `docs`, `packages`, and `playground` are excluded from that compilation.

The documentation site is a separate Docusaurus project under `docs/`; its own package scripts include `start`, `build`, and `serve`.

---

## Testing

TypeORM uses **Mocha** for its main test suite. Mocha is configured to execute compiled test files matching:

```text
./build/compiled/test/**/*.test.{js,ts}
```

with shared setup from:

```text
./build/compiled/test/utils/test-setup.js
```

The configured timeout is 90 seconds.

### Run the normal test suite

```bash
pnpm run test
```

Under the hood, this runs:

```text
compile
→ test:fast
→ mocha
```

so a normal test invocation cleans and recompiles the project before executing the tests.

### Run tests without recompiling

After compiling manually or running the compiler in watch mode:

```bash
pnpm run test:fast
```

This invokes Mocha directly against the existing compiled output.

### Run a specific test or group of tests

Use Mocha's `--grep` option:

```bash
pnpm run test -- --grep "your test name"
```

You can also temporarily use `describe.only(...)` or `it.only(...)` while developing a test. Remove `.only` before committing.

For the fastest loop:

```bash
# Terminal 1
pnpm run compile -- --watch

# Terminal 2
pnpm run test:fast -- --grep "relevant test"
```

### How database tests work

The shared `test/utils/test-utils.ts` helper reads `ormconfig.json`, filters connections according to properties such as `skip`, `enabledDrivers`, and `disabledDrivers`, creates `DataSource` instances, initializes them, and supplies helpers for resetting and closing test databases.

A typical functional test uses:

```ts
createTestingConnections(...)
reloadTestingDatabases(...)
closeTestingConnections(...)
```

and places test entities in an `entity/` directory beside the test. The project's developer documentation provides this as the standard starting pattern for database-oriented tests.

For regression tests associated with an existing GitHub issue, the project asks contributors to include the issue number in a comment near the test.

---

## Other checks to run

The root package provides dedicated scripts for linting, type checking, formatting, and CI formatting checks:

```bash
pnpm run lint
pnpm run typecheck
pnpm run format:ci
```

To automatically format the repository:

```bash
pnpm run format
```

These scripts currently map to ESLint, `tsc --noEmit`, and Prettier.

A practical pre-PR check is therefore:

```bash
pnpm run typecheck
pnpm run lint
pnpm run format:ci
pnpm run test
```

---

## Contribution workflow

Create feature/fix work on a branch based on `master`:

```bash
git checkout -b my-fix-branch master
```

The contribution guidelines require appropriate tests for code changes and ask contributors to run the TypeORM test suite before submitting a PR. PRs should target `typeorm:master`.

The repository uses commit messages in roughly this form:

```text
<type>: <subject>

<body>

<footer>
```

Common types include `feat`, `fix`, `test`, `docs`, `refactor`, `perf`, `build`, `ci`, and `chore`. Subjects should use imperative present tense, should not start with a capital letter, and should not end with a period.

For significant new features, the maintainers ask contributors to open an issue and discuss the proposal before implementing it; smaller changes can be submitted directly as PRs.

---

## Recommended first development session

For a new contributor, a minimal PostgreSQL-based workflow is:

```bash
# Install
pnpm install

# Configure tests
cp ormconfig.sample.json ormconfig.json
# Edit ormconfig.json so only the PostgreSQL setup you need is enabled.

# Start the database
docker compose up postgres-17

# Initial verification
pnpm run test

# Then begin the fast development loop:
pnpm run compile -- --watch

# In another terminal:
pnpm run test:fast -- --grep "test you're working on"
```

This keeps the local environment small while following the repository's documented build and testing model.

### Key files to read next

* `DEVELOPER.md` — authoritative local build and test workflow.
* `CONTRIBUTING.md` — PR, issue, testing, and commit conventions.
* `package.json` — supported Node/pnpm versions and available scripts.
* `src/index.ts` — a useful map of TypeORM's public API and major subsystems.
* `test/utils/test-utils.ts` — explains how database configurations are selected and test `DataSource`s are constructed.
* `ormconfig.sample.json` and `docker-compose.yml` — the two files to understand when debugging database-specific tests locally.
