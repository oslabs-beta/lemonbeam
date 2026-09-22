# TypeORM Developer Onboarding Guide

## Project overview

TypeORM is a TypeScript-based object-relational mapping (ORM) library. It supports databases including MySQL/MariaDB, PostgreSQL, Microsoft SQL Server, Oracle, SAP HANA, SQLite, MongoDB, and Google Spanner, and supports both the **Active Record** and **Data Mapper** patterns. It is designed to work across environments including Node.js, browsers, React Native, and Electron.

At a high level, TypeORM provides the pieces needed to map application objects to databases: data sources, entity managers, repositories, query builders, decorators, database-specific drivers, metadata handling, migrations, schema management, persistence, and event subscribers.

This repository is primarily a **library**, not a standalone application server. The root package does not define a `start` script; the normal development workflow is to compile TypeScript, run tests against configured databases, and optionally build a distributable package or run the documentation site.

---

## Prerequisites

You will need:

* Git.
* Node.js. The current package declares support for Node `^20.19.0`, `^22.13.0`, or `>=24.11.0`.
* pnpm. The repository declares `pnpm@10.34.5` as its package manager.
* One or more supported database systems if you intend to run integration/functional tests.
* Docker is optional and can be used to provide the database services locally instead of installing each DBMS yourself.

---

## Setup

### 1. Clone the repository

If you are contributing upstream, the developer guide recommends working from a fork and adding the main TypeORM repository as an `upstream` remote.

```bash
git clone git@github.com:<your-github-username>/typeorm.git
cd typeorm

git remote add upstream https://github.com/typeorm/typeorm.git
```

If you only need a local checkout and do not plan to submit changes, cloning the main repository directly is sufficient.

### 2. Install dependencies

```bash
pnpm install
```

The project uses pnpm throughout its development and CI workflows.

### 3. Create your database configuration

Copy the sample ORM configuration:

```bash
cp ormconfig.sample.json ormconfig.json
```

Then edit `ormconfig.json` so that it contains the database connections you want to test against.

The test runner executes tests for the databases enabled in this file, so you do **not** need every supported database configured while working on a database-agnostic change. Keeping only the relevant configurations can significantly shorten the feedback loop.

The sample configuration includes a `better-sqlite3` database backed by `temp/better-sqlite3.db`, in addition to configurations for server-based databases.

### 4. Start databases with Docker, if needed

For example, the developer guide shows starting PostgreSQL with:

```bash
docker compose up postgres-17
```

You can also start the database services defined by the repository with:

```bash
docker compose up
```

The project's Docker Compose configuration contains services for multiple database engines, including MySQL, MariaDB, PostgreSQL, and SQL Server.

---

## Running the project locally

Because TypeORM is a library, "running it locally" generally means **compiling it and exercising it through its tests or a consuming application** rather than launching a root application server.

### Compile the source

```bash
pnpm run compile
```

The compile script cleans the existing build and invokes TypeScript. Compiled files are written to `build/compiled`.

### Compile continuously while developing

```bash
pnpm run watch
```

Or, using the workflow recommended by the developer guide:

```bash
pnpm run compile -- --watch
```

Watch mode lets TypeScript recompile changed files instead of rebuilding everything before every test run.

### Build a distributable TypeORM package

```bash
pnpm run package
```

This creates a distribution under:

```text
build/package/
```

That directory can be linked or copied into another application when you need to test your local TypeORM changes in a real consumer project.

### Run the documentation site

The root package also exposes:

```bash
pnpm run docs:dev
```

which delegates to the development command in the `docs` project.

---

## Project structure

The most important areas of the repository are:

```text
typeorm/
├── src/
│   ├── data-source/       # DataSource / connection management
│   ├── entity-manager/    # Entity operations
│   ├── repository/        # Repository implementation
│   ├── query-builder/     # SQL query construction
│   ├── decorator/         # Entity/column/relation decorators
│   ├── driver/            # Database-specific drivers
│   ├── metadata/          # Entity metadata
│   ├── schema-builder/    # Schema creation and synchronization
│   ├── migration/         # Migration infrastructure
│   ├── subscriber/        # Event subscribers
│   └── persistence/       # Entity persistence logic
│
├── test/
│   ├── functional/        # Feature/integration tests
│   ├── github-issues/     # Regression tests for GitHub issues
│   ├── unit/              # Unit tests
│   └── utils/             # Shared testing utilities
│
├── docs/                  # Documentation project
├── build/
│   ├── compiled/          # Compiled development/test output
│   └── package/           # Packaged TypeORM distribution
├── docker-compose.yml     # Local database services
├── ormconfig.sample.json  # Sample test database configuration
├── package.json           # Commands and dependencies
└── tsconfig.json          # Main TypeScript configuration
```

