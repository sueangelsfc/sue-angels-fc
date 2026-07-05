# REDESIGN BRIEF — Sue's Angels FC

**Read this first.** This is the front door for a **complete, ground-up reinvention** of the Sue's
Angels FC website. Scope: **full rebuild** — new visual language, new layout system, new interaction
model, and the stack itself is yours to choose. This brief tells you the creative mandate, what the
site is, what you are free to change, what you must not silently break, and where everything lives.

This is **not** a refresh and **not** an iteration. Use the existing site (below) purely as a
**content inventory and feature reference — never as a design reference.** Do not preserve its
layouts, components or visual hierarchy. Challenge every decision; rebuild every component from
first principles.

---

## THE CREATIVE MANDATE

Build an **experience**, not a website. The benchmark is not other football sites — it is **Apple,
Stripe, Linear, Vercel, Framer, Nothing, Rivian, Arc Browser, and Awwwards Site of the Day winners.**
The finished site should feel like a premium digital product from an elite design studio, and should
be as memorable visually as it is excellent in UX, accessibility and performance.

Principles to hold throughout:

- **Every page tells a story.** Every scroll reveals something new. Every interaction delights.
- **Nothing is static.** Backgrounds feel alive, typography animates in elegantly, cards feel
  tangible, images have depth, buttons respond with personality, hovers feel satisfying, transitions
  feel cinematic. But **motion guides attention — it never distracts from it.** Every animation has
  a purpose.
- **If information can become an experience, make it an experience.** If a component can become
  interactive, make it interactive. Take every chance to make something more immersive, more
  intuitive, or more beautiful.
- **Redesign for objectively better, not merely different.** Nothing changes just to look new;
  everything changes to be better in UX, clarity, emotion or craft.
- **Reinforce the club's identity and build emotional engagement with supporters** — this is a club
  founded in memory of someone, so the emotion is real, not decorative.

### The technique toolkit (use where each genuinely outperforms the alternative)

- **GSAP** — cinematic timeline animations, scroll-triggered storytelling, staggered reveals,
  parallax, page transitions, and micro-interactions.
- **Three.js** *(where appropriate)* — immersive 3D, depth, lighting, particles, floating objects,
  interactive scenes, premium visual effects. Use it where it elevates the story; don't bolt 3D onto
  pages that don't need it.
- **Modern CSS animation** where it outperforms JavaScript.
- **GPU-accelerated transforms** for maximum performance.
- **Spring-based / physical motion** that feels physical rather than mechanical.

### The three balances (non-negotiable — this is what separates award-winning from merely flashy)

1. **Beauty ↔ usability** — it must be effortless to navigate and use, not just to look at.
2. **Innovation ↔ accessibility** — full keyboard/screen-reader support, real alt text, focus states,
   reduced-motion honoured (`prefers-reduced-motion` must gracefully strip the heavy motion), colour
   contrast. An Awwwards winner that fails accessibility is a fail here.
3. **Creativity ↔ performance** — GPU transforms, lazy-loaded 3D/heavy assets, code-splitting, fast
   first paint, smooth 60fps. Immersive must not mean slow. Test on mobile.

**Tension to resolve deliberately:** Three.js + GSAP + full motion vs. the hard constraints below
(the live Supabase/CMS content layer, existing routes/SEO, the Vercel deploy). The reinvention is
free to introduce a build step / bundler (Vite etc.) — but if it does, it must carry the content
layer forward and update the deploy config. Decide the stack up front and make it coherent.

---

## STEP 1 — Go and look at the live site (do this before touching code)

The current site is live. Study it page by page first so your redesign is a deliberate upgrade, not
a reskin of assumptions. **Canonical host is `www`** (the non-www apex has an unreliable TLS cert —
always use the `www.` URLs below).

Open / fetch each of these:

