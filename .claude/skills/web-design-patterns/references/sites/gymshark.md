# Reference: gymshark.com

Studied 2026-07-07 via Firecrawl (full-page screenshot + rawHtml + real `.css`/`.js` assets, analysed in the context-mode sandbox). Homepage of Gymshark — high-traffic fitness-apparel DTC storefront. This is a **commerce** reference, not an editorial one: its craft is in fast, functional UI choreography (modals, cart, carousels, hover-zoom, marquee) over big-photography grids — the opposite end of the spectrum from wolverine-worldwide's slow cinematic editorial.

## Identity snapshot
- **Style:** bold **athletic commerce** — full-bleed photography grids, condensed heavy display type in UPPERCASE, sharp corners, monochrome chrome (black ink / white ground) letting model photography carry all the colour. Confident, punchy, retail-fast (not slow-luxury).
- **Colour:** effectively **monochrome UI** — `#000000` brand-black ink, `#FFFFFF` brand-white ground, a full grey ramp (`grey-50 #f5f5f5 → grey-950 #111111`). Chroma exists only as small **status/accent tokens**: blue `#007db5` (links/accent), gold `#ba935f` (staff/loyalty), green `#34c759` (success), red `#bf2e35`, orange `#ffb005`. (The Firecrawl auto-branding guessed "primary blue / gold" — that is wrong for the *feel*; those are minor tokens. The brand reads black-white-photography.)
- **Type:** condensed-display headings — **Druk Condensed Super** (mega hero), **Anton** + **Bebas Neue** (section headings), with **Montserrat** on buttons and **Roboto** as body. All heading text is UPPERCASE (150 `text-transform:uppercase` rules) with tight tracking. `--studio-title-font-size` ramps `5.2rem → 8rem`.
- **Radius:** **sharp** system — dominant `0` and `4px` (`--rounded-corners-standard:4px`, `-small:2px`, `-large:8px`). The one soft exception: **buttons are full pills** (`border-radius:var(--spacing-56)` = 56px / `--rounded-corners-button:5rem`). So: sharp cards + photography, pill CTAs.
- **Shadows:** light and functional — tokens `--box-shadow-small:0 4px 15px rgba(0,0,0,.1)`, `--box-shadow-large:0 4px 60px rgba(0,0,0,.1)`, `--box-shadow-top:0 -4px 15px rgba(0,0,0,.1)`. Used for floating cart/modals/menus, not decoration.
- **Stack:** **Next.js** (pages router, `/_next/static/*-[hash].js|css`) on **Shopify** commerce, React. **No heavy motion library** — no GSAP / lenis / locomotive / framer-motion / three detected in the core chunks (the "framer"/"three" string hits were incidental). Motion is **CSS `@keyframes` + Slick carousel + React state**. **react-slick** is the carousel engine (confirmed: `slick-track/slick-dots/slick-arrow/slick-slide`, `slick.woff` icon font). A `swiper` string appears once but Slick is the live one.
- **Motion scale:** **872 KB** compiled CSS carrying **~185 `@keyframes`**, **~219 `animation:`**, **~184 `transition:`**, **646 `transform:`** declarations. But almost all keyframes are **UI-state choreography** (modal/drawer/cart/quick-add slide-in-out + backdrop-in-out, skeleton/review shimmer, spinners `rotate`, `pulse`/`pulse-ring` stock alerts, snackbox toasts). Only a few are "hero" motion (`jumbo-hero_marquee`, `collection-card_change-background/-colour`, `multi-tier_slide-up`, `header_fadeInFadeOut`). This is the fingerprint of a **transactional** site: motion serves flows, not scroll-cinema.
- **Easings:** dominant is **Material standard `cubic-bezier(.4,0,.2,1)`** (12×) + decelerate `cubic-bezier(0,0,.2,1)` (3×) and a custom `cubic-bezier(.39,.07,.26,1)` (4×) and `cubic-bezier(.22,1,.36,1)` (ease-out-quart-ish, 2×). Most transitions just use named `ease`/`ease-in-out`/`ease-out`.
- **Durations:** fast and clustered — most-used are `.2s`, `.25s ease-in-out`, `.25s ease-out`, `.3s`, `.3s ease-in-out`, `.3s cubic-bezier(.4,0,.2,1)`; a few `.5s`/`.75s` for larger drawer slides. Nothing in the slow 1s+ editorial range. **This is the tell: retail motion is ~200-300ms, not ~700-1050ms.**
- **Breakpoints:** conventional commerce grid — `767`, `768`, `1023`, `1024`, `1223` px (mobile / tablet / desktop / wide-content). `--base-page-margin` steps `16px → 40px` at `1024`.

