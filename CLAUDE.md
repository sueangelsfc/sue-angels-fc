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
  test/run.mjs        2,816-check suite against the generated output
```

**Run `npm run build` after any change under `src/`.** Nothing in `src/` is served; only the generated root files are.

### Why a generator
1. **Shell drift is impossible.** Header, nav and footer are defined once in `html.mjs`. The old site copy-pasted them into 20 files and they drifted (three different brand `aria-label`s, two different mobile CTA labels).
2. **Real URLs.** Every player (`/players/<slug>.html`), match (`/matches/<id>.html`), article and album gets its own crawlable file with content in the HTML.
3. **The deploy runs the generator.** `buildCommand` is `npm run sync && npm run build && npm run verify`, set by `45492af` when the Publish button landed. It was `null`, and this note said no build could fail on deploy; that has not been true since. A deploy now pulls the database, regenerates and checks the derived figures, so **a bad record can fail a deploy** and anything the panel reads must resolve to something sane rather than throwing.
4. **Works with JavaScript disabled.** Every page ships complete markup.

### The database reaches the site when somebody publishes
The control panel writes to **Supabase**. The generator reads
**`src/data/recovered-live.json`**, which is a snapshot of exactly those seven
tables. A save in the panel changes the database and **not the website** until
that snapshot is refreshed, which is what **Publish to site** now does: the
deploy hook fires a Vercel build and the build's own `buildCommand` runs
`npm run sync` first. Nothing refreshes on a schedule, so an unpublished save
is invisible for as long as nobody presses it.

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

**The club publishes for itself.** *Publish to site* calls `/api/publish`,
which asks `is_club_admin()` and then fires the Vercel deploy hook. It is
live: `DEPLOY_HOOK_URL` is set on `sue-angels-fc-b469` and pressing the button
produces a production deployment within seconds. `npm run publish` on a laptop
still works and is the fallback if the hook is ever revoked.

`DEPLOY_HOOK_URL` is the ONLY variable it needs. It also read
`SUPABASE_ANON_KEY`, which the activation note never mentioned, so it was
never set: `apikey` fell back to the caller's own login token, Supabase's
gateway rejected it, and the function told an administrator they were not one.
The key comes from `src/data/runtime.json` now, where the website already
ships it. A setup step nobody is told to perform is a step that does not
happen.

The button reports the SERVER's answer, and its four outcomes are distinct on
purpose: not signed in, sign-in expired, the database says no, and the
database would not answer (a fault here, with the status it returned). It also
does not guard on the browser's copy of the permission answer the way every
other write does, because its whole job is to go and ask.

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

**A tag is stored EITHER as a bare name or as `{name, role}`.** The tagger writes the second the moment it knows anything beyond the name, and both shapes are in the database. Reading only the first is what put the literal text `[object Object]` under 624 gallery photographs and into their alt text. Everything reading a tag goes through `tagName()` in `src/templates/gallery.mjs`.

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
- **Positions are one list**, `src/lib/positions.mjs`: twenty-nine places with a full name, a group and a place on the pitch, and nineteen **roles** in their own list, each naming the positions it attaches to. A team sheet records both (`positions: ['ST'], role: 'F9'` is a striker playing as a false nine), and everything derived from where somebody stood reads `positions` alone. Changing a position clears a role that no longer attaches to it. It was three lists that disagreed (21, 26 and 22 codes), so team sheets in the archive using RDM and LAM printed as raw codes on a player page. Full names everywhere text is read; the short code survives only on a pitch diagram, where it carries a `<title>`. The suite fails if a code in any stored team sheet has no name, or if a marker is silent.
- Every section ends with **where its content shows on the website**, with a link.
- A fixture that has been played has **Enter result**: it opens the match form pre-filled and saving clears the fixture, so the site cannot list a match as still to come under a report of its own score.
- The match form is five tabs, players are picked from dropdowns, and the pitch draws the shape from the positions given to the eleven.
- **The report writer is its own chunk**, `src/admin/lazy/15-report.js` → `control-report.js`, fetched when Build the report is pressed and by nobody else. It was inside `control-match.js` and was most of the reason that file reached 17KB. Two ways to write one, and **the panel always says which it used**:
  - **Written.** `/api/claude` gets the facts, the coach's notes and the club's house rules. `ANTHROPIC_API_KEY` is set on `sue-angels-fc-b469`.
  - **Composed.** Arranged in the browser from the facts alone, threading the notes through by time and by player name. No key, no network. This is the fallback for a missing session, a missing key, an over-long prompt, no network or a 500, so the button can never do nothing.
- It also knows two things no tab on the form holds: **how the club has done against this opponent before**, and **where the match sits in a run of pre-season friendlies**. Both are counted from the match list the panel already ships, walkovers carrying no goals exactly as the site counts them, and the suite reconciles the head-to-head against the site's own figures for every opponent.
- It invents nothing either way: a goal with no minute does not acquire one.
- **A goal carries what it was struck with, where from, what the ball was doing, and who made it and how.** The vocabulary is `src/lib/football.mjs`, following Opta's qualifiers, and it is shared by the panel, the stats engine and the pages so they cannot describe the same goal differently. The assist is a field ON the goal; the flat `assists` array is derived on save so everything downstream keeps working. Goalkeepers have saves. All of it surfaces on the player profile, with a line saying how many of his goals the detail actually covers.
- **Covers are drawn, not found.** Two badges, the score and the date for a match; the crest and the headline for an article. Canvas, in the browser, saved to the record and used as the share image. A real photograph always wins.
- The boot screen holds for **three seconds, end to end**, however long the badge takes to assemble; the beat count adapts rather than the total. `TOTAL` in `home.mjs` is the only number to change.
- **The home page banner is pickable** and produces the same three widths the build does (640/960/1344), so the srcset and the preload hint stay true. Removing it restores the original.
- **The home page's running order is the club's**, in Control panel → Home page. **Seventy-five bands across seven areas**, each movable, each able to be turned off, written to `home:layout`. It was one line of `home.mjs`, which made it a decision from July that the club could not revisit: in August the promotion to League Eight was news while an empty League Eight table led the page. `src/lib/home-layout.mjs` is the single definition and it is total, never throwing whatever the record holds, because a deploy now runs the generator and a record that threw would fail the club's own publish.
  - **The seventy-five, by area:** *Happening now* (11) · *On the pitch* (10) · *The figures* (18) · *The people* (12) · *The club* (7) · *Getting involved* (8) · *The archive* (9). `HOME_BANDS` in `src/lib/home-layout.mjs` is the list; the panel is handed it by the build.
  - **The live page is 17 bands.** The club rearranged its own front page in the panel on 10 August and now hides 11 of the twenty it had, so the page is the 9 it kept plus the 8 archive bands that draw. The other 58 are off until switched on. Not because they are unfinished: the club had already arranged its front page, and bands arriving switched on would rearrange it without anybody asking. **Show everything** turns the lot on in one press.
  - **The archive nine carry no `off` flag, and that is the club's decision.** They were asked for, so they are part of the shipped order. The mechanism is the off rule read backwards: with no flag there is nothing to hide, the club's record predates all nine and does not name them, so they arrive published and the insertion rule places them at the bottom of the page, which is where an archive belongs. Turning one off in the panel writes it into `hidden` and still wins outright.
  - **`home:layout` cannot be written from a developer machine.** It lives in Supabase and only an admin login writes it, and hand-editing `src/data/recovered-live.json` is worse than useless because the deploy runs `npm run sync` first and overwrites it. Changing a default in `home-layout.mjs` is the only lever code has, and it is a change to what every site gets rather than to this club's record.
  - **An area is a panel device and nothing else.** The running order is still one flat list, because the page is one column. So the filter narrows what you can SEE and never what you can MOVE: an area's bands are not adjacent, so with a filter on the arrows come off and each row says why. Position numbers stay the real ones.
  - ***The archive* is a different KIND of band, not a different subject.** Every match, every season, every club played, the reports, the albums, the crest wall, what is in here, the grounds: these get longer with the seasons instead of turning over, which is why they are grouped away from the ones that go stale.
  - **Two bands carry a real form** (Get in touch, The monthly email). Both write to the table AND post the endpoint, the same double write the footer does, because a form that only emailed would record nothing while `RESEND_API_KEY` is unset. Their ids are prefixed (`hc-`, `hn-`) so they cannot collide with the footer's `ft-email` on the same page. The suite drives them in a headless browser: unique ids, no orphan labels, and an empty submit produces four validation errors without navigating.
  - **The hero is pinned** and is named as pinned in the list. It carries the page's one h1 and the next-match card, and a list of eight where the page has nine invites somebody to go hunting for a bug.
  - **The rail numbers down the page are derived from the published order.** They were typed at the call site, 1 to 8, which is correct for exactly one arrangement: hiding a band left the strip reading 04 then 06. A band that is hidden **or empty** takes no number, so `news` with no articles cannot leave a gap.
  - **The suite renders the page with everything on**, because the built files contain none of the off bands: twenty could ship broken and 2,800 checks would pass without reading a line of their markup, then break on the day the club switched one on. That block checks the split-CSS rule, every outbound link, the rail numbering, that a leaderboard numbers 1..n rather than by shirt number, and that each band empties itself when its source is taken away. Six mutation probes confirm every one of those checks goes red when the thing it guards is broken.
  - **A leaderboard's left column is a rank, never a shirt number.** Five of these bands put a small numeral beside a player's name, which is exactly the shape a squad number takes, and the site never shows those. The suite asserts the column reads 1, 2, 3 down the list.
  - **The panel is handed the band list by the build** (`SEED.homeBands`) rather than holding its own, so it cannot offer a band the site does not draw, and it is told which bands are currently empty so a switch never promises something the page will ignore.
  - **The panel says what each band costs, and what the running order comes to.** The cost of a band used to be invisible at the moment somebody flicked the switch: the only place it was computed was `npm test`, which the club never runs, so the answer arrived as a failing build afterwards. The build measures every band and seeds the figures, and the suite reconciles them byte for byte against the page. **Raw markup, never gzipped** - raw bytes add up, so a total is exact, whereas a per-band gzipped figure could only be an estimate. The comparison is against **the standard order** (145KB) rather than a ceiling: a ceiling would have to model the fixed part of the document, and a budget readout that is optimistic by a few KB is worse than none. The standard order is measured, and it is a button on the same screen. Heaviest band is 34x the lightest, which is the whole point of the column.
  - **The home screen's data rides with the home chunk.** `homeBands` is 15KB of raw JSON for seventy bands and their pick lists, read by one screen, and it was in `control-seed.js`, which loads first and is not deferred: every one of the eighteen panels paid for it to render the Inbox. That is the lazy-split rule arriving by a different door - last time thirteen modules in one file, this time one module's data in everybody's file. `control-seed.js` **12.0 → 7.0KB gzipped** for every panel visitor; `control-home.js` 3.4 → 8.8KB for whoever opens that one screen. `control-seed.js` is budgeted now (8KB), having never been, despite sitting on the critical path for every screen.
  - **There are two copies of the ordering rule**, one in Node for the generator and one in the browser for the preview, and the suite runs both over the same records and fails if they part company. A preview that disagrees with what gets published is worse than no preview.
  - Absent means the standard order: no record, an empty record and a record full of names nothing has heard of all produce the page byte for byte as it ships.
  - **Three more bands the club can add**, all off until switched on: **a match report**, **photographs** from one album, and **a player**. Each publishes something the club already makes that the front page has never shown, and each takes a **pick**: leave it automatic (the newest report, the newest album, the leading scorer) and it keeps up with the season on its own; choose a particular one and it stays until changed. `featuredFor()` resolves it, and **a pick that stops resolving falls back to the automatic one** rather than leaving a heading over a hole, because a pick points at content edited on other screens and can outlive it.
  - **A band added later must not switch itself on.** The off rule reads the stored ORDER, not `hidden`: an existing record says `hidden: []`, which is authoritative and cannot mention a band that did not exist when it was written, so reading `hidden` alone would publish every new band on every site that had ever touched the screen.
  - The panel's dropdowns are seeded from the same functions the page resolves with, so it cannot offer a match whose report was cleared or an album that was deleted. The suite asserts every option it offers resolves.
  - **Pre-season** and **The season ahead** are two more, both off until switched on, both derived in `src/lib/preseason.mjs`. Pre-season shows the friendly programme, the record across it, who has scored and who has made a first appearance for the club. The season ahead lists the new division's clubs and what the archive holds on each.
  - **Both retire themselves on evidence, not on a date.** Pre-season reports itself empty once a competitive match has been played that season, and the season ahead once the division has started. A band still calling September's league football "pre-season" in October is what this prevents, and a date would not have prevented it.
  - **A first appearance is a claim about a person**, so it is derived from the archive: anybody named in a pre-season team sheet who appears in no earlier match record. Leon Burnett scored in the Pure Football friendly and is correctly *not* listed, because he played in October. The suite asserts both directions.
  - **A band empties itself on the same question it renders.** "Every season" tested `d.seasons.length > 1` and drew one row per season with competitive matches PLAYED, which in August are two different numbers: 26/27 exists and holds six friendlies, so the switch promised a comparison and the page drew a single row. Both read `seasonsPlayed()` now, and the band stays off until there is a second season to compare.
  - **A band with no data is a switch that lies**, so every candidate is checked against the records before it is written. Four were dropped for exactly this: goalkeeper saves (`keeperApps` is 0 across the squad), a video band (no match carries one), and ever-present players (nobody has played all 33). `PARTNERS` turned out to be a subset of `SPONSORS`, so that band would have duplicated Who backs the club. A fifth, the club's founding core, was dropped in August: no player has yet appeared in two seasons, because only two matches of 26/27 have been played.
  - **Coverage is returned, never averaged over silently.** Bookings reports how many matches hold a card list (33 of 33, so the figure is real); how the goals come reports how many goals record the detail; formations says 30 team sheets of 33. Body part, zone and situation cover 4 goals of 141, which is why there is no band for them.
  - **Thirteen new derivations** in `stats.mjs`, all reconciled against the pages that already publish the same figures: `currentRun()` (the runs the club is on, each beside its all-time best, because "two wins in a row" with nothing beside it reads as a bad season rather than the second week of a new one), `goalKinds()` (open play, set piece, penalty, returning its own COVERAGE so a share is never quoted over a fraction of the evidence without saying so) and `opponentRecords()`. `opponentRecords()` groups on the opponent name **as stored**, deliberately not the reduced form `oppBadge()` matches on: a badge lookup wants "same club", a head-to-head wants "same opponent", and merging Pure Football FC 2.0 into 1st Team would claim a record against a side never played.
  - **The weight ceiling is PER BAND, and it started out per page, which was wrong.** A total that fails whenever the club asks for more parts is measuring the request rather than the code, and that is exactly what happened when the catalogue went forty to seventy. How many bands exist is the club's business. What goes wrong quietly is one band far heavier than what it shows, so the ceiling is on the heaviest (32KB of markup, set just above `campaign` at 30KB, which inlines an SVG chart with a tooltip per match) and on the mean (4KB, currently 3.3KB across 66). The total is reported, not blocked: everything on is around 35KB gzipped and 260KB of HTML, against per-page budgets of 22KB and 160KB. It takes a deliberate press to get there.
  - **The campaign band crashed on a dataset with nothing played**, reading `scored[0]` for its first axis label with no guard. Unreachable while the band was hard-coded onto a page with 33 matches behind it, and reachable the moment the layout could hand the page any dataset it liked. A crash here fails the club's own publish rather than degrading, so it is guarded and `campaign` now has an emptiness test like everything else.

### A team qualifier is not noise
`clubIdentity()` in `preseason.mjs` strips the legal suffix (FC, AFC, Football Club) and **keeps** the team qualifier (1st Team, 2.0, B, Reserves, Sundays, Vets). Two clubs match only when what remains is equal.

League Eight 26/27 contains **Pure Football FC 1st Team**. The club beat **Pure Football FC 2.0** in a pre-season friendly on 2 August. Reduce both far enough and they are one string, and the site publishes "played 3, won 3" against a side it has never met, on the page a new opponent is most likely to read. Where the base matches but the qualifier does not, that is a **related side** and the page says so in words: "New. The club has played their Pure Football FC 2.0, not this side."

This is the same rule as `oppBadge()`'s, for the same reason: match on equality of the reduced forms, never on one containing the other.

### An undefined custom property deletes its declaration
It does not fall back to something sensible: the whole declaration is invalid at computed-value time, so the property takes its inherited or initial value and the rule silently does nothing.

**`sa.css` and `home.css` are different vocabularies.** A rebuilt page loads `home.css` plus its route band and nothing else. `--space-*`, `--step-*`, `--text-muted`, `--radius-*` and `--brand` are sa.css names; home.css has `--fg`, `--ink-1/2/3`, `--volt`, `--display`, `--ui`, `--r`, `--r-sm`, `--wide-num` and literal px. A card written in the wrong one has no padding, no radius and no surface, and it reads as a layout mistake rather than a spelling mistake.

`npm test` now asserts that every bare `var(--x)` in the sheets a page links is declared by one of them, by an inline style, or by a script's `setProperty`. Three real defects were shipped when it was written: `--ink-1` (used by the champions page and the sub-page nav, defined nowhere), `--ui` (which `control.css` borrowed from a sheet `control.html` does not load) and `--w` (fine, set inline by the build). `var(--x, fallback)` is safe by construction and is not flagged.
- Four video slots per match: footage, before, after, anything else. Direct upload is capped at 60MB with the reason on the button, because a full match is a gigabyte.
- **Recognition follows its type.** A season award, a trophy, a club record, a Player of the Month and the captaincy are five different shapes, and the awards page reads different fields from each. The form asks for the right ones and clears the ones belonging to a type an entry has been changed away from, while still preserving anything it has never heard of.
- **The sponsorship pipeline** is the club's own prospect list: who has been contacted, who has committed, and how much of the season's target that is. Nothing in it is published. The retired one lived in browser storage on one laptop.
- **Squad status is a fact about a player IN A SEASON**, `src/lib/squad-status.mjs`. It was one value per player with no date, so "Retained for 26/27" was a literal string in two files (wrong from July 2027, fixable only by a developer), "New signing" never expired, and a trial never ended. `roster:status` is `{num: {season: key}}` now; the old flat shape still reads, taken as the latest season. The club sets seven things (in the squad, on trial, injured, unavailable this season, retired, left, moved into coaching) and the site **works out three**: new signing, retained, back at the club. They are derived from **who was named in a match that season**, so nobody keeps them true and they stay true as seasons pass. Moving somebody into coaching still writes both `roster:status` and `roster:coaches`, because in real life it is one decision.
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
npm test          # 2,816 checks against the generated output
npm run serve     # local preview on :4321
```

