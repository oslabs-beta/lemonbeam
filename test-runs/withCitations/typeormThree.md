# TypeORM Onboarding Guide

This guide covers the TypeORM repository snapshot provided, including the project architecture, development setup, local workflow, repository structure, and testing conventions. The snapshot identifies the root package as TypeORM `1.1.1`.

## Project Overview

TypeORM is a TypeScript-based object-relational mapping (ORM) library. It supports multiple database engines—including MySQL/MariaDB, PostgreSQL, Microsoft SQL Server, Oracle, SAP HANA, SQLite, MongoDB, and Google Spanner—and implements both the **Data Mapper** and **Active Record** patterns.

The library is designed to work across Node.js as well as browser and mobile/desktop JavaScript environments. Its feature set includes repositories, entity managers, relations, transactions, migrations, schema management, query building, caching, subscribers, and multiple-database support.

At a high level, most work in the repository follows this path:

```text
Application-facing API
        ↓
DataSource / Repository / EntityManager
        ↓
Metadata + persistence + query-building layers
        ↓
Database-specific driver
        ↓
Database
```

Database-independent behavior should generally stay in the common layers, while database-specific logic belongs under `src/driver/`.

---

## Prerequisites

You'll need:

* Git
* Node.js
* pnpm
* A database used by the tests you're running, or Docker to run database services locally

The development guide explicitly supports using Docker instead of locally installed MySQL, MariaDB, and PostgreSQL instances.

For this repository snapshot, the root package specifies:

```text
pnpm: 10.34.5

Node:
  ^20.19.0
  ^22.13.0
  >=24.11.0
```

The repository also treats pnpm `^10.34.5` as the required development package-manager version.

---

## Setup

### 1. Clone the repository

If you're contributing upstream, the developer guide recommends working from a fork:

```bash
git clone git@github.com:<github-username>/typeorm.git
cd typeorm

git remote add upstream https://github.com/typeorm/typeorm.git
```

The documented workflow uses your fork as `origin` and the main TypeORM repository as `upstream`.

### 2. Install dependencies

From the repository root:

```bash
pnpm install
```

### 3. Create your test database configuration

Copy the sample config:

```bash
cp ormconfig.sample.json ormconfig.json
```

Then edit `ormconfig.json` for the databases available on your machine.

Tests are executed against the database configurations present and enabled in this file. You **do not need every supported database running for day-to-day development**: the development guide explicitly recommends keeping only the configurations relevant to your change when you want a faster test cycle.

A convenient lightweight option is `better-sqlite3`; the sample config points it at a local file:

```json
{
  "skip": false,
  "type": "better-sqlite3",
  "database": "temp/better-sqlite3.db",
  "logging": false
}
```

### 4. Optional: start database services with Docker

For one service, for example PostgreSQL:

```bash
docker compose up postgres-17
```

Or start the configured database containers together:

```bash
docker compose up
```

## The developer documentation recommends Docker as an alternative to installing the various DBMSs directly on the development machine.

## Running the Project Locally

TypeORM itself is a **library**, not a standalone server application, so the normal local workflow is to compile the library, run tests against it, or run the documentation site.

### Compile the code

```bash
pnpm run compile
```

The `compile` script cleans the previous build and invokes TypeScript:

```text
gulp clean && tsc
```

### Develop in watch mode

For an efficient edit/compile/test loop, the developer guide recommends:

```bash
pnpm run compile -- --watch
```

Once the initial compilation finishes, run tests without compiling again:

```bash
pnpm run test:fast
```

This avoids the full clean-and-rebuild performed by `pnpm run test`.

The repository also exposes a direct TypeScript watch script:

```bash
pnpm run watch
```

### Build the distributable package

To test your local TypeORM build from another application:

```bash
pnpm run package
```

This creates a distributable package under:

```text
build/package/
```

You can link or copy that directory into another project. The developer guide also documents packing it as a tarball:

```bash
cd build/package
pnpm pack
```

### Run the documentation site

The root package provides:

```bash
pnpm run docs:dev
```

which runs the documentation project's development server.

---

## Project Structure

The most important directory is `src/`, which contains TypeORM's core implementation:

```text
src/
├── data-source/       # DataSource / connection management
├── entity-manager/    # EntityManager and entity operations
├── repository/        # Repository abstraction
├── query-builder/     # SQL/query construction
├── decorator/         # Entity, column, relation, etc. decorators
├── driver/            # Database-specific implementations
├── metadata/          # Entity metadata
├── schema-builder/    # Schema creation/change machinery
├── migration/         # Migration system
├── subscriber/        # Event subscribers
└── persistence/       # Entity persistence logic
```