## Page anatomy (VERIFIED from full-page screenshot — homepage)
Confirmed visually (1920×1080 render) + from rawHtml heading order. The rhythm is a **retail merchandising stack**, not an editorial band alternation:
1. **Announcement / USP bar** (top, thin) — a **rotating/revolving** row of promo lines ("Get 10% off…", "Free shipping over $75", "Students get 12% off", "Refer a friend"). Auto-advancing with a pause control ("Pause slide rotation" a11y label). Sits above the header and scrolls away with it.
2. **Fixed header** — left: menu + Women/Men primary tabs; center: **DVMSHARK** wordmark (the shark-logo monospaced lockup); right: search, account, wishlist, bag icons. `height:8rem`, `position:fixed`. Starts **transparent over the hero**, becomes solid, and **hides on scroll-down / shows on scroll-up** (see Micro-details).
3. **Hero grid** — a **3-column full-viewport photography hero**: three model shots side by side (16:9 each, `hero-content` height `56.25vw` or full `100dvh - 11.7rem`). The left tile carries the campaign copy bottom-left: giant UPPERCASE headline ("NEW IN"), a one-line subhead ("Just in time for Hot Girl Summer"), and **two stacked pill buttons** ("Shop new in" = solid white, "Shop bestsellers" = outline). Content-alignment is class-driven (`--left` / `--left-bottom` / `--center` / `--bottom`). Media supports **video with hover-zoom** as well as image.
4. **"WOMEN'S FAVORITES" merchandising row** — section eyebrow/heading (UPPERCASE, left), then a **4-across product carousel** (react-slick) of model-on-plain-ground product cards. Cards are sharp-cornered, no card background, image + name.
5. **Repeating merchandising blocks** — "NEW IN", "MEN'S FAVORITES", category tiles (LEGGINGS / SPORTS BRAS / SHORTS / T-SHIRTS & TOPS / JOGGERS / HOODIES), each a heading + slick carousel or a **content-block** grid (`data-length="2..4"` sets 2/3/4 cards per row via `--basis`). Mega-menu flyouts (from the header) mirror these categories (Trending / Products / Last Chance / Accessories / Explore columns).
6. **Footer** — standard commerce footer (help/shop/company columns, region selector — dozens of "The XX store" locale links, newsletter sign-up, socials). Not a cinematic wordmark band like editorial sites.

Rhythm: **white ground throughout**, section after section of heading + full-bleed photography carousel/grid. Colour and warmth come entirely from the model imagery; the chrome stays black-on-white. One merchandising idea per row, tight vertical padding (`4rem` desktop section padding), fast to scan.

