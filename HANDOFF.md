# Handoff: Sue's Angels FC — Website (v2 redesign)

## Overview
A complete website for Sue's Angels FC, a London Sunday-league football club (League Ten champions, 25/26, unbeaten). Founded in memory of Susan Anne Martin and supporting sepsis awareness. The site covers: home, about, champions, team (with player analytics dashboards), schedule (fixtures/results/table), media (news/gallery), sponsors, contact, join, and a password-gated author/CMS control panel.

## About the design files
These files are a **working prototype**, not a design mock — built as static HTML + in-browser React (Babel standalone) with a live data layer. They run as-is when served, and are currently deployed via Vercel with a Supabase backend. They are provided as a **reference implementation**: the intended look, behaviour, content and data model. To take this into a production codebase, **recreate these screens in the target framework** (Next.js/React recommended since the components are already React) using its established patterns, build tooling and component library — rather than shipping the in-browser-Babel HTML to production.

## Fidelity
**High-fidelity.** Final colours, typography, spacing, motion and interactions are all set. Recreate pixel-faithfully. Real club data is wired throughout.

## Architecture (current prototype)
- **Pages**: one `.html` per route (`index, about, champions, teams, schedule, fixtures, results, table, media, news, gallery, sponsors, contact, join, admin`). Each loads React 18 + ReactDOM + Babel standalone (pinned), then shared scripts, then the page's `*Redesign.jsx`, rendering into `#rd-root`.
- **Shared shell**: `RedesignShell.jsx` exports to `window`: `RDHeader` (floating capsule nav, badge-only, cursor-trailing volt glow, uppercase links, language picker, mobile drawer, floating admin bar when logged in), `RDFooter` (faded wordmark watermark), `RDPageHero` (interior hero banner with scroll-fade heading), `Reveal` (IntersectionObserver scroll-reveal), `RDArrow`, `rdLeagueTotals`, `RDPage`.
- **Design system**: `colors_and_type.css` (tokens) + `redesign.css` (the v2 layer; all classes namespaced `rd-`). Legacy `site.css` is only loaded on `admin.html` for the embedded match-data editor.
- **Data layer**: `dataStore.js` abstracts read/write over Supabase (`supabase-config.js`, `supabase.js`) with a localStorage fallback. `PageShell.jsx` holds the static seed data (squad, coaches, results, fixtures, league table, season info, competitions) and all derived-stats logic.
- **Stats engine**: `window.derivedPlayerStats(num, compMatcher, seasonKey)` and `derivedSquad*` compute every player/team stat live from saved match entries — so entering match data automatically updates dashboards, leaderboards and records.

## Screens / views
- **Home** (`index.html` → `HomeRedesign.jsx`): hero (live next-match/session countdown over faded badge, scroll-fade heading, count-up stat row), season dashboard (stat tiles + win-rate ring, all count-up), recent results rail, league-table preview, squad carousel, partners, gallery mosaic, club story + sepsis band, join CTA.
- **About** (`AboutRedesign.jsx`): mission quote, club records, journey carousel, Sue's story, sepsis awareness, values.
- **Champions** (`ChampionsRedesign.jsx`): celebration badge hero, full season stats + win ring, league results, up-next.
- **Team** (`TeamsRedesign.jsx`): tabs — First team (position-grouped cards), Leaderboards, Coaches, Team stats. Tapping a player opens a **dashboard modal**: KPI tiles, performance **radar chart**, win-rate ring, breakdown bars, match log, bio + photo gallery. Season + competition filters.
- **Schedule** (`ScheduleRedesign.jsx`): Fixtures / Results (competition filter) / League table (25/26 + 26/27 draft). `fixtures/results/table.html` are focused entry points to the same component.
- **Media** (`MediaRedesign.jsx`): News (human-authored articles only — match reports/previews from coach commentary + manual composer; **no AI generation**) and Gallery (cloud albums with lightbox). `news/gallery.html` are focused entry points.
- **Sponsors** (`SponsorsRedesign.jsx`): partner cards + detail modals, benefits, enquiry.
- **Contact** (`ContactRedesign.jsx`), **Join** (`JoinRedesign.jsx`): routed forms + FAQ.
- **Admin / CMS** (`admin.html` → `AdminPanel.jsx`): Supabase-auth-gated dashboard with sections — Match data (`MatchEntry.jsx`), Fixtures (`FixtureEntry.jsx`), Articles, Gallery (`GalleryAlbums.jsx`), Squad photos (main + gallery per player), Coaches (photo + bio), Sponsors.

