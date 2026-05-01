#!/usr/bin/env bash
set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:8088}"

fmt() {
  if command -v jq >/dev/null 2>&1; then
    jq .
  else
    cat
  fi
}


echo ""
echo "=== POST /events — unhappy path (invalid event) ==="
body=$(curl -s -X POST "${BASE_URL}/events" \
  -H "Content-Type: application/json" \
  -d '{
    "specversion": "0.3",
    "id": "",
    "traceid": "tooshort"
  }')
echo "$body" | fmt
