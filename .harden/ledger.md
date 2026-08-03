# Hardening ledger

Append-only. Each run of the `harden-site` skill reads this first, so that a
second run starts where the last one finished rather than re-deriving it.

The "Checked, and sound" section is the half that saves time. Without it every
run re-discovers that nineteen of twenty suspicions were never defects.

---

## Run 2026-08-03

Seeded from the sweep that produced the skill. Everything below was
demonstrated on built output or on the live site, not inferred from reading
code.

**Swept:** the panel's promises; derived figures against their sources; data
reaching the page; house style in shipped copy; staleness; orphans and
duplicates; the two-implementations problem.

**Found and fixed**
- The match editor's box labelled "What the website publishes" published
  nothing. Every match page read `commentary`, so six finished reports, about
  25,000 characters, sat unpublished, and the Clear button's promise that the
  site "falls back to your notes" was untrue because the notes were all it had
  ever shown. Four places decided what "the report" was and gave three
  answers. → `f30f115`
- Club-written prose arrived with whatever typography it was pasted from: 52 em
  dashes against 2 en dashes, 260 straight apostrophes against 56 curly, and
  "Division Ten" in 24 places for a league the site calls League Ten. Fixed at
  the boundary in `src/lib/prose.mjs`, not at fourteen render sites. → `f30f115`
- Seven albums held 606 photographs of seven matches and neither page linked to
  the other. Each album re-typed the fixture into its title; two lost the
  separator, so the gallery printed the competition as part of the fixture. The
  date field held the upload afternoon, so all seven read June 2026 for games
  spanning September to February. → `cec5504`
- Sixteen venue strings for about nine grounds, including "Meadhurst Sports
  Clun" and the club's own ground as a postal address. "Barns Elms" was the
  misspelling, not the fix. → `41b47ad`
- Eight player pages read "28th of 27": a rank outside the population it names,
  because players who started no matches were ranked against those who did.
  → `88848d9`
- The position list showed `0.5` to the eye and said "1 match" to a screen
  reader — one row, two figures, two units. → `88848d9`
- The dashboard reported "0 of 26 opponents have a badge" while 25 crests were
  shipping, because it counted rows in a table its own uploader writes and
  which has none. It was inviting the club to re-find 25 badges it had.
  → `5ee084a`
- The home page's next-match card was fixed at build time, so it led with a
  played fixture under a countdown reading "Kick-off" until the next publish.
  → `78a71e7`
- No draft state on an article: anything saved went live at the next Publish.
  And the generator never deleted a page, so a deleted article kept serving at
  its URL for good. → `f112fed`
- A result and the fixture it came from are the same match under two ids
  (`r2026…` / `f2026…`), so Pure Football away appeared twice at once: the 0-2
  on the results page and the same match under "Played, not yet counted".
  → `6d82315`
- Pre-season friendlies counted towards competitive figures. The dugout's
  record read 34 played, 30 wins. → `6d82315`

**Checked, and sound**
- All 101 sitemap routes return 200 on the live site, one `h1` each, a meta
  description on every one.
- All 606 Supabase gallery URLs resolve. Zero broken images across 22 pages.
- Zero console errors across every page type.
- 477 proportional bars and 91 gauges agree with the figure printed beside
  them: the stats table, 96 profile bars including each "26 of 30" under a
  percentage, 140 squad-comparison bars, 31 position bars.
- Every album's scoreline, date, competition and home/away agrees with its
  match record.
- The published league table agrees with all 90 division results, walkovers
  counted properly. Now asserted by `npm run verify`.
- 25 of 26 opponents resolve a badge through `oppBadge()`. Only Mala Vida FC
  has none.
- No service-role key in shipped output. Security headers present.
- `.firecrawl/` is 108MB of scraped reference pages but is gitignored and never
  deployed — a false alarm worth not raising twice.

**Left deliberately**
- **Mala Vida FC has no crest.** Nothing to fix in code; the club can upload
  one. Would change if a badge file appears in `assets/badge/`.
- **16 of 36 players have no photograph and the gallery cannot supply one.**
  All 624 photo tags are a bare name meaning "somewhere in this frame"; none is
  marked as the subject. Every candidate frame is either unambiguous but a wide
  pitch shot with the player forty pixels tall, or close enough to crop but
  carrying two names with nothing to say which face is which. Choosing is how
  somebody wears another player's face, which this site has done before. Would
  change the moment anybody marks a subject in Photo tagging.
- **No live FA Full-Time fetch.** The league id is recorded nowhere, Full-Time's
  home page is a search form with no table, and League Eight does not start
  until 6 September, so a parser written now would be guesswork against a page
  that does not exist. The derived-table check covers the recorded season
  instead. Would change once a real league URL is known.
- **The probe row in production `enquiries`.** Deleting it needs the sign-in
  only the club has. Flagged in the inbox and on the dashboard as safe to
  delete.
- **`sa.js` ships the next-match logic to 101 pages to run on one.** 386 bytes.
  The right answer at the next raise is to split `sa.js` per page the way the
  stylesheets already are, not to raise again.

**Overdue**
- The consent gate and the two third-party scripts behind it: not exercised
  this run.
- The service worker's cache behaviour across a version change.
- `api/publish.js`, `api/notify-enquiry.js` and `api/subscribe.js`: read, not
  invoked. The enquiry double-write is the one with a known past failure.