## Type, wordmark & media (verified)
- **Condensed heavy display for all headings** (Druk Condensed Super / Anton / Bebas Neue), **UPPERCASE**, tight tracking (`letter-spacing` mostly `0`, some `.05rem`/`.1rem`, a couple negative `-.05rem`). This condensed-uppercase-heavy look is the type signature — very different from wolverine's wide grotesk sentence-case-with-periods.
- **Body Roboto**, small (`--body-font-size-standard:1.6rem`, `-small:1.4rem`), `--caption` `1.1–1.2rem`.
- **Buttons Montserrat**, pill (`radius 56px`), `height:4.4rem`, `padding:1.25rem 3.2rem`, solid-white / outline pairs on imagery. A secondary "text button" variant is Roboto, `min-height:3.2rem`, transparent, underline-on-hover.
- **Wordmark:** the shark monogram + `GYMSHARK` lettermark (do NOT reproduce their logo — clone the *lockup pattern*: centered monogram + heavy condensed lettermark).
- **Media:** hero/card media is **image OR video** (`hero-block_media video`, `card_media-container video`), object-fit cover, and **zooms on hover** (`:hover img/video{transform:scale(1.05)}`, some `1.03`). No ken-burns idle drift detected (retail wants the still to sell the product) — the zoom is hover-triggered, not ambient.
- **Transitions present:** hover media-zoom (1.03–1.05); link **underline sweep** (`:hover:after{transform:scaleX(1);transform-origin:bottom left}`); header hide/show + transparent→solid; USP marquee revolve; drawer/modal slide+fade+backdrop; skeleton shimmer while loading; button loading spinner + success overlay + pulsate ring. **No masked line-by-line headline rise, no scroll-parallax particles, no scroll-pinned sections** — this site does not use the editorial entrance vocabulary.

> **Clone status:** analysed from real assets + screenshot; **not** rebuilt as a like-for-like. Recipes below are config-grade where values were extracted, rebuild-by-eye where behaviour was inferred.

## Micro-details (keen-eye pass — the things that are easy to miss)
- **Header is a hide-on-scroll fixed bar with a transparent-over-hero state (not a multi-state pill like Wolverine):**
  - Base: `.header{position:fixed;top:0;z-index:12;height:8rem;width:100%}`.
  - Over the hero: `.wrapper-container--transparent{position:sticky;margin-bottom:-7.6rem}` — the header sits transparent and content pulls up underneath it (so the hero photo runs full-bleed behind the chrome).
  - On scroll-**down**: `.header--is-hidden{top:-8rem}` and `.wrapper-container--hidden{transform:translateY(-100%)}` slide the whole header (and the USP banner: `.usp-banner--reversed-scrolled{transform:translateY(-12rem)}` / `translateY(calc(-1*var(--usp-revolving-height)))`) off the top. Reappears on scroll-**up**.
  - The transition that sells it: `.wrapper-container{transition:top .3s ease-in-out, transform .3s ease-in-out}` — a **300ms** slide, not a slow reveal.
  - Reproduce: `position:fixed`; add `.solid` when `scrollY>0`; add `.hidden` (`transform:translateY(-100%)`) when scrolling down past the header height, remove on scroll-up. 300ms `ease-in-out`.
- **USP announcement bar auto-revolves** with a manual **pause** affordance (a11y "Pause slide rotation") — respects the reduced-motion / user-control expectation for auto-moving content.
- **Custom zoom cursor** on product galleries: `.gallery-container:hover{cursor:none}` and a drawn `+` (`::before`/`::after` hairlines, one rotated 90° with `transition:transform .3s`) follows the pointer as a "zoom-in" cursor. Small, premium touch.
- **Category tiles animate their own theme on entry:** `@keyframes collection-card_change-background{0%{background:var(--color-page-secondary)}to{background:var(--background-colour)}}` + a paired `change-colour` — each tile tweens from neutral to its brand colour rather than popping.
- **Buttons are stateful:** loading overlay (`opacity` fade + spinner `@keyframes spin 1s linear infinite`), success overlay (check), and a **pulsate ring** (`@keyframes pulsate{0%{box-shadow:0 0 0 0 rgba(0,0,0,.44)}70%{box-shadow:0 0 0 .8rem rgba(0,0,0,0)}to{...0}}`, plus a `-light` variant on dark). Stock alerts use the same idea (`pulse-ring` from transparent → warning colour → transparent).
- **Everything modal/drawer is a slide + fade + backdrop trio:** for cart, quick-add, quick-look, get-the-look, review, sign-in, remove-all, zoom-modal etc. — each has `slide-in/out`, `fade-in/out`, `backdrop-in/out` keyframes (desktop from side, mobile from bottom `slide-in-mob`). Corners round only at the top on mobile sheets (`border-radius:var(--spacing-16) var(--spacing-16) 0 0`).
- **Skeletons shimmer** (`@keyframes shimmer`) on product/review load — retail perceived-performance detail.
- **Marquee** (`@keyframes jumbo-hero_marquee{0%{left:100%}to{left:-100%}}`) — a full-width scrolling-text band for campaign hero variants; `header_fadeInFadeOut{0%{opacity:0}20%,80%{opacity:1}to{opacity:0}}` cross-fades revolving header messages.
- **Sharp corners are a deliberate choice:** 39 `border-radius:0` + 27 `radius:4px` vs the pill buttons — the tension between hard-edged cards and soft CTAs is part of the look.