`npm test` covers: document structure, one h1 per page, heading order, alt text, resolvable assets and internal links, JSON-LD validity, asset-version consistency, overflow guards, reduced motion, both themes, WCAG AA contrast on every text token pair, form labelling, security headers, no service-role key in output, sitemap/robots correctness, and performance budgets. Budgets are **gzipped KB**, one per bundle, and they are ceilings over a split thing rather than one big one: `sa.css` 22, `home.css` 26, `sa.js` 24, `control.css` 7, `control.js` 16, `control-seed.js` 8, and one per lazy panel chunk. **Code is budgeted apart from data**: `control-home.js` carries seventy-five band descriptions, so its emitted ceiling moved three times for growth that was not code, and `src/admin/lazy/95-home.js` and `10-match.js` are now measured as source so an edit to the code shows up on its own. **The deploy does not run this suite** (`sync && build && verify`), so a page over budget still publishes: these are a signal to whoever is reading, not a gate on the club. The home page's margin is printed on every run for that reason. It also asserts the split stays split: that the match form and the photo tagger are not in the core, that every deferred panel maps to a chunk that exists and is cache-busted, and that routing does not gate on a module having been downloaded.

## Deployment
**The domain is on the Vercel project `sue-angels-fc-b469`.** Three projects on this account look like the right one and only that one is:

```
Project                Domains
sue-angels-fc-b469     www.suesangelsfc.co.uk, suesangelsfc.co.uk    ← this one
sue-angels-fc          www.suesangelsfc.co.uk                        ← stale, dead repoId, last prod deploy June
sue-angels-rebuild     none                                          ← deploys the same repo to a .vercel.app only
```

**Comparing content will not tell them apart.** `sue-angels-rebuild` auto-deploys from the same GitHub repo, so it serves a byte-identical build and every `*.vercel.app` hostname returns the same site. `.vercel/` has pointed at the wrong project twice; ask Vercel instead:

```bash
vercel domains inspect suesangelsfc.co.uk     # the Projects table at the bottom is the answer
```

`vercel env ls production` is the other tell: `sue-angels-fc-b469` is the one holding `DEPLOY_HOOK_URL` and `ANTHROPIC_API_KEY`. A settings screen for the wrong project looks completely normal, which is how an environment variable gets added to a project nothing is served from.

Push to `main` → `sue-angels-fc-b469` auto-deploys to www.suesangelsfc.co.uk. Preview URLs are protected by team SSO and need a signed-in Vercel session.

**Server-side environment variables** (never in `src/data/runtime.json`, never anywhere the generator can reach):

| Variable | Used by | State |
|---|---|---|
| `DEPLOY_HOOK_URL` | `api/publish.js` | set, Preview + Production |
| `ANTHROPIC_API_KEY` | `api/claude.js` | set 3 Aug 2026, Production, sensitive |
| `RESEND_API_KEY` | `api/notify-enquiry.js` | not set; the endpoint no-ops gracefully and the `enquiries` table write is what actually records the lead |

