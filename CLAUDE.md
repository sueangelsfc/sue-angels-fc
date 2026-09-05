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
    csp.mjs           the security policy as data, every host carrying its evidence
    seasons.mjs       the season bar, the panels, and the ids that must not collide
  templates/          one module per route family
  styles/*.css        concatenated in filename order into sa.css
  styles-control/     the panel's own sheet, control.css, linked by control.html alone
  scripts/*.js        concatenated into sa.js (public)
  admin/05-record.js  does a match record add up? asked by the form AND the dashboard
  admin/*.js          the panel shell and its light modules -> control.js
  admin/lazy/*.js     one module per file, fetched when its panel is first opened
  data/               recovered evidence + runtime config
  test/run.mjs        3,592-check suite against the generated output
  test/dom.mjs        a small, strict DOM that throws rather than guessing
  test/panel-render.mjs  the panel, rendered, and asked what came out
```

**Run `npm run build` after any change under `src/`.** Nothing in `src/` is served; only the generated root files are.

### Why a generator
1. **Shell drift is impossible.** Header, nav and footer are defined once in `html.mjs`. The old site copy-pasted them into 20 files and they drifted (three different brand `aria-label`s, two different mobile CTA labels).
2. **Real URLs.** Every player (`/players/<slug>.html`), match (`/matches/<id>.html`), article and album gets its own crawlable file with content in the HTML.
3. **The deploy runs the generator.** `buildCommand` is `npm run sync && npm run build && npm run verify && npm run guard`, set by `45492af` when the Publish button landed and given its guard later. It was `null`, and this note said no build could fail on deploy; that has not been true since. A deploy now pulls the database, regenerates and checks the derived figures, so **a bad record can fail a deploy** and anything the panel reads must resolve to something sane rather than throwing.
4. **Works with JavaScript disabled.** Every page ships complete markup.

### The security policy is data, and it is wrong in both directions or neither

`src/lib/csp.mjs` holds the Content-Security-Policy, and every host in it
carries the evidence that it is still needed. A CSP fails silently whichever
way it is wrong, and this one was wrong both ways at once.

- **Too wide.** `'unsafe-eval'`, `unpkg.com` and `cdn.jsdelivr.net` were there
  for the Babel-in-the-browser admin retired in July, and `https://www.youtube.com`
  sat in `frame-src` as "embedded match footage" when the only `<iframe>` on the
  site is the nocookie one. No page would have rendered differently with any of
  them gone: **an unused permission is invisible.**
- **Too narrow, which is worse.** `sa.js` loads Google Analytics and the Meta
  pixel once a visitor consents and neither host was permitted, so the day
  somebody set `SA_GA_ID` analytics would have failed in the console of a page
  that looked entirely fine. The panel draws YouTube thumbnails from
  `i.ytimg.com`, which `img-src` did not allow, so those were broken live.

Two kinds of evidence, because there are two kinds of host. **`provenBy`** is a
shipped file that names it, and the suite greps that file, so an allowance
outlives its cause by one test run. **`requiredBy`** is for an address only a
third-party script ever reaches - where gtag posts, the Meta beacon - which no
file of ours will ever mention; grepping for one would prove we had guessed it,
not that it was needed, so the evidence is the permitted parent that pulls it
in. Stop loading gtag and they fall with it.

**Asserted against `vercel.json`, never generated into it.** Vercel reads that
file BEFORE the build runs, so a generated one would always be a deploy behind,
which is a worse bug than the drift it would prevent.

### The two endpoints a stranger can call

`/api/publish` and `/api/claude` ask the database whether the caller is a club
administrator. `/api/notify-enquiry` and `/api/subscribe` cannot: they are what
the public forms post to. That makes them the only two places where a
stranger's text reaches a third party the club pays for, and `api/_public.js`
is what guards them.

- **Everything the caller sent is escaped.** notify-enquiry interpolated `type`
  and `source` straight into the notification email's HTML. Only `email` was
  validated, by a regular expression that happens to exclude a tag; truncating
  the other two to 120 characters is not validation.
- **A brake on a loop, and it says it is not a rate limiter.** These are
  serverless functions, so the counter lives in one warm instance and a cold
  start begins from nothing. It blunts a naive flood from one address. A
  comment implying a guarantee it cannot make would be worse than the hole.
  A real limiter needs shared state, and the club already has Supabase.

### What an accessibility engine found, kept found

The suite asserted a great deal about markup - one h1, heading order, alt
attributes present, labels, contrast on every token pair - and an
`@accesslint/core` audit of every page family and of the panel still found five
things it had no question for. All five are fixed and all five are questions now.

- **Duplicate ids on every season-filtered page**, five per season on awards and
  six on club records, each the target of an `aria-labelledby`. Every panel
  ships in the HTML by design, so every id in one shipped as many times, and
  four headings out of six on club records were announced against a season the
  reader was not looking at. Fixed in **`seasonPanels`**, not in each template,
  for the same reason the bar is there: *a page adding a season filter writes no
  JavaScript*, and it should not have to remember this either. The panel the
  page OPENS on keeps its ids untouched, so `/awards.html#potm` still lands on
  something visible.
- **A photograph labelled with a name the link already prints**, so a screen
  reader read the row twice. The site's rule stands - a face on a crest wall is
  the only label there is - with `alt=""` where the caller has already said it.
- **Complementary landmarks nested inside a section**, and the panel's whole
  sign-in screen outside every landmark, which is content nothing can jump to.
- **Links distinguished from the sentence around them by colour alone.**
  Everywhere else a link is a card, a button or a whole line and is obvious
  without the hue; the pre-season band puts them mid-sentence.

Writing the checks found three more of the same defects the page audit had
missed, and one fault of my own: the landmark check read a **comment** -
explaining why a plate is not an `<aside>` - as though it were an `<aside>`.
A check that reads commented-out markup as shipped markup is worse than none.

### A class the panel draws that nothing styles

The test DOM has no cascade and refuses `getComputedStyle` rather than
inventing one, which is right and leaves a real gap: a screen can render
correct markup and look like nothing. **A class no stylesheet mentions is the
part of that gap that can be closed without a cascade**, and it found five, all
real. `cp-chip` and its three modifiers were defined nowhere, so matchday's
readiness column showed bare text where every other screen shows a coloured
pill, and `cp-actions` left two buttons unspaced.

**Gated at zero for the panel, reported for the pages.** The same question of
the public pages comes back at 118, and almost all of those are structural
wrappers a template groups with and never styles - a judgement call, so it is
printed with the other figures rather than failing a build.

### Rendered in a real browser, in CI

`npm run visual` drives a headless Chrome over the DevTools protocol with **no
dependency at all** - Node 22 has a global `WebSocket`, so no Puppeteer and no
Playwright. It asks four questions of every page family at 320, 768 and 1280,
and of all 21 panel screens, and each is a fact rather than a matter of taste:

- **Did anything throw?** A `ReferenceError` in `sa.js` shipped for weeks and
  was found by a person opening the live site and reading the console.
- **Is any text past the edge of the page?**
- **Is any text drawn at no size?**
- **Is any text unreadable against the background it is actually on?**

The panel is booted the way `panel-render.mjs` boots it - the shipped files
with the network stubbed - because that is the screen the club types on.

**It renders the home page with every band switched on.** The club has 17 of
the 75 on, so the built `index.html` holds 17 and a browser looking at it sees
17 - and the other 58 are the ones nobody would notice breaking, because the
defect appears the day somebody flicks a switch in the panel. `npm test`
renders the page this way for the same reason. The generator writes
`__all-bands.html` when `SA_ALL_BANDS` is set, and the check deletes it again
whatever happens.

**It found two real mobile bugs in bands nobody can see.** The campaign band's
grid used a bare `1fr`, which is `minmax(auto, 1fr)`, so the 606px inline SVG
chart forced the track open: at 320px the whole band laid out at **648px
inside a 272px grid**, clipped by `.sec{overflow:hidden}` so nothing scrolled
and nothing looked wrong. And the league table band's heading row was a
no-wrap flex row, so **Full table** sat 44px off the side of a phone.

**It refuses to guess, twice over.** Text over a gradient or a photograph has
no single background colour, so it is counted as unverifiable and reported
rather than failed: 7,092 of 16,275 pieces of text are on a gradient, and a
check that assumed the top stop would fail dozens of readable things. And text
a container clips is **reported per band, never failed**, because a ticker, a
carousel and a chart all clip on purpose and telling those from an accident is
a judgement.

**Five flaws in the check, every one found by probing it rather than reading
it.** It measured `<option>` elements, which have no layout box because the
select paints them. It measured children of `display:none` parents, so the
mobile nav's label read as invisible text on every desktop screen. It tested
the visually-hidden pattern by looking for a 1px box, and `.sr-only` on a
`<table>` does not collapse - a table sizes to its content - so the league
table's screen-reader copy reported 46 of its cells as clipped; the clip is
what hides it, so the clip is what to look for.

**And the overflow question was wrong twice.**
`documentElement.scrollWidth > clientWidth` is the usual measure and is dead
here: `home.css` sets `html{overflow-x:hidden}` on purpose, so the document
can never report horizontal scroll, and a 3000px element proved it said
nothing. Asking it of text instead is not dead and is wrong the other way - it
reported 69 elements, every one inside a ticker or a chart that clips them by
design. It neutralises the page-level clip and asks the document now, and
**says out loud that this is a weak gate on this site**: `.sec{overflow:hidden}`
is global, so every band absorbs its own overflow and only markup outside a
band can make the page scroll. What a reader on a phone experiences is text
clipped inside a band, which is the figure reported beside it.

**One bug in nine places.** Every component drawing a small secondary label
inside a selected orange pill picked its own dark-ink alpha - 0.6, 0.62, 0.66,
0.72 - and not one reached AA, at 9 to 11px. `--text-on-brand-2` is the one
token now, at 0.8, which is 5.05:1. And `--error` was doing two opposite jobs:
text on a dark panel (wants light) and the fill behind white on `.btn--danger`
(wants dark). Lifting it for the first took the second to 4.08:1, which is the
tell that they were never one colour. `--error-solid` is the fill.

**`.github/workflows/checks.yml` runs it, and runs the suite.** Until it
existed nothing ran any of this except a person remembering to: the pre-push
hook covers a push from the laptop it is installed on and nothing else - not a
merge, not the web editor, not another machine. **It does not gate the
deploy**, deliberately: Vercel's own `buildCommand` already refuses to publish
broken output, and everything here is a signal to whoever is reading rather
than a reason to stop the club publishing a result.

### What the deploy refuses to publish
`npm run verify` reconciles the derived figures against the published league table. That is a real check and it is not a check on the **output**: every page could ship a broken share image and the deploy would be perfectly happy. Not hypothetical - all forty-three share cards pointed at the host `co.ukundefined` for weeks, because `drawnCover()` read a `CLUB.url` that does not exist.

`scripts/guard.mjs` is the narrow middle between that and `npm test`. **The full suite stays out of the gate on purpose**: most of it is budgets, and a page that grew two kilobytes must never stop the club publishing a result. So the rule for what belongs in the guard is: *if a reasonable person could look at the failure and call it a judgement call, it goes in `npm test` instead.* Nothing in the guard is a judgement call - a page that did not render, `undefined` or `[object Object]` in an attribute, an image with no `alt` at all, a local link that resolves to nothing, an absolute URL whose host was built by accident, two pages disagreeing about a bundle version, a share card referenced and absent, a sitemap advertising a page nobody generated, a `service_role` key in output.

**It judges only what the generator wrote.** `src/build.mjs` emits `src/data/build-manifest.json` and the guard reads nothing else. Walking the repo root instead produced three hundred failures about a WordPress plugin's flag icons in scraped third-party pages, and a gate that noisy gets switched off within the hour. The same lesson twice over: the leak check was case-insensitive and failed on **Christopher FerNANdes**, a real player, on his own page, with his name spelled correctly.

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

### Who kept the clean sheet is something the club records
The match form asks. It stores the keeper in `cleanSheets` and the back line in `cleanSheetContributors`, the club has answered on **fourteen** matches, and the site read **neither** - it credited whoever STARTED in a position matching `/GK|CB|LB|RB|WB/`.

Those disagree on **twelve of the fourteen**, and five players' totals were wrong. Neither stored field is the answer on its own either: Brockwell away names five defenders and does **not** name the keeper, so it is the union of the two.

This is the "write the reader first" rule broken in the place it is written down: *a field with no consumer is a lie with a save button.* This one had a save button, a hint saying where it showed on the website, and no reader.

- **The position rule still covers the ten older matches** nobody answered for, so nothing in the archive loses a clean sheet it had.
- **The credit is no longer confined to starters.** A man the club names is a man the club names, whether he began the match or came on.
- **Career figures are competitive only**, because that is what `d.players` publishes - `dataset.mjs` builds them from `matches.filter(isCompetitive)` and friendlies get their own band. Counting the pre-season clean sheet made the keeper's published 13 look like a missing 14th.

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

`matches` (38) · `fixtures` (1) · `team_badges` (0) · `player_photos` (30) · `articles` (5) · `gallery` (7) · `recognition` (4)

Counts as of the snapshot in `src/data/recovered-live.json`, 25 Aug 2026. **They move whenever the club saves, so read the snapshot rather than this line** - `python3 -c "import json;d=json.load(open('src/data/recovered-live.json'));[print(k,len(v)) for k,v in d.items()]"`. Three of the seven had drifted here before anybody looked.

Plus private `enquiries` and `supporters`.

`player_photos` is a general blob store, not just photographs: it also holds `roster:*`, `coach:*`, `donate:config` and `sponsor:*` records.

`sponsor:partners` is the club's partner list, one row holding the ordered list because the order is the billing order. See `src/lib/partners.mjs`.

**A tag is stored EITHER as a bare name or as `{name, role}`.** The tagger writes the second the moment it knows anything beyond the name, and both shapes are in the database. Reading only the first is what put the literal text `[object Object]` under 624 gallery photographs and into their alt text. Everything reading a tag goes through `tagName()` in `src/templates/gallery.mjs`.

### Security posture
- **Anonymous:** may read the seven content tables, may INSERT into `enquiries`/`supporters`, may do nothing else. Verified: content writes return 401 or affect zero rows; `enquiries`/`supporters` SELECT returns `[]`; storage upload returns 403.
- **A `200 []` from an anonymous read of a private table is the policy working**, not an empty table.
- **A bare `204` from PostgREST means the statement ran, not that rows changed.** Use `Prefer: return=representation` to see how many rows a write actually affected. Reading 204 as "write succeeded" produces false security alarms.
- **That header is for ADMIN writes only, and using it anonymously produces the opposite false alarm.** Returning the new row needs a SELECT policy on it, and anon has none on `enquiries`, `supporters` or `band_views` because they are write-only by design. So `Prefer: return=representation` on an anonymous insert fails with `42501 new row violates row-level security policy`, which is indistinguishable from the insert policy being missing. It cost a day: three tables were declared broken and the club told its contact form had been recording nothing, when the same insert with `return=minimal` returns 201 and always had. `sbInsert()` sends `return=minimal` and the suite asserts it, because that is the club's lead capture.
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

### What was typed survives a failed save
The panel knew when a screen was dirty and warned before the tab closed, and that warning was live on **exactly one screen**: `95-home.js` is the only module that ever calls `U.dirty`. Every other editor - the match form above all, five tabs and forty fields filled in on a phone at the side of a pitch - could lose the lot to a dropped connection, an expired token or a stray refresh, in silence. `render()` says so out loud: "whatever was unsaved is gone".

A warning is not a save. The shell keeps a **draft of every editor as it is typed**, in `localStorage`, and offers it back on the way in. Held generically in the shell for the same reason `setDirty` is: thirteen modules that each have to remember is thirteen chances to forget, and the one that forgets is the one that loses a match report. A delegated listener sees every field in every editor, including screens not written yet.

- It stores **field values, not the record**, so it needs to know nothing about what a match is.
- It will only offer a draft back to a form of the **same shape** - the signature is the ordered field identities - because a form changed since would have the values poured into whatever fields lined up.
- **Offered, never applied.** Restoring silently would overwrite the database with something the club may have abandoned, before they had seen either.
- **Passwords and file inputs are never captured.** One cannot be stored, the other cannot be restored from a string.
- A draft **expires after seven days**, and a full or blocked `localStorage` cannot take the panel down: a safety net that throws is worse than none.
- It clears when `CP.upsert` **actually writes** - the store has already counted rows through `verifyWrote()`, so it is not a 204 being read as success.

`control.js`'s budget went 11 → 12KB for this, deliberately and once. The obvious saving is to move the dashboard (12KB of source) into `lazy/`, and that is **not** the answer: everyone lands on the dashboard, so making it lazy saves nobody a download and turns one request into two before the first screen draws. It is in the shell for the same reason the draft code is.

### The hint under a field is part of the field
Every editor writes its own markup - there is no shared field builder - so each puts its explanation in a `.cp-note` beside the control and none of them associates the two. The sentence saying what a field does and what it changes on the website was reaching sighted users only. The shell wires `aria-describedby` after every render, generically, for the same reason it holds the drafts.

**The class it looks for is `field__hint` or `cp-note`.** It looked for `cp-note` alone at first - the class for a note about a whole SECTION - while every one of the panel's 25 field hints carries `field__hint`. The wiring ran on every render and attached itself to nothing, and the suite passed throughout, because the check asked whether the mechanism existed rather than whether it caught anything. Found by opening the panel in a browser and reading the attribute off a real field, which is the only thing that could have found it.

**A dialog is not inside the panel body.** `wireHints` runs on what a module draws into its panel, and the biggest form in the whole panel - the match editor, 69 fields and 14 hints - is appended straight to `<body>` after that render. So the screen with the most explaining to do had none of it reaching a screen reader. A `MutationObserver` on **body's direct children only** catches it; watching the subtree would run on every keystroke that redraws a row. 0 → 10 fields described in the editor.

**A RUN of them, not just the first.** `aria-describedby` takes a list, and the match notes field carries two paragraphs: the explanation, and a live gauge saying how much has been written. Only the explanation was ever announced, so the half that changes as you type reached nobody. The run stops at the first element that is not a hint, which is what still keeps a field from picking up a sentence belonging to the next one.

**And the class has to mean what it says.** Three notes in the match editor carried `field__hint` while describing a whole block - the trialist panel, the substitutions list, a status line beside a button. They are `cp-note` now. "Every field hint is announced" was true before only because those three were never going to be announced by anything.

**Only the element immediately after the field**, never a looser lookup. The first version fell back to "the first `.cp-note` among my siblings", so a field with no hint of its own picked up one belonging to a field further up the section: a match-notes textarea was described to a screen reader as "Shown on the results page". A wrong sentence read with total confidence is worse than the silence it replaced, and the suite's check for this is the negative one.

The panel also carries `aria-busy` while a screen fetches its chunk and reads the database. A spinner is a picture; `aria-busy` is the same fact said out loud.

Two things an audit of this claimed and got wrong, both worth not re-checking: the toast container has carried `role="region"` and `aria-live="polite"` since it was written, so saves have always been announced; and 15 of the 16 labels with no `for=` wrap their own control, which is valid.

### How the club adds a sponsor

Two different things, and the screen never said which was which.

- **Sponsorships** are the small things sold during a season, one at a time: the match report, the match ball, Player of the Match, a player's season. They live in the database, **Record a sponsorship** adds one, and `report.mjs` and `player.mjs` print the credit. This always worked.
- **Partners** are the businesses on the shirt and across the sponsors page. These were in `club.mjs` and **could not be added at all**. The panel explained why at length: the logos are contractual assets, changing one is a deliberate code change, "it is on purpose". That is true of the logo **file** and of nothing else on the record. The name, the tier, the trade, the blurb, the placements and the links are words. The club changed its main kit sponsor for 26/27, which under that arrangement meant finding a developer, and the one screen called Sponsors had no answer to "how do I add a sponsor?".

`src/lib/partners.mjs` is now the one list, editable in **Control panel → Sponsors**. The logo is uploaded like a badge and kept as a PNG so a transparent mark stays transparent.

**There were two lists and they had already drifted.** `SPONSORS` is the home page logo strip and `PARTNERS` the sponsors page; they hold the same four businesses in the same order, and two are named differently on the two pages ("Sporting Solutions" against "Sporting Solutions Ltd", "Staines Rugby" against "Staines Rugby Club"). A fifth, HLO, is in the strip and has never been on the page, which nothing recorded as a decision. One record per partner now, carrying **where it appears** rather than being duplicated per place: `onStrip`, `onPage`, and a `short` name for where the logo is the content and the text is only read aloud.

- **The baseline reproduces both pages byte for byte**, drift included. Correcting a partner's name on the live site is the club's decision, not this file's; what changed is that the disagreement is visible in one place where somebody can settle it. The suite asserts the strip and the page still equal the two code lists exactly.
- **Absent, empty, and full of nameless entries all mean the code baseline.** A club that has never opened the screen gets the pages it has today. An empty record is not a club with no sponsors.
- **A new partner appears in both places unless told otherwise**, which is what somebody adding a sponsor expects. The home strip shows the first four; the order is the billing order and the panel says so under the table.
- **The partner prose rides with `control-content.js`, not the shared seed.** Each partner carries a paragraph, their placements and their links; putting that in `control-seed.js` pushed it 0.8KB over its ceiling for somebody opening the Inbox. Same lesson as `homeBands`, caught the same way, by the budget, the first time the data was added.
- A link pasted without a label is named from its host, so a partner's Instagram is not published as "Website".

**The pointer to the pipeline carries a figure.** "Chasing the ones that are not" was a whole section whose only content was that the pipeline is a different nav item, which is a nav item doing an impression of a screen. It reads the pipeline's own row and says how many prospects and how much is committed.

### The panel title was the whole nav button

It read the button's `textContent`, and the button holds the count badge. `setCount` writes the number and then **hides** the span, and a hidden span is still in `textContent`, so the Fixtures screen was headed **"Fixtures 0"** and the Inbox "Inbox 0". A screen titled with a stray digit reads as a counter that has broken. The label has its own class and the title is read from that.

**The fixtures list comes before the form.** The screen is called Fixtures and opened on a six-field form with what is actually coming up below the fold. Adding a fixture happens a handful of times a season; looking at the list is why anybody opens the screen.

### Who a match can name

Two rings, one gate, and **every player dropdown on the match form goes through `offer()`**.

- **club** — anyone at the club on the match's date. The ring for *building* the sheet: the eleven and the bench.
- **match** — the men on the team sheet, and nobody else. Everything after the sheet is a claim about *this match* (he scored, he was booked, he kept goal, he wore the armband) and none of it can be true of somebody who was not on it.

`control-match.js` works out who was at the club that day and does it well. **The failure was where that answer was asked for.** Counted in a browser against real data: **one dropdown of the nine was filtered.** The eleven's picker is repainted once the dialog is in the document, so it reads the date field; every other picker is built as a string *before* the dialog exists, so `matchIso()` finds no date field, returns `''`, and the filter waves everybody through. The bench offered 44 names where the eleven's offered 34. Same shape as the field hints: a correct mechanism attached to almost nothing, its tests asking only whether it existed.

- **The team sheet is the gate for the whole match.** Under match scope, the Shepherd's goal credited to a man not among the fourteen could not have been entered.
- **An empty sheet narrows nothing**, so match scope falls back to club scope and the goals can still be typed before the team sheet.
- **Whoever is already stored is always offered**, however the rings fall, or opening an old record would blank its captain on the next save.
- **Everything downstream of the sheet is repainted when the sheet or the date moves** (`afterSheet()`), so a substitute named on tab two reaches the scorer dropdown on tab three without a reload.
- **The ring is explained once per pane, not once per field.** The first version printed the same sentence under all five pickers on Cards and keeping; five identical explanations reads as a template misfiring and buries the hint that *is* specific to the field. Each picker keeps only its own count ("14 to choose from").

### Does the record add up?

The form asks for the same match twice — a scoreline on the first tab, the goals on the third — and never compared them. **Two of the archive's thirty-five played matches disagree with themselves**: Shepherd's away credits a goal to a man not on the sheet, and FC Porto of London a yellow card (that second one was found by the check, not by reading the data).

Neither is a save to refuse. A result typed at the side of a pitch is worth having before the detail is known, so it **says so** — above the tabs, on every tab, until it is fixed or knowingly saved: an eleven that is not eleven, no team sheet at all, a scoreline that disagrees with the goals listed, and anybody named in the match who is not on its sheet. The suite runs the same three questions over everything published and fails if a third arrives.

**Each tab carries what it holds** (`11 + 3`, `5`, `written`). The only way to find out whether the cards had been entered was to go and look at all five, and the commonest way to record a match badly is to stop before the end.

**The record checker was being handed half a record.** The dashboard asked it
about `m.data`, the stored row, and a stored row carries neither the kind of
result nor the score: both live on the seeded match, which is the site's own
merged view. Two consequences, and the first is the one the club noticed.
**Three walkovers were reported as matches with no team sheet** - Shepherd's
Tuesday, Catania and Old Freemen's, the three that make the 54 points - because
`matchProblems` returns early on a walkover and never saw one. The club was
being asked to write team sheets for three matches nobody played. And the
scoreline question could not run at all on any match whose score was never
typed into the panel, which is most of the archive. Seeded facts first, stored
second, so a record the club has since edited still wins on the fields it owns.
Not a second copy of the walkover rule: the rule was always there and was being
given a record with the answer missing. **Eight flagged matches became none**,
and the harder question found nothing new.

**A friendly is not asked for a team sheet.** Not a relaxation of the rule, a
correction to it: appearances, goals and every career figure the site
publishes are counted from **competitive** matches only, so a friendly's
eleven is credited to nobody however carefully it is entered. Proved before it
was written - adding the eleven to the BPR friendly of 30 August moved the
stats page not at all, left career appearances on 351 and did not change the
pre-season band by a single name. The archive's count of matches with no team
sheet goes from eight to **three, all competitive**, and the other five stop
being a job nobody needed to do. **Everything else about a friendly still
counts**, because the rest of it is published: the goals show on the match page
and in the pre-season band, so a scoreline disagreeing with them is a real gap
there as much as anywhere. The editor had to start passing `competition`
alongside the record, or the same match would have been clean on the dashboard
and flagged on the form.

**A man who did not come on cannot have scored.** A second question, and a different fault from the one above: he *is* on the sheet, and the sheet says he watched. The bench's `on` field came after the archive, so every historical substitute reads as unused, and **thirteen credits across eleven of the thirty-five played matches** go to one. It shows on the website: William Clark has seven goals from two appearances, because appearances count starts and he came off the bench for five of them.

**Asking the same question about the armband and the Player of the Match found a third bad record.** Old Freemen's, 19 Oct 25: a captain who is not on his own team sheet. Two of the three were found by the check rather than by reading the data.

**The questions are asked, not grepped for, and they are asked of everything.** They used to live inside the editor, reading the form's own fields, and that had two costs. The suite could only assert they EXISTED, by regular expression over the shipped file - and a rule can pass a regular expression while being applied to nothing, which is exactly how one player dropdown of nine came to be the only filtered one. And the dashboard could not ask them at all, so a record that disagrees with itself could only be found by opening it; nobody opens a match from October to check it.

They are one pure function over a record now, **`src/admin/05-record.js`**, shared by the form and the dashboard, and the suite hands the shipped function crafted records.

**Asking the stored record rather than the form found two more.** An assist at Brockwell and one in the Woking cup tie, credited to men on neither the eleven nor the bench. They were invisible because the form asks about `goals[].assist` and the flat `assists` array is derived on save, so it is on no tab: *a question asked of the screen can only cover what is on the screen.* The form takes the orphans too now.

**The archive, named rather than counted:** five men in a match on no team sheet for it (`r20251005-brockwell-h`, `r20251019-freemens`, `r20251207-woking-cc`, `r20260301-shepherds-a`, `r20260517-portolondon-drt`), eighteen matches crediting an unused substitute, seven with no team sheet at all, and one whose scoreline and goals disagree (`r20260816-brentford`). `<=` passes when a check finds *fewer*, which is what a weakened check looks like, so each is asserted by name. The club fixing one in the panel is expected to fail the check and to be settled by striking a line out. **The dashboard counts them on the screen the club lands on**, with a button to the results list.

### Who came on, and for whom

The sheet recorded that a starter went off (`subbedOff`) and that a substitute came on (`on`, `onAt`), and **nothing joined the two**, so the match page said so in words: *"Sunday-league match returns do not record minutes or substitutions, so neither is shown rather than estimated."* From 26/27 the club records the pair. `src/lib/subs.mjs`.

A substitution is one event, `{minute, off, on}`, and the record is a list of them.

- **A man can come back on.** Sunday league runs rolling changes, and the old shape could not express one at all: `subbedOff` and `on` are one boolean each, so a player is one thing or the other for the whole match. Two events say it exactly — off at 62, on at 78 — and both are true.
- **He is not then "the man who came off".** `wentOff()` drops anybody whose last event was coming on, because he finished the match on the pitch and that is what the page means.
- **Each row's dropdowns are walked forward through the list**, so they offer who was actually available at that moment: you can only take off somebody on the pitch and only bring on somebody who is not. That makes a return offerable with no special case, because a man taken off is off the pitch and so is back in the second list.
- **`subbedOff` and the bench's `on`/`onAt` are derived from the list on save**, never typed twice, so anything not yet taught about `subs` still reads the match correctly.
- **Reading backward, nothing is invented.** A match saved before this opens showing what *is* known — he came on, at this minute — with the man he replaced blank rather than guessed, and the suite asserts the archive is never given a pairing it never held.
- **The note only appears where they are genuinely absent.** A sentence saying substitutions are not recorded becomes false on the first match that records one.
- **An unminuted substitution is not minute zero.** Same trap as the assist pairing; it sorts to the end.

### An empty minute is not minute zero

An assist is a field **on** the goal; the flat `assists` array is derived on save. A record written the old way is carried forward by pairing each goal with an assist in the same minute by somebody else — and that rule tested `minute != null`. **The archive's minutes are mostly the empty string**, which is not null, and `Number('') === Number('')` is `0 === 0`, so every goal matched every assist and took the first one every time, so it matched the *same* one.

Opening the Shepherd's match and pressing **Save** rewrote it with one man credited for all five goals and the four real assisters kept on the end as orphans: **five assists in, nine out, one of them quadrupled.** Nobody had to do anything wrong; opening a record and saving it was enough, and the form gives no sign of it because the flat list is on no tab.

A minute has to *be* one, and an assist comes out of the pool once used. Whatever is left in the pool is exactly what never paired — a truer definition of an orphan than asking the goals afterwards, which compared on minute again and so counted the same assist twice. `carryAssists()` is at module scope **because a rule that can silently multiply the club's assist record is one the suite has to be able to run on its own.**

### One spell is one line

A starter took ninety-five pixels: his name in the smallest type on the screen, a full spell block underneath (which half, where, what he was asked to do, a remove button) and a centred orange "Add where else he played" under that, eleven times over. A thousand pixels of scrolling to read eleven names, with the name the least visible thing in its own row, and eleven position dropdowns starting at eleven different x positions because the name column was as wide as the name.

Almost nobody moves. **One spell in the first half means he played there all match**, so the half is not a fact about him and the remove button has nothing to remove: both come off, the row is one line, and moving him is a quiet link away. **Only when the half is the first** — a single spell recorded as the second is a fact somebody entered, and hiding it would be the form disagreeing with the record.

The eleven's count moved into the label it counts, too. It sat in a flex row beside the picker, and the picker carries a hint and a collapsible trialist row, so the one number that matters was pushed to the bottom of a 90px block and printed level with "Somebody on trial?".

### The match form is split, and how it was made safe
`control-match.js` was **15.9KB gzipped of a 16KB budget** - the largest chunk in the panel and the most-opened - because the two LIST screens shipped the whole five-tab editor to anybody reading a table. It is now **4.9KB**, with the editor in `control-matchedit.js` (11.9KB) fetched the first time somebody opens a match.

The seam was never the problem. The blocker was **state**: `openMatch` read 23 module bindings and REASSIGNED six that the lists also read (`SQUAD`, `TRIALISTS`, `STATUS`, `nameOfNum`, `spellsByNum`, `benchDetail`). A binding reassigned in one chunk leaves the other holding the old array, and the two drift apart in silence rather than failing. They are properties of **`window.CPMSTATE`** now - one object, shared by reference, mutated by property and never replaced - so reassignment becomes property assignment, which every holder sees.

- The lists keep the 8 helpers they also use and hand them over on `window.CPMH`. One date parser, not two that can disagree.
- The editor takes everything else from `window` and publishes `window.CPME.openMatch`. The three call sites go through `U.chunk('matchedit')` first, the same pattern the report writer already used.
- `M.fixtures` and `M.results` never move. The first attempt swallowed `M.results` into the moved set because the definition scanner did not recognise `M.x = function` as a boundary, and everything between `openMatch` and the next `function` was absorbed.

### The panel can be loaded outside a browser
`src/test/harness.mjs` is the panel's first runtime coverage of any kind. The suite was static analysis over generated output and the panel sits behind a Supabase sign-in, which is precisely why the split sat undone: 1,500 lines could move and nothing would say a word until the club tried to record a result.

**No chunk touches the DOM at load** - every one declares its helpers, registers its modules and waits - so a chunk loads against plain stubs (`CP`, `CPU`, `SA_SEED`) and can be asked the questions that matter: does it register what it should, do two chunks share the same state object, does a mutation in one show up in the other.

### And now it is rendered
That harness stops exactly where the bugs live. Every panel defect found in the last month was found by a person opening a browser: **one player dropdown of nine was filtered**, the **field hints attached to nothing** for weeks, a screen was headed **"Fixtures 0"**. Each had a check beside it asserting that the mechanism existed, and static analysis cannot tell any of those from working code.

`src/test/panel-render.mjs` boots the shipped `control.html`, `control-seed.js`, `control.js` and the lazy chunks - through the shell's own `need()`/`load()` path, so `CHUNK_OF` and the hashed URLs in `CP_CHUNKS` are exercised rather than supplied - and renders **all twenty-one screens twice**: against the archive, and against seven empty tables. Only the network is stubbed.

**The old caveat still holds and is kept by REFUSING, not by staying away.** A half-built DOM that answers wrongly is worse than none, so `src/test/dom.mjs` throws on every selector, API and construct whose behaviour would differ from a browser's. `getBoundingClientRect` throws because this DOM has no layout; `getComputedStyle` throws because it has no cascade; `<tr>` directly inside `<table>` throws because a browser inserts an implicit `<tbody>` and this does not. Capture-phase listeners are **implemented**, not stubbed, because the draft saver and the validity marker listen on `document` in the capture phase and would otherwise have reported themselves working while storing nothing. `script.src` is a reflected attribute for the same reason: the shell loads a chunk with `s.src = '...'`, and an ordinary JS property would be invisible to `getAttribute`.

What it can now prove, none of which was checkable before:
- **The team sheet gates the whole match.** Fifteen men on the sheet, and captain, Player of the Match, keeper, every scorer and every assist offer exactly fifteen - while the pickers that BUILD the sheet still offer the whole club.
- **A substitution can only take off somebody on the pitch**: the off list grows down the rows and the on list shrinks.
- **A draft round-trips** from keystroke to `localStorage` to the offer back to the values restored, and a `localStorage` that throws on everything cannot take the panel down.
- **Three renders leave one set of listeners**, which is what `cloneNode(false)` is for.
- **Every control has a name, every aria reference lands**, table headers are scoped, nothing jumps the tab order.

**A probe that stops firing must fail the run, and for a while it did the opposite.** `bust()` throws when its pattern is not in the shipped file, and that throw landed inside the shell's own script-loading path, which turns any failure into *"This section could not be downloaded"* and carries on. So a probe aimed at `showOnly="squad"` - a name the minifier renames - found nothing, threw, produced an **empty panel**, and the check written as *"did the list change"* compared nought visible rows with nought rows and passed. The probe had silently stopped testing anything and the suite reported all 3,712 checks passing. Two fixes: `boot` records every chunk that would not run and **`openPanel` refuses to return while one is outstanding**, so the failure is loud wherever it happens; and a probe is aimed at the minified SHAPE (`/,(\w+)="squad",/`) rather than at a name the minifier owns. Every probe check also asserts it had rows to look at, because `0 === 0` is the shape all of these pass on.

**Every check has a mutation probe**, and `bust()` refuses to be a no-op: a probe that silently changes nothing reports the check as weak when the check is fine. Writing them found a check of mine measuring the wrong thing - counting database writes after three renders passes whether the listeners stacked or not, because the button validates before it saves. It counts listeners now.

### How the editors work
- Authorisation is the **database's** answer, surfaced in the UI. A non-registered account is shown as read-only rather than hitting a policy error.
- **Every editor is a form.** They used to be raw JSON textareas, defended on the grounds that a lossy form would drop fields the website reads. The premise was right and the conclusion was not: each form starts from the record as it stands, changes only the fields it covers, and writes the rest back untouched, so a JSONB shape it has never heard of survives being edited by it. A **Raw** button is still one click away on every record.
- **Row keys are never shown.** `r20260201-bpr` is a database format, not a name for anything.
- **Positions are one list**, `src/lib/positions.mjs`: twenty-nine places with a full name, a group and a place on the pitch, and nineteen **roles** in their own list, each naming the positions it attaches to. A team sheet records both (`positions: ['ST'], role: 'F9'` is a striker playing as a false nine), and everything derived from where somebody stood reads `positions` alone. Changing a position clears a role that no longer attaches to it. It was three lists that disagreed (21, 26 and 22 codes), so team sheets in the archive using RDM and LAM printed as raw codes on a player page. Full names everywhere text is read; the short code survives only on a pitch diagram, where it carries a `<title>`. The suite fails if a code in any stored team sheet has no name, or if a marker is silent.
- Every section ends with **where its content shows on the website**, with a link - **or it is a named exemption in the suite**. 18 of 42 sections made no claim at all, which is not the same as being exempt; it is just quiet. Two of them genuinely published and now say so (Fixtures to come → `/fixtures.html`, The founding staff → `/coaches.html`). The other 15 publish nothing - the dashboard reports on the site rather than being part of it, settings and the audit trail have no page, the sponsorship pipeline is private by design, matchday assembles what other screens publish - and they are listed in `PUBLISHES_NOTHING`, the same device as the six pages with no outbound citation: **adding to the list is a decision, not a way to silence a check.** A new section with no `where:` fails until it is linked or argued for.
- A fixture that has been played has **Enter result**: it opens the match form pre-filled and saving clears the fixture, so the site cannot list a match as still to come under a report of its own score.
- The match form is five tabs, players are picked from dropdowns, and the pitch draws the shape from the positions given to the eleven.
- **The report writer is its own chunk**, `src/admin/lazy/15-report.js` → `control-report.js`, fetched when Build the report is pressed and by nobody else. It was inside `control-match.js` and was most of the reason that file reached 17KB. Two ways to write one, and **the panel always says which it used**:
  - **Written.** `/api/claude` gets the facts, the coach's notes and the club's house rules. `ANTHROPIC_API_KEY` is set on `sue-angels-fc-b469`.
  - **Composed.** Arranged in the browser from the facts alone, threading the notes through by time and by player name. No key, no network. This is the fallback for a missing session, a missing key, an over-long prompt, no network or a 500, so the button can never do nothing.
- It also knows two things no tab on the form holds: **how the club has done against this opponent before**, and **where the match sits in a run of pre-season friendlies**. Both are counted from the match list the panel already ships, walkovers carrying no goals exactly as the site counts them, and the suite reconciles the head-to-head against the site's own figures for every opponent.
- It invents nothing either way: a goal with no minute does not acquire one.
- **A goal carries what it was struck with, where from, what the ball was doing, and who made it and how.** The vocabulary is `src/lib/football.mjs`, following Opta's qualifiers, and it is shared by the panel, the stats engine and the pages so they cannot describe the same goal differently. The assist is a field ON the goal; the flat `assists` array is derived on save so everything downstream keeps working. Goalkeepers have saves. All of it surfaces on the player profile, with a line saying how many of his goals the detail actually covers.
- **Share covers are drawn at build time and committed.** `npm run covers` writes `assets/covers/<id>.jpg` for every played match and every article, 1200x630, from the same records the pages are derived from: both badges either side, **VS** before a match is played and the score after, with home on the left the way the scoreline is written. Articles get the crest and the headline. 43 cards, 2.5MB. Before this every report shipped `og-match.jpg` and every article `og-news.jpg`, so a link to a win and a link to a defeat looked identical in WhatsApp. **The deploy cannot draw them** - Vercel's build has no browser - so the output is committed like the generated HTML, and a match published from the panel keeps the generic card until somebody runs the script. It degrades rather than breaking, and `npm test` prints how many pages are still on the generic card. Two Chrome details cost an hour: `--headless=new` hangs on macOS trying to open a display link, and without `--user-data-dir` a headless launch hands the URL to the Chrome already open and waits for a window that never appears. Chrome does not exit after `--screenshot` either, so the script polls for the file and kills it.
- **The panel is told which cards the build drew** (`SEED.drawnCovers`, keyed by match id and article row key). Cover pictures asked whether a record stored a `cover` and printed **None** otherwise, which was wrong for all 43 the moment the build started committing cards: 38 reports showed a red None while each was sharing its own card, and the bulk button offered to redraw every one of them over a committed file. Three states now - **stored** (a photograph or a card drawn in the panel, always wins), **drawn** (the build's card), **none** (the generic image, the only real gap) - and the dashboard tile counts the same way. The suite reconciles the seeded list against the covers on disk and against the pages that ship them.
- **A cover is drawn when the record is saved.** This was the last step in publishing that only a person could take: the build draws a card for every match and article, but the DEPLOY cannot, because Vercel has no browser. So `npm run covers` ran on a laptop or not at all, and a result recorded in the panel shared the generic club image until somebody remembered. **A step somebody has to remember is another way of saying it does not happen.** The two drawers moved out of the Cover pictures screen to module scope, publish themselves on `window.CPCOVERS`, and the match editor and the news editor call `ensure()` after a save. A record that already carries a cover is left alone - a real photograph beats a drawn card - and a failure to draw one never turns a saved match into an error, because the result is worth more than the picture. Driven end to end in the suite rather than asserted: the chunk must be fetched, the canvas drawn on, the card must carry the scoreline, and the cover must come back onto the record.
- **The dashboard still says when something is sharing the generic card**, for the records that predate this. 106 of the 108 pages ship a card of their own; the two that do not are the noindex panel and the news index, which is not an article.
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
  - **A first appearance is a claim about a person**, so it is derived from the archive: anybody named in a pre-season team sheet who appears in no earlier match record. Leon Burnett signed in July 2026 and IS listed, though the record slot he holds was used against Brockwell Violets in October 2025: a team sheet stores a slot and slots get handed on, so `signedOn()` - the club's own statement of when somebody joined - decides which of two people a slot meant. Where nothing is recorded the sheet still decides. This note used to say the opposite, and the suite certified it.
  - **A band empties itself on the same question it renders.** "Every season" tested `d.seasons.length > 1` and drew one row per season with competitive matches PLAYED, which in August are two different numbers: 26/27 exists and holds six friendlies, so the switch promised a comparison and the page drew a single row. Both read `seasonsPlayed()` now, and the band stays off until there is a second season to compare.
  - **A band with no data is a switch that lies**, so every candidate is checked against the records before it is written. Four were dropped for exactly this: goalkeeper saves (`keeperApps` is 0 across the squad), a video band (no match carries one), and ever-present players (nobody has played all 33). `PARTNERS` turned out to be a subset of `SPONSORS`, so that band would have duplicated Who backs the club. A fifth, the club's founding core, was dropped in August: no player has yet appeared in two seasons, because only two matches of 26/27 have been played.
  - **Coverage is returned, never averaged over silently.** Bookings reports how many matches hold a card list (33 of 33, so the figure is real); how the goals come reports how many goals record the detail; formations says 30 team sheets of 33. Body part, zone and situation cover 4 goals of 141, which is why there is no band for them.
  - **Thirteen new derivations** in `stats.mjs`, all reconciled against the pages that already publish the same figures: `currentRun()` (the runs the club is on, each beside its all-time best, because "two wins in a row" with nothing beside it reads as a bad season rather than the second week of a new one), `goalKinds()` (open play, set piece, penalty, returning its own COVERAGE so a share is never quoted over a fraction of the evidence without saying so) and `opponentRecords()`. `opponentRecords()` groups on the opponent name **as stored**, deliberately not the reduced form `oppBadge()` matches on: a badge lookup wants "same club", a head-to-head wants "same opponent", and merging Pure Football FC 2.0 into 1st Team would claim a record against a side never played.
  - **The weight ceiling is PER BAND, and it started out per page, which was wrong.** A total that fails whenever the club asks for more parts is measuring the request rather than the code, and that is exactly what happened when the catalogue went forty to seventy. How many bands exist is the club's business. What goes wrong quietly is one band far heavier than what it shows, so the ceiling is on the heaviest (32KB of markup, set just above `campaign` at 30KB, which inlines an SVG chart with a tooltip per match) and on the mean (4KB, currently 3.3KB across 66). The total is reported, not blocked: everything on is around 35KB gzipped and 260KB of HTML, against per-page budgets of 22KB and 160KB. It takes a deliberate press to get there.
  - **The campaign band crashed on a dataset with nothing played**, reading `scored[0]` for its first axis label with no guard. Unreachable while the band was hard-coded onto a page with 33 matches behind it, and reachable the moment the layout could hand the page any dataset it liked. A crash here fails the club's own publish rather than degrading, so it is guarded and `campaign` now has an emptiness test like everything else.

### A team qualifier is not noise
`clubIdentity()` lives in **`src/lib/club-name.mjs`** (dependency-free, because `stats.mjs` and `preseason.mjs` both need it and `preseason.mjs` already imports `stats.mjs`). It strips the legal suffix (FC, AFC, Football Club) and **keeps** the team qualifier (1st Team, 2.0, B, Reserves, Sundays, Vets). Two clubs match only when what remains is equal.

**"Men's" is a legal suffix, not a qualifier, and the asymmetry with "women's" is deliberate.** This is a men's Sunday league: every side in it is a men's side, so the word separates no opponent from any other. It separates a club's men's team from a women's team this club will never face. A women's or ladies' side is a different set of players, so those stay. The archive spells them **BPR Men's** and the transcribed fixture list **BPR FC**, and with `mens` left in they did not reduce to the same base either, so the home page carried *"A first meeting"* in one band and *"BPR Men's · Played 2, won 2"* eight bands below it, in the same document, from the same records. The badge registry had already decided it the other way - one entry, needle `bpr`, resolving both spellings - so the crest was right and the sentence beside it was wrong.

**`opponentRecords()` groups on `clubIdentity()`, not on the raw stored name.** The raw name is whatever somebody typed into the panel, so one club spelled two ways became two rows, each claiming a complete record against a club the other row also played. Identity keeps a 2.0 and a 1st Team apart (their identities differ) while merging the spellings, so it answers both questions at once. The row takes the most recent spelling. The suite asserts this against a **crafted** list: every name in today's archive reduces uniquely, so the same check over real data passes with no grouping implemented at all.

League Eight 26/27 contains **Pure Football FC 1st Team**. The club beat **Pure Football FC 2.0** in a pre-season friendly on 2 August. Reduce both far enough and they are one string, and the site publishes "played 3, won 3" against a side it has never met, on the page a new opponent is most likely to read. Where the base matches but the qualifier does not, that is a **related side** and the page says so in words: "New. The club has played their Pure Football FC 2.0, not this side."

This is the same rule as `oppBadge()`'s, for the same reason: match on equality of the reduced forms, never on one containing the other.

### An undefined custom property deletes its declaration
It does not fall back to something sensible: the whole declaration is invalid at computed-value time, so the property takes its inherited or initial value and the rule silently does nothing.

**`sa.css` and `home.css` are different vocabularies.** A rebuilt page loads `home.css` plus its route band and nothing else. `--space-*`, `--step-*`, `--text-muted`, `--radius-*` and `--brand` are sa.css names; home.css has `--fg`, `--ink-1/2/3`, `--volt`, `--display`, `--ui`, `--r`, `--r-sm`, `--wide-num` and literal px. A card written in the wrong one has no padding, no radius and no surface, and it reads as a layout mistake rather than a spelling mistake.

`npm test` now asserts that every bare `var(--x)` in the sheets a page links is declared by one of them, by an inline style, or by a script's `setProperty`. Three real defects were shipped when it was written: `--ink-1` (used by the champions page and the sub-page nav, defined nowhere), `--ui` (which `control.css` borrowed from a sheet `control.html` does not load) and `--w` (fine, set inline by the build). `var(--x, fallback)` is safe by construction and is not flagged.
- Four video slots per match: footage, before, after, anything else. Direct upload is capped at 60MB with the reason on the button, because a full match is a gigabyte.
- **Recognition follows its type.** A season award, a trophy, a club record, a Player of the Month and the captaincy are five different shapes, and the awards page reads different fields from each. The form asks for the right ones and clears the ones belonging to a type an entry has been changed away from, while still preserving anything it has never heard of.
- **The sponsorship pipeline** is the club's own prospect list: who has been contacted, who has committed, and how much of the season's target that is. Nothing in it is published. The retired one lived in browser storage on one laptop. Its header was four tiles carrying two facts, two of them both labelled *Committed* (one counting pounds, one counting people) and one reading `0 of 0` wrapped across two lines. Two money figures, the bar that already draws the percentage, and a count per stage, which is the thing that says what to do today. **With nobody on the list there are no figures at all**: four tiles of zero above an empty table reads as broken rather than as new.
- **The squad screen is in surname order and opens on who is here.** Two
  faults, both invisible in the source. It sorted on `name`, which is the
  FIRST name, so the site's own surname-ordered list arrived and was shuffled
  into a different alphabetical order - sorted either way it looks sorted,
  which is why nothing caught it, and the check has to name *which* order. And
  it opened on all 37 players when 21 are at the club and 16 have retired,
  left or moved into coaching: the list somebody came to work on was
  outnumbered by the one they had not. **Sorting it was only half the fix**:
  the column printed "Andrew Allen, Michael Brabrook, Kafele Brown", so
  reading down the first letters gave A, M, K, E, L, C and the table was
  reported as unsorted. A correct order nobody can see is not an order, so the
  column is written **surname first** - "Allen, Andrew" - from the record's own
  `last` and `first` rather than by splitting on a space, and the full name is
  still what every label, dialog and dropdown says. The suite asks both halves,
  because a first-name sort displayed first-name-first reads in order too.
  **At the club** is the opening filter,
  **Everyone** is the next button along, and nobody is hidden from the record -
  hiding somebody from the screen that edits them would be a worse bug than
  the one being fixed. `absent` is named in the panel's `PLAYING` map for the
  same reason it is named in the library: it is never set by anybody, so
  without the entry the safe question has to be asked backwards.
- **Squad status is a fact about a player IN A SEASON**, `src/lib/squad-status.mjs`. It was one value per player with no date, so "Retained for 26/27" was a literal string in two files (wrong from July 2027, fixable only by a developer), "New signing" never expired, and a trial never ended. `roster:status` is `{num: {season: key}}` now; the old flat shape still reads, taken as the latest season. The club sets seven things (in the squad, on trial, injured, unavailable this season, retired, left, moved into coaching) and the site **works out three**: new signing, retained, back at the club. They are derived from **who was named in a match that season**, so nobody keeps them true and they stay true as seasons pass. Moving somebody into coaching still writes both `roster:status` and `roster:coaches`, because in real life it is one decision.
- **Images are resized in the browser before they leave it.** A phone produces four or five megabytes and nothing on the site is drawn wider than about 1200px. Player photographs are cut square to 520px and stored inline on the `player_photos` row, which is where the existing nineteen live. Badges and article covers go to the storage bucket and the record keeps the address, because a page showing five inline would carry them all as base64. A badge is kept as a PNG so a transparent crest stays transparent.
- Every destructive action goes through a confirm dialog. Writes are attributed to `audit_log` via `log_admin_action()`.
- Settings offers a full JSON backup of every content table.

**`render()` replaces the panel body element, it does not empty it.** Modules attach listeners to that element and rely on bubbling. `innerHTML = ''` left the listeners behind, so each refresh stacked another copy: two renders in, one click saved twice, and since saving refreshes it compounded.

### What the website is actually read for

The club publishes 108 pages and had no way of knowing which of them anybody
opens. **Control panel → Website stats** answers it: what gets read, where in
the world the reader is, what sent them, what they read it on, how long they
stayed and how far down they got. `migrations/007_page_stats.sql`,
`src/scripts/30-stats.js`, `src/admin/lazy/85-stats.js`.

- **A row is a COUNT, not a visit, and that is the whole design.** The beacon
  calls `record_page_view`, which adds one to a bucket keyed by (day, page,
  zone, source, device). Two readers of the same page from the same zone on
  the same day are one row with `views: 2`. An individual visit cannot be
  reconstructed afterwards **by somebody with the database open**, which is a
  stronger property than promising not to look. It matters here because this
  records more than `band_views` does: one row per view carrying day, page,
  zone, source, dwell and depth is rich enough to pick a single person out of
  a quiet day.
- **So it sits outside the consent gate**, on exactly the reasoning 004 wrote
  down: no identifier of any kind, no cookie, no address, no user agent, no
  time finer than the day. If anything identifying is ever added it belongs
  behind the gate that GA and the Meta pixel sit behind.
- **Where in the world is the device's time zone, not its address.** The
  browser sends what it already knew (`Europe/London`) and **the panel** maps
  it to a country, because the map is a hundred-odd entries read by one screen
  and mapping on the way in would put it in `sa.js`, which every visitor to
  every page downloads. Same rule that moved `homeBands` out of
  `control-seed.js`. It is wrong for a VPN and a travelling phone and the
  screen says so. An unmapped zone reports its REGION rather than vanishing.
- **Anon cannot touch the table, only the function.** Tighter than
  `band_views`, where anon may insert whatever it likes. `record_page_view` is
  `SECURITY DEFINER` and clamps every argument - a path is shape-checked, a
  device must be one of three, seconds and depth are bounded - so junk and
  inflation stop at the door rather than in the panel.
- **It counts views, not visitors, and the screen says so.** With no
  identifier two views cannot be told apart, so unique visitors is a number
  this cannot honestly produce. It also counts only readers running
  JavaScript, which leaves out most crawlers and flatters the figures.
- **The beacon fires on `visibilitychange`, never `beforeunload`.**
  Registering the latter disables the back/forward cache in some browsers,
  which is a real cost to the reader in exchange for a counter. `pagehide`
  covers the desktop close; one `sent` latch means a tab hidden and re-shown
  records one view rather than one per glance.
- **A page shorter than the window is 100% scrolled, not 0%.** Without that
  every short page reports as nobody scrolling rather than as nothing to
  scroll.
- **`sa.js` 16 → 17KB, and the 444 bytes are named** in `run.mjs` beside the
  ceiling, measured by building without the beacon and with it. The ceiling's
  own comment demands that; this is the first raise to answer it.
- **When it is read is a second table, and that is the whole design.** The
  obvious way to add the hour is a column on `page_stats`, and it is the wrong
  one: that table's privacy property holds because the key is coarse enough
  that real readers collide in it, and a 24-way split of a key already
  carrying day, page, zone, source and device turns most buckets back into one
  view each - the single reader from Europe/Zurich, on the sponsors page, at
  23:00. `page_stats_hourly` is keyed (day, hour, path) and carries **no zone,
  no source and no device**, so it can say "eleven views of the squad page at
  8pm on Tuesday" and can never say who. The two cannot be joined back into a
  visit because neither holds anything to join on. `migrations/008_page_stats_detail.sql`.
- **The hour is the READER'S, not the server's.** "People read this at eight in
  the evening" is a fact about a habit; converted to a server clock it is a
  fact about nothing.
- **The world map is data, not a picture, and carries no library.**
  `MAP_GRID` is a 150x64 bitmap of where land is, rasterised once from Natural
  Earth's 110m outline and stored as 1,600 characters of base64. One `<path>`
  of round-capped dots draws all 2,856 land cells, because a zero-length
  subpath with a round cap paints a dot: one DOM node instead of 2,856. The
  bubbles are circles at each country's centroid, sized by **area** rather
  than radius so twice the views does not look like four times.
- **Nothing on the screen ever measures the page.** No `getBoundingClientRect`,
  no `getComputedStyle`, no canvas: every chart is sized in its own viewBox
  and scaled by CSS, which is what lets the whole screen render in the suite's
  DOM - it has neither layout nor a cascade and throws rather than inventing
  them.
- **`control-stats.js` 5 → 11KB and `control.css` 6 → 7KB, both measured.**
  Strip the grid and the two lookup tables out of the shipped chunk and it
  gzips to 7.7KB, so the data is 2.4KB of the 10.2. The sheet grew 383 bytes
  for the four components the panel did not already have. The alternative was
  a charting library, which would have cost more than all of it.
- **The browser check was rendering the empty state, and that is the defect
  this whole file exists to catch.** `scripts/visual.mjs` stubbed `CP.rest` to
  `[]`, so the one screen built entirely on it drew "nothing recorded yet" at
  all three widths and the map, the trend, the heatmap and every table on it
  were never rendered in a real browser at all. The stub serves figures now,
  and the check **asks the screen directly** whether it drew 2,856 land dots,
  a marker, 168 heatmap cells and a trend - proved by breaking the threshold
  and watching it go red.
- **Four defects found by the probes, not by reading the code.** The heatmap
  bucketed a missing hour under the key `2:NaN`, so a site still shipping the
  old beacon would have drawn 168 empty squares that read as a week nobody
  visited; empty cells were hidden by putting the opacity on the same element
  as the outline, so the grid drew as five floating bars; a check read
  squad.html's figure off the day table's "most read" column and reported 10
  for a page with 7; and the drill-down check matched `7 of the period's 24
  views` inside **`17` of the period's 24 views**, so it passed on an
  unfiltered panel.
- **Inert until the migration is run**, like 002 and 004. Until then every
  call is a 404, the failure is swallowed, and the screen names the file that
  turns it on rather than showing an empty page that reads as broken.
- **The screen knows what the site PUBLISHES, not only what was read.**
  `stats-pages.json` is written by the build - every route, its real title,
  what kind of page it is, and the day a match was played or an article went
  up - and this screen fetches it. Two of the most useful questions need it:
  what a page is *called* (a reader did not come for
  `/players/charlie-dunkley.html`), and **which pages nobody opened**, which
  traffic cannot answer on its own because a page with no views writes no row.
  99 of the site's 106 published pages had no views in the sample period, and
  that number is only obtainable by comparing the two.
  - **Fetched, not seeded.** 10KB of titles and dates read by one screen most
    people never open. In `control-seed.js` every panel would pay for it; in
    the chunk it would double the chunk. Same rule as `homeBands`, third time.
  - **Every use of it is optional.** With the fetch failing, a page is its
    address, the sections that need dates say so and name the file, and every
    other figure is unchanged. The suite renders both states.
- **A date has to be one.** Article rows carry both an ISO timestamp and a
  human `20 Jul 2026`, and slicing ten characters off the second produced
  `20 Jul 202` - a string that sorts wrongly, parses to nothing and would have
  marked the chart on a day that does not exist. `isoDay()` parses and reads
  back **local** components, because `2026-07-19T23:06Z` is the 20th in London
  and `toISOString()` would mark the day before the thing happened.
- **One filter, applied once.** Part of the site, country, source and device
  narrow *every* figure on the screen, in `view()`. A filter each section
  applied for itself is how a total comes to disagree with the rows under it.
  The dropdowns are built from the **unfiltered** period on purpose, so
  choosing a country cannot empty the source list and strand somebody - which
  is also why the check for "narrowing takes every other figure with it" reads
  the table cells and not the whole screen, having first failed on the control
  that makes the filter usable.
- **What moved, ranked by size and not by percentage.** One view becoming
  three is a 200% rise and is not news on a club website. Pages that vanished
  are movers too, so the list is built from the union of both periods rather
  than from what is here now.
- **The trend says what the club DID.** Vertical marks on the days a match was
  played or an article went up, from the catalogue's real dates, and the
  previous period laid over as a dashed line where the two are the same
  length. A traffic chart with no idea what happened is a line moving for no
  stated reason.
- **`control-stats.js` 11 → 15KB.** The page list is not in it.

### A descendant space is not every space

`src/test/dom.mjs` split a selector on `/\s+/`, so
`[data-val="United Kingdom"]` was torn in half and reported as an unsupported
selector. That is the worst of both answers: the syntax **is** supported, and
a real check could not be written with it. `splitCombinators()` tracks bracket
depth the way `splitTop` already did, so a space inside an attribute value or
a `:not()` stays where it is. Found by writing the check the DOM said it
could not parse, which is exactly what that error message asks for.
- **`CP.rest` in the test harness answered `[]` unconditionally**, so any
  screen built on it could only ever be rendered empty and its arithmetic was
  untestable. It takes crafted rows now, and the suite hands the shipped
  screen four and reads what came out. Three probes: a broken zone map, a
  broken sum, and a blank referrer label. Two of the three checks were **weak
  when first written** and the probes are what said so - the headline total is
  summed off the rows rather than through `roll()`, so a broken aggregation
  left it correct; and "Direct or unknown" matched the paragraph explaining
  the phrase rather than the table cell.

### An article the club has written but has not yet entered

`src/data/articles-extra.json` exists because the `articles` table **cannot be
written from a developer machine**: an anonymous INSERT is refused with
`42501 new row violates row-level security policy`, which is the posture
working exactly as designed. Only an admin session in Control panel → News can
create one, and a finished piece should not wait on somebody being at a laptop.

Same device as `fixtures-2627.json`, and the rule that makes it safe is the
same one: **it loses to the database, on the slug.** The moment the article is
entered in the panel the stored row wins outright and the file's copy vanishes
from the build, so it can never produce a duplicate and forgetting to delete it
costs nothing. A second source for editorial content is the fault this
repository keeps having; the dedup is what stops it being one.

- **Not into an empty database.** Gated on the STORED matches, not on
  `d.matches`, which already carries the transcribed pre-season fixtures - so a
  bare database still has eight of them and the obvious gate let the article
  straight through into the "what does a brand-new club's site look like"
  render.
- **A real photograph beats a drawn card, and drawing one anyway is not
  harmless.** `make-covers.mjs` drew a card for a match that already carried an
  uploaded photograph. The page correctly shipped the photograph, so the card
  was never used, but the build seeds the panel from *does a card exist on
  disk* - and that then disagreed with the pages: 39 records seeded as drawn
  against 38 actually shipping one. The panel's own `ensure()` already skipped
  these; the script did not.

## Forms — how a lead actually reaches the club
`form[data-enquiry]` writes to the `enquiries` table **and** posts `/api/notify-enquiry`. It succeeds if **either** lands.

**That double write matters.** The email endpoint is a graceful no-op until `RESEND_API_KEY` is set, so a form that only emailed would record nothing — which is exactly the bug that once left `enquiries` empty. Same pattern for the footer newsletter: `supporters` table **and** `/api/subscribe`.

Read leads in **Control panel → Inbox**; RLS blocks anonymous reads, so signing in is the only way to see them.

## Commands
```bash
npm run build     # regenerate every route (run after any src/ change)
npm run covers    # redraw the committed share cards (needs a local Chrome)
npm run visual    # render every page family and panel screen in a headless Chrome
npm run guard     # refuse to publish output that is broken (the deploy runs this)
npm run verify    # assert derived stats against the published league table
npm test          # 3,592 checks against the generated output and the rendered panel
npm run serve     # local preview on :4321
```

`npm test` covers: document structure, one h1 per page, heading order, alt text, resolvable assets and internal links, JSON-LD validity, asset-version consistency, overflow guards, reduced motion, both themes, WCAG AA contrast on every text token pair, form labelling, security headers, no service-role key in output, sitemap/robots correctness, and performance budgets. It also asks, of every page, that **no id is defined twice**, that **every aria reference lands**, that **no image repeats the text of the link it sits inside**, and that **no complementary landmark is nested** - the four things an `@accesslint/core` audit found that nothing here had a question for. And of the API: that the gated endpoints ask the database who is calling, and that the two anonymous ones throttle and escape everything the caller sent. Budgets are **gzipped KB**, one per bundle, and they are ceilings over a split thing rather than one big one: `sa.css` 22, `home.css` 26, `sa.js` 24, `control.css` 6, `control.js` 13, `control-seed.js` 8, and one per lazy panel chunk. **Code is budgeted apart from data**: `control-home.js` carries seventy-five band descriptions, so its emitted ceiling moved three times for growth that was not code, and `src/admin/lazy/95-home.js` and `10-match.js` are now measured as source so an edit to the code shows up on its own. **The deploy does not run this suite** (`sync && build && verify && guard`), so a page over budget still publishes: these are a signal to whoever is reading, not a gate on the club. The home page's margin is printed on every run for that reason. It also asserts the split stays split: that the match form and the photo tagger are not in the core, that every deferred panel maps to a chunk that exists and is cache-busted, and that routing does not gate on a module having been downloaded.

**Images are budgeted too, and were not.** Every bundle had a gzipped ceiling and images had none, so the whole apparatus watched 32KB of stylesheet while 231KB of photograph walked past it - on the home page the images outweigh the HTML, the CSS and the JavaScript together. Now measured: the heaviest page's **eager** payload (288KB ceiling, index.html at 231KB), the mean across all 108 (96KB ceiling, currently 62KB), `width` and `height` on all 2,954 images, and a **srcset on anything over 100KB**. Raw bytes, not gzipped: these formats are already compressed and a gzip figure would be a fiction dressed as precision.

**That srcset rule asks about size, not timing.** It ran on eager images only at first, which is the wrong question: making an oversized image lazy takes it off the critical path and does nothing about a phone eventually downloading a desktop file to show it 325px wide. Which is exactly what the sponsors hero did after being made lazy an hour earlier. `/assets/hero/team.webp` has 480/800/1200 variants now, and the partner logo that was 112KB of PNG for a mark shown 153px wide was re-encoded to WebP at quality 1.0 and **proved faithful first**: composited on the white tile it sits on, the largest single-channel difference across 447x187 pixels is **1 of 255**. Staines Rugby was measured the same way, saved 1KB, and was left alone - not worth touching a partner's asset for.

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
- **A crest names its club and a photograph names its subject.** Every image carried `alt=""` - the textbook pattern for a logo beside its own name, and on this site the crest very often is NOT beside it: on the crest wall and the next-match card it is the only label there is. `clubCrest()` and `oppBadge()` name the club, the photo helpers name the person, and the star placeholder says it is the club star because that is what it shows and it is not a photograph of anybody. Root-page coverage **6% → 89%**, and an `@accesslint/core` audit of the squad cards and a league row reports no violations. The deliberate cost: in the league table the crest and club name share one cell, so a screen reader hears the club twice. Verbose, not wrong.
- **A page that rests on an external source names it.** `SOURCES` in `club.mjs` holds the three the site actually draws on: **FA Full-Time** (the table, the division's ninety results and the scoring chart are transcribed from it), **Surrey FA** (the county cup the club plays in - provable from four ties in the archive, which is why it is not London FA) and **the UK Sepsis Trust / NHS**. `sourceNote()` in `blocks.mjs` renders it once so fourteen pages cannot word it fourteen ways. An AEO audit scored the site 0/7 on outbound citations; the rule is not "two links per page" and six pages still carry none **on purpose** - 404 and the Google token have no content, and news, videos, live and the gallery are the club's own work. The suite names those six, so adding to the list is a decision rather than a way to silence a check.
- **Structured data describes the page it is on.** The home page shipped `FAQPage` markup naming five questions whatever the club had chosen, and the club has Ask the Angels switched off - so it told a search engine it carried content it did not. `faqSchema` follows the band now, and the suite fails any page whose FAQ markup has no visible questions behind it.
- **A claim about the FUTURE is only made about somebody still at the club.** `milestones()` is the one band that says what is about to happen, and it said it about everybody: William Clark retired in June 2026 and the front page had him two assists from ten. It filters on `isPlaying()` now - retired, left and moved into coaching are out; injured and unavailable this season stay, because a man out for the season is coming back. **The past tense is untouched and that is the point**: every appearance, goal, leaderboard place, club record and Those who came before entry stands exactly as it did. What stops is the club saying they are about to add to it. The filter is inside `milestones()` rather than at the call site because the band and the test that decides whether to draw it both call it, and a band that empties itself on a different question from the one it renders is how a heading ends up over an empty list.
- **The milestone step reads `apps`, not `starts`.** The label has always said appearances and the figure was starts, which were the same number until a substitute the record can prove was on the pitch started counting. The band told the front page that Charlie Dunkley was one appearance from 25 when he had already played 25. The stale note under it ("appearances count starts: Sunday-league returns do not record substitutes") was a fourth copy of the one removed from three other pages.
- **No em dashes** in copy.
- **Writing about the cause.** The club exists because Susan Anne Martin died of sepsis, and that asks for care the style rules above do not cover. Say **she died of sepsis**, never "lost her battle" or "fought": it was an illness, not a defeat. Warm and plain, not mournful and not inspirational. **Never point it at an outcome** - it does not appear in a sponsorship pitch, a recruitment line or as a reason to click, because a death is not a selling point. **Never medical advice**: link the UK Sepsis Trust and let them do that. And when a piece is about football, let it be about football; the cause has its own page and does not need a paragraph bolted onto a match report.
- **Understate it.** Eighteen from eighteen speaks without help, and "incredible", "unbelievable" and "historic" all make it smaller. A real number instead of an adjective, and say the awkward part out loud: "3 of the 33 were awarded as walkovers and carry no score" is why the rest is believable. An empty state says what is missing, why, and what fills it, never "No data available".

## Adding a field to the control panel

Four rules, each of them written after the failure it prevents. `harden-site` audits for these after the fact; these are how not to need it.

- **Write the reader first.** A field with no consumer is a lie with a save button. Two tables were written by the panel and read by nothing for as long as their editors existed.
- **Say where it shows, in the hint, and make it a `where:` link.** A label that promises an outcome is a testable claim, and "What the website publishes" was false for six match reports.
- **Absent must mean the safe default.** `draft: true` hides an article; missing means published, so nothing already saved needs migrating.
- **The panel never offers what the site derives.** New signing, retained and returned are worked out from evidence. Offering them as choices creates a second source for one fact, and the two will disagree - the panel called a first-ever signing "Retained" for exactly this reason.
- **No squad numbers, and not as a bare numeral either.** The club plays with
  none: the number is a storage key, and a Sunday-league team sheet is a list
  of keys. The existing check catches the words - "No.", "Squad number" - and
  would sail past the likelier leak, which is the key printed on its own beside
  the person it belongs to ("38 Rob Heath" in a team sheet). Every generated
  page is now asked, for every player, against **their own** number. One
  coincidence is allowed **by name**: `awards.html` prints rank, name and count,
  so "5 Andrew Allen 2" is fifth place with two awards and his key happens to
  be 2. Named rather than exempting the page, so a real leak on awards.html
  still fails, and as a subset test, because a coincidence that stops appearing
  is not a weakened check.
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
10. **A check that runs after the report is not a check.** `run.mjs` printed its failures and called `process.exit(1)` two thirds of the way down the file, because for a long time that was the end of it. Three blocks were later appended **after** that point - the image budgets, the clean-sheet provenance and the entire panel render suite - and every one of them was incapable of failing the build: their failures were pushed to `fails` after the report had printed, and the last line says "All N checks passed" unconditionally. So the newest hundred-odd checks, every one written to catch a bug that had actually shipped, ran and were thrown away. It also hid that the clean-sheet checks had been wrong from the moment they were written (they read `m.data`; a normalised match carries the stored record on `m.detail`). **The report is the last thing in the file now and nothing may be added below it.** Found by breaking a check on purpose and watching the suite congratulate itself.

## What is at its ceiling and what is not

Every area of this project has been pushed as far as code can push it. Four are
bounded by something code cannot supply, and saying which is more useful than
claiming they are finished.

- **The record itself.** 17 players have no photograph and the gallery cannot
  supply one (see below); seven matches have no team sheet; two pre-season
  goals are unattributed; one cup tie has no stored shootout result; Mala Vida
  FC has no badge anywhere. Every one of these is a fact somebody has to enter
  in the panel, and every one of them is now **counted on the dashboard** with
  a button to the screen that fixes it. That is the part code can do: turn a
  gap into a job.
- **The probe row in `enquiries`.** Deleting it needs the sign-in only the club
  has. One press, in the Inbox.
- **Layout, in `npm test` itself.** `src/test/dom.mjs` has no cascade and
  refuses `getComputedStyle` rather than inventing one, which keeps the suite
  runnable anywhere in eight seconds. `npm run visual` is the browser (below),
  and it runs in CI rather than in the suite for that reason.
- **Inline scripts in the CSP.** `script-src` keeps `'unsafe-inline'` because
  the theme is applied by an inline head script before first paint and every
  page carries JSON-LD, which `script-src` also governs. Hashing those would
  mean a distinct header for each of 108 routes.

## Outstanding / known limitations
- **`team_badges` is empty (0 rows), and that is not the same as having no crests.** 25 of 26 opponents resolve a badge through `oppBadge()`, which tries an uploaded row, then `badges-extra.json`, then the recovered registry, then a needle (`woking` finds Woking Vets for "Woking Veterans Sundays"). Only **Mala Vida FC** has none. Counting the table instead of asking the resolver is what made the dashboard report "0 of 26" and invite the club to re-find 25 badges it already had. `fixtures` has **1** row - the BPR friendly of 30 August, written by the panel. This note said 6 and `fixtures-2627.json` said 0, and the truth was neither: the six pre-season friendlies are transcribed in that file from the club's July announcement, and exactly one of them has since been entered in the panel as well. The transcribed rows lose to a real row on the date-and-clubs identity test, so the duplicate never reached the site, which is why nobody noticed.
- **What is still to come is derived once**, in `dataset.mjs` as `d.upcoming` / `d.nextFixture`, against the day the site was generated. Six pages each used to sort `fixtures` and take the first without checking whether the date had passed, so the morning after a match the home page still led with it and the countdown ran backwards. Two of the six filtered on `m.played`, which a fixture row does not carry. Nothing re-derives it now.
- **A probe row exists in production `enquiries`** (`name = __probe_delete_me`), created while auditing RLS. Anonymous clients cannot delete it; remove it from Control panel → Inbox once signed in. **The dashboard says so on the screen the club lands on**, with a button to the inbox, because a note in this file is not a thing anybody who can fix it ever reads.
- **One cup tie has no stored shootout result** (`r20260412-kew-ccup`, Kew Antigua 2-2). It is shown as penalty-decided with no winner claimed rather than inventing one.
- **Stripe donations** are built and the panel owns the link (Control panel → Donations). The cause page falls back to the link that is live today if the record is empty.
- **16 of 36 players have no photograph, and the gallery cannot currently supply one.** All 624 photo tags are a bare name, which means "somewhere in this frame", and none is marked as the **subject**. Only 5 of the 16 are tagged at all, and every frame is one of two useless kinds: unambiguous but a wide match shot where the player is about forty pixels tall among five team-mates, or close enough to crop but carrying two names with nothing saying which face is which. Cropping one of those is how a player ends up wearing somebody else's face, which has happened here. The machinery is right and the data is not: **Control panel → Photo tagging → mark a subject** promotes that frame to the front of Player photographs → From the gallery, which now sorts by subject, then by fewest other people tagged, and says which it is showing.
- **No photograph of Susan Anne Martin exists in the repo.** The cause page opens on the crest. If the family can clear a photo it belongs there.
- **An appearance is a start, or a substitute the record can prove was on the pitch.** It used to be starts only, and the reasoning was sound while the evidence did not exist. Two things supply it now: the bench carries `on`, and where nobody has ticked it the match record often proves it anyway. **A man who scored played, whatever the sheet says about him.** That gap published as **William Clark, seven goals from two appearances** — he came off the bench for five of them. Ten players moved, every one on evidence. A name on the bench with nothing beside it is still not an appearance, which is the part of the old rule that was right, and the suite's check for it is the negative one. Somebody credited in a match he is on no sheet for gets nothing either: that is a broken record, and three are in the archive.

  **The label had to move with the figure.** `playerProfile` returned `starts: played.length` and `played` stopped meaning starts, so eleven appearances published under the word **Starts**. It returns both now, they differ for ten players, and the squad cards, the stats table and the player pages all say *Appearances*. Three pages carried a note explaining that starts were shown *because* the engine could not count substitutes; that reason is gone and so are the notes. The suite fails any of those pages that prints the word Starts, because with ten players it would now be a false statement rather than a narrow one.
- Videos page links out to YouTube; per-video embedding awaits catalogued rows.
- **The league table is transcribed, and now checked against the results it is made of.** It never needed fetching: the site already holds all ninety division matches because it prints them under "Around the league", and a ten-club double round robin is exactly ninety. `deriveTable()` in `stats.mjs` builds the table from them and `npm run verify` asserts the two agree, so a mistyped figure or a wrong division result stops the build. That is the loud failure the retired `TableSync.jsx` was meant to provide, with no third-party proxy and no hard-coded fallback in the path. **Walkovers are the whole difficulty**: seven of the ninety were awarded, and counting them as scoreless draws moved six rows out of ten and cost the club six points. Where two clubs are level on every figure (Old Freemen's and Shepherd's Tuesday both finished P18 W5 D2 L11, 28-36, 17) the order is the league's to decide, so the check compares club by club and only asserts that the published order makes sense of its own figures. A live 26/27 table still has to be typed in as the season goes, but **the Full-Time ids are recorded now**, in `src/data/league-eight-2627.json`: league `3545957`, season 2026-27 `709965053`, division League Eight `879497042`. The season starts **Sunday 6 September**, at home to Three Little Birds, 11:00.
