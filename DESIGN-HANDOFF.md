# Sue's Angels FC — Design Handoff

You're picking up a **finished, deployable** website for Sue's Angels FC, a London Sunday-league club (League Ten champions 25/26, unbeaten; founded in memory of Susan Anne Martin; supports sepsis awareness). The visual identity has been rebuilt from scratch on a new design system. This doc is everything you need to keep working on it.

---

## 1. Runtime & architecture (read first)
- **Static site.** Plain HTML + React via CDN. No bundler/framework. Deploys as-is (Vercel; `vercel.json` present).
- **Per-page HTML** — `index, about, champions, teams, schedule, fixtures, results, table, media, news, gallery, sponsors, contact, join` (+ `404`). Each page loads: fonts → `app.css` → React (production) → the data-layer scripts → **`SiteApp.js`**.
- **`SiteApp.js`** holds every page component + a `SiteHeader`, `SiteFooter`, `BackToTop`, and renders the correct page **by URL filename** into `#rd-root`. Focused entry pages set `window.SA_TAB` (e.g. `results.html` → Schedule on the Results tab).
- **Source vs build:** `SiteApp.jsx` is the source; `SiteApp.js` is compiled from it (Babel `preset-react`, `runtime: classic`, so it keeps using the global `React` — no bundler). Same for the data-layer `*.jsx`→`*.js`. **If you edit a `.jsx`, recompile it to `.js`** (`npx babel SiteApp.jsx -o SiteApp.js`) — the HTML loads the `.js`.
- **`admin.html` is the CMS and is UNTOUCHED** — it still uses the legacy `site.css` + `AdminPanel.jsx`. Don't break it; it drives the public content.

## 2. REUSE — never recreate or fabricate
The entire data layer is real and must be kept: `PageShell.jsx` (seed data + `derivedPlayerStats` + `TeamBadge` + `getDerivedResults` + `RAW_TABLE` + `COMPETITIONS` + `ALL_SEASONS` + `getActiveUpcoming/getNextSession` + `COACHES`), `dataStore.js`, `supabase*.js`, `FixtureEntry.jsx` (`getActiveUpcoming`, `getFixtureDate`), `MediaStore.jsx` (`GalleryStore`, `galleryCover`), `PlayerPhotos.jsx` (`getPlayerPhoto`), and everything in `assets/`. **Real data only** — never invent stats. Stats not in the engine (minutes, xG, heatmaps) do not exist; don't add them.

## 3. Type system (locked)
- **Clash Display** — display, headlines, stat numbers. Weights 400/500/600/700. Loaded from Fontshare.
- **Hanken Grotesk** — body, UI, labels, tables. Weights 400–800. Loaded from Google Fonts. Use `font-variant-numeric: tabular-nums` on all stats.
- Tokens: `--m-display`, `--m-sans`. Headings/nav/buttons/chips/tagline/footer are **UPPERCASE** (via `text-transform`); body & lead stay sentence case for readability.

## 4. Colour, glass, motion
- **Anchors:** volt `#D6F23A` (accent — fills, rings, active states, key numbers) and navy `#071D29` (on-volt ink / deep base). Plus promotion orange `--m-orange-ink` (2nd place / other promoted club).
- **Volt-as-text rule:** volt **text** uses `--m-volt-ink` (bright volt in dark, deep navy `#0A1B27` in light) so it never turns muddy olive. Bright volt is for **fills** only. On always-dark surfaces (e.g. the Media score-cover) use bright `--m-volt` directly.
- **Light + dark** (dark is primary). Theme flips via `html[data-theme="light"]` token overrides; a no-flash `<script>` in each `<head>` sets it before paint; the toggle persists to `localStorage['sa-theme']`. **Every change must read well in both themes.**
- **Glass:** premium glassmorphism via tokens `--m-glass-1/2/3` (translucent fills), `--m-glass-edge` (hairline border), `--m-glass-hi` (inner top highlight), `--m-glass-shadow` (ambient depth). Real `backdrop-filter: blur()+saturate()`. There's a `prefers-reduced-transparency` fallback to solid panels.
- **Motion:** scroll-reveal (`.m-reveal` + IntersectionObserver), gentle hero parallax, count-up numbers, ring/bar fill-ins, subtle ambient drift (`.m-drift`). **transform/opacity only**, easing `--m-ease` `cubic-bezier(0.16,1,0.3,1)`, all gated behind `prefers-reduced-motion`.

