# CLAUDE.md — Sue's Angels FC website

Project instructions for Claude Code. Read this first; it is the source of truth for how this site is built, how to change it safely, and how to deploy.

## What this is
A static marketing + club-data website for **Sue's Angels FC** (a London Sunday-league football club). Live at **suesangelsfc.co.uk**, hosted on **Vercel**, source on **GitHub** (`sueangelsfc/sue-angels-fc`). Plain HTML + React-via-CDN. **No bundler, no framework, no build step** — files deploy exactly as they sit in the repo.

## Runtime architecture (read before editing)
- **Per-page HTML.** One `.html` file per route: `index, about, champions, teams, schedule, results, fixtures, table, media, news, gallery, sponsors, contact, join` (+ `404`, `admin`). Each public page loads, in order: Google/Fontshare fonts → `app.css` → React 18 + ReactDOM (UMD, pinned) → the data/util scripts → `SiteApp.js`, then renders into `#rd-root`.
- **`SiteApp.js` is the whole public app.** It contains every page component plus `SiteHeader`, `SiteFooter`, `BackToTop`, and a router that picks the component by URL filename. Focused entry pages set `window.SA_TAB` before mount (e.g. `results.html` sets the Schedule page's active tab to `results`).
- **Source vs build:** `SiteApp.jsx` is the JSX **source**; `SiteApp.js` is the **compiled** output (Babel `preset-react`, `runtime: classic`, so it keeps using the global `React`). **The site loads `SiteApp.js`, NOT the jsx.** In practice this project has been edited by hand-writing `React.createElement(...)` directly in `SiteApp.js` (the `.jsx` has drifted and is NOT authoritative). **Always edit `SiteApp.js`.** If you prefer to work in JSX, re-sync `SiteApp.jsx` → recompile → overwrite `SiteApp.js`, but verify nothing regresses.
- **`admin.html` is the CMS.** It is intentionally on the **legacy** stack: `site.css` + `AdminPanel.jsx` (transpiled in-browser by Babel standalone). It drives all live content. Don't break it.

## Data layer (`dataStore.js`)
- A thin wrapper over **Supabase** (config in `supabase-config.js` / `supabase.js`) with a localStorage cache, exposing `window.*` getters/setters. Cloud writes are optimistic; with no Supabase reachable they roll back (preview mode).
- Key globals: `getDerivedResults()`, `derivedSquad(compMatcher, season)`, `derivedPlayerStats(num, matcher, season)`, `seasonOf(result)`, `getPlayerStatus()/setPlayerStatus()`, `getSeason2627()/setConfirmed2627()`, `getCustomArticles()/saveCustomArticle()/deleteCustomArticle()`, `getCoachData()/setCoachData()`, `getCustomCoaches()/saveCustomCoaches()`, `getArticleCover()/setArticleCover()`, `getPostCover()/setPostCover()`, `getCoverBadges()/saveCoverBadges()`, `getHeroImages()/setHeroImages()`, `getGalleryCats()/addGalleryCat()`, `getClubVideos()/saveClubVideos()`, `getDonateConfig()/setDonateConfig()`, `removeBadgeBg(dataUrl)`.
- `GalleryStore` (`MediaStore.jsx`/`GalleryAlbums.jsx`) holds matchday photo albums: `{ id, title, photos[], cover, category, homeBadge, awayBadge, photographer, photoTags[] }`.
- **Club badges:** `PageShell.js` defines `BADGE_REGISTRY` + `window.resolveBadge(name)` + `window.KNOWN_CLUBS`. `window.TeamBadge` renders a club's crest by fuzzy name match.
- Cross-tab/live updates fire DOM events: `sa-articles-changed`, `sa-media-changed`, `sa-roster-changed`. Components listen and re-render.

## Styling
- **`app.css`** is the single public stylesheet. Design tokens live in `:root` (search `--m-`): volt accent `#D6F23A` (`--m-volt`), display font `--m-display` (Clash Display), `--m-radius: 26px`, win/draw/loss colors, glass surfaces, etc.
- Cache-busting: every page links `app.css?v=N`. **When you change `app.css`, bump `N` on every HTML file** (they must all match) or the CDN/browser serves stale CSS — this has bitten the project before. Current version: `v=21`.
- Light + dark themes via `html[data-theme="light|dark"]`; the toggle persists to `localStorage('sa-theme')`.
- Mobile: there is a deliberate "mobile hardening" section near the end of `app.css` (`@media (max-width: 760/600/430)`). Responsive grids use the `repeat(auto-fill, minmax(min(100%, Npx), 1fr))` pattern to guarantee no horizontal overflow. Keep that pattern for any new card grid.

## Conventions
- Hand-written `React.createElement` in `SiteApp.js`. Keep style: small helper components, `h = React.createElement` aliases inside functions, BEM-ish `mp-`, `mh-`, `m-`, `ts-`, `ma-` class prefixes.
- Copy tone: confident, uppercase display headings, British spelling, "League Ten / League Eight" (NOT "Division").
- Auto-generated post/cover art: `maGenCover(spec)` renders the badge/scorecard covers used across Media, gallery (matchday), and videos.
- No emoji unless already part of the brand. No new colors outside the token set.

## How to run / preview
Open any `.html` directly in a browser (it pulls React + Supabase from CDNs). For a local server: `npx serve` (or any static server) from the site root. No install/build.

## How to deploy
Push to the GitHub repo → Vercel auto-deploys (project Root Directory = repo root, Framework = "Other", no build command). After deploy, hard-refresh / open in a private window to dodge the CDN/browser cache. `vercel.json` is included.

## Project tooling (USE THESE — they encode the recurring footguns)
- **`./scripts/bump.sh <asset>`** — cache-bust an asset across every page atomically (`--list` shows current versions). Never hand-run sed for `?v=` bumps.
- **`./scripts/drift-check.sh`** — verifies `PageShell.js` (public) and `PageShell.jsx` (admin) agree on COACHES / SQUAD / BADGE_REGISTRY. The two files are separate sources of truth and HAVE drifted (hid a coach in the admin; showed a coach as a player). Any edit to shared data must go in BOTH files.
- **`./scripts/ship.sh "msg"`** — full deploy: syntax checks → drift check → commit → push → polls the live site until asset versions match local.
- **Pre-push hook** (`git config core.hooksPath scripts/hooks`, already set) blocks pushes with js/jsx drift or mixed `?v=` versions.
- **Skills** (`.claude/skills/`): `responsive-sweep` (overflow audit of all pages at 320/375/768 after any CSS change), `badge-pipeline` (process any crest image → transparent, named, sized, both formats, registry aspect, deployed).

## Things that have caused bugs (avoid repeating)
1. **Stale cache** — always bump `app.css?v=` AND any `*.js?v=` across all HTML when editing those assets.
2. **Editing `SiteApp.jsx` expecting it to ship** — it doesn't; `SiteApp.js` is what loads.
3. **Wrong Vercel Root Directory** — must point at the folder containing `index.html`.
4. **Horizontal overflow on mobile** — never let a grid column exceed `100%`; use the `min(100%, …)` minmax pattern; let long team names ellipsis (`min-width:0` on flex children).

## Outstanding / known follow-ups
- **Stripe donations** are built but paused: the donate buttons read "Donations opening soon" until a Stripe Payment Link is pasted in **Admin → Donations** (`getDonateConfig`). No keys live in the repo by design.
- Some content (a stray gallery album, an old article) is **cloud data**, deletable in the CMS (`admin.html`), not in code.