## Design tokens
- **Primary font**: Geist (headlines, stats, nav, names, CTAs) — weights 500/600/700, letter-spacing −0.05em on display, −0.02em body.
- **Secondary font**: Manrope (body, long-form, tables) — 400/500/600.
- **Colours**: volt `#D6F23A` (accent; on-volt text always navy `#061A27`), navy `#071D29`, page bg `#03121C`, surface tints `rgba(255,255,255,0.035–0.06)`, white `#FFFFFF`. Result colours: win `#25E27B`, draw `#F2C744`, loss `#FF4D5E`.
- **Radius**: cards 24px, small 16px, inputs 12px, pills 9999px.
- **Type scale**: fluid `clamp()` — hero `clamp(3rem,8.5vw,8rem)`, h2 `clamp(2rem,4.4vw,4.2rem)`, body `clamp(0.95rem,1.2vw,1.18rem)`.
- **Motion**: ease `cubic-bezier(0.16,1,0.3,1)`; scroll-reveal + staggered card entrances; count-up numbers; hover lift + volt glow; cursor-trailing hero/header glow. All gated behind `prefers-reduced-motion`.

## Backend / data model (Supabase)
Tables (key/jsonb): `matches`, `fixtures`, `team_badges`, `player_photos`, `articles`, `gallery`. Player extra photos stored under `pg:<num>`; coach photo+bio under `coach:<id>` (both in `player_photos`). Admin = single Supabase auth user matched against `adminEmail` in `supabase-config.js`. RLS: public read, authenticated write. SQL in `../supabase/schema.sql`.

## Known pending feature
**Add/remove players & coaches from the backend.** Squad (`window.SQUAD`) and `window.COACHES` are currently hardcoded arrays in `PageShell.jsx`. To make them editable from the CMS, turn them into a data-driven roster: a `roster` store (like `gallery`), merge custom entries over the seed arrays via a `window.getSquad()/getCoaches()` accessor used everywhere `SQUAD`/`COACHES` are read, and add create/edit/delete UI in `AdminPanel.jsx`. This is the recommended first task in the new codebase.

## Files
All under `site/`. Page HTML + matching `*Redesign.jsx`; shared `RedesignShell.jsx`, `redesign.css`, `colors_and_type.css`; data/admin: `dataStore.js`, `PageShell.jsx`, `AdminMode.jsx`, `MatchEntry.jsx`, `FixtureEntry.jsx`, `PlayerPhotos.jsx`, `GalleryAlbums.jsx`, `MediaStore.jsx`, `Nav.jsx`, `supabase*.js`. Badges/photos in `site/assets/`.

---

## Session changelog (latest — read before continuing in Claude Code)

### v-next — FULL VISUAL REBUILD (new production design system) ⭐ CURRENT
The public site has been rebuilt on a brand-new design system. **Deployable as-is** (static).
- **Type**: Clash Display (display/headlines/stat numbers) + Hanken Grotesk (body/UI/tables, tabular figures). Loaded via Fontshare + Google Fonts `<link>`s in every page `<head>`.
- **CSS**: `app.css` is the new production stylesheet (namespaced `m-` / `mh-` / `mp-` / `sa-`). It is a copy of `mock.css` (the working source). Premium glassmorphism, volt `#D6F23A` + navy `#071D29`, light + dark (dark primary) via `html[data-theme]` + a no-flash init script in each page. Volt-as-text uses a theme-aware ink (deep navy in light) so it never muddies; volt stays a bright FILL. Motion (scroll-reveal, hero parallax, count-ups, ring/bar fills, ambient drift) is transform/opacity-only and `prefers-reduced-motion` gated.
- **App**: `SiteApp.jsx` defines ALL page components + a real `SiteHeader` (floating glass nav, links to `*.html`, active state, theme toggle, Join CTA) + `SiteFooter`, and renders the right page by URL filename into `#rd-root`. Player profile, sponsor, coach and gallery interactions are in-page modals; the **player profile is GK-aware** (keeper cards show clean sheets / conceded / pens saved, not goals).
- **Pages** (each its own HTML loading the data layer + `SiteApp.jsx`): `index`(home), `about`, `champions`, `teams`, `schedule`(+ `fixtures`/`results`/`table` set `window.SA_TAB`), `media`(+ `news`/`gallery`), `sponsors`, `contact`, `join`. Deep-link tabs via `SA_TAB`.
- **Data**: 100% reused — `PageShell.jsx`, `dataStore.js`, `supabase*.js`, `derivedPlayerStats`, `FixtureEntry.jsx`, `MediaStore.jsx`, all assets. Real data only. The season ledger on the home page counts **all competitions** (league + cups), not just the league.
- **CMS**: `admin.html` is UNCHANGED (still uses `site.css` + `AdminPanel.jsx`). The CMS continues to drive the public pages.
- **Deprecated but kept**: the old `*Redesign.jsx` files + `redesign.css` + `colors_and_type.css` are no longer loaded by the public pages (legacy reference only). Dev preview files (`mock.html`, `mockhome.html`, `mock-pages.html`, `Mock.jsx`, `MockHome.jsx`, `MockPages.jsx`, `mock.css`) can be deleted before deploy.
- **Pending**: drop the real squad photos into `assets/squad/` (`lineup/coach/teamtalk/warmup.jpg`) to enrich heroes/cards; News currently renders live result-based report cards until CMS articles exist.



