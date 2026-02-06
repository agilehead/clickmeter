#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

KNEX="${ROOT}/node_modules/.bin/knex"

NODE_ENV=${NODE_ENV:-development} "${KNEX}" migrate:latest \
  --knexfile "${ROOT}/knexfile.clickmeter.js" \
  --env "${NODE_ENV:-development}"

