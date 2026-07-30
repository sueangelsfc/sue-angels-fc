# Reference: castore.com

Studied 2026-07-07 via Firecrawl (pre-scraped `rawHtml` + `branding` + `images`, analysed in sandbox) plus a real-browser scroll observation (ground truth for nav/hero/motion). Castore is a British premium performance-sportswear e-commerce brand (Shopify). The homepage teardown here is a **SALE-mode** capture (a "SALE LIVE" campaign was running).

## Identity snapshot
- **Style:** monochrome **retail** commerce — stark black-and-white cinematic sports photography, generous white chrome, one signal **RED** accent reserved for SALE/urgency. Editorial restraint over decoration; premium-athletic, not loud.
- **Colour:** Dawn-style RGB-triplet token system. `--color-background: 255,255,255` (white) / `--color-foreground: 0,0,0` (ink). Buttons pure black (`--color-button: 0,0,0`) with white text. **Accent RED `#FF4242`** (links/SALE; also `#ff2525` in the SALE banner). Alt colour schemes carry a dark surface `#242833` (36,40,51) and near-black `#121212`. Hierarchy is type + photography; red is the ONLY chroma and it means "sale".
- **Type:** self-hosted **Inter** everywhere (`--font-body-family: Inter, sans-serif`, `--font-heading-family: Inter, sans-serif`; woff2 weights n4=400 and n6=600 self-hosted at `/cdn/fonts/inter/`). Weight tokens: regular 400, semi-bold 600, bold 700 — headings use 600 as their "bold". A secondary display face **GTStandard-M** (Regular/Medium/Semibold) is loaded via a Shoplift A/B test for some headings. Big black section headings ("Shop Sale By Category") are heavy, tight, sentence/title-case.
- **Radius:** soft-pill retail system — **buttons 30px** (full pill), **inputs 24px**, media tiles / cards ~**4px** (`--spacing.borderRadius: 4px`, baseUnit 4). Product/category image tiles are effectively square (`aspect-ratio: 1/1`).
- **Stack:** **Shopify** custom theme (Dawn-derived, theme id `t/832`) — Liquid sections, no SPA framework. Motion via **keen-slider** (`vendor-keen-slider.js` + `keen-slider.css`) and a house **`bao-carousel.js`**; Dawn's IntersectionObserver scroll-reveal; countdown.js for sale timers. **No GSAP / Lenis / Framer / Swiper.** CSS keyframes are minimal (only `spin` + `place-holder-animation` inline); motion is transition-driven + JS sliders.
- **Breakpoints (Dawn granular):** 360, 414/420/425, 500, 550, 750 (the primary mobile↔desktop switch — Dawn's `749/750px`), 768, 990, 1000, 1024, 1440. Header logo drops to 54px under 749px.

## Page anatomy (VERIFIED — browser scroll + Shopify section order)
Section order confirmed from the live `shopify-section` / `template--…` id sequence in `rawHtml`, cross-checked against the watched scroll. Top-to-bottom:
1. **Announcement bar** (BLACK) — auto-rotating carousel of utility messages (KLARNA / FREE DELIVERY) with **prev/next arrows**, centred, `max-width:550px`. keen-slider, `data-autoplay="true"` `data-speed="3"`. (`__announcement-bar` + `__countdown_announcement`.)
2. **SALE bar** (RED) — a "SALE LIVE" urgency strip in `#ff2525`/`#FF4242` directly under the announcement bar (campaign-mode).
3. **Header** (STICKY WHITE) — `position: sticky`. Black **winged-crest** mark + `CASTORE` wordmark; **centred** primary nav (SALE · Men · Sports · Women · Explore); search / account / bag icons right. Persists on scroll unchanged — does **not** hide or morph (see Micro-details).
4. **Hero slideshow** (`__slideshow`) — full-bleed B&W cinematic sports photo, giant RED offer text overlaid; a dark scrim (`.banner__media::after{opacity:.1}`). Slideshow section (can auto-advance between banners).
5. **Collection list** (`__collection_list`) — "Shop Sale By Category" big black heading + a **4-up square-tile image grid** (`aspect-ratio:1/1`), each tile a category photo with label.
6. **Image with text** (`__image_with_text`) — editorial split band (photo one side, copy + pill CTA other).
7. **Featured collection** (`__featured_collection`) — product rail/grid (keen-slider carousel of product cards).
8. **Collection list #2** (`__collection_list`) — second category grid band.
9. **Quote slider** (`__quote_slider`) — testimonial/press-quote slider with an **infinite auto-scrolling logo marquee** (`--autoscroll-timing: 80s`, gap 80px).
10. **Footer** (`__footer`) — link columns, localization, legal, newsletter.

Rhythm: WHITE editorial commerce throughout, punctuated by the BLACK announcement bar + RED sale bar at the very top and the DARK cinematic hero photo. One merchandising idea per band; square-tile grids do the heavy lifting; red appears only where money/urgency lives.

## Type, wordmark & media (verified)
- **One grotesk everywhere — Inter** (fallback `sans-serif`; GTStandard-M as an A/B display swap). Body 16px. Section headings large and heavy (weight 600), title/sentence case, tight leading. Small UI labels near-normal tracking (`letter-spacing` mostly `normal`/`0`, occasional `0.2rem`/`1px` on eyebrows). This is NOT a letter-spaced-uppercase editorial system like Wolverine — Castore keeps type tighter and more retail-utility.
- **Wordmark:** black **winged crest** monogram + `CASTORE` wordmark (single weight, not a two-weight split). Logo mark asset `CastoreBrandMark_Black.png`; favicon `Wings_Logo_V2.png`. (Clone as a crest-mark + single-weight club name.)
- **Buttons:** black **full-pill** (30px radius), white text, no shadow; secondary = light pill (`#EDEDED`) with black text/outline. Inputs 24px pill. Media tiles 4px, square.
- **Media:** photography-first, **no background video** on the homepage (unlike Wolverine) — full-bleed B&W stills in the hero and square photo tiles in the category grids. Hero media carries a faint dark scrim (`opacity:.1`) for text legibility.
- **Transitions present:** Dawn scroll-reveal (`opacity 700ms, transform 700ms`, `translateY(90px)→0`, cascade-staggered); slow cinematic state changes on filter/background/colour at **1.5s `cubic-bezier(0.65, 0.05, 0.36, 1)`**; snackbar/drawer at 250ms `cubic-bezier(0,0,0.2,1)`; keen-slider autoplay. (Values below.)

## Micro-details (keen-eye pass — the things that are easy to miss)
- **Nav is STATIC-STICKY, not a morph (verified in browser):** `.section-header { position: sticky; top: 0 }` — the WHITE bar simply pins to the top and **persists unchanged** on scroll. It does **not** hide-on-scroll-down, does **not** condense to a pill, does **not** go transparent. This is the deliberate opposite of Wolverine's 3-state machine: a calm, always-present retail chrome. Reproduce with plain `position:sticky;top:0;background:#fff;z-index:high` — resist adding scroll states.
- **Above the nav sits a two-tier utility stack:** a BLACK **auto-rotating announcement carousel** (keen-slider, `data-autoplay="true"`, `data-speed="3"`, centred, `max-width:550px`, with `.slider-button` prev/next arrows in inverse colour) + a RED **"SALE LIVE"** bar. These scroll away with the page; only the white header pins.
- **Red is a semaphore, not decoration** — `#FF4242` appears only on links + SALE urgency (bar, hero offer text). Everything else is strict B&W. Cloning the "signal accent" discipline matters more than the exact hue.
- **Square everything** — category/product tiles are `aspect-ratio:1/1`; the grid reads as a clean merchandising matrix, not editorial asymmetry.
- **Slow cinematic hover/state** — the standout easing is `cubic-bezier(0.65, 0.05, 0.36, 1)` applied over a long **1.5s** to `filter` / `background-color` / `color` (image-desaturate / colour-shift on interaction), which is what gives the B&W photography its "expensive settle". Fast UI (drawers, snackbars, opacity) stays snappy at 100–250ms.
- **Logo marquee** in the quote band scrolls infinitely via a CSS custom-prop timer (`@property --autoscroll-timing: 80s`), gap 80px — a cheap, GPU-light brand-logo ticker.
- **Mobile:** centred nav collapses to a hamburger; header logo shrinks to 54px under 749px; grids reflow to fewer columns via Dawn's granular breakpoints.
- No shadows on buttons/inputs (`shadow:none` throughout) — depth comes from the black-on-white contrast, not elevation.

> **Clone status:** analysed from real Shopify theme CSS + browser observation; not yet rebuilt. Config-grade tokens/motion; slider internals rebuild-by-eye (keen-slider is a known lib — swap in any snap carousel).

---

## Recipe 1 — Static-sticky retail header + rotating utility bar  ★ signature ★
**Recipe-grade** (real values from theme CSS + observed behaviour).

**What it is:** a calm always-present white nav that pins to the top and never changes state, sitting under a black auto-rotating announcement carousel and a red urgency bar. The anti-Wolverine nav: stability reads as "trusted store", not "cinematic site".
**How it works:** the utility stack (`announcement carousel` + `sale bar`) lives in normal flow and scrolls away; the header is `position:sticky;top:0` so it alone pins. The announcement carousel is keen-slider on autoplay (`speed 3`) with inverse-colour prev/next arrows.
**Extracted values:** header `position:sticky; top:0`; logo 54px @≤749px; announcement carousel `max-width:550px`, centred, `data-autoplay="true"` `data-speed="3"`; buttons/arrows use `--typography-inverse` (white on black); no scroll-state classes anywhere.

```html
<div class="utility"><!-- scrolls away -->
  <div class="announce" data-autoplay="true" data-speed="3"><!-- keen-slider -->
    <div class="ann-track">
      <div class="ann-slide">Klarna available at checkout</div>
      <div class="ann-slide">Free delivery over £X</div>
    </div>
    <button class="ann-prev">‹</button><button class="ann-next">›</button>
  </div>
  <div class="sale-bar">SALE LIVE</div>
</div>
<header class="site-header"><!-- pins --></header>
```
```css
.utility .announce{max-width:550px;margin:0 auto;color:#fff;background:#000;position:relative;place-content:center}
.sale-bar{background:#FF4242;color:#fff;text-align:center;padding:.5rem}
.site-header{position:sticky;top:0;z-index:40;background:#fff}  /* NO hide/morph states */
@media(max-width:749px){.site-header .logo{width:54px}}
```
**Rebranded for Sue's Angels:** navy (`#04121B`) sticky header instead of white; volt (`#D6F23A`) as the semaphore accent in the "sale/urgency" role (e.g. "TICKETS LIVE"); keep the rotating black utility bar for KLARNA-style utility lines. Keep it stateless — the value is the calm.
**recipe-grade vs rebuild-by-eye:** header + bars **recipe-grade**; keen-slider autoplay is **rebuild-by-eye** (any autoplay snap carousel: `setInterval` advancing `scrollLeft` on a `scroll-snap-type:x mandatory` track).

## Recipe 2 — Square category/merchandising grid
**Recipe-grade.**

**What it is:** the "Shop Sale By Category" band — a big black heading over a 4-up grid of square photo tiles, each a category label over a B&W image.
**How it works:** CSS grid of `aspect-ratio:1/1` tiles; image fills, label overlaid; slow desaturate/colour-shift on hover via the signature 1.5s easing.
**Extracted values:** tile `aspect-ratio:1/1`, tile radius ~4px; grid `repeat(4, 1fr)` desktop → 2-up mobile; hover `filter`/`background-color` `1.5s cubic-bezier(0.65,0.05,0.36,1)`.

```css
.cat-grid{display:grid;gap:12px;
  grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr));}
.cat-tile{aspect-ratio:1/1;border-radius:4px;overflow:hidden;position:relative}
.cat-tile img{width:100%;height:100%;object-fit:cover;
  transition:filter 1.5s cubic-bezier(.65,.05,.36,1), transform 1.5s cubic-bezier(.65,.05,.36,1);
  filter:grayscale(1)}
.cat-tile:hover img{filter:grayscale(0);transform:scale(1.03)}
```
**Rebranded for Sue's Angels:** square kit/match/ticket tiles; keep the B&W→colour desaturate reveal for premium feel; swap 4px radius for the club's 26px if a softer look is wanted. Use the `minmax(min(100%,Npx),1fr)` pattern (already the project's overflow-safe convention).
**recipe-grade vs rebuild-by-eye:** **recipe-grade.**

## Recipe 3 — Slow cinematic state-transition (the 1.5s desaturate)  ★ signature feel ★
**Recipe-grade** (exact easing + duration extracted).

**What it is:** the "expensive" feel on Castore's monochrome photography — colour/filter/background changes settle over a long 1.5 seconds on a distinctive ease, so interactions feel weighted and premium rather than snappy.
**Extracted values:** `transition: filter 1.5s cubic-bezier(0.65, 0.05, 0.36, 1), background-color 1.5s cubic-bezier(0.65, 0.05, 0.36, 1), color 1.5s cubic-bezier(0.65, 0.05, 0.36, 1)`. (Contrast: UI utility — drawers, snackbars, opacity — stays fast at 100–250ms on `cubic-bezier(0.4,0,0.2,1)` / `cubic-bezier(0,0,0.2,1)`.)

```css
:root{ --ease-cinema: cubic-bezier(.65,.05,.36,1); }
.cinema{transition:filter 1.5s var(--ease-cinema),
                   background-color 1.5s var(--ease-cinema),
                   color 1.5s var(--ease-cinema);}
```
**When to use:** big photographic tiles, hero overlays, colour-scheme swaps — anywhere a slow settle sells quality. Pair with the square grid (Recipe 2).
**Rebranded for Sue's Angels:** apply to navy↔volt state shifts on feature tiles; keep the 1.5s so it reads editorial, not gimmicky.
**recipe-grade vs rebuild-by-eye:** **recipe-grade.**

## Recipe 4 — Dawn scroll-reveal (cascade)
**Recipe-grade** (Dawn's IntersectionObserver reveal, as shipped).

**What it is:** on-scroll rise-and-fade for sections, staggered ("cascade") across siblings.
**Extracted values:** hidden state `translateY(90px)` + `opacity:0`, `will-change:opacity,transform`; reveal `transition: opacity 700ms, transform 700ms`; cascade delay stepped per child. Fires once via IntersectionObserver.

```css
[data-reveal]{opacity:0;transform:translateY(90px);will-change:opacity,transform;
  transition:opacity 700ms, transform 700ms;}
[data-reveal].revealed{opacity:1;transform:none;}
[data-reveal].revealed:nth-child(1){transition-delay:0ms}
[data-reveal].revealed:nth-child(2){transition-delay:75ms}
[data-reveal].revealed:nth-child(3){transition-delay:150ms}
```
```js
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');io.unobserve(e.target);}}),{threshold:.1});
document.querySelectorAll('[data-reveal]').forEach(el=>io.observe(el));
```
Note: Castore's 90px rise is a **larger** travel than the shared-primitive 24px — reads slower/heavier, matching the brand. Add a `prefers-reduced-motion` guard that sets the final state directly.
**recipe-grade vs rebuild-by-eye:** **recipe-grade.**

## Recipe 5 — Infinite logo marquee (press/quote band)
**Rebuild-by-eye** (technique + real timing).

**What it is:** the quote/press band's brand-logo strip that scrolls infinitely and calmly.
**Extracted values:** duration via `@property --autoscroll-timing` = **80s**, logo `gap: 80px`, tab logos `width: 80%`.

```css
@property --scroll-t{syntax:"<time>";inherits:true;initial-value:80s}
.marquee{--scroll-t:80s;overflow:hidden}
.marquee__track{display:flex;gap:80px;width:max-content;animation:marq var(--scroll-t) linear infinite}
@keyframes marq{to{transform:translateX(-50%)}}  /* duplicate the logos once for seamless loop */
```
**Rebranded for Sue's Angels:** a slow sponsor-logo ticker at the same 80s cadence; grayscale logos that colour on hover (reuse Recipe 3's easing).
**recipe-grade vs rebuild-by-eye:** timing **recipe-grade**; loop mechanism **rebuild-by-eye** (Castore uses a CSS-var-timed slider; the duplicate-track keyframe above is the portable equivalent).

---

## What to reuse from this site
- **The static-sticky retail nav pattern** — the deliberate counterexample to hide/morph navs. When a build should feel like a *trusted store* rather than a *cinematic showcase*, pin a plain bar and stop.
- **The single-semaphore-accent discipline** — strict B&W + one red that means "sale/urgency". Transfers to any brand: pick one accent, reserve it for money/action.
- **The 1.5s `cubic-bezier(0.65,0.05,0.36,1)` cinematic settle** on photography — the most transferable motion asset here; slow desaturate/colour-shift = instant premium.
- **Square merchandising grids** (`aspect-ratio:1/1`, overflow-safe `minmax` columns) as the default commerce layout.
- **Two-tier utility stack** (rotating announcement carousel + urgency bar) above a pinned header — the retail-conversion chrome pattern.

## Fidelity note
Config-grade for tokens, colour system, type, breakpoints, and the four CSS-driven motion values (sticky nav, 700ms reveal / 90px travel, 1.5s cinematic ease, 80s marquee) — all extracted from the live Shopify theme CSS and corroborated by real-browser observation of nav/hero/announcement behaviour. Slider internals (keen-slider / bao-carousel autoplay, slideshow advance) are **rebuild-by-eye**: keen-slider is an off-the-shelf library, so reproduce with any `scroll-snap` + autoplay handler rather than reverse-engineering it. No background video anywhere (photography-only, unlike Wolverine). Screenshot came back blank (Shopify SPA-hydrated), so layout/rhythm here rests on the user's real-browser observation + the deterministic Shopify section order, not on a static image.
