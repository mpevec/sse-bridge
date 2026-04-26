#!/usr/bin/env bash
set -euo pipefail

# Test the SSE event stream
echo "=== GET /events/:appId (SSE stream) ==="
curl -Nv http://localhost:8088/events/expair