A useful mental model when navigating the code is:

* **`data-source/`** — start here for database initialization and top-level configuration.
* **`repository/` and `entity-manager/`** — application-facing persistence APIs.
* **`query-builder/`** — query construction and SQL-oriented behavior.
* **`metadata/` and `decorator/`** — how entity declarations become TypeORM metadata.
* **`persistence/`** — translating entity state into database operations.
* **`driver/`** — differences between PostgreSQL, MySQL, SQLite, SQL Server, Oracle, etc.
* **`schema-builder/` and `migration/`** — database schema evolution.

The repository's testing tree is organized separately:

```text
test/
├── functional/        # Feature/integration tests; preferred location
├── github-issues/     # Regression tests associated with issues
├── unit/              # Unit tests
└── utils/             # Shared test helpers
```

Functional tests are preferred over adding new tests organized solely by GitHub issue number.

Other notable areas include `docs/` for the documentation application and `packages/` for additional packages such as the TypeORM codemod.

---

## Useful Development Commands

The root `package.json` defines the main development commands:

| Command              | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `pnpm run compile`   | Clean and compile the TypeScript source             |
| `pnpm run watch`     | Continuously compile TypeScript changes             |
| `pnpm run package`   | Produce the distributable TypeORM package           |
| `pnpm run test`      | Compile, then run the test suite                    |
| `pnpm run test:fast` | Run Mocha without recompiling first                 |
| `pnpm run test:ci`   | Run Mocha with `--bail`                             |
| `pnpm run lint`      | Run ESLint                                          |
| `pnpm run format`    | Format files with Prettier                          |
| `pnpm run format:ci` | Verify formatting without modifying files           |
| `pnpm run typecheck` | Run TypeScript type checking without emitting files |
| `pnpm run docs:dev`  | Start the documentation development server          |

For day-to-day work, a useful loop is:

```bash
# Terminal 1
pnpm run compile -- --watch

# Terminal 2
pnpm run test:fast -- --grep "feature I'm changing"
```

---

## Testing

### How tests work

TypeORM's tests are predominantly database-backed. Test utilities create one `DataSource` for each enabled database configuration, reset databases between tests, and close the connections after the suite finishes.

A typical functional test follows this pattern:

```typescript
describe("description of the functionality", () => {
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

    it("should do something", () =>
        Promise.all(
            dataSources.map(async (dataSource) => {
                // assertions
            }),
        ))
})
```

The repository deliberately runs the same behavior across multiple configured databases where possible.

### Test entities

Put entities used exclusively by a test under an `entity/` directory next to the test:

```text
test/functional/my-feature/
├── entity/
│   ├── User.ts
│   └── Photo.ts
└── my-feature.test.ts
```

The documented test utilities support automatically loading entities from that relative directory.

### Run the full configured suite

```bash
pnpm run test
```

This first compiles the repository and then runs Mocha.

Remember that "full" here means tests against the database entries enabled in your local `ormconfig.json`.

### Run tests without rebuilding

After the code has already been compiled:

```bash
pnpm run test:fast
```

Use this during normal development alongside TypeScript watch mode.

### Run a subset of tests

Filter Mocha tests by their `describe` or `it` names:

```bash
pnpm run test -- --grep "your test name"
```

For the faster precompiled workflow:

```bash
pnpm run test:fast -- --grep "your test name"
```

The developer guide also mentions temporarily using `describe.only(...)` or `it.only(...)` while developing a focused test.

### Before opening a PR

At minimum, run:

```bash
pnpm run test
pnpm run lint
pnpm run format:ci
pnpm run typecheck
```

CI separately performs compilation, formatting checks, linting, and database test jobs, including tests across multiple Node versions and database drivers.

New or changed behavior should normally include corresponding tests; the project's PR checklist specifically calls for new or updated tests validating code changes.

---

## Recommended First-Day Workflow

For a quick local environment without bringing up every supported database:

```bash
# 1. Install
pnpm install

# 2. Create the test configuration
cp ormconfig.sample.json ormconfig.json

# 3. Edit ormconfig.json and keep only the database(s)
#    relevant to your work — better-sqlite3 is a lightweight option.

# 4. Initial compile
pnpm run compile

# 5. Run tests
pnpm run test:fast

# 6. Start the development loop
pnpm run compile -- --watch

# In a second terminal:
pnpm run test:fast -- --grep "area you're changing"
```

When you're comfortable with that workflow, start tracing features from their public API through `DataSource`, `Repository`/`EntityManager`, query or persistence logic, and finally the relevant database driver. That path maps closely to the repository's documented architecture.
