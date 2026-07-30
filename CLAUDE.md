# CLAUDE.md — Sue's Angels FC website

Project instructions for Claude Code. Read this first; it is the source of truth for how this site is built, how to change it safely, and how to deploy.

> **July 2026: the public site was replaced.** The orange/black rebuild that lived in `redesign/` is now the site, at the repo root. The retired React app is archived in `legacy/` and design experiments in `prototypes/`; both are excluded from deploys by `.vercelignore`. Tag `pre-rebuild-checkpoint` marks the last commit before the promotion.

## What this is
A static marketing + club-data website for **Sue's Angels FC** (a London men's Sunday-league football club, founded 2025 in memory of Susan Anne Martin, playing for sepsis awareness). Live at **suesangelsfc.co.uk**, hosted on **Vercel**, source on **GitHub** (`sueangelsfc/sue-angels-fc`, production branch `main`). **No bundler, no framework, no build step** — files deploy exactly as they sit in the repo.

## Runtime architecture (read before editing)
- **Per-page HTML, no framework on the public site.** One `.html` file per route: `index, about, sepsis, champions, awards, sponsors, squad, stats, coaches, schedule, results, league, records, live, news, gallery, videos, join, contact` (+ `404`). Each page loads, in order: self-hosted fonts (`fonts/`) → `styles.css` → `supabase-config.js` → `data.js` → `PageShell.js` → `match-context.js` → `live.js` → `main.js`.
- **The baked HTML is the content.** Every page ships real, readable markup; `live.js` then hydrates any `[data-live]` region from Supabase. That means the site works with JavaScript blocked — keep it that way. Scroll-reveal hiding is scoped to `html.js` (a class set by an inline head script) precisely so a script failure can never blank a section.
- **`styles.css`** is the whole public stylesheet, **`main.js`** the whole interaction layer, **`data.js`** the data layer.
- **`control.html` is the control panel** (the admin route). It mounts `control-shell.jsx` — sidebar, dashboard, ⌘K palette, auth gate — and hosts the editor components from `AdminPanel.jsx`. It loads React from the **local production** bundles (`react.18.3.1.min.js`) plus Babel standalone from CDN for the 11 runtime `.jsx` editors.
- **`admin.html` is the older CMS**, kept working on the legacy stack (`site.css` + `AdminPanel.jsx`). `/admin` redirects to the new control panel; `/admin.html` still reaches the legacy one.
- **Both admin surfaces share the same 11 `.jsx` editors.** Don't delete or `.vercelignore` them.

## Data layer (`dataStore.js`)
- A thin wrapper over **Supabase** (config in `supabase-config.js` / `supabase.js`) with a localStorage cache, exposing `window.*` getters/setters. Cloud writes are optimistic; with no Supabase reachable they roll back (preview mode).
- Key globals: `getDerivedResults()`, `derivedSquad(compMatcher, season)`, `derivedPlayerStats(num, matcher, season)`, `seasonOf(result)`, `getPlayerStatus()/setPlayerStatus()`, `getSeason2627()/setConfirmed2627()`, `getCustomArticles()/saveCustomArticle()/deleteCustomArticle()`, `getCoachData()/setCoachData()`, `getCustomCoaches()/saveCustomCoaches()`, `getArticleCover()/setArticleCover()`, `getPostCover()/setPostCover()`, `getCoverBadges()/saveCoverBadges()`, `getHeroImages()/setHeroImages()`, `getGalleryCats()/addGalleryCat()`, `getClubVideos()/saveClubVideos()`, `getDonateConfig()/setDonateConfig()`, `removeBadgeBg(dataUrl)`.
- `GalleryStore` (`MediaStore.jsx`/`GalleryAlbums.jsx`) holds matchday photo albums: `{ id, title, photos[], cover, category, homeBadge, awayBadge, photographer, photoTags[] }`.
- **Club badges:** `PageShell.js` defines `BADGE_REGISTRY` + `window.resolveBadge(name)` + `window.KNOWN_CLUBS`. `window.TeamBadge` renders a club's crest by fuzzy name match.
- Cross-tab/live updates fire DOM events: `sa-articles-changed`, `sa-media-changed`, `sa-roster-changed`. Components listen and re-render.

