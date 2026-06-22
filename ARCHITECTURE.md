# ARCHITECTURE — Sue's Angels FC

Developer handover reference for the codebase. Read alongside `CLAUDE.md` (which is
the rules-of-engagement). This file explains *how the site is wired* so a new
developer can be productive quickly.

## 1. The one-paragraph summary
A static, per-page HTML site. There is **no bundler and no build step** — files
deploy exactly as they sit in the repo. The public app is one big React component
tree authored as hand-written `React.createElement` calls inside **`SiteApp.js`**
(loaded via UMD React from local files). Content is read from **Supabase** through a
thin wrapper (`dataStore.js`) with a `localStorage` cache, and edited through an
in-browser CMS (`admin.html`). Hosting is **Vercel**; deploy = `git push` to `main`.

## 2. Request lifecycle (what loads, in order)
Every public `*.html` page loads, in `<head>`/end-of-`<body>`:
1. Inline theme bootstrap (reads `localStorage('sa-theme')`, sets `data-theme`).
2. `app.css?v=N` — the single stylesheet (design tokens + every component).
3. A CSS-only **boot screen** (`#sa-boot`, a pulsing crest) shown instantly, faded
   out once the app renders.
4. Core scripts, all `defer` (so they download in parallel, execute in order):
   `react` → `react-dom` (local UMD) → `supabase-config` → `supabase` →
   `dataStore` → `Nav` → `PageShell` → `AdminMode` → `PlayerPhotos` → `MediaStore`
   → `FixtureEntry` → **`SiteApp.js`**.
5. Deferred effect scripts: `chart-anim`, `hero-rotator`, `fx` (incl. the
   `[data-tilt]` pointer-tilt engine), `gallery-fx`, `player-fx`, `analytics`,
   `consent`.
`SiteApp.js` renders the whole app into `#rd-root`. Focused entry pages set
`window.SA_TAB` (inline, before the deferred app runs) to pick a sub-tab — e.g.
`results.html` sets it to `results`.

## 3. Source-of-truth files
| File | Role |
|---|---|
| `SiteApp.js` | **The whole public app.** Every page component + `SiteHeader`, `SiteFooter`, `BackToTop`, and the filename→component router. **Edit this**, not `SiteApp.jsx` (the JSX has drifted and is NOT authoritative). |
| `app.css` | Single public stylesheet. Tokens in `:root` (`--m-*`). Late "mobile hardening" `@media` section near the end **overrides earlier blocks** (CSS later-wins) — put mobile overrides there or after it. |
| `PageShell.js` | Static defaults/data: `SQUAD`, `COACHES`, `SA_DEFAULT_RECOGNITION` (awards), `SA_DEFAULT_ARTICLES`, pre-season `getNextSession`, badge registry helpers. |
| `dataStore.js` | Supabase wrapper + localStorage cache. Exposes `window.*` getters/setters (see CLAUDE.md for the full list). Optimistic cloud writes; rolls back if Supabase is unreachable (preview mode). |
| `admin.html` + `*.jsx` | The CMS. Intentionally on the **legacy** stack: `site.css` + Babel-standalone in-browser transpile of `AdminPanel.jsx`/`Nav.jsx`/etc. **Do not `.vercelignore` or delete the `.jsx` files** — the CMS loads them at runtime. |

## 4. Data flow
- Reads: components call `window.getDerivedResults()`, `derivedSquad()`,
  `derivedPlayerStats()`, `getCustomArticles()`, `getRecognition()`, etc.
- Writes (CMS): setters in `dataStore.js` push to Supabase and update the cache.
- Live updates: cross-tab DOM events (`sa-articles-changed`, `sa-media-changed`,
  `sa-roster-changed`) — components listen and re-render.
- Badges: `PageShell.js` defines `BADGE_REGISTRY` + `window.resolveBadge(name)` +
  `window.TeamBadge` (fuzzy club-name → crest).

## 5. Styling system
- Tokens: volt accent `--m-volt: #D6F23A`, navy base, `--m-display` (Clash Display),
  `--m-sans` (Hanken Grotesk), `--m-radius`, glass surfaces (`--m-glass-1/2/3`),
  win/draw/loss colours. Light/dark via `html[data-theme]`, persisted to
  `localStorage('sa-theme')`.
- **Fluid scaling**: `html { font-size: clamp(...) }` drives rem-based sizing so the
  UI grows on large screens and shrinks on phones. Container `--m-max` widens on
  ultrawide. See `[[mobile-css-architecture]]` notes in CLAUDE.md.
- Responsive grids use `repeat(auto-fill, minmax(min(100%, Npx), 1fr))` to guarantee
  no horizontal overflow. `html, body { overflow-x: hidden }` is the page-drag guard.

## 6. Cache-busting (critical, has caused bugs)
Assets are referenced with `?v=N`. **When you change `app.css` or any `*.js`, bump
its `?v=` on every HTML file** (they must all match) or the CDN/SW serves stale.
The service worker (`sw.js`) is network-first for HTML and stale-while-revalidate
for versioned assets, so new `?v=` = new URL = fresh fetch.

## 7. How to… (common tasks)
- **Add a page**: create `foo.html` (copy an existing page's `<head>` + script
  block), add a `Foo` component in `SiteApp.js`, wire it into the router by filename,
  add SEO (canonical, description, JSON-LD), and link it in `Nav`/footer + `sitemap.xml`.
- **Change content** (squad, results, articles, awards): use `admin.html` (cloud
  data), not code. Code only holds the *defaults* in `PageShell.js`.
- **Edit the design**: change tokens/components in `app.css`, bump `?v=` everywhere.

## 8. Deploy & security
- Deploy: push to `main` → Vercel auto-builds (Root = repo root, Framework = Other,
  no build command). Hard-refresh / private window to dodge cache after deploy.
- Headers (`vercel.json`): HSTS, X-Content-Type-Options, X-Frame-Options,
  Referrer-Policy, Permissions-Policy, and a **Content-Security-Policy** (allowlisted
  for the CDNs/Supabase the site uses; `'unsafe-inline'/'unsafe-eval'` are required
  because of inline boot/theme scripts and the admin Babel transpile). Supabase
  access is constrained by **RLS** (`schema.sql`); the `api/*` serverless functions
  lock CORS.

## 9. Known limitations (the maintainability ceiling)
- `SiteApp.js` is one large hand-written `createElement` file. It works and ships,
  but the highest-leverage future upgrade is migrating to a real component/build
  setup (Vite + JSX) so the file can be split and type-checked. Until then: keep
  edits small, match the surrounding `h = React.createElement` idiom, and never
  assume `SiteApp.jsx` reflects production.
