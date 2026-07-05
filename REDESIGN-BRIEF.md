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