Adding one takes effect only on the NEXT deployment: `vercel redeploy <latest-prod-url>`, or press **Publish to site** in the control panel.

## Conventions
- British spelling. "League Ten / League Eight", never "Division".
- **Five pages carry a season filter** (squad, player stats, results, club records, awards) and they all use the same one: `src/lib/seasons.mjs` builds the views and the bar, `[data-season-switch]` in `sa.js` shows the matching `[data-season-view]` panel. **A page adding a season filter writes no JavaScript.** Every panel ships in the HTML, so with the script blocked the page still shows the season it opened on. The bar also fires a `sa:season` event, which is how the results page filters its match list from the same press rather than growing a second control.
- **Every figure on a filtered page must describe the filter.** This went wrong in six places at once: the stats leaders were career totals under "The season's leaders", the squad chips totalled 24 under a tab reading 34, "Who scored them" counted every goal the club has scored, and three heroes named a fixed season above tabs that could show any. If a tab changes what is listed, it changes what is counted and what the sentence above it says.
- **A historical claim is derived, not built from a current fact.** `d.lastTitle` gives `{season, division}` from the archive, because the 37 player descriptions said the squad "won `CLUB.division` unbeaten" and `CLUB.division` is the division the club plays in NOW. Promotion would have had every one of them claiming the club won League Eight. The same descriptions dated **career** figures to one season ("31 goals in 25/26"), which reads correctly only while every career is one season. Both are asserted on the shipped output. The eight page-level descriptions had the same shape in their fallbacks but ship from literals in `DESC` / `recovered-pages.json`, so those were never live.
- **`currentSeason` was one string doing three jobs.** It is three derived names now, and the split is the difference between a site that survives 6 September and one that does not:

  | name | means | today | on the first League Eight whistle |
  |---|---|---|---|
  | `d.currentSeason` | the season the club's figures describe | 25/26 | **26/27** |
  | `d.tableSeason` | the season `d.table` describes | 25/26 | 25/26, until a League Eight table is transcribed |
  | `d.titleSeason` / `d.titleDivision` | the season the club won, and in what | 25/26 · League Ten | never moves |

  `figuresSeason()` and `tableSeasonOf()` live in `stats.mjs` so the **suite runs the shipped rule, not a copy**. `currentSeason` reads `competitive`, so a pre-season friendly does not move it: in August the club has 26/27 friendlies on the record and is correctly still a 25/26 club. `tableSeason` is asked **of the table** - its own row reconciles with exactly one season's league record - because taking the latest league season would caption last season's final standings with this season's name.
