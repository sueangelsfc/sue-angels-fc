#!/bin/bash
# bump.sh — cache-bust an asset across EVERY html page in one command.
# The #1 recurring bug in this project is a changed asset shipping under an old
# ?v= (browser/SW serves stale code and "the fix doesn't show"). This makes the
# bump atomic: same new version on every page, verified, no hand-run sed.
#
#   ./scripts/bump.sh SiteApp.js        -> bumps SiteApp.js?v=N to v=N+1 everywhere
#   ./scripts/bump.sh app.css 90        -> forces v=90 everywhere
#   ./scripts/bump.sh --list            -> show current versions of all assets
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "${1:-}" = "--list" ] || [ -z "${1:-}" ]; then
  echo "Current asset versions (count = pages referencing):"
  grep -rhoE "[A-Za-z_-]+\.(js|jsx|css)\?v=[0-9]+" *.html | sort | uniq -c | sort -rn
  exit 0
fi

ASSET="$1"
ESCAPED=$(printf '%s' "$ASSET" | sed 's/\./\\./g')
CURRENT=$(grep -rhoE "${ESCAPED}\?v=[0-9]+" *.html | grep -oE '[0-9]+$' | sort -rn | head -1)
[ -z "$CURRENT" ] && { echo "ERROR: $ASSET not referenced with ?v= in any html"; exit 1; }
NEXT="${2:-$((CURRENT + 1))}"

sed -i '' "s/${ESCAPED}?v=[0-9]*/${ASSET}?v=${NEXT}/g" *.html

COUNTS=$(grep -rhoE "${ESCAPED}\?v=[0-9]+" *.html | sort | uniq -c)
echo "$ASSET: v$CURRENT -> v$NEXT"
echo "$COUNTS"
DISTINCT=$(echo "$COUNTS" | wc -l | tr -d ' ')
[ "$DISTINCT" = "1" ] && echo "OK: consistent on all pages" || { echo "WARNING: mixed versions remain!"; exit 1; }
