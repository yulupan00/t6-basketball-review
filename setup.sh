#!/bin/bash
# Quick local test server for T6 github_pages.
# Usage: ./setup.sh   (then open http://localhost:8765)
cd "$(dirname "$0")"
PORT=${PORT:-8765}
echo "Serving T6 at http://localhost:$PORT"
exec python3 -m http.server "$PORT"
