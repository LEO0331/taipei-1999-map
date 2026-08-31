#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "=== Harness Initialization ==="

if [[ ! -f node_modules/.bin/vitest || ! -f node_modules/.bin/tsc || ! -f node_modules/.bin/vite ]]; then
  echo "=== npm ci (dependencies missing) ==="
  npm ci
fi

echo "=== npm test ==="
npm test

echo "=== npm run build ==="
npm run build

echo "=== Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Read feature_list.json to see current feature state"
echo "2. Pick ONE unfinished feature to work on"
echo "3. Implement only that feature"
echo "4. Re-run verification before claiming done"
