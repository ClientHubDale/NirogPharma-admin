#!/bin/sh
# Browser suites. `./e2e/run.sh` runs them all, `./e2e/run.sh nav settings` a few.
#
# Starts the dev server on port 5199 if it is not already up (and stops it
# again on the way out). Set E2E_CHROME if Chrome is somewhere unusual.
set -u
cd "$(dirname "$0")/.."

PORT=${E2E_PORT:-5199}
BASE="http://localhost:$PORT"
export E2E_BASE="$BASE"

started=""
if ! curl -s -o /dev/null "$BASE/"; then
  npx vite --port "$PORT" --strictPort >/tmp/np-e2e-vite.log 2>&1 &
  started=$!
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    curl -s -o /dev/null "$BASE/" && break
    sleep 1
  done
fi

suites="$*"
[ -z "$suites" ] && suites=$(ls e2e/suites/*.mjs | sed 's|.*/||; s|\.mjs$||' | tr '\n' ' ')

failed=0
for s in $suites; do
  out=$(node "e2e/suites/$s.mjs" 2>&1)
  status=$?
  printf '%-12s %s\n' "$s" "$(printf '%s' "$out" | tail -1)"
  if [ $status -ne 0 ]; then
    failed=$((failed + 1))
    printf '%s\n' "$out" | grep -E '^FAIL|Error' | head -8 | sed 's/^/             /'
  fi
done

[ -n "$started" ] && kill "$started" 2>/dev/null

if [ $failed -gt 0 ]; then
  echo "$failed suite(s) failed"
  exit 1
fi
echo "all suites passed"