## Styling — the 26/27 orange-and-black identity
- **`styles.css`** is the single public stylesheet. Tokens live in `:root`:
  - `--volt: #FF6A2A` — the brand orange, and the **only** accent. `--volt-rgb` for `rgba()`. `--volt-2` hover, `--volt-hi` highlight, `--volt-text` the AA-safe orange for text on light.
  - `--navy-deep: #090B0D` main canvas, `--navy: #171A1E` elevated surface, `--fg: #F7F5F2` warm off-white, `--ink-2/--ink-3` secondary/tertiary greys.
  - `--display: 'Archivo'` (variable weight + width), `--body/--ui: 'Geist'`. Self-hosted in `fonts/`.
- **Orange is the only accent.** Do not introduce a second hue. Win/draw/loss, league position, campaign stats and status all express difference through weight, size and structure, not new colours — several off-palette greens, cyans, golds and blues were removed for exactly this reason.
- **The old lime `#D6F23A` identity is gone** from every shipped file. If it reappears anywhere outside `legacy/`, that's a regression.
- Cache-busting: every page links `styles.css?v=N` and `main.js?v=N`. **Use `./scripts/bump.sh <asset>`** — never hand-edit the versions, and they must match on all pages.
- Dark-only for now: `.tsw` (the theme toggle) is `display:none` and the light-theme CSS is kept dormant for an easy re-enable. If you re-enable it, `--volt` as *text* fails AA on white — use `--volt-text` instead.
- Responsive grids use `repeat(auto-fill, minmax(min(100%, Npx), 1fr))` to guarantee no horizontal overflow. Keep that pattern for any new grid.
- Badge: `assets/badge/sue-angels-badge-star.webp` is a **512×634 portrait shield**. Opponent crests are square, so in a square box the club's own mark letterboxes smaller than theirs — the `[src*="sue-angels"]` scale rule near the end of `styles.css` corrects the optical mass. Never stretch it to square.

## Conventions
- Plain HTML + vanilla JS on the public site; hand-written `React.createElement` only inside the admin `.jsx` files.
- Copy tone: confident, British spelling, "League Ten / League Eight" (NOT "Division"). No em dashes.
- Club email is **suesangelsfc@gmail.com**. `hello@suesangelsfc.co.uk` was a placeholder and does not exist.
- Auto-generated post/cover art: `maGenCover(spec)` renders the badge/scorecard covers used across Media, gallery (matchday), and videos.
- No emoji unless already part of the brand. No new colors outside the token set.

## How to run / preview
`npx serve` from the site root (or any static server). No install, no build. Opening a file directly with `file://` mostly works but the `/api/*` functions won't, so form submits will show their error state locally.

## How to deploy
Push to `main` → Vercel auto-deploys (project `sue-angels-fc`, Root Directory = repo root, Framework = "Other", no build command). `vercel --yes` makes a preview; `vercel deploy --prod` promotes. Team-level SSO protects preview URLs, so they need a signed-in Vercel session. After deploy, hard-refresh or use a private window.

## Enquiries and forms (how a lead actually reaches the club)
`main.js` binds two form types:
- `form.ft2__form` (footer newsletter) → `/api/subscribe` (MailerLite) **and** the `supporters` table.
- `form[data-enquiry]` (contact, join, sponsorship) → the `enquiries` table via `saAddEnquiry()` **and** `/api/notify-enquiry` (email alert). It succeeds if **either** lands.

That double write matters: the email endpoint is a graceful no-op until `RESEND_API_KEY` is set, so if it were the only destination nothing would be recorded — which is exactly the bug that left `enquiries` empty. Read the leads in **Control panel → Inbox**; RLS blocks anonymous reads, so signing in is the only way to see them.

Add `data-enquiry-type` for the label stored on the row, `data-enquiry-ok` for the success message, and `data-enquiry-requires-message` to make the message field mandatory.