The core `src/` responsibilities are documented explicitly in the repository's development instructions. Database-specific behavior belongs in `src/driver/`, while higher-level abstractions such as repositories and query builders are kept database-agnostic where possible.

Tests are divided into functional, issue-regression, unit, and utility areas. For new behavior, the repository specifically recommends favoring **functional tests** rather than creating a per-GitHub-issue test unless the distinction is useful.

---

## Testing

### Run the full test suite

```bash
pnpm run test
```

`test` first compiles the project and then runs the fast test command:

```text
pnpm run compile && pnpm run test:fast --
```

The tests run against the database connections enabled in `ormconfig.json`. A test should generally work against all applicable databases unless it is intentionally database-specific.

### Fast development loop

Once you already have a current compiled build, use:

```bash
pnpm run test:fast
```

Unlike `pnpm run test`, this skips the compilation step. A useful two-terminal development loop is therefore:

```bash
# Terminal 1
pnpm run compile -- --watch

# Terminal 2
pnpm run test:fast
```

This is the workflow recommended in the repository for faster iteration.

Be aware that `test:fast` tests the existing compiled output, so make sure compilation has completed after modifying source files.

### Run a subset of tests

Use Mocha's `--grep` support:

```bash
pnpm run test:fast -- --grep "pattern"
```

This runs tests whose `describe` or `it` descriptions match the supplied pattern.

You can also temporarily use Mocha's `.only` on a `describe` or `it` while developing a specific test.

### How the test runner works

Mocha searches the compiled tree for:

```text
./build/compiled/test/**/*.test.{js,ts}
```

It loads the shared test setup from `build/compiled/test/utils/test-setup.js`, runs recursively, and has a 90-second test timeout by default.

### Writing tests

Most database-backed tests use the shared connection utilities:

```typescript
createTestingConnections()
reloadTestingDatabases()
closeTestingConnections()
```

A common structure is:

```typescript
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
                // test implementation
            }),
        ))
})
```

The project's test guidance recommends putting test entities in an `entity/` directory alongside the test and running database-independent assertions across every configured data source.

---

## Code-quality checks

Before opening a PR, the main commands worth running are:

```bash
pnpm run compile
pnpm run test
pnpm run lint
pnpm run format
```

The repository defines separate compile, test, ESLint, and Prettier commands for these checks.

Pull requests that change behavior are expected to include or update tests, and the PR checklist also calls for documentation updates when applicable.

---

## Recommended first development workflow

For a new contributor, a practical first session looks like this:

```bash
# Install dependencies
pnpm install

# Create local test DB configuration
cp ormconfig.sample.json ormconfig.json

# Edit ormconfig.json to keep/configure the DBs you need

# Optionally start database containers
docker compose up

# Terminal 1: compile and watch
pnpm run compile -- --watch

# Terminal 2: run the test you're working on
pnpm run test:fast -- --grep "relevant test name"

# Before submitting
pnpm run test
pnpm run lint
pnpm run format
```

## This follows the repository's intended development model: dependencies and database configuration first, followed by a watch-mode compiler and `test:fast` for iteration, with the complete test and quality checks before submission.

## Common onboarding gotchas

**`pnpm run test:fast` appears to ignore my code changes.**
`test:fast` does not recompile the codebase. Run the compiler first or leave `pnpm run compile -- --watch` running in another terminal.

**Tests fail trying to connect to databases I am not working with.**
Check `ormconfig.json`. Tests run for databases configured there; during focused development you can keep only the database configurations relevant to your change.

**Where should database-specific implementation code go?**
Database-specific drivers live under `src/driver/`; shared behavior should remain in the appropriate higher-level subsystem when possible.

**Where should I add a regression test?**
Prefer an appropriate `test/functional/` location for feature behavior. `test/github-issues/` exists for issue-specific regressions, while `test/unit/` is for individual components.

**Do I need all supported databases running locally?**
No. The configuration determines which databases participate in a test run, so focused development can use a smaller set. Full cross-database coverage remains important for changes intended to be database-independent.
