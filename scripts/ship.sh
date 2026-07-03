#!/bin/bash
# ship.sh — the whole deploy ritual in one command.
#   ./scripts/ship.sh "commit message"
# Runs: syntax checks on changed JS -> js/jsx drift check -> commit -> push ->
# polls the live site until the HTML serves the same asset versions as local.
# (Bump versions FIRST with ./scripts/bump.sh <asset> for anything you changed.)
set -euo pipefail
cd "$(dirname "$0")/.."

MSG="${1:?usage: ship.sh \"commit message\"}"

echo "── 1/5 syntax check (changed .js) ─────────────────────────"
CHANGED_JS=$(git diff --name-only HEAD -- '*.js' | grep -v '^api/' || true)
for f in $CHANGED_JS; do node -c "$f" && echo "  OK $f"; done
[ -z "$CHANGED_JS" ] && echo "  (no plain .js changed)"

echo "── 2/5 js/jsx drift check ─────────────────────────────────"
./scripts/drift-check.sh | tail -1

echo "── 3/5 commit ─────────────────────────────────────────────"
git add -A
git commit -q -m "$MSG" || { echo "  nothing to commit"; }

echo "── 4/5 push ───────────────────────────────────────────────"
git push -q origin main
echo "  pushed $(git rev-parse --short HEAD)"

echo "── 5/5 verify live (versions match local) ─────────────────"
LOCAL=$(grep -hoE "[A-Za-z_-]+\.(js|css)\?v=[0-9]+" index.html | sort -u)
for i in 1 2 3 4 5 6; do
  LIVE=$(curl -s "https://www.suesangelsfc.co.uk/index.html?z=$RANDOM" | grep -oE "[A-Za-z_-]+\.(js|css)\?v=[0-9]+" | sort -u)
  if [ "$LIVE" = "$LOCAL" ]; then echo "  LIVE ✓ (all asset versions match local)"; exit 0; fi
  echo "  poll $i: not yet…"; sleep 14
done
echo "  WARNING: live versions still differ after ~90s — check Vercel dashboard."
exit 1
