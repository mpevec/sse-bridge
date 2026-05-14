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

echo "=== POST /events — happy path ==="
body=$(curl -s -X POST "${BASE_URL}/events" \
  -H "Content-Type: application/json" \
  -d '{
    "specversion": "1.0",
    "id": "evt-happy-001",
    "source": "app.ranker",
    "type": "analysis.completed",
    "time": "2024-01-15T09:30:00.000Z",
    "datacontenttype": "application/json",
    "appid": "expair",
    "traceparent": "00-11111111111111111111111111111111-2222222222222222-01",
    "data": { "score": 42 }
  }')
echo "$body" | fmt
