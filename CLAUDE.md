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
  styles-control/     the panel's own sheet, control.css, linked by control.html alone
  scripts/*.js        concatenated into sa.js (public)
  admin/*.js          the panel shell and its light modules -> control.js
  admin/lazy/*.js     one module per file, fetched when its panel is first opened
  data/               recovered evidence + runtime config
  test/run.mjs        1,920-check suite against the generated output
```

**Run `npm run build` after any change under `src/`.** Nothing in `src/` is served; only the generated root files are.

### Why a generator
1. **Shell drift is impossible.** Header, nav and footer are defined once in `html.mjs`. The old site copy-pasted them into 20 files and they drifted (three different brand `aria-label`s, two different mobile CTA labels).
2. **Real URLs.** Every player (`/players/<slug>.html`), match (`/matches/<id>.html`), article and album gets its own crawlable file with content in the HTML.
3. **Vercel needs no build step.** `buildCommand: null`. No build can fail on deploy.
4. **Works with JavaScript disabled.** Every page ships complete markup.

### The database does not reach the site on its own
The control panel writes to **Supabase**. The generator reads
**`src/data/recovered-live.json`**, which is a snapshot of exactly those seven
tables. Nothing connects them automatically, so a save in the panel changes the
database and **not the website** until the snapshot is refreshed.

```bash
npm run sync        # pull the seven content tables into the snapshot
npm run publish     # sync + build + verify + test, in that order
```

This gap was live for the whole of the July rebuild: six fixtures, and edits to
four other tables, sat in the database while the site showed the code baseline.
`npm run sync` reports which tables changed, so an empty report is a real
answer rather than a silent no-op.

`player_photos` is two tables sharing one name. Base64 photographs are
reduced to `{key, kind, bytes}`, because the generator needs the size and not
the payload. Everything else is kept whole: `roster:status`, `roster:s2627`,
`roster:coaches`, `coach:*`, `sponsor:*` and `donate:config` are small
structured records the panel writes and the site reads. Skipping the whole
table to dodge the photographs is what kept those out of the build, so a
squad status could be changed all day and the website never moved.

The club can publish for itself: **Publish to site** calls `/api/publish`,
which checks `is_club_admin()` and fires the Vercel deploy hook. That needs
`DEPLOY_HOOK_URL` set in Vercel (Settings -> Git -> Deploy Hooks, branch
`main`, then Settings -> Environment Variables). Until it exists the button
says so rather than pretending.

### Cache busting is automatic
`sa.css` and `sa.js` are versioned by a **content hash** computed at build time and stamped identically on every page. Never hand-edit a `?v=`. Mixed versions used to be a recurring production bug; the test suite now asserts a single version across all pages.

## The statistics engine — the one rule that matters
**Every published figure is derived in `src/lib/stats.mjs` from match records. No page hard-codes a number.** Two pages can therefore never disagree.

`npm run verify` asserts the derived League Ten figures against the independently published league table row. It must pass.

Three kinds of completed match count differently, and getting this wrong is what made a derived table disagree with the official one:

| `kind` | Counts as played | Goals count | Notes |
|---|---|---|---|
| `score` | yes | yes | ordinary result |
| `walkover` | yes, 3 pts to one side | **no** | official table adds no goals; 15×3 + 3×3 = 54 |
| `penalty` | yes | yes (normal time) | shootout result is not stored, so no winner is inferred |

**Which side a walkover went to is the record's own `wo` field**, `H-W` or
`A-W`, written by the panel from a club name. It used to be inferred by
pattern-matching the match report for the phrase "awarded a walkover", which
could only ever produce a win: a walkover AGAINST the club would have gone
missing from the played column entirely. Records with no `wo` still fall back
to the wording.

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
`/control.html`, with `control.js` and `control.css`. Auth via Supabase Auth REST directly — no SDK, no in-browser Babel. Reached by typing **angels** anywhere on the site, which is a doorway rather than a lock: everything that actually protects the club's data is server side.

Modules: dashboard, fixtures, results and reports, squad and staff, player photographs, news, gallery albums, cover pictures, home page banner, photo tagging, video and interviews, recognition, league badges, sponsors, donations, sponsorship pipeline, inbox, settings. Each heavy one is its own file in `src/admin/lazy/`.

### It is split, and it has to stay split
`control.js` shipped all thirteen modules to somebody who opened one, and its budget went 16 → 18 → 24 → 30KB in a single sitting for that one reason. Now:

- `src/admin/*.js` is the shell: the store, the helpers, the router, and the light modules. It publishes `window.CPM` (the module registry) and `window.CPU` (the helper set).
- `src/admin/lazy/*.js` is one module per file, emitted as `control-<name>.js` and fetched the first time its panel is opened. `CHUNK_OF` in the shell maps a panel to its chunk; the build stamps hashed URLs into `window.CP_CHUNKS`.
- **A new panel goes in `lazy/`.** Adding one to the shell means everybody downloads it forever.

The panel's stylesheet was `src/styles/70-control.css`, inside `sa.css`, so every visitor to the website downloaded the whole panel's styling to render a page that cannot show a pixel of it. It is `control.css` now, linked by `control.html` alone. `sa.css` 24 → 19KB gzipped.

### How the editors work
- Authorisation is the **database's** answer, surfaced in the UI. A non-registered account is shown as read-only rather than hitting a policy error.
- **Every editor is a form.** They used to be raw JSON textareas, defended on the grounds that a lossy form would drop fields the website reads. The premise was right and the conclusion was not: each form starts from the record as it stands, changes only the fields it covers, and writes the rest back untouched, so a JSONB shape it has never heard of survives being edited by it. A **Raw** button is still one click away on every record.
- **Row keys are never shown.** `r20260201-bpr` is a database format, not a name for anything.
- **Positions are one list**, `src/lib/positions.mjs`: thirty codes with a full name, a group and a place on the pitch. It was three lists that disagreed (21, 26 and 22 codes), so team sheets in the archive using RDM and LAM printed as raw codes on a player page. Full names everywhere text is read; the short code survives only on a pitch diagram, where it carries a `<title>`. The suite fails if a code in any stored team sheet has no name, or if a marker is silent.
- Every section ends with **where its content shows on the website**, with a link.
- A fixture that has been played has **Enter result**: it opens the match form pre-filled and saving clears the fixture, so the site cannot list a match as still to come under a report of its own score.
- The match form is five tabs, players are picked from dropdowns, and the pitch draws the shape from the positions given to the eleven. Match reports take **bullets**, and the report builder writes the facts already recorded around the coach's own words. It invents nothing: a goal with no minute does not acquire one.
- **A goal carries what it was struck with, where from, what the ball was doing, and who made it and how.** The vocabulary is `src/lib/football.mjs`, following Opta's qualifiers, and it is shared by the panel, the stats engine and the pages so they cannot describe the same goal differently. The assist is a field ON the goal; the flat `assists` array is derived on save so everything downstream keeps working. Goalkeepers have saves. All of it surfaces on the player profile, with a line saying how many of his goals the detail actually covers.
- **Covers are drawn, not found.** Two badges, the score and the date for a match; the crest and the headline for an article. Canvas, in the browser, saved to the record and used as the share image. A real photograph always wins.
- **The home page banner is pickable** and produces the same three widths the build does (640/960/1344), so the srcset and the preload hint stay true. Removing it restores the original.
- Four video slots per match: footage, before, after, anything else. Direct upload is capped at 60MB with the reason on the button, because a full match is a gigabyte.
- **Recognition follows its type.** A season award, a trophy, a club record, a Player of the Month and the captaincy are five different shapes, and the awards page reads different fields from each. The form asks for the right ones and clears the ones belonging to a type an entry has been changed away from, while still preserving anything it has never heard of.
- **The sponsorship pipeline** is the club's own prospect list: who has been contacted, who has committed, and how much of the season's target that is. Nothing in it is published. The retired one lived in browser storage on one laptop.
- Squad status moves a player between **in the squad, retained for 26/27, retired, left the club, moved into coaching**. The last one writes both `roster:status` and `roster:coaches`, because in real life it is one decision.
- **Images are resized in the browser before they leave it.** A phone produces four or five megabytes and nothing on the site is drawn wider than about 1200px. Player photographs are cut square to 520px and stored inline on the `player_photos` row, which is where the existing nineteen live. Badges and article covers go to the storage bucket and the record keeps the address, because a page showing five inline would carry them all as base64. A badge is kept as a PNG so a transparent crest stays transparent.
- Every destructive action goes through a confirm dialog. Writes are attributed to `audit_log` via `log_admin_action()`.
- Settings offers a full JSON backup of every content table.

**`render()` replaces the panel body element, it does not empty it.** Modules attach listeners to that element and rely on bubbling. `innerHTML = ''` left the listeners behind, so each refresh stacked another copy: two renders in, one click saved twice, and since saving refreshes it compounded.

## Forms — how a lead actually reaches the club
`form[data-enquiry]` writes to the `enquiries` table **and** posts `/api/notify-enquiry`. It succeeds if **either** lands.

**That double write matters.** The email endpoint is a graceful no-op until `RESEND_API_KEY` is set, so a form that only emailed would record nothing — which is exactly the bug that once left `enquiries` empty. Same pattern for the footer newsletter: `supporters` table **and** `/api/subscribe`.

Read leads in **Control panel → Inbox**; RLS blocks anonymous reads, so signing in is the only way to see them.

## Commands
```bash
npm run build     # regenerate every route (run after any src/ change)
npm run verify    # assert derived stats against the published league table
npm test          # 1,920 checks against the generated output
npm run serve     # local preview on :4321
```

`npm test` covers: document structure, one h1 per page, heading order, alt text, resolvable assets and internal links, JSON-LD validity, asset-version consistency, overflow guards, reduced motion, both themes, WCAG AA contrast on every text token pair, form labelling, security headers, no service-role key in output, sitemap/robots correctness, and performance budgets. Budgets are **gzipped KB**, one per bundle, and they are ceilings over a split thing rather than one big one: `sa.css` 22, `home.css` 26, `sa.js` 24, `control.css` 7, `control.js` 16, and one per lazy panel chunk. It also asserts the split stays split: that the match form and the photo tagger are not in the core, that every deferred panel maps to a chunk that exists and is cache-busted, and that routing does not gate on a module having been downloaded.

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
- **`DEPLOY_HOOK_URL` is not set in Vercel**, so Publish to site correctly reports that publishing is not configured rather than pretending. Vercel → Settings → Git → Deploy Hooks (branch `main`), then Settings → Environment Variables. Until then, publishing is `npm run publish` on a laptop.
- **`fixtures` and `team_badges` are empty (0 rows).** The homepage next-match card shows "to be confirmed" and the fixtures page shows an empty state. Upcoming fixtures come from the code baseline until rows exist.
- **A probe row exists in production `enquiries`** (`name = __probe_delete_me`), created while auditing RLS. Anonymous clients cannot delete it; remove it from Control panel → Inbox once signed in.
- **One cup tie has no stored shootout result** (`r20260412-kew-ccup`, Kew Antigua 2-2). It is shown as penalty-decided with no winner claimed rather than inventing one.
- **Stripe donations** are built and the panel owns the link (Control panel → Donations). The cause page falls back to the link that is live today if the record is empty.
- **15 of 34 players have no photograph**, and 26 of the opponent clubs have no badge. Both can be added now, and a missing opponent badge is what makes a drawn match cover fall back to initials.
- **No photograph of Susan Anne Martin exists in the repo.** The cause page opens on the crest. If the family can clear a photo it belongs there.
- **Appearances count starts only.** Sunday-league match returns do not record minutes or substitute appearances, so neither is shown rather than estimated.
- Videos page links out to YouTube; per-video embedding awaits catalogued rows.
- **The league table is still transcribed**, not fetched. The retired `TableSync.jsx` pulled it from FA Full-Time through a third-party proxy with a hard-coded fallback, which is two ways to publish a wrong table quietly. A replacement should be a scheduled server-side fetch that fails loudly.
