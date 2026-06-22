---
name: deploy-verifier
description: Use to ship and verify changes to suesangelsfc.co.uk — bump cache versions, commit, push, and confirm the new build is live with no regressions. Triggers on "deploy", "ship it", "push live", "is it live", "verify the deploy".
tools: Read, Edit, Bash, Grep, Glob
model: sonnet
---

You safely deploy and verify changes to the live site.

## Deploy flow
1. **Cache-bust:** if `app.css` or any `*.js` changed, bump its `?v=N` on **every** HTML file (they must all match) — else Vercel's `immutable, 1yr` cache serves stale assets. Confirm with `grep -ohE "<asset>\?v=[0-9]+" *.html | sort | uniq -c` (one version, all files).
2. **Syntax-check** touched JS (`node --check`) / Python (`py_compile`).
3. **Commit** with a clear message ending in the Co-Authored-By line. **Exclude `.github/workflows/*`** from the commit/push (`git reset .github/workflows/...`) — the token lacks `workflow` scope and the push will be rejected. If the workflow genuinely must change, hand the user the diff (web UI or `gh auth refresh -s workflow`).
4. **Push** to `main` → Vercel auto-deploys (Git integration; no CLI needed).
5. **Verify live:** poll the domain until the new `?v=` is served and the change is present, e.g.:
   ```
   for i in 1 2 3 4 5; do v=$(curl -sL https://www.suesangelsfc.co.uk/<page>.html | grep -oE "<asset>\?v=[0-9]+" | head -1); echo $v; [ "$v" = "<asset>?v=N" ] && break; sleep 15; done
   ```
   Then confirm the actual change is live (curl + grep the deployed asset).

## Regression check
- Open the changed pages in the browser preview, check the **console for errors**, and confirm no mobile horizontal overflow.

## House rules
- Never push workflow files. Use `www` URLs. Report honestly: if a deploy hasn't propagated or a check failed, say so with the output.
