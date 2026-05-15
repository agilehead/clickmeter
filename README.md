# Clickmeter

Minimal analytics server built with **Tsonic + ASP.NET Core + EF Core (SQLite)**.

This repo is also a “real-world” readiness test for Tsonic (NativeAOT + EF query precompilation).

## What it provides

Clickmeter records pageview-style events and exposes aggregate metrics through a
small HTTP API.

Core concepts:

- **Property** — tracked site or application
- **Pageview** — event with path, campaign, referrer, and user-agent metadata
- **Read key** — bearer token required for metrics endpoints
- **SQLite store** — EF Core-backed persistence using the generated compiled
  model

Request and response payloads use closed typed records. JSON records are
represented as arrays of `{ key, value }` entries inside the Tsonic source
model, then serialized as normal JSON objects at the HTTP boundary.

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

## API shape

### Ingest

```http
POST /api/ingest
content-type: application/json
```

```json
{
  "propertyId": 1,
  "path": "/pricing",
  "campaign": "spring",
  "referrer": "https://example.com/",
  "userAgent": "Mozilla/5.0"
}
```

### Metrics

Metrics endpoints require the property read key:

```http
Authorization: Bearer <read-key>
```

Common reads:

- `GET /api/overview?propertyId=<id>`
- `GET /api/metrics?propertyId=<id>`
- `GET /api/top-pages?propertyId=<id>`
- `GET /api/top-campaigns?propertyId=<id>`

The server returns totals and top-key aggregates as typed JSON payloads.

## Selftest

```bash
npm run selftest
```

To run against a local (unpublished) Tsonic checkout:

```bash
TSONIC_BIN="node /path/to/tsonic/packages/cli/dist/index.js" npm run selftest
```

## Full verification

```bash
TSONIC_BIN="node /path/to/tsonic/packages/cli/dist/index.js" npm run verify-all
```

`verify-all` overlays sibling local first-party Tsonic packages when they are
checked out beside this repo. That makes Clickmeter a release-wave consumer for
the compiler, generated CLR bindings, ASP.NET Core, Microsoft.Extensions,
EF Core, SQLite, and core runtime packages.
