# Analytics Server (Clickmeter) — Minimal Spec (Extensible)

## Summary
Two API surfaces:

1) **Browser → Ingest API**: called by web pages to register events (MVP: `pageview`).
2) **Server → Reporting API**: called server-to-server to answer questions like “how many pageviews/visitors did this property get this week?” with optional campaign breakdowns.

Everything is scoped by `property_id` (your app decides what that maps to). The client/API contract is designed to stay stable while the backend evolves (SQLite → Postgres → ClickHouse, more event types, more dimensions) **without breaking clients**.

## Design principles (so it scales without rewrites)
- **Stable envelope, extensible payload**: keep a small set of required fields; put event-specific fields in `data`.
- **Append-only raw events**: store raw events immutable; build rollups/materializations for speed.
- **Versioned schemas**: include `schema_version` in requests; tolerate unknown fields (forward compatible).
- **Idempotency**: accept `event_id` and dedupe to handle retries/batching safely.
- **Separation of concerns**: Postgres/SQLite for metadata + auth; events store can change later without changing endpoints.

## Core concepts
- **Property**: a tracked “site/app” scope. Identified by `property_id`.
- **Write key**: used by browsers to send events (public-ish; protected by allowed origins + rate limits).
- **Read key**: used server-to-server to query reports (secret).
- **Visitor**: anonymous identifier (cookie/localStorage); may be absent if consent is not granted.
- **Session**: identifier to group events; may be client-generated initially.
- **Campaign**: attribution identifier (your `campaign_id`) and/or UTMs.

## API: Browser → Ingest

### Endpoint
`POST /v1/events`

### Auth (choose one)
- **Simplest**: `Authorization: Bearer <write_key>` (or `X-Write-Key`)
- **More secure**: browser uses a **short-lived signed token** minted by your backend; token encodes `property_id` + expiry.

### CORS / abuse controls (recommended)
- Per-property `allowed_origins` allowlist.
- Per-key/per-IP rate limits.
- Drop/flag obvious bots (optional at MVP).

### Request body (envelope)
Minimal required: `property_id`, `events[]`.

```json
{
  "schema_version": 1,
  "property_id": "prop_123",
  "sent_at": "2026-01-24T18:12:33Z",
  "events": [
    {
      "event_id": "01HR... (uuid/ulid)",
      "type": "pageview",
      "ts": "2026-01-24T18:12:33Z",
      "context": {
        "page": {
          "url": "https://example.com/products/sku1",
          "path": "/products/sku1",
          "title": "Product page",
          "referrer": "https://google.com/"
        },
        "campaign": {
          "campaign_id": "cmp_789",
          "utm": {
            "source": "google",
            "medium": "cpc",
            "campaign": "winter-sale"
          }
        }
      },
      "identity": {
        "visitor_id": "v_abc123",
        "session_id": "s_def456",
        "user_id_hash": "sha256:..."
      },
      "data": {}
    }
  ]
}
```

### Notes
- `event_id` enables safe retries and batching (dedupe by `(property_id, event_id)`).
- Server should compute `received_at`, and should prefer server time if `ts` is missing/invalid.
- Prefer **not** to accept raw PII; keep `user_id_hash` as a one-way hash if needed.
- If you later add new event types (`click`, `add_to_cart`, `purchase`, etc.), clients keep calling the same endpoint; only `type` + `data` changes.

### Response
Return an acknowledgment suitable for “fire-and-forget”:
```json
{ "accepted": 10, "rejected": 0, "errors": [] }
```

## API: Server → Reporting

### Auth
`Authorization: Bearer <read_key>` (secret; not used in browsers).

### Minimal endpoints (MVP)
1) `GET /v1/properties/{property_id}/overview?from=YYYY-MM-DD&to=YYYY-MM-DD`
   - Returns: `pageviews`, `unique_visitors`, `sessions` (define as: distinct `visitor_id` / distinct `session_id`)

2) `GET /v1/properties/{property_id}/pages?from=...&to=...&limit=50`
   - Returns top `path`s by `pageviews` (+ optional uniques)

3) `GET /v1/properties/{property_id}/campaigns?from=...&to=...&limit=50`
   - Returns top campaigns by `pageviews` (prefer `campaign_id`, else `utm.campaign`)

### Scalable “single reporting endpoint” (optional, but future-proof)
To avoid adding many bespoke endpoints later, you can standardize on:

`GET /v1/properties/{property_id}/metrics?from=...&to=...&interval=day&metrics=pageviews,unique_visitors,sessions&group_by=path,campaign_id`

This can power overview/pages/campaigns with different query parameters, while keeping the external API stable.

## Storage recommendations

### MVP storage: SQLite (OK with constraints)
SQLite can work if you accept:
- **Single-node** deployment (or a single writer).
- **Batch inserts in transactions** (browser sends events in batches).
- **WAL mode** + `busy_timeout` to reduce lock errors.
- Dashboards read mostly from **rollups** (hourly/daily), not raw events.

### Default production storage: PostgreSQL
Postgres is the safest “simple but production-friendly” default:
- Easier concurrency, backups, replication, multi-instance app servers.
- Partition `events` by time; index `(property_id, ts)` and commonly grouped dimensions.
- Still use rollups for fast dashboards.

### Scale-up storage: ClickHouse (events) + Postgres (metadata)
If ingest volume / aggregations become heavy:
- Keep **properties/keys/config** in Postgres.
- Store raw events + rollups in ClickHouse for fast analytics.
- Client-facing API stays the same (no rewrite; only backend implementation changes).

## Minimal data model (logical)

### Metadata
- `properties(id, name, allowed_origins, created_at, ...)`
- `api_keys(id, property_id, type[write|read], key_hash, created_at, revoked_at, ...)`

### Raw events (append-only)
At minimum:
- `events(id, property_id, event_id, ts, received_at, type, path, url, referrer, visitor_id, session_id, campaign_id, utm_source, utm_medium, utm_campaign, data_json, user_agent, ip, ...)`

### Rollups (recommended even for MVP)
Example: daily per-property per-dimension rollups:
- `daily_rollups(property_id, date, path, campaign_key, pageviews, unique_visitors, sessions)`

Rollups let you keep the ingest path simple while making reporting fast and cheap.

## MVP feature set (what to build first)
- Ingest `pageview` with batching + idempotency (`event_id`)
- Property + API key management (write/read)
- Overview/pages/campaigns reports over a date range
- Basic dedupe + basic bot filtering (optional)

## “No rewrite” growth path (spec stays stable)
- Add new event types by introducing new `type` values and putting event-specific fields in `data`.
- Add new reporting breakdowns by adding new `group_by` dimensions (or new views backed by the same rollups).
- Change storage engine (SQLite → Postgres → ClickHouse) behind the same ingest/report endpoints.
- Add privacy/consent modes by allowing `identity` to be partially/fully absent and still accepting events.

