# MIGRATION PLAN — toward a build pipeline (Vite + JSX)

Staged plan to lift the last two scores (**maintainability 8 → 10**, **security 9.5 → 10**)
by replacing the hand-written `React.createElement` monolith with a real build, **without
ever risking the live site**. Read with `ARCHITECTURE.md`.

---

## 0. The honest trade-off (read before approving)

The no-build architecture was a **deliberate choice** with real upside:
- Anyone can edit a file and `git push` — no Node, no toolchain, no `node_modules`.
- Instant, dependency-free deploys; nothing to rot or break in CI.

A build step **buys**: a readable/splittable codebase, type-checking, tree-shaking,
hashed assets (no manual `?v=` bumps), and the ability to drop `'unsafe-eval'` (and most
`'unsafe-inline'`) from the CSP.

A build step **costs**: a toolchain to maintain, a barrier for non-technical volunteers,
and a more complex deploy. For a club site this is a genuine tension.

**Recommendation:** do this **incrementally**, smallest-value-first. **Phase 1 alone**
(re-sync the JSX + a tiny compile step) fixes ~80% of the maintainability pain at very low
risk and is independently shippable. Only continue to Phases 3–4 (full Vite + strict CSP)
if the team actually wants the toolchain. **Each phase ships on its own and can be the
last one.** Don't treat this as all-or-nothing.

### Reality check on "security 10"
React's `style={{…}}` emits inline `style` attributes, so **`style-src 'unsafe-inline'`
is effectively unavoidable** without also moving hundreds of inline styles to classes
(a large, separate refactor). So the realistically-achievable CSP wins are: **drop
`'unsafe-eval'`** (Phase 3, kill admin's in-browser Babel) and **nonce scripts to drop
`script-src 'unsafe-inline'`** (Phase 4). A truly pure CSP is a stretch goal, not a
quick switch — flagged honestly.

---

## 1. Goals / non-goals

**Goals:** readable + splittable source; type-checkable; strict-er CSP; keep **identical
behaviour, SEO, and the per-page (MPA) model**; zero downtime.

**Non-goals:** NOT becoming a client-routed SPA (would break SEO + the SW); NOT redesigning
anything; NOT changing content/data flow or Supabase.

---

## 2. Guardrails (apply to every phase)

1. **Parity harness first (Phase 0).** Capture, for all 24 pages: a full-page screenshot
   (dark + light, desktop + 390px), the rendered `#rd-root` text, and a per-page behaviour
   checklist (router picks right component, `SA_TAB` tabs, theme toggle, countdown, sliders,
   tilt, forms submit, admin CRUD). This is the regression oracle.
2. **Branch + Vercel preview deploy** for every phase. Never build straight to `main`.
   Compare the preview against the Phase-0 snapshots before merging.
3. **Rollback = revert the merge commit.** Because each phase keeps the output loadable the
   same way until Phase 5, rollback is always one revert.
4. **One phase = one PR.** Decision gate between phases (below).

---

## 3. The phases

### Phase 0 — Safety net  ·  ~0.5 day  ·  risk: none
Build the parity harness (script the 24-page screenshot + DOM-text capture via the preview
tools; write the behaviour checklist). Commit the baseline artifacts. **Nothing in the app
changes.**

### Phase 1 — Re-establish a JSX→JS compile for `SiteApp` (the big win)  ·  ~2–3 days  ·  risk: low
- Re-author `SiteApp.jsx` so it is **authoritative** and compiles to a `SiteApp.js` that is
  behaviourally identical to today's (classic runtime, global `React`, IIFE/global output —
  same as the current Babel `preset-react` settings).
- Add a tiny local build (esbuild or Vite *library* mode) that emits `SiteApp.js`. Keep
  **everything else identical**: same multi-page HTML, same script load order, same globals,
  same `?v=` busting, same Vercel no-build deploy (commit the compiled `SiteApp.js`, OR add a
  build step that only compiles this one file).
- **Verify** against Phase 0 (byte-diff the render, not the source). Ship.
- **Outcome:** you now edit real JSX; the drift problem is gone; maintainability jumps. The
  runtime/deploy model is **unchanged**, so risk is contained to one file.

### Phase 2 — Split the monolith into modules  ·  ~3–5 days  ·  risk: low–medium
- Break `SiteApp.jsx` into `src/pages/*` + `src/components/*` (SiteHeader, SiteFooter,
  BackToTop, cards, tables, the cinematic hero, etc.) + `src/lib/*`. The build still emits the
  same single `SiteApp.js`. Pure reorganisation, **no behaviour change**; verify per split.

### Phase 3 — Vite multi-page build + migrate `admin` off Babel-standalone  ·  ~4–6 days  ·  risk: medium
- Introduce **Vite MPA** (one HTML entry per page). Bundling replaces the 12 global `<script>`
  tags with module imports; **hashed filenames replace manual `?v=` bumping**.
- Re-point Vercel to `vite build` (Root unchanged, output `dist/`). Update the service worker
  for hashed assets.
- **Migrate `admin.html`** from in-browser Babel to the build → this is what lets us **drop
  `'unsafe-eval'`** and the `unpkg` Babel/React-dev CDN from the CSP.
- Highest-risk phase: full preview-vs-baseline parity sweep, plus a manual admin CRUD pass
  against a Supabase staging row, before merge.

### Phase 4 — CSP hardening + optional TypeScript  ·  ~2–4 days  ·  risk: medium
- Add per-response **script nonces** (Vercel Edge Middleware) and drop `script-src
  'unsafe-inline'`. Tighten `connect-src`/`img-src` to exact origins now that bundling makes
  them enumerable. (Keep `style-src 'unsafe-inline'` — see §0 caveat — unless a later
  inline-style→class refactor is scoped.)
- Optional: turn on TypeScript incrementally (`allowJs`, type the `dataStore`/`PageShell`
  public surface first).

### Phase 5 — Cutover, docs, decommission  ·  ~1 day  ·  risk: low
- Flip Vercel fully to the build, delete the legacy no-build path + drifted artifacts, rewrite
  `CLAUDE.md` §"Runtime architecture" and `ARCHITECTURE.md` for the new flow, monitor for a
  week with the SW/analytics.

---

## 4. Decision gates
After **Phase 1** and after **Phase 3**, stop and decide whether the gain so far justifies
continuing. Many teams will (correctly) stop after Phase 1 or 2: the maintainability problem
is essentially solved there, and Phases 3–4 mostly buy the CSP/asset-hashing polish at the
cost of the toolchain.

## 5. Effort summary
| Phase | Output | Effort | Ship alone? |
|---|---|---|---|
| 0 | Parity harness | 0.5d | n/a |
| 1 | Real JSX source + compile | 2–3d | ✅ (recommended floor) |
| 2 | Componentised modules | 3–5d | ✅ |
| 3 | Vite MPA + admin migrated, `unsafe-eval` gone | 4–6d | ✅ |
| 4 | Nonce CSP, optional TS | 2–4d | ✅ |
| 5 | Cutover + docs | 1d | — |

**Total if taken all the way: ~2.5–4 weeks of focused work.** Phase 1 (the high-ROI floor):
**~3 days.**

## 6. What I'd do first
Phase 0 + Phase 1, on a branch, behind a Vercel preview, verified against the baseline — then
review the result and decide whether to go further.