- **The suite simulates 6 September.** One competitive League Eight match is put on the record and every page re-rendered, because today all three values are the same string and no build of current data can tell whether a call site asked for the right one. That simulation found a real error in the split itself.
- **Never type a season into copy.** `d.currentSeason`, `d.nextSeason` and `d.latestSeason` are derived, and `d.nextSeason` counts on from the last known season so the site never runs out of an answer. Eight pages said "26/27" in their copy, five of them as `d.nextSeason || '26/27'` where `d.nextSeason` did not exist, so the fallback WAS the value. Every one would have been wrong from July 2027.
- **No em dashes** in copy.
- **Writing about the cause.** The club exists because Susan Anne Martin died of sepsis, and that asks for care the style rules above do not cover. Say **she died of sepsis**, never "lost her battle" or "fought": it was an illness, not a defeat. Warm and plain, not mournful and not inspirational. **Never point it at an outcome** - it does not appear in a sponsorship pitch, a recruitment line or as a reason to click, because a death is not a selling point. **Never medical advice**: link the UK Sepsis Trust and let them do that. And when a piece is about football, let it be about football; the cause has its own page and does not need a paragraph bolted onto a match report.
- **Understate it.** Eighteen from eighteen speaks without help, and "incredible", "unbelievable" and "historic" all make it smaller. A real number instead of an adjective, and say the awkward part out loud: "3 of the 33 were awarded as walkovers and carry no score" is why the rest is believable. An empty state says what is missing, why, and what fills it, never "No data available".