| Page | Live URL |
|------|----------|
| Home | https://www.suesangelsfc.co.uk/ |
| About | https://www.suesangelsfc.co.uk/about.html |
| Champions | https://www.suesangelsfc.co.uk/champions.html |
| Team | https://www.suesangelsfc.co.uk/teams.html |
| Coaches | https://www.suesangelsfc.co.uk/coaches.html |
| Squad | https://www.suesangelsfc.co.uk/squad.html |
| Stats | https://www.suesangelsfc.co.uk/stats.html |
| Records | https://www.suesangelsfc.co.uk/records.html |
| Awards | https://www.suesangelsfc.co.uk/awards.html |
| Schedule | https://www.suesangelsfc.co.uk/schedule.html |
| Fixtures | https://www.suesangelsfc.co.uk/fixtures.html |
| Results | https://www.suesangelsfc.co.uk/results.html |
| League table | https://www.suesangelsfc.co.uk/table.html |
| League | https://www.suesangelsfc.co.uk/league.html |
| Live | https://www.suesangelsfc.co.uk/live.html |
| Media | https://www.suesangelsfc.co.uk/media.html |
| News | https://www.suesangelsfc.co.uk/news.html |
| Gallery | https://www.suesangelsfc.co.uk/gallery.html |
| Videos | https://www.suesangelsfc.co.uk/videos.html |
| Sponsors | https://www.suesangelsfc.co.uk/sponsors.html |
| Contact | https://www.suesangelsfc.co.uk/contact.html |
| Join | https://www.suesangelsfc.co.uk/join.html |
| Sepsis awareness | https://www.suesangelsfc.co.uk/sepsis.html |

