# Clickmeter

Minimal analytics server built with **Tsonic + ASP.NET Core + EF Core (SQLite)**.

This repo is also a “real-world” readiness test for Tsonic (NativeAOT + EF query precompilation).

## Prerequisites

- .NET 10 SDK
- Node.js + npm
- `tsonic` installed globally, or point scripts at a local checkout via `TSONIC_BIN`

## Setup

```bash
npm install
```

## Run

```bash
# apply SQLite migrations
npm run migrate

# run server (builds + generates EF compiled model)
npm run dev
```

## Selftest

```bash
npm run selftest
```

To run against a local (unpublished) Tsonic checkout:

```bash
TSONIC_BIN="node /path/to/tsonic/packages/cli/dist/index.js" npm run selftest
```

