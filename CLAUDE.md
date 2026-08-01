# CLAUDE.md — Sue's Angels FC platform

Project instructions for Claude Code. Read this first; it is the source of truth for how this site is built, how to change it safely, and how to deploy.

> **July 2026 rebuild.** The public site and control panel were rebuilt as a **template-driven static platform**. Sources live in `src/`; the generator writes the deployed HTML/CSS/JS to the repo root and that output is committed. The previous per-page hand-authored site (`app.css`, `SiteApp.js`, `PageShell.js`, per-page `.js`) and the Babel-transpiled `.jsx` admin were retired. Tags `pre-platform-rebuild-20260730` and `pre-rebuild-checkpoint` mark earlier states; the recovery package under `/Users/Stewart/Documents/Sue's Angels FC/recovery` holds the old production site verbatim.

## What this is
A static marketing + club-data website for **Sue's Angels FC** (a London men's Sunday-league football club, founded 2025 in memory of Susan Anne Martin, playing for sepsis awareness). Live at **www.suesangelsfc.co.uk**, hosted on **Vercel**, source on **GitHub** (`sueangelsfc/sue-angels-fc`, production branch `main`).

**League Ten champions 25/26, unbeaten: P18 W18 D0 L0, GF 90, GA 11, 54 pts.** Promoted to League Eight.

## Architecture — read before editing

### The generator is the whole build
```
src/
  build.mjs           the generator: reads data, renders every route, writes output
  lib/
    club.mjs          canonical club facts, sepsis copy, sponsors, FAQs, packages
    stats.mjs         derived statistics engine (shared with the browser)
    dataset.mjs       assembles the canonical dataset from recovered evidence
    html.mjs          page shell: <head>, header, nav, footer, icons, crest
    blocks.mjs        football components: fixture cards, tables, line-ups
    verify-dataset.mjs asserts derived figures against the published table
  templates/          one module per route family
  styles/*.css        concatenated in filename order into sa.css
  scripts/*.js        concatenated into sa.js (public)
  admin/*.js          concatenated into control.js (control panel only)
  data/               recovered evidence + runtime config
  test/run.mjs        1,546-check suite against the generated output
```

**Run `npm run build` after any change under `src/`.** Nothing in `src/` is served; only the generated root files are.

### Why a generator
1. **Shell drift is impossible.** Header, nav and footer are defined once in `html.mjs`. The old site copy-pasted them into 20 files and they drifted (three different brand `aria-label`s, two different mobile CTA labels).
2. **Real URLs.** Every player (`/players/<slug>.html`), match (`/matches/<id>.html`), article and album gets its own crawlable file with content in the HTML.
3. **Vercel needs no build step.** `buildCommand: null`. No build can fail on deploy.
4. **Works with JavaScript disabled.** Every page ships complete markup.

### Cache busting is automatic
`sa.css` and `sa.js` are versioned by a **content hash** computed at build time and stamped identically on every page. Never hand-edit a `?v=`. Mixed versions used to be a recurring production bug; the test suite now asserts a single version across all pages.

## The statistics engine — the one rule that matters
**Every published figure is derived in `src/lib/stats.mjs` from match records. No page hard-codes a number.** Two pages can therefore never disagree.

`npm run verify` asserts the derived League Ten figures against the independently published league table row. It must pass.

Three kinds of completed match count differently, and getting this wrong is what made a derived table disagree with the official one:

| `kind` | Counts as played | Goals count | Notes |
|---|---|---|---|
| `score` | yes | yes | ordinary result |
| `walkover` | yes, won, 3 pts | **no** | official table adds no goals; 15×3 + 3×3 = 54 |
| `penalty` | yes | yes (normal time) | shootout result is not stored, so no winner is inferred |

## Design system

Tokens in `src/styles/00-tokens.css` are the single source of truth. Nothing downstream hard-codes a value that belongs there.