### Theming — light + dark mode (NEW, site-wide)
- Dark is the default/primary. Light mode flips via `html[data-theme="light"]` overrides at the **bottom of `redesign.css`** ("LIGHT MODE" section).
- Toggle: `RDThemeToggle` in `RedesignShell.jsx` (in the header actions). Persists to `localStorage['sa-theme']`. A **no-flash init `<script>` is injected in every `*.html` `<head>`** (sets `data-theme` before paint).
- Token strategy: hardcoded `#fff` text and exact glass/line `rgba(255,255,255,…)` values were converted to tokens (`--fg-1`, `--rd-card`, `--rd-card-2`, `--rd-line`, `--rd-line-2`) so they auto-flip. Light values: bg `#EEF1F4`, card `rgba(255,255,255,.62/.82)`, ink `#081423`.
- **Volt readability rule:** `--rd-volt-ink` token = bright volt in dark, deep volt `#5C6B00` in light. All volt **text** uses `--rd-volt-ink`; volt **fills** (buttons, rings, bars) stay bright. In light mode, **primary buttons invert to navy bg + volt text** (`html[data-theme="light"] .rd-btn--volt`). Dark scrim labels over imagery are forced white in light.

### Home hero — rebuilt (`HomeRedesign.jsx` `RDHero` + `redesign.css` "HOME HERO v3")
- Full-bleed squad photo: `assets/hero-team.jpg` (dark) / `assets/hero-team-light.jpg` (light), swapped via `.rd-hero__img--dark/--light`. Photos optimised to ~2400px (~700KB).
- Photo runs to the very top under a **transparent header**: `body.rd-home .rd-header` is `position:fixed`; header is transparent at top (`.rd-header.is-clear`, toggled by a scroll listener in `RDHeader` at `scrollY<30`) and turns glass on scroll.
- Hero **fades into the next section** via `.rd-hero--photo::after` → `linear-gradient(to bottom, transparent, var(--rd-bg))` (works both themes).
- Content: eyebrow, big "SUE'S ANGELS FC" title, tagline, 3 glass route cards (`.rd-hroute` — renamed to avoid clash with the interior `.rd-route`), glass Next-match panel (`.rd-nm`, live data + countdown), 3 floating stat cards (`.rd-hcard`: Season record / League position / Club stats — all real), motto band. (The old "League Ten Champions" line was removed per request.)
- **Removed** the redundant "Season in numbers" section (`RDDash`) from the homepage — it duplicated the hero cards. `RDDash` function still defined but no longer rendered.

### Gallery (`GalleryAlbums.jsx` `AlbumLightbox` + `redesign.css` "ALBUM VIEWER")
- Opening an album now shows a **uniform-size horizontal carousel** (`.rd-album` / `.rd-album__rail` / `.rd-album__cell`, scroll-snap, swipe + arrows). Tapping a photo **enlarges** it in a fullscreen zoom layer (`.rd-zoom`, prev/next + keyboard). Replaced the old `.lightbox` markup (which was unstyled on public pages — `.lightbox` CSS lives only in admin-only `site.css`).

### Team / player (`TeamsRedesign.jsx`)
- Squad cards are **3D flip cards** (`.rd-player--flip`): front = photo + identity + headline stats; back = number, role, full stat grid, "View full profile" CTA. Flip button top-right; whole front opens the profile.
- Player **profile modal redesigned** (WHOOP/athlete-OS style, real data only — radar removed): hero + season-overview panel, 4 progress **rings** (`RDRing`), **match-impact bars** (`RDImpact`), **form last-10** (`RDForm`), **season insights**, cumulative **trend chart** (`RDTrend`), **position pitch** (`RDPitch`). Shared classes `.rd-rings/.rd-ring2/.rd-impact/.rd-form2/.rd-insights/.rd-pp2/.rd-pphero` in `redesign.css`.
- **Availability %** = appearances ÷ matches actually played, **excluding walkovers** (`teamMatches` filter in `RDPlayerProfile`).
- Player-card stat cells enlarged for readability (bigger numbers/labels, token bg + border).

### Champions (`ChampionsRedesign.jsx`) — rebuilt
- Glass dashboard: 4 rings (Win rate / Points won / Goals-per-game / Clean sheets) + "Final league record" cells (`.rd-champ-record`) + "What it took" insight cards + league-results rail + promoted band. Reuses the profile's ring/insight classes.

### NOT yet re-laid-out (still on original layouts; theme-aware + glass, but no fresh dashboard pass)
- **Schedule, About, Sponsors, Contact, Join** — these run on the same `rd-` design system and work in both themes, but they were **not** rebuilt into the new hero/dashboard aesthetic. **This is the recommended next task.** Each already has a matching `*Redesign.jsx`. Suggested elevations: glass stat/insight treatments (reuse `.rd-rings/.rd-ring2/.rd-insights/.rd-hcard`), stronger editorial hierarchy, trim any redundant copy. Keep them honest (real data only) and avoid over-adding content.

### Notes for production recreation
- Keep hero/theme images ~2400px wide (~700KB) for performance.
- This remains an in-browser-Babel prototype; recreate in the target framework as the original handoff notes describe.
