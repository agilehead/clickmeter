#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -z "${TSONIC_BIN:-}" ]]; then
  echo "FAIL: TSONIC_BIN is not set. Set it to the tsonic CLI path." >&2
  exit 1
fi

echo "=== clickmeter selftest ==="
echo "workspace: ${ROOT}"

cd "${ROOT}"

echo "=== build ==="
npm run -w @clickmeter/server build

echo "=== run (server) ==="
DB_PATH="${ROOT}/packages/server/clickmeter.db"
rm -f "${DB_PATH}" >/dev/null 2>&1 || true

echo "=== migrate (sqlite) ==="
CLICKMETER_DB="${DB_PATH}" npm run migrate >/dev/null

pushd "${ROOT}/packages/server" >/dev/null

CLICKMETER_DB="${DB_PATH}" \
CLICKMETER_ADMIN_TOKEN="dev-admin" \
  CLICKMETER_LISTEN_URL="http://localhost:8085" \
  ./out/clickmeter >.tmp-server.log 2>&1 &
pid=$!

cleanup() {
  kill "${pid}" >/dev/null 2>&1 || true
  wait "${pid}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in {1..40}; do
  if curl --silent --fail "http://localhost:8085/health" >/dev/null; then
    break
  fi
  sleep 0.1
done

echo "=== bootstrap property ==="
bootstrap="$(
  curl --silent --fail \
    -H "authorization: Bearer dev-admin" \
    -H "content-type: application/json" \
    -d '{"property_id":"prop_123","allowed_origins":["https://example.com"]}' \
    "http://localhost:8085/internal/admin/properties"
)"
echo "${bootstrap}" | rg -q "\"write_key\"" && echo "${bootstrap}" | rg -q "\"read_key\""

write_key="$(node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(0,"utf8"));process.stdout.write(d.write_key);' <<<"${bootstrap}")"
read_key="$(node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(0,"utf8"));process.stdout.write(d.read_key);' <<<"${bootstrap}")"

echo "=== ingest preflight (CORS) ==="
preflight="$(
  curl --silent --fail --include \
    -X OPTIONS \
    -H "origin: https://example.com" \
    -H "access-control-request-method: POST" \
    -H "access-control-request-headers: authorization, content-type" \
    "http://localhost:8085/v1/events"
)"
echo "${preflight}" | rg -qi "^HTTP/.* 204"
echo "${preflight}" | rg -qi "^Access-Control-Allow-Origin: https://example.com"

echo "=== ingest pageview ==="
curl --silent --fail \
  -H "origin: https://example.com" \
  -H "authorization: Bearer ${write_key}" \
  -H "content-type: application/json" \
  -d '{
    "schema_version": 1,
    "property_id": "prop_123",
    "scope": { "type": "store", "id": "store_1" },
    "events": [
      {
        "event_id": "evt_1",
        "type": "pageview",
        "ts": "2026-01-10T00:00:00Z",
        "context": {
          "page": { "url": "https://example.com/x", "path": "/x", "title": "X", "referrer": "" },
          "campaign": { "campaign_id": "c1", "utm": { "source": "google", "medium": "cpc", "campaign": "winter-sale" } }
        },
        "identity": { "visitor_id": "v1", "session_id": "s1" },
        "dims": { "store": "store_1", "plan": "pro" }
      }
    ]
  }' \
  "http://localhost:8085/v1/events" >/dev/null

echo "=== report overview ==="
curl --silent --fail \
  -H "authorization: Bearer ${read_key}" \
  "http://localhost:8085/v1/properties/prop_123/overview?from=2026-01-01&to=2026-12-31" \
  | rg -q "\"pageviews\""

echo "=== report pages ==="
curl --silent --fail \
  -H "authorization: Bearer ${read_key}" \
  "http://localhost:8085/v1/properties/prop_123/pages?from=2026-01-01&to=2026-12-31&limit=10" \
  | rg -q "\"/x\""

echo "=== report campaigns ==="
curl --silent --fail \
  -H "authorization: Bearer ${read_key}" \
  "http://localhost:8085/v1/properties/prop_123/campaigns?from=2026-01-01&to=2026-12-31&limit=10" \
  | rg -q "c1"

echo "=== report metrics (filter + group_by) ==="
curl --silent --fail \
  -H "authorization: Bearer ${read_key}" \
  "http://localhost:8085/v1/properties/prop_123/metrics?from=2026-01-01&to=2026-12-31&metrics=pageviews,unique_visitors&group_by=path&path=/x,/y,/z&campaign_id=c1" \
  | rg -q "\"pageviews\""

popd >/dev/null

echo "=== OK ==="