- **Brand:** `#FF7034` orange, true black, white, warm off-white `#FFF8F3`. **Orange is the only accent hue.** Win/draw/loss express difference through weight and structure, never a second colour. Status colours (`--success/--warning/--error`) exist for UI feedback only — forms, toasts, the control panel — and never decorate football data.
- **Type:** **Archivo** variable (weight *and* width) for display, **Geist** variable for body. The width axis is the signature move: `--width-hero: 116%` for headlines, `--width-num: 100%` for tabular figures so columns still align. Two variable files replaced nine static ones.
- **Scale:** `--step--2` to `--step-8`, fluid. Use a step token, never an ad-hoc `font-size`.
- **Glass:** `.glass` is five stacked effects — low-alpha tint, backdrop blur + saturation, a bright top rim and dark bottom rim (thickness), a specular sweep, and a floating shadow. Used **selectively**: nav, buttons, feature panels, overlays, modals, footer. Dense tables and long forms use `.panel` (opaque) because glass hurts sustained reading. There is a `@supports` fallback to a solid surface.
- **Atmosphere:** four large orange masses drift and breathe behind every page, animated on `transform`/`opacity` only. `.atmos__veil` is what keeps white body text above AA over a saturated orange peak — do not remove it. Motion stops entirely under `prefers-reduced-motion`.
- **Themes:** coordinated dark and light, `prefers-color-scheme` respected, manual toggle persisted to `localStorage`, applied by an inline head script before first paint so there is no flash. `--text-on-brand` is **dark ink in both themes**: white on `#FF7034` is only 2.76:1 and fails AA.
- **Hero interior** pins dark-theme tokens because the photograph is dark in both themes. Note it re-declares `color: var(--text)` — descendants inherit `body`'s *computed* colour, so redefining the token alone would change nothing.

## Data layer
Supabase project `hvbquuvxcswylyguplfb`. All seven content tables share the shape `{ key text primary key, data jsonb, updated_at timestamptz }`:

`matches` (33) · `fixtures` (0) · `team_badges` (0) · `player_photos` (28) · `articles` (5) · `gallery` (7) · `recognition` (4)

Plus private `enquiries` and `supporters`.

`player_photos` is a general blob store, not just photographs: it also holds `roster:*`, `coach:*`, `donate:config` and `sponsor:*` records.

### Security posture
- **Anonymous:** may read the seven content tables, may INSERT into `enquiries`/`supporters`, may do nothing else. Verified: content writes return 401 or affect zero rows; `enquiries`/`supporters` SELECT returns `[]`; storage upload returns 403.
- **A `200 []` from an anonymous read of a private table is the policy working**, not an empty table.
- **A bare `204` from PostgREST means the statement ran, not that rows changed.** Use `Prefer: return=representation` to see how many rows a write actually affected. Reading 204 as "write succeeded" produces false security alarms.
- `migrations/002_admin_role_and_rls.sql` replaces the client-side `adminEmail` comparison with an `admin_users` registry plus an `is_club_admin()` SECURITY DEFINER predicate, and re-grounds every write policy on it. **It is inert until an administrator row is inserted** — see the footer of that file. `003` rolls it back without destroying the roster or audit history.
- The Supabase **anon/publishable key is designed to be public**. Never put a service-role key in `src/data/runtime.json` or anywhere the generator can reach. The test suite fails the build if `service_role` appears in shipped output.

## Control panel
`/control.html` + `control.js` (its own bundle; none of it loads on a public page). Auth via Supabase Auth REST directly — no SDK, no in-browser Babel.

Modules: dashboard, fixtures, results and reports, squad and staff, news, gallery and video, recognition, league badges, sponsors, inbox, settings.

- Authorisation is the **database's** answer, surfaced in the UI. A non-registered account is shown as read-only rather than hitting a policy error.
- Content editors are **raw JSON** by design: these are JSONB documents with varied shapes, and a lossy form would silently drop fields the website reads. JSON is validated before it can be saved.
- Every destructive action goes through a confirm dialog. Writes are attributed to `audit_log` via `log_admin_action()`.
- Settings offers a full JSON backup of every content table.

## Forms — how a lead actually reaches the club
`form[data-enquiry]` writes to the `enquiries` table **and** posts `/api/notify-enquiry`. It succeeds if **either** lands.

**That double write matters.** The email endpoint is a graceful no-op until `RESEND_API_KEY` is set, so a form that only emailed would record nothing — which is exactly the bug that once left `enquiries` empty. Same pattern for the footer newsletter: `supporters` table **and** `/api/subscribe`.

Read leads in **Control panel → Inbox**; RLS blocks anonymous reads, so signing in is the only way to see them.