## Project tooling (USE THESE — they encode the recurring footguns)
- **`./scripts/bump.sh <asset>`** — cache-bust an asset across every page atomically (`--list` shows current versions). Never hand-run sed for `?v=` bumps.
- **`./scripts/drift-check.sh`** — verifies `PageShell.js` (public) and `PageShell.jsx` (admin) agree on COACHES / SQUAD / BADGE_REGISTRY. The two files are separate sources of truth and HAVE drifted (hid a coach in the admin; showed a coach as a player). Any edit to shared data must go in BOTH files.
- **`./scripts/ship.sh "msg"`** — full deploy: syntax checks → drift check → commit → push → polls the live site until asset versions match local.
- **Pre-push hook** (`git config core.hooksPath scripts/hooks`, already set) blocks pushes with js/jsx drift or mixed `?v=` versions.
- **Skills** (`.claude/skills/`): `responsive-sweep` (overflow audit of all pages at 320/375/768 after any CSS change), `badge-pipeline` (process any crest image → transparent, named, sized, both formats, registry aspect, deployed).

## Things that have caused bugs (avoid repeating)
1. **Stale cache** — always `./scripts/bump.sh` the asset you changed; versions must match on all pages.
2. **Only 11 `.jsx` files are live** (the ones `control.html` and `admin.html` load via Babel). Don't re-add per-page `.jsx` component files — that whole class was removed.
3. **Wrong Vercel Root Directory** — must point at the folder containing `index.html`.
4. **Horizontal overflow on mobile** — never let a grid column exceed `100%`; use the `min(100%, …)` minmax pattern; let long team names ellipsis (`min-width:0` on flex children).
5. **Shared shell markup is copy-pasted into all 20 pages** (header, mobile nav, footer). It has drifted before — three different brand-link `aria-label`s, two different mobile CTA labels. When you change the shell, change it in **every** page, or better, factor it into `PageShell.js`.
6. **Hiding content by default in CSS.** Anything that starts hidden and is revealed by JS must be scoped to `html.js`, or a script failure blanks the page.
7. **Only two destinations count as "saved"** — a form that just POSTs to `/api/*` records nothing when the key isn't set. Always write to Supabase too.
8. **`enquiries` and `supporters` are anon-INSERT / no-anon-SELECT.** A `200 []` from an anonymous read is the policy working, not an empty table.

## Outstanding / known follow-ups
- **Stripe donations** are built but paused: the donate buttons read "Donations opening soon" until a Stripe Payment Link is pasted in **Control panel → Donations** (`getDonateConfig`). No keys live in the repo by design.
- **`migrations/001_enquiry_status.sql` has not been run.** It adds optional `status` + `notes` to `enquiries` for lead tracking. The Inbox feature-detects the columns and works fully without it.
- **The `fixtures` and `team_badges` tables are empty** (0 rows). Upcoming fixtures currently come from the code baseline in `PageShell.js`; the CMS overrides it once rows exist.
- **No photograph of Susan Anne Martin exists in the repo.** The cause page currently opens on the crest. If the family can clear a photo it belongs there — the club's whole premise is her memory.
- **Babel standalone still transpiles 11 `.jsx` editors in the browser** on the admin routes. Precompiling them to `.js` at commit time would remove the last CDN dependency and a client-side compile.
- Some content (a stray gallery album, an old article) is **cloud data**, deletable in the control panel, not in code.

## Design system notes (from the July 2026 six-specialist review)
Findings that were **deliberately not** applied, so they don't get "fixed" by mistake:
- `.hx__navgrp:focus-within .hx__dd` **stays**. It is what lets a keyboard user open a nav dropdown by tabbing. The Escape-doesn't-close bug it caused is handled in `main.js` by moving focus back to the trigger first.
- The dormant light theme is **kept**, not deleted, for an easy re-enable.

Known debt the review surfaced and is still open: ~141 distinct font-size values with no scale tokens; 31 distinct border-radius values against 3 tokens; `control.css` re-declaring brand literals that `styles.css` already tokenises (including `--cp-o-ink: #C2400B` vs `--volt-text: #C2410C`, one digit apart); ~213 lines of dead CSS for retired components; `.sec--pagehero` defined four times.
