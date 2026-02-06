# Coding Standards (Clickmeter)

These rules are intentionally strict. The codebase is meant to stay “small-file, single-purpose” as it grows.

## File layout

- **Kebab-case file names** for all implementation files (e.g. `create-property.ts`, `parse-date-range-utc.ts`).
- Prefer directory names that read like a sentence when combined with the file name (e.g. `server/handlers/handle-ingest.ts`).

## Public API shape

- **One exported function per implementation file.**
  - The exported function is the “unit of reuse” (domain operation, handler, parser, etc).
  - **Internal helpers** (`function foo() {}`) are allowed inside the file.
  - **Types related to that exported function** may be exported from the same file (e.g. `export type CreateXInput = ...`).
- Avoid exporting “bags of unrelated helpers”.

## Composition

- Use small “wiring” modules that compose exported functions (e.g. `create-app-handlers.ts`).
- Keep business logic deterministic and side-effect free where possible; push I/O to the edges (HTTP, EF Core, filesystem).

## Naming

- Function names: `camelCase` (e.g. `createAppHandlers`, `handleIngest`).
- File names: `kebab-case` (e.g. `create-app-handlers.ts`, `handle-ingest.ts`).