## Commands
```bash
npm run build     # regenerate every route (run after any src/ change)
npm run verify    # assert derived stats against the published league table
npm test          # 1,546 checks against the generated output
npm run serve     # local preview on :4321
```

`npm test` covers: document structure, one h1 per page, heading order, alt text, resolvable assets and internal links, JSON-LD validity, asset-version consistency, overflow guards, reduced motion, both themes, WCAG AA contrast on every text token pair, form labelling, security headers, no service-role key in output, sitemap/robots correctness, and performance budgets (`sa.css` ≤ 130KB, `sa.js` ≤ 48KB, `control.js` ≤ 60KB, no page over 120KB, hero under 250KB). Budgets are **raw bytes** and the build does not minify, so they include comments; `sa.js` is ~12KB gzipped. Adding a minifier would let the JS budget come back down..

## Deployment
**The domain is on the Vercel project `sue-angels-fc-b469`, not `sue-angels-fc`.** The older `sue-angels-fc` project links to a GitHub `repoId` that no longer exists and last deployed to production in June. `.vercel/project.json` pointed at the wrong one — if you run `vercel deploy --prod` against it, nothing reaches the live domain.

Push to `main` → `sue-angels-fc-b469` auto-deploys to www.suesangelsfc.co.uk. Preview URLs are protected by team SSO and need a signed-in Vercel session.

## Conventions
- British spelling. "League Ten / League Eight", never "Division".
- **No em dashes** in copy.
- Club email is **suesangelsfc@gmail.com**. `hello@suesangelsfc.co.uk` does not exist.
- No emoji. No colours outside the token set.
- **Use literal characters (`·`, `’`, `–`), not HTML entities**, in template strings. Named entities passed through `esc()` render literally as `&MIDDOT;` — this happened in 61 places. Literals are correct in both escaped and raw contexts.
- Sponsor logos are the partners' own marks: never recoloured or restyled. They sit on a white tile so their colours stay true.

## Things that have caused bugs
1. **Inlining the crest.** The traced path is ~26KB; inlining it put 80% of the homepage weight in repeated crest paths and one player page reached 909KB. It ships as one cached `<img>`.
2. **`assets/badge/sue-angels-crest-marks.svg` is an INVERTED mask** — a full-canvas rectangle with the crest subtracted via `evenodd`. Filling it paints the background and voids the crest. Use the raster crest.
3. **An SVG with no intrinsic size renders at 300×150.** Every inline icon carries `.ico`, which sizes it from the current text size.
4. **The badge registry maps to objects** `{ match, src, alt, aspect }`, not strings. Using the record as a `src` yields `[object Object]`.
5. **An opaque background on a stacking-context element paints over a negatively-stacked child.** The hero layers with positive `z-index` instead.
6. **Redefining a colour token on a container does not change inherited text colour** — descendants inherit the already-computed value. Re-declare `color` too.
7. **Hiding content by default in CSS.** Anything revealed by JS must be scoped to `html.js`, or a script failure blanks the page.
8. **Wrong Vercel project** — see Deployment above.
9. **Footer headings.** They are `h2`; as `h3` they created an `h1 → h3` jump on any page whose main content had no `h2`.

## Outstanding / known limitations
- **Migration 002 has not been run**, and the platform's write authorisation depends on it. Until an `admin_users` row exists, the control panel is read-only for everyone. This is fail-closed and safe, but it does mean the panel cannot write yet.
- **`fixtures` and `team_badges` are empty (0 rows).** The homepage next-match card shows "to be confirmed" and the fixtures page shows an empty state. Upcoming fixtures come from the code baseline until rows exist.
- **A probe row exists in production `enquiries`** (`name = __probe_delete_me`), created while auditing RLS. Anonymous clients cannot delete it; remove it from Control panel → Inbox once signed in.
- **One cup tie has no stored shootout result** (`r20260412-kew-ccup`, Kew Antigua 2-2). It is shown as penalty-decided with no winner claimed rather than inventing one.
- **Stripe donations** are built but paused pending a Payment Link in Control panel → Donations.
- **No photograph of Susan Anne Martin exists in the repo.** The cause page opens on the crest. If the family can clear a photo it belongs there.
- **Appearances count starts only.** Sunday-league match returns do not record minutes or substitute appearances, so neither is shown rather than estimated.
- Videos page links out to YouTube; per-video embedding awaits catalogued rows.