## 5. Files that matter
| File | Role |
|---|---|
| `app.css` | The entire design system + all components (this is the working stylesheet; edit here) |
| `SiteApp.jsx` / `SiteApp.js` | All page components + shell. Edit `.jsx`, recompile to `.js` |
| `PageShell.jsx/.js`, `dataStore.js`, `supabase*.js`, `FixtureEntry.jsx/.js`, `MediaStore.jsx/.js`, `PlayerPhotos.jsx/.js` | Data layer — reuse, don't rewrite |
| `assets/` | Badges, sponsor logos, hero/player photos |
| `*.html` | Per-page entry points (boilerplate; vary only `<title>`/meta and `SA_TAB`) |
| `admin.html` + `AdminPanel.jsx` etc. | CMS — leave alone |

**CSS class prefixes:** `m-` core/shared, `mh-` home sections, `mp-` interior-page sections, `sa-` site shell (header/footer/skip-link/back-to-top/FAQ). Reuse these; don't invent a parallel system.

## 6. Pages & key components
- **Home** — cinematic photo hero (oversized title, route cards, next-match/session card with live countdown, 3 dashboard cards), **all-competition season ledger** (big win-rate ring + tiles, "The campaign"), recent-results rail, league-table preview, join band.
- **About** — story hero, mission quote, club records, 25/26 journey timeline, Sue's story + photo, club values.
- **Champions** — celebration hero + 4 rings + final league record + "what it took" insights + league-results rail.
- **Team** — sub-tabs: First team (position-grouped photo cards), Leaderboards (full table: `# PLAYER APPS G A G+A MOTM`, season + competition filters), Coaches, Team stats. **Tap a player → profile modal (the showpiece).**
- **Schedule** — sub-tabs: Results (competition filter, all comps), League table (full `# CLUB P W D L GF GA GD PTS`, **rank+club flush left**, promotion crumbs = volt for champions / orange for 2nd), Fixtures. **26/27 "League Eight" view shows the provisional opponent line-up with crests + a vacancy slot.**
- **Media** — News/reports (match-report cards with a **full-time score-cover: home crest · score · away crest · competition**) + Gallery (lightbox).
- **Sponsors** — partners (detail modal) + "what you get" + donate.
- **Contact / Join** — route picker + form (inline success, no `alert`) + FAQ (Join).
- **Shell** — floating glass header (links, active state, theme toggle, Join CTA, **mobile hamburger drawer; burger+toggle right-aligned**), skip-to-content link, glass footer (caps), **back-to-top button** (glass, appears on scroll).

### The showpiece: player profile modal
Dense, real analytics from `derivedPlayerStats`, **GK-aware**:
- Outfield: Apps/Goals/Assists/G+A/MOTM/Cards · rings (G+A per game, win rate, availability, MOTM rate) · goal breakdown bars · "Season impact" (share of club goals, goalscoring/assist/MOTM rank) · cumulative G+A sparkline · position pitch · per-competition splits · last-10.
- Goalkeepers: Clean sheets/Conceded/Pens saved instead · rings (clean-sheet %, conceded/game, win rate, availability) · defensive-record bars · clean-sheet rate/rank · cumulative clean sheets · last-10 conceded.

## 7. Hard rules (keep to these)
1. Real data only — never fabricate or invent metrics.
2. Works in **light and dark**, both readable; volt text → `--m-volt-ink`.
3. **No em dashes ("—") in copy** — use commas/periods. British English.
4. Motion is transform/opacity only and reduced-motion gated.
5. Reuse the data layer + `assets/`; don't touch `admin.html`/CMS.
6. Edit `.jsx`, then recompile to `.js`.

## 8. Status
**Done & deployable:** full multi-page site, both themes, interactions (modals, filters, forms, drawer, lightbox), production React + precompiled JS, copy pass, SEO (sitemap/robots/JSON-LD), a11y (skip-link, ARIA), 404, GA hook, back-to-top.

**Optional / needs input (not blocking deploy):**
- Add real squad photos to `assets/squad/` (`lineup.jpg`, `coach.jpg`, `teamtalk.jpg`, `warmup.jpg`) and wire into heroes/cards.
- Wire Contact/Join forms to a real endpoint (Formspree or a Supabase `enquiries` table) — currently client-side success only.
- Optional perf: self-host fonts, responsive WebP images, bundle/minify the JS, or port to Next.js.

## 9. Deploy
Static. Push the folder to Vercel/Netlify. Ensure `supabase-config.js` has production keys. `admin.html` is the CMS.
