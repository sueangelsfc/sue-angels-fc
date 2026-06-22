# Build migration — working notes

Authoritative source is now **`src/SiteApp.jsx`** (was the hand-maintained `SiteApp.js`).
Build the deployable file with:

    npm install        # one-time (esbuild)
    npm run build:app  # src/SiteApp.jsx -> SiteApp.js   (or: npm run watch:app)

Output is behaviourally identical to the old hand-written file (esbuild, classic JSX
runtime, global React). New code can be written in real JSX; old createElement code
keeps working unchanged and is converted incrementally (Phase 2).

## Parity check (the regression oracle)
`migration/parity-probe.js` returns a normalized render signature per page. Baselines
captured on `main` live in `migration/baseline/`. After any migration change: rebuild,
load each page in the preview, run the probe, and diff against the baseline.
Verified identical so far: home (textLen 2622, all counts), league (2 tables, 37 rows).

## Status
- [x] Phase 0 — parity harness + baselines (home, league)
- [x] Phase 1 — esbuild pipeline + authoritative `src/SiteApp.jsx`, parity-verified
- [ ] Phase 2 — split monolith into src/pages + src/components
- [ ] Phase 3 — Vite MPA + migrate admin off Babel (drops CSP 'unsafe-eval')  ← deploy-model gate
- [ ] Phase 4 — nonce CSP, optional TypeScript
- [ ] Phase 5 — cutover + decommission no-build path  ← final gate
