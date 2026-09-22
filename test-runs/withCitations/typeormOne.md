# TypeORM Onboarding Guide

## Project overview

TypeORM is a TypeScript-based object-relational mapping (ORM) library. It supports databases including MySQL/MariaDB, PostgreSQL, Microsoft SQL Server, Oracle, SAP HANA, SQLite, MongoDB, and Google Spanner, and can run across environments such as Node.js, browsers, React Native, and Electron. It supports both the **Active Record** and **Data Mapper** patterns.

At a high level, TypeORM provides the infrastructure for:

* Defining entities and relationships with decorators.
* Reading and writing entities through repositories and entity managers.
* Building SQL queries through `QueryBuilder`.
* Managing database-specific behavior through drivers.
* Creating and evolving schemas.
* Running migrations.
* Handling persistence and database events.

Because TypeORM is a **library rather than a standalone application/server**, there is not a single `start` command that launches the project. Local development primarily consists of compiling the library, optionally running the compiler in watch mode, configuring one or more test databases, and executing the test suite. The repository exposes commands for compilation, packaging, tests, linting, formatting, and watch mode.

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/typeorm/typeorm.git
cd typeorm
```

The repository and its main documentation are linked from the project's developer resources.

### 2. Install Node.js and pnpm

Make sure **Node.js** and **pnpm** are available locally. To stay close to CI, Node.js 24 is a sensible choice: the repository's reusable GitHub Actions setup defaults to Node 24, configures pnpm, and installs dependencies using the lockfile.

Then install dependencies:

```bash
pnpm install
```

### 3. Create your local database configuration

Copy the sample configuration:

```bash
cp ormconfig.sample.json ormconfig.json
```

Edit `ormconfig.json` to configure the database or databases you want to test against. The documented development setup explicitly uses this file for database connections.

For day-to-day development, you generally do **not** need every supported database running. Configure the driver relevant to the code you're working on unless you specifically need cross-database verification.

### 4. Start database services

The repository supports using Docker for its database dependencies:

```bash
docker compose up
```

This is optional if you already have the required databases installed locally.

---

## Running the project locally

### Compile the source

Run a normal TypeScript build with:

```bash
pnpm run compile
```

Compiled output is written beneath `build/compiled/`.

### Development/watch mode

While editing source, use:

```bash
pnpm run watch
```

This keeps the TypeScript compiler watching for changes. The repository also documents a fast test workflow that combines compilation in watch mode with `test:fast`.

A useful development loop is therefore:

```bash
# Terminal 1
pnpm run compile -- --watch

# Terminal 2
pnpm run test:fast
```

### Build a distributable package

To produce the package that would be distributed to consumers:

```bash
pnpm run package
```

The package is created under:

```text
build/package/
```

The documented build workflow distinguishes normal compilation (`build/compiled/`) from packaging (`build/package/`).

### Code quality commands

Before opening a PR, these are useful checks:

```bash
pnpm run lint
pnpm run format
pnpm run compile
pnpm run test
```

The repository exposes dedicated lint, format, compile, and test commands as part of its development workflow.

---

## Project structure

Most changes will live under `src/` or `test/`.

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
├── test/
│   ├── functional/
│   ├── github-issues/
│   ├── unit/
│   └── utils/
├── docs/
├── packages/
├── build/
├── ormconfig.sample.json
└── package.json
```

The major `src/` areas are organized by responsibility:

| Directory             | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `src/data-source/`    | `DataSource` lifecycle and connection management |
| `src/entity-manager/` | Entity-management operations                     |
| `src/repository/`     | Repository-pattern implementation                |
| `src/query-builder/`  | Programmatic SQL/query construction              |
| `src/decorator/`      | Entity, column, and relation decorators          |
| `src/driver/`         | Database-specific drivers                        |
| `src/metadata/`       | Entity metadata                                  |
| `src/schema-builder/` | Schema creation and synchronization              |
| `src/migration/`      | Migration infrastructure                         |
| `src/subscriber/`     | Entity/database event subscribers                |
| `src/persistence/`    | Entity-persistence internals                     |

A useful architectural rule is to keep **database-specific behavior in `src/driver/`**. Code intended to work across databases should remain database-agnostic where possible and be tested against multiple drivers.

### Tests

The test tree is divided into:

* `test/functional/` — feature/integration tests; generally the preferred location for new behavioral tests.
* `test/github-issues/` — regression tests associated with specific GitHub issues.
* `test/unit/` — isolated unit tests.
* `test/utils/` — shared testing infrastructure and helpers.

---

## Testing

### Run the full suite

```bash
pnpm run test
```

The normal test command recompiles the project before running tests.

### Fast test cycle

After the project is already compiled—or while the compiler is running in watch mode—use:

```bash
pnpm run test:fast
```

This skips the full recompilation step and is better for quick iteration.

### Run a subset of tests

Mocha's grep option can be passed through `test:fast`:

```bash
pnpm run test:fast -- --grep "pattern"
```

For example:

```bash
pnpm run test:fast -- --grep "repository"
```

This is the fastest way to repeatedly execute the feature or regression you're actively working on.

### How database tests work

Tests can execute against multiple database configurations from `ormconfig.json`. New tests should generally work across supported databases unless the behavior being tested is explicitly driver-specific. Test entities are normally placed in an `entity/` directory adjacent to the test.

The standard integration-test pattern uses helpers such as:

```typescript
createTestingConnections(...)
reloadTestingDatabases(...)
closeTestingConnections(...)
```

Tests then run their assertions across the resulting `DataSource` instances.

When adding tests:

1. Prefer `test/functional/` for normal feature behavior.
2. Use descriptive `describe()` blocks and `"should ..."` test descriptions.
3. Make tests portable across database drivers when possible.
4. Put driver-specific branching behind explicit database-type checks only when necessary.

---

## Suggested first-day workflow

After cloning the repository, a practical first run is:

```bash
pnpm install
cp ormconfig.sample.json ormconfig.json

# Start/configure the databases needed by ormconfig.json
docker compose up

# Make sure the code compiles
pnpm run compile

# Run the tests
pnpm run test
```

Once that works, switch to the quicker development loop:

```bash
# Terminal 1
pnpm run compile -- --watch

# Terminal 2
pnpm run test:fast -- --grep "feature you're changing"
```

---

## Before submitting a change

At minimum, verify:

```bash
pnpm run lint
pnpm run compile
pnpm run test
```

Changes should include new or updated tests where appropriate, and documentation should be updated when the change affects documented behavior or APIs. The repository's PR checklist explicitly calls for tests and corresponding documentation updates.

For most feature work, a good mental model is:

```text
write/update test
      ↓
implement change in src/
      ↓
run focused test
      ↓
run lint + compile
      ↓
run full test suite
      ↓
update docs if public behavior changed
```

The codebase is strongly oriented around **multi-database compatibility**, so a change that works against one SQL dialect may still require consideration of the other drivers before it is ready to merge.
