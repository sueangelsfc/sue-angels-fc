#!/bin/bash
# drift-check.sh — warn when PageShell.js (public) and PageShell.jsx (admin)
# disagree on shared data. This drift class caused a real bug: Louis Allen
# existed as a coach in PageShell.js but was missing from PageShell.jsx, so the
# admin Coaches section silently hid him. Run before pushing anything that
# touches COACHES, SQUAD, or BADGE_REGISTRY in either file.
#
# Extraction is bracket-matched (not line-based) and whitespace-tolerant:
# the .jsx aligns columns ("num:  5") while the compiled .js does not.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - <<'PY'
import re, sys

def arr(fname, marker):
    s = open(fname, encoding='utf-8').read()
    i = s.find(marker)
    if i < 0: return ''
    i = s.find('[', i); depth = 0
    for j in range(i, len(s)):
        if s[j] == '[': depth += 1
        elif s[j] == ']':
            depth -= 1
            if depth == 0: return s[i:j+1]
    return ''

def ids(text):      return set(re.findall(r"id:\s*'([a-z0-9-]+)'", text))
def nums(text):     return set(int(n) for n in re.findall(r"num:\s*(\d+)", text))
def matches(text):  return set(re.findall(r"match:\s*'([a-z0-9-]+)'", text))

JS, JSX = 'PageShell.js', 'PageShell.jsx'
fail = False

def compare(label, a, b):
    global fail
    only_js, only_jsx = sorted(a - b), sorted(b - a)
    if only_js or only_jsx:
        fail = True
        print(f"=== {label}: DRIFT ===")
        if only_js:  print(f"  only in {JS} (public): {only_js}")
        if only_jsx: print(f"  only in {JSX} (admin): {only_jsx}")
    else:
        print(f"=== {label}: OK ({len(a)} entries match) ===")

compare('COACHES ids',            ids(arr(JS, 'window.COACHES')),      ids(arr(JSX, 'window.COACHES')))
compare('SQUAD numbers',          nums(arr(JS, 'SQUAD = [')),          nums(arr(JSX, 'SQUAD = [')))
compare('BADGE_REGISTRY matches', matches(arr(JS, 'BADGE_REGISTRY')),  matches(arr(JSX, 'BADGE_REGISTRY')))

print()
if fail:
    print('DRIFT FOUND — fix BOTH files before shipping (admin reads .jsx, public reads .js).')
    sys.exit(1)
print('PageShell.js / PageShell.jsx: no shared-data drift detected.')
PY