Not public, do not redesign: `admin.html`, `league-admin.html` (the club's CMS — see constraints).

**How to view it in this environment:**
- Fetch a page's rendered content: use `WebFetch` / `firecrawl-scrape` on any URL above.
- See it visually / test interactions: run it locally (below) and use the `preview_*` tools, which
  can screenshot, snapshot the DOM, click, and resize. The live pages pull React + Supabase from
  CDNs, so a local copy renders identically.

---

## STEP 2 — Run it locally

No build step. From the repo root:

```
npx serve
```

Then open any `.html` (e.g. `http://localhost:3000/index.html`). Everything loads from CDN, so the
local copy behaves like production. Use `preview_start` → `preview_screenshot` / `preview_snapshot`
to verify your changes.

---

## What this is

A static marketing + live-club-data site for **Sue's Angels FC**, a **men's** London Sunday-league
football club (note: men's, not women's — do not assume from the name). Founded 2025 **in memory of
Susan Anne Martin**, and it champions **sepsis awareness**. It won **League Ten 25/26** (champions,
promoted, unbeaten) and is entering **League Eight 26/27**. The site is both a public shopfront
(recruitment, sponsorship, story) and a living record (fixtures, results, table, squad, stats,
media) that the club updates itself through a CMS.

**Tone:** confident, premium, uppercase display headings, British English, **no em dashes**, no
emoji. "League Ten / League Eight" — never "Division".

---

## Brand quick-reference (current — you may evolve it, but it should still feel like this club)

- **Colours:** volt yellow `#D6F23A` (accent) · navy `#071D29` (ink/base) · light bg `#EAEEF2` ·
  result colours win `#25E27B` / draw `#F2C744` / loss `#FF4D5E`.
- **Type:** Clash Display (headlines/stats) + Hanken Grotesk (body/UI). Self-hosted in `assets/fonts`.
  You may change the pairing, but honour the typography rule below.

### Typography rule — NO generic "AI default" fonts

The type is a large part of why a site reads as elite vs. templated. **Do not** reach for the
default, overused, "AI-generated" typefaces: **Inter, Roboto, Open Sans, Lato, Montserrat, Poppins,
Nunito, Space Grotesk (as everything), or the raw system stack.** These are the tell of a generic
build and are banned here.

Instead choose **distinctive, premium, characterful** typefaces with a real point of view — the kind
Apple/Stripe/Linear/Nothing/Rivian-tier sites use (bespoke or high-craft display faces, expressive
grotesks, a considered serif/sans contrast). The current Clash Display + Hanken Grotesk pairing is a
good baseline of the *bar* to clear or beat. Whatever is chosen must be **properly licensed for web,
self-hosted** in `assets/fonts` (no hotlinking that leaks a generic Google-Fonts look), preloaded,
and subset for performance.
- **Feel:** premium glassmorphism, light **and** dark mode, subtle motion.
- Full token set + design explorations: `design/DESIGN.md`, `design/design-tokens.json`, and the
  standalone concept HTML files in `design/`.

---

## The pages and everything on them

`SITEMAP.md` is a **complete, section-by-section inventory of every page** (hero → stats → tables →
CTAs → footer), including the showpiece interactive pieces (the player-analytics profile modal, the
league table, the matchday score-covers). Treat it as the functional spec of what the redesign must
still deliver. Read it in full before designing.

---

## LICENCE TO GO FURTHER

This brief is a floor, not a ceiling. **You are trusted and encouraged to do anything better** than
what is written here. If you see a stronger layout, a smarter interaction, a more beautiful component,
a better information architecture, a cleaner data model, a nicer admin flow, a feature that would
delight supporters — **do it, or propose it.** Improve anything you touch. Bring ideas the brief didn't
think of. The named directions below are the club's must-haves; everything else is open to your
judgement and craft.

The only lines you may not cross without a deliberate plan are the **HARD CONSTRAINTS** further down
(don't lose the club's live content/ability to edit it, keep routes/SEO, keep it accessible, fast and
mobile-safe, keep the deploy working). Inside those lines, exceed the brief wherever you can.

---

## SIGNATURE DIRECTION (explicit requests from the club)

These are not suggestions — the club has asked for them by name.

### The hero — a 3D animated crest, not squad photos

The current hero uses team photography. **Replace it with a bespoke, award-winning 3D animation of
the club crest.** The crest is the emotional core of the brand (a shield with the volt angel, halo,
wings, "SUE'S ANGELS", EST 2025, and the motto *"What we do in life echoes in eternity"*). Make it the
hero moment: think the crest building itself, the shield extruding/rotating with real depth and
lighting while the volt angel, wings and text lift out and settle in staggered layers; particles /
light shafts / a living volt-on-navy field behind it; parallax and pointer-reactive tilt; a cinematic
GSAP timeline on load that resolves into a calm, interactive resting state. Three.js is the right tool
here. It should feel like the Nothing / Rivian / Apple product-reveal tier, and it should carry the
club's meaning (remembrance, ascension) — not be 3D for its own sake.

**Vectors are prepared for exactly this** (see assets below): `sue-angels-crest-silhouette.svg`
(the shield outline — extrude / bevel / mask / 3D geometry) and `sue-angels-crest-marks.svg` (the volt
angel + wings + halo + text as a separate, overlay-aligned layer to animate independently). Both share
a `0 0 512 512` space so they recombine perfectly.

### Profile cards — modernise them

The player cards and the player-profile modal are a showpiece (see `SITEMAP.md` §Team). Make them feel
distinctly **modern and premium**: tactile depth, pointer-reactive 3D tilt / glare, smooth spring
motion, elegant data viz (the rings, sparklines, pitch position, last-10 form), refined typographic
hierarchy, satisfying open/close transitions. They must **degrade gracefully where a player has no
photo** (photos are cloud-fed and sparse — see assets).

---

## ASSETS — what you have, and what you don't

Design to reality, not to placeholders.

**You have:**
- **Crest** — raster (`sue-angels-badge*.png/.webp/.jpg`, transparent `-cutout`, `-shield`) **and now
  two prepared vectors** for the 3D hero: `assets/badge/sue-angels-crest-silhouette.svg` and
  `assets/badge/sue-angels-crest-marks.svg` (regen with `scripts/trace-crest.py`).
- **Opponent crests** — ~35 clubs in `assets/badge/` (png + webp), used by the badge registry.
- **Hero photography** — 12 shots in `assets/hero/` (`banner-01..12`, jpg + webp).
- **Fonts** — self-hosted woff2 in `assets/fonts/` (Clash Display ×4, Hanken ×5). See the typography
  rule — you may replace these, but a new premium face must be licensed + self-hosted here.
- **UI icons** — SVG in `assets/icons/` (trophy, whistle, pitch, football, captain, shirt) — animatable.
- **OG / sponsors / sponsorship pack** — in `assets/og/`, `assets/sponsors/`, root PDF.

**You DON'T have (plan around it):**
- **Player photography is thin and cloud-fed.** Only one real player cutout ships in `assets/players/`;
  the rest live in Supabase (`player_photos`) and coverage is incomplete. Any design that leans on a
  full set of player portraits will break — provide a strong crest/monogram fallback.
- **No full-colour vector of the crest.** The two SVGs above are a silhouette + a volt-marks trace
  (great for motion/3D). A pixel-faithful full-colour vector redraw, if ever wanted, is a manual
  designer job — flag it and I/the club can commission it.
- **The crest raster is 512×512.** Fine as a Three.js texture; for a giant sharp hero, prefer the SVGs
  (resolution-independent) over upscaling the PNG.

---

## THE BACKEND IS IN SCOPE TOO (read this before touching data or admin)

The club has said **the backend also needs redesigning** — so understand it before you change it. It
is two distinct layers; treat them differently:

**A. The data layer (the club's real content) — KEEP or deliberately MIGRATE, never lose.**
- Storage is **Supabase (Postgres + Auth)**. Every content table uses one generic shape:
  `(key text primary key, data jsonb, updated_at timestamptz)`. Tables: `matches`, `fixtures`,
  `team_badges`, `player_photos`, `articles`, `gallery`, `recognition`, plus `supporters` and
  `enquiries` (schema in `schema.sql`).
- **Row-Level Security** is the safety model: content tables are **public-read, admin-write** (writes
  require a signed-in user); `supporters` + `enquiries` are **public-insert, admin-read only** (visitor
  emails/leads stay private). Do not weaken this.
- The browser talks to Supabase through **`dataStore.js`** — a `window.*` getter/setter abstraction
  with a **localStorage cache and optimistic writes**. Crucially it has a **`local` fallback**: with no
  Supabase config it runs entirely on localStorage (that's the preview mode). Auth + client live in
  `supabase.js` / `supabase-config.js`; admin is gated by a single email.
- **Because the data is a simple key→jsonb map, it is portable.** A rebuilt front end can keep calling
  the same tables, or you can design a cleaner schema and write a migration — but the club must not lose
  content or the ability to edit it.

**B. The admin CMS (the editing UI) — this is the part most worth reinventing.**
- `admin.html` + 11 `.jsx` files (`AdminPanel.jsx`, `MatchEntry.jsx`, `FixtureEntry.jsx`,
  `GalleryAlbums.jsx`, `MediaStore.jsx`, `Nav.jsx`, `PlayerPhotos.jsx`, `TableSync.jsx`, etc.) run on a
  **legacy in-browser Babel** stack — deliberately old, and the club edits everything through it. A
  redesign can rebuild this into a modern admin dashboard, **but it must still write through the same
  auth + RLS rules to the same data** (or the migration in A), and stay dead simple for a non-technical
  club admin to use on a phone.

**C. Serverless API (`api/`, Vercel functions) — rework as needed, don't drop silently.**
- `api/og-image.js`, `api/og-cover.js`, `api/share.js` (share/OG-image generation), `api/subscribe.js`
  (newsletter), `api/notify-enquiry.js` (lead notifications), `api/claude.js`. Keep the capabilities
  (OG images, enquiry capture, subscribe) working under whatever stack you choose.

---

## HARD CONSTRAINTS — a "full rebuild" may change everything EXCEPT these

Even though you're free to change the stack, the site is live with real users, real content, and
real SEO. Breaking any of the following is a regression, not a redesign:

1. **The content/CMS layer stays functional (or is deliberately migrated).**
   Live content — results, fixtures, squad, coaches, articles, gallery albums, videos, sponsors,
   league table — is **not hard-coded**. It lives in **Supabase** and is edited by the club through
   `admin.html` (the CMS). `dataStore.js` is the data layer; `admin.html` loads `.jsx` files
   transpiled in-browser. If your rebuild replaces the front end, you must **either keep reading from
   the same data layer or plan and build a migration** so the club doesn't lose its content or its
   ability to edit it. Do not ship a redesign that only shows static placeholder data.

2. **All existing routes/URLs keep working.** The pages in the table above are indexed and linked
   externally. Keep the same filenames/paths (or add redirects in `vercel.json`). Preserve
   `robots.txt`, `sitemap.xml`, per-page SEO meta + JSON-LD, and canonical `www`.

3. **Deployment model.** Hosted on **Vercel**, source on **GitHub** (`sueangelsfc/sue-angels-fc`),
   auto-deploy on push, Root Directory = repo root, Framework = "Other". If you introduce a build
   step, you must update the Vercel config to match — today there is intentionally none.

4. **Real assets are the club's, use them.** Crest, team/hero photos, player photos, sponsor logos,
   OG images and the sponsorship pack live in `assets/` (`badge/`, `hero/`, `players/`, `sponsors/`,
   `og/`, `fonts/`). Reuse the real crest and photography; don't invent placeholder branding.

5. **Accessibility + mobile.** Light/dark themes, no horizontal overflow on mobile, real alt text,
   focus states. The current build has a hard-won mobile-hardening pass — don't regress it.

---

## Where the current implementation lives (reference / salvage, not scripture)

You can replace these, but read them to understand behaviour before you do:

- `CLAUDE.md` — the authoritative description of how the current site is built and its footguns.
- `ARCHITECTURE.md` — architecture notes.
- `SiteApp.js` — the **entire current public app** (all pages + header/footer/router), hand-written
  `React.createElement`.
- `app.css` — the single public stylesheet; design tokens in `:root` (search `--m-`).
- `dataStore.js`, `supabase.js`, `supabase-config.js` — the data layer over Supabase.
- `PageShell.js` / `PageShell.jsx` — club badge registry + shared squad/coach data (public + admin).
- `admin.html` + its `.jsx` files (`AdminPanel.jsx`, `MatchEntry.jsx`, `FixtureEntry.jsx`,
  `GalleryAlbums.jsx`, `MediaStore.jsx`, `Nav.jsx`, etc.) — the CMS. Legacy stack, keep it working.
- `scripts/` — `bump.sh` (cache-bust assets across pages), `drift-check.sh`, `ship.sh` (deploy).

---

## Definition of done for the redesign

- Every page in the table above exists, at the same URL, delivering the content described in
  `SITEMAP.md` — but reimagined, not reskinned.
- Real club data still renders and is still editable by the club (constraint #1).
- The three balances hold: it's beautiful **and** effortless, innovative **and** accessible
  (keyboard/SR/reduced-motion), creative **and** fast (60fps, quick first paint, tested on mobile).
- Motion has purpose everywhere; nothing feels static; interactions delight without distracting.
- Works in light and dark mode, no mobile overflow.
- Deploys to Vercel with the config matching whatever stack was chosen (build step carried through
  if introduced).
- Passes the gut check: could this credibly be an **Awwwards Site of the Day**? If not, it isn't
  done.

---

*Prepared for a Fable 5 redesign session. Start at STEP 1.*