---

## Recipe 1 — Hide-on-scroll fixed header with transparent-over-hero state  ★ signature ★
**Recipe-grade** (real values from `header_*` classes).

**What it is:** a fixed top bar that (a) sits **transparent over a full-bleed hero**, (b) turns **solid** once you leave the hero, and (c) **hides on scroll-down, reappears on scroll-up** — carrying an announcement bar with it. The retail default (vs Wolverine's transparent→centered-pill morph).
**How it works:** header is `position:fixed;height:8rem;z-index:12`. A wrapper is `position:sticky;top:0` with `transition:top .3s ease-in-out, transform .3s ease-in-out`. A `transparent` modifier pulls page content up under it (`margin-bottom:-7.6rem`) so the hero runs full-bleed. JS watches scroll direction: past the header height going down → add `hidden` (`translateY(-100%)`) / `top:-8rem`; scrolling up or at top → remove it and (once past hero) add `solid`.
**Real values:** `height:8rem` · `z-index:12` · slide `.3s ease-in-out` · hidden `translateY(-100%)` / `top:-8rem` · transparent overlap `margin-bottom:-7.6rem` · USP banner co-slide `translateY(-12rem)`.

```js
let last = 0;
const hdr = document.querySelector('.hdr'), heroH = () => innerHeight * 0.8;
addEventListener('scroll', () => {
  const y = scrollY;
  hdr.classList.toggle('solid', y > heroH());          // transparent → solid past hero
  if (y > last && y > 80) hdr.classList.add('hidden');  // scroll down → hide
  else hdr.classList.remove('hidden');                  // scroll up → show
  last = y;
}, { passive: true });
```
```css
.hdr{position:fixed;top:0;left:0;width:100%;height:8rem;z-index:12;background:transparent;
  transition:top .3s ease-in-out, transform .3s ease-in-out, background .3s ease-in-out;}
.hdr.solid{background:#fff;}
.hdr.hidden{transform:translateY(-100%);}
```
**Rebranded for Sue's Angels** (navy over a hero video): `.hdr` transparent over the `#04121B` hero video, turns to a `#04121B` glass bar (`backdrop-filter:blur`) once past it, hides on scroll-down; keep the **300ms `ease-in-out`** — do NOT slow it to the editorial 700ms, the fast slide is what reads as "app-like retail". Recipe-grade.

## Recipe 2 — Full-bleed photography hero grid with alignment classes  ★ signature ★
**Recipe-grade** (`hero-block_*` / `jumbo-hero_*`).

**What it is:** a hero that is **1–3 full-height photography tiles side by side**, each with class-driven content placement, campaign copy + stacked pill CTAs over the image, and hover media-zoom. Sells product without any decorative motion.
**How it works:** each tile is `height:56.25vw` (16:9) or `calc(100dvh - 11.7rem)` full-height; `position:relative`, media `object-fit:cover` absolutely filling it; a content layer flex-aligned by modifier class (`--left` / `--left-bottom` / `--center` / `--bottom`). Media can be `<img>` or `<video muted loop playsinline autoplay>`; on hover the media scales to `1.05`.
**Real values:** tile height `56.25vw` (desktop) / `37.5vw` (wide) / `100dvh - 11.7rem` (full) · content align classes above · media hover `transform:scale(1.05)` · buttons pill (`radius 56px`, `height 4.4rem`).

```css
.hero{display:grid;grid-template-columns:repeat(3,1fr);}              /* 1 / 2 / 3-up */
.hero-tile{position:relative;height:56.25vw;overflow:hidden;}
.hero-tile img,.hero-tile video{position:absolute;inset:0;width:100%;height:100%;
  object-fit:cover;transition:transform .4s ease-out;}
.hero-tile:hover img,.hero-tile:hover video{transform:scale(1.05);}
.hero-copy{position:absolute;inset:0;padding:2.4rem;display:flex;flex-direction:column;
  justify-content:flex-end;align-items:flex-start;gap:1.2rem;}         /* --left-bottom */
.hero-copy h1{font:800 clamp(3rem,7vw,8rem)/.9 "Druk Condensed Super",sans-serif;
  text-transform:uppercase;color:#fff;}
```
**Rebranded for Sue's Angels:** 1-up or 2-up navy hero using `assets/videos/hero-*.mp4` as the tile media, Clash Display headline bottom-left, volt pill primary + outline secondary. Keep `overflow:hidden` + `scale(1.05)` hover. On mobile collapse to a single full-height tile. Recipe-grade.

## Recipe 3 — react-slick merchandising carousel (heading + N-up product row)
**Rebuild-by-eye** (Slick confirmed; internal config not extracted).

**What it is:** the repeating "WOMEN'S FAVORITES / NEW IN / category" rows — a section eyebrow/heading with a horizontally-scrolling **2/3/4-up** card carousel (arrows + dots), swipe on mobile.
**How it works on the site:** **react-slick** (`slick-track`, `slick-dots`, `slick-arrow`, `slick.woff` icon font). A `content-block` wrapper sets cards-per-row via `data-length="2..4"` → `--basis`, with `calc()` widths; below `1024px` it swaps the flex default for the carousel. Card = sharp-cornered image (no bg) + name, media hover-zoom `1.05`.
**Rebuild** without react-slick — CSS scroll-snap + a tiny arrow handler is enough:
```css
.row{display:flex;gap:1.6rem;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;}
.row>*{flex:0 0 calc(25% - 1.2rem);scroll-snap-align:start;}   /* 4-up; 2/3 via var */
.card img{width:100%;aspect-ratio:3/4;object-fit:cover;transition:transform .4s ease-out;}
.card:hover img{transform:scale(1.05);}
```
Drive arrows by scrolling one card-width; dots from scroll position. **Real config to reuse:** N-up = 2/3/4 by breakpoint, card aspect ~3/4, gap `1.6rem`, hover-zoom `1.05`, `.4s ease-out`.

## Recipe 4 — Link underline sweep on hover
**Recipe-grade** (`:hover:after{transform:scaleX(1);transform-origin:bottom left}`).

**What it is:** the animated underline that grows left→right under nav/text links on hover.
```css
.link{position:relative;text-decoration:none;}
.link::after{content:"";position:absolute;left:0;bottom:-2px;width:100%;height:1px;
  background:currentColor;transform:scaleX(0);transform-origin:bottom right;
  transition:transform .25s ease-out;}
.link:hover::after{transform:scaleX(1);transform-origin:bottom left;}
```
Origin flips right→left between rest and hover so it wipes in one direction. Real timing on-site clusters at `.25s`. Recipe-grade.

## Recipe 5 — Drawer / modal slide+fade+backdrop trio (cart / quick-add / quick-look)
**Recipe-grade** (pattern from ~80 modal keyframes).

**What it is:** every overlay (cart, quick-add, quick-look, sign-in, reviews, zoom) is the same 3-part choreography: a **backdrop** fades in, a **panel** slides in (from the side on desktop, from the bottom on mobile), reversed on close. Mobile sheets round only their top corners.
**How it works:** three keyframe pairs run together — `backdrop-in/out` (opacity), `slide-in/out` (desktop `translateX`) / `slide-in-mob/out-mob` (mobile `translateY`), and often a `fade-in/out` for content. Durations `.25–.5s`, easing `ease-out` / `cubic-bezier(.4,0,.2,1)`.
```css
@keyframes bd-in{from{opacity:0}to{opacity:1}}
@keyframes panel-in{from{transform:translateX(100%)}to{transform:translateX(0)}}
@keyframes panel-in-mob{from{transform:translateY(100%)}to{transform:translateY(0)}}
.backdrop{animation:bd-in .25s ease-out forwards;background:rgba(0,0,0,.5);}
.panel{animation:panel-in .35s cubic-bezier(.4,0,.2,1) forwards;box-shadow:0 4px 60px rgba(0,0,0,.1);}
@media(max-width:767px){.panel{animation-name:panel-in-mob;border-radius:1.6rem 1.6rem 0 0;}}
```
**For Sue's Angels:** reuse for a fixtures/squad quick-look or a mobile menu sheet — navy panel, volt accents, top-rounded mobile sheet. Keep the fast `.25–.35s` timing. Recipe-grade pattern.

## Recipe 6 — Stateful action button (loading spinner / success / pulsate ring)
**Recipe-grade** (`button_spin`, `button_pulsate`, overlays).

**What it is:** an "Add to bag"-style button that swaps its label for a spinner while pending, flashes a success check, and can emit an attention **pulsate ring**.
```css
@keyframes spin{to{transform:rotate(1turn)}}
@keyframes pulsate{0%{box-shadow:0 0 0 0 rgba(0,0,0,.44)}70%{box-shadow:0 0 0 .8rem rgba(0,0,0,0)}to{box-shadow:0 0 0 0 rgba(0,0,0,0)}}
.btn{position:relative;overflow:hidden;border-radius:5rem;height:4.4rem;}
.btn .overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  opacity:0;transition:opacity .2s ease-in;}
.btn.is-loading .overlay{opacity:1;}
.btn .overlay .spinner{animation:spin 1s linear infinite;}
.btn.attention{animation:pulsate 1.5s ease-out infinite;}
```
Use a `-light` pulsate (`rgba(255,255,255,.44)`) on dark buttons. Real: overlay fade `.2s ease-in`, spin `1s linear`, pulse ring expands to `.8rem`. Recipe-grade.

---

## What to reuse from this site
- **The fast-retail motion register** — `.2–.35s`, Material `cubic-bezier(.4,0,.2,1)`, hover-zoom `1.05`, underline sweep. When a build should feel like a **fast app/store** (not a slow gallery), this is the timing to copy; it is the direct counterweight to wolverine's 700–1050ms editorial curves in the shared palette.
- **The hide-on-scroll + transparent-over-hero header** (Recipe 1) — the most reusable structural piece.
- **The full-bleed photography hero grid with alignment classes** (Recipe 2) — for image/video-led hero sections.
- **The slide+fade+backdrop overlay pattern** (Recipe 5) — one reusable trio for every drawer/modal/cart/mobile-menu on a project.
- **Type lesson:** condensed heavy UPPERCASE display (Druk/Anton/Bebas) + neutral body (Roboto) + pill CTAs on sharp cards — a punchy alternative to wide-grotesk sentence-case editorial.

## Fidelity note
- **Recipe-grade** (real extracted values): header behaviour, hero-block structure, hover-zoom, underline sweep, modal/drawer keyframe pattern, button states, colour tokens, radii, durations, easings, fonts.
- **Rebuild-by-eye** (behaviour understood, exact config not pulled): react-slick carousel config, USP marquee revolve timing, custom zoom-cursor tracking, mega-menu flyout timings. Motion is Next.js/React + CSS keyframes + react-slick; **no GSAP/scroll library** — so there is no scroll-linked parallax/pin/count-up vocabulary here to extract (verified absent), unlike wolverine-worldwide.