## Adding a field to the control panel

Four rules, each of them written after the failure it prevents. `harden-site` audits for these after the fact; these are how not to need it.

- **Write the reader first.** A field with no consumer is a lie with a save button. Two tables were written by the panel and read by nothing for as long as their editors existed.
- **Say where it shows, in the hint, and make it a `where:` link.** A label that promises an outcome is a testable claim, and "What the website publishes" was false for six match reports.
- **Absent must mean the safe default.** `draft: true` hides an article; missing means published, so nothing already saved needs migrating.
- **The panel never offers what the site derives.** New signing, retained and returned are worked out from evidence. Offering them as choices creates a second source for one fact, and the two will disagree - the panel called a first-ever signing "Retained" for exactly this reason.
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
- **`team_badges` is empty (0 rows), and that is not the same as having no crests.** 25 of 26 opponents resolve a badge through `oppBadge()`, which tries an uploaded row, then `badges-extra.json`, then the recovered registry, then a needle (`woking` finds Woking Vets for "Woking Veterans Sundays"). Only **Mala Vida FC** has none. Counting the table instead of asking the resolver is what made the dashboard report "0 of 26" and invite the club to re-find 25 badges it already had. `fixtures` has 6 rows and they are live.
- **What is still to come is derived once**, in `dataset.mjs` as `d.upcoming` / `d.nextFixture`, against the day the site was generated. Six pages each used to sort `fixtures` and take the first without checking whether the date had passed, so the morning after a match the home page still led with it and the countdown ran backwards. Two of the six filtered on `m.played`, which a fixture row does not carry. Nothing re-derives it now.
- **A probe row exists in production `enquiries`** (`name = __probe_delete_me`), created while auditing RLS. Anonymous clients cannot delete it; remove it from Control panel → Inbox once signed in.
- **One cup tie has no stored shootout result** (`r20260412-kew-ccup`, Kew Antigua 2-2). It is shown as penalty-decided with no winner claimed rather than inventing one.
- **Stripe donations** are built and the panel owns the link (Control panel → Donations). The cause page falls back to the link that is live today if the record is empty.
- **16 of 36 players have no photograph, and the gallery cannot currently supply one.** All 624 photo tags are a bare name, which means "somewhere in this frame", and none is marked as the **subject**. Only 5 of the 16 are tagged at all, and every frame is one of two useless kinds: unambiguous but a wide match shot where the player is about forty pixels tall among five team-mates, or close enough to crop but carrying two names with nothing saying which face is which. Cropping one of those is how a player ends up wearing somebody else's face, which has happened here. The machinery is right and the data is not: **Control panel → Photo tagging → mark a subject** promotes that frame to the front of Player photographs → From the gallery, which now sorts by subject, then by fewest other people tagged, and says which it is showing.
- **No photograph of Susan Anne Martin exists in the repo.** The cause page opens on the crest. If the family can clear a photo it belongs there.
- **Appearances count starts only.** Sunday-league match returns do not record minutes or substitute appearances, so neither is shown rather than estimated.
- Videos page links out to YouTube; per-video embedding awaits catalogued rows.
- **The league table is transcribed, and now checked against the results it is made of.** It never needed fetching: the site already holds all ninety division matches because it prints them under "Around the league", and a ten-club double round robin is exactly ninety. `deriveTable()` in `stats.mjs` builds the table from them and `npm run verify` asserts the two agree, so a mistyped figure or a wrong division result stops the build. That is the loud failure the retired `TableSync.jsx` was meant to provide, with no third-party proxy and no hard-coded fallback in the path. **Walkovers are the whole difficulty**: seven of the ninety were awarded, and counting them as scoreless draws moved six rows out of ten and cost the club six points. Where two clubs are level on every figure (Old Freemen's and Shepherd's Tuesday both finished P18 W5 D2 L11, 28-36, 17) the order is the league's to decide, so the check compares club by club and only asserts that the published order makes sense of its own figures. A live 26/27 table still has to be typed in as the season goes: Full-Time's league id is recorded nowhere, and the season starts 6 September.
