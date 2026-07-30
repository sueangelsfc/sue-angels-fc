# Reference: vuoriclothing.com

Studied 2026-07-07 via Firecrawl (rawHtml + real `_next/static` CSS/JS assets, analysed in sandbox) + a live in-browser scroll pass. Retail e-commerce homepage for Vuori (premium performance / athleisure apparel).

## Identity snapshot
- **Style:** calm, warm-neutral **minimal retail** — beige/warm-grey premium-casual. Product-first, motion-restrained, "quiet luxury athleisure". Hierarchy comes from generous whitespace + one big photo/video per band, not colour or motion flash.
- **Colour:** `#FFFFFF` bg, ink `#333333`, warm greys `#5A5A5A / #717070 / #3E3E3E`, hairline border `#C6C6C6`, near-black display `#121826`. Muted product-swatch accents only (`#37526B` navy, `#A4DEF9` sky, `#FAAF43` amber, `#D02E2E` red) — never as chrome. Effectively monochrome UI with colour living entirely in photography and swatch chips.
- **Type:** self-hosted-via-Adobe **Aktiv Grotesk** (Typekit kit `nic3lll`, 139 refs), + **Open Sans** as a secondary/system fallback. Grotesk, humanist, calm. Display H1 ≈ 30px (`29.856px`), H2 ≈ 21px, body ≈ 12–14px — restrained sizes for a fashion retailer; the *photography* is the scale, not the type.
- **Radius:** near-sharp — buttons/inputs `0px`, brand token `2px`. Squared, editorial, not pill-y.
- **Stack:** **Next.js** (`_next/static`, `__NEXT_DATA__`, webpack chunks) + **Material UI v5** component system with **Emotion** CSS-in-JS (`mui-style-*` classes, 2648 refs; `MuiAppBar`/`MuiPaper`/`MuiGrid`/`MuiButton`). **Swiper.js** for every carousel (185 refs; the only shipped CSS files are Swiper's). Commerce backend is **Shopify** (headless; `cdn.shopify`, 125 refs) + Global-e cross-border. **No GSAP, no Framer Motion, no scroll library.** Motion is MUI's `theme.transitions.create()` + CSS transitions + Swiper.
- **Breakpoints:** MUI default set — **xs 0, sm 600, md 900, lg 1200, xl 1536** (Grid uses `MuiGrid-grid-xs-12` etc.). Header swaps `header-mobile` ↔ `desktop-header` at the md boundary.

## Page anatomy (from live scroll + rawHtml heading/testid order)
Confirmed by watching it scroll and cross-checked against DOM order. The rhythm is a **calm vertical stack of full-width photo/video bands alternating with horizontal product rails** — very little dark/light drama, lots of air:
1. **Announcement bar + Sticky header** — thin top promo/free-shipping marquee bar, then the light nav (`New · Women · Men · Accessories · Explore` + Search / Account / Bag). Both live inside one `StickyElement-container` so the whole cluster sticks together. Lowercase `vuori` wordmark with a small gradient sunrise monogram (SVG, linear-gradient fill).
2. **Hero** — understated full-bleed `hero-media` **video** (`muted playsinline`, poster `*_fallback.png`, `object-fit:cover`) with a light `hero-overlay-interactive` on a 12-col MUI Grid. Eyebrow + short headline ("Start Strong"), outline **Shop Women's / Shop Men's** buttons. Not a giant split-line headline — quiet.
3. **New Arrivals rail** (WHITE) — `New Arrivals` heading + Shop Women's/Men's, then a **horizontal Swiper product carousel**: image cards + name + price + `left-nav`/`right-nav` chevron arrows, cards peeking off the right edge.
4. **Feature band — "The Breathe Collection"** (WHITE) — full-width lifestyle image + eyebrow "Introducing" + heading + supporting copy + CTA.
5. **"Day In. Day Out." Daily Collection band** — image band + heading + subcopy.
6. **Popular Categories** — grid/rail of category tiles.
7. **Product spotlights** — "The Kore Short" ("One Short. Every Sport.™") and "The Halo Wideleg" ("...Dreamknit™ softness...") each a big split image + heading + copy + CTA.
8. **Recommended For You** — personalised `HomePage-FeaturedProductsCarousel` (another Swiper rail).
9. **Shop By Color** — a set of colour-named Swiper carousels (`Carousel-Blue/Pink/Brown/Navy/White/Grey/Green/Red`) — swatch-driven merchandising.
10. **Brand statement** — H1 "A New Perspective On Performance Apparel™" band.
11. **Footer** — `Support / Company / Other` link columns, email signup (Klaviyo), region/language selector, legal. Squared, low-key.

Rhythm: WHITE throughout (no dark-band alternation like Wolverine). Cadence is **full-width media band → horizontal product rail → media band**, one idea per band, huge photography, restrained type, subtle reveals. An **entry region modal** ("Welcome to United States" / Shop in…) + **OneTrust cookie banner** appear on first load.

## Type, wordmark & media (verified)
- **One grotesk everywhere** (Aktiv Grotesk; Open Sans fallback). Headings are *modest* in px for a fashion site — H1 ~30px, H2 ~21px — trending sentence-case, calm weight. Body 12–14px. Tiny uppercase labels for eyebrows ("Introducing") and nav.
- **Wordmark:** lowercase `vuori` set beside a small **gradient sunrise monogram** — an inline SVG with a `linearGradient` fill (`desktop_linear_198:378`). Clone the *device* (lowercase wordmark + small gradient mark), never the glyphs.
- **Buttons:** squared (`0px` radius). Primary = **transparent with a `#C6C6C6` hairline border, `#333333` text** (the outline "Shop Women's" style). Secondary = solid `#333333` bg, white text. No pills, no lift-heavy shadows.
- **Media slots:** hero is **video** (`muted playsinline` + `*_fallback.png` poster, `transition:opacity 0.3s` fade-in once loaded); every other "image" band is a still lifestyle photo; product rails are image cards. Video is used sparingly (hero only), unlike editorial sites.
- **Transitions present:** MUI standard easing `cubic-bezier(0.4, 0, 0.2, 1)` at a dominant **250ms** (also 200/150/300ms); Swiper slide `speed: 300–400ms`; hero video `opacity 0.3s`; product-card image cross-fade on hover (`productCardHoverBox`). All UI-flow, not scroll-cinema.

> **Clone status:** analysed from render + real MUI/Swiper assets; **not yet built as a like-for-like**. Config-grade tokens, easing, durations, breakpoints, and carousel params extracted; MUI/Emotion component internals captured at technique level (rebuild with plain CSS + Swiper).

## Micro-details (keen-eye pass — the things that are easy to miss)
- **Nav is STICKY, not a scroll-morph:** the header uses `MuiAppBar-positionSticky` (CSS `position:sticky; top:0`), wrapped — together with the announcement bar — in a single `StickyElement-container` so the promo bar + nav travel and pin as one unit. It **persists on scroll in the same light state** (no transparent→pill morph, no hide-on-scroll-down). This is the calm-retail choice: stay put, stay legible. Reproduce: `position:sticky; top:0; z-index` on a wrapper holding `[promo-bar][nav]`; keep it opaque white the whole time.
- **Carousels are Swiper.js horizontal rails, everywhere:** New Arrivals, Recommended For You, and the per-colour "Shop By Color" sets are all Swiper (`slidesPerView` responsive via `breakpoints`, `spaceBetween`, `navigation` with `left-nav`/`right-nav` chevron buttons, `speed:300–400`, `grabCursor`, `freeMode` on some). Cards deliberately **peek off the right edge** to signal "scrollable". `slidesPerGroup` advances a page at a time on arrow click. Reproduce with native CSS scroll-snap + a chevron handler, or Swiper if already a dependency.
- **Product card hover cross-fade:** `productCardHoverBox` wraps `position:relative;overflow:hidden` with an `.image-overlay` second image on top — hovering cross-fades primary→alternate product shot (`opacity`, MUI 250ms `cubic-bezier(.4,0,.2,1)`). Subtle, not a zoom.
- **Hero video fade-in:** the `<video>` starts and fades `opacity 0.3s` once ready, over a `*_fallback.png` poster — no hard pop.
- **Squared everything:** buttons/inputs are `0px` radius; the brand's max radius token is `2px`. Reads editorial/technical, not friendly-rounded.
- **Entry choreography:** region modal ("Welcome to United States") + OneTrust cookie banner on first visit — a retail/legal convention worth reproducing as a dismissible layer, not core design.
- **Tiny uppercase eyebrows** ("Introducing", nav items) sit above sentence-case headings; ™ marks are part of the brand voice ("One Short. Every Sport.™").

---

## Recipe 1 — Sticky promo-bar + nav cluster  ★ signature ★
**Recipe-grade** (MUI `positionSticky` + `StickyElement-container` wrapper observed).

**What it is:** a thin announcement/free-shipping bar stacked above the main nav, both pinned together at the top of the viewport, staying in one calm opaque state the whole scroll (no morph, no hide).
**How it works:** wrap `[promo-bar][nav]` in one element with `position:sticky; top:0`. Because they share the sticky wrapper, they pin as a unit and the nav never detaches from the promo bar. Opaque background throughout for legibility over any band.
**Extracted values:** `position:sticky; top:0`; MUI `AppBar-positionSticky`; z-index above content; transitions (if any) `250ms cubic-bezier(0.4,0,0.2,1)`.

```html
<div class="sticky-cluster">
  <div class="promo-bar">Free shipping on orders over …</div>
  <header class="site-nav"><!-- wordmark · links · search/account/bag --></header>
</div>
```
```css
.sticky-cluster{position:sticky; top:0; z-index:1100; background:#fff;}
.promo-bar{font-size:.72rem; letter-spacing:.06em; text-transform:uppercase; text-align:center; padding:.4rem 1rem; background:#333; color:#fff;}
.site-nav{display:flex; align-items:center; justify-content:space-between; padding:.75rem 1.25rem; border-bottom:1px solid #eee;}
```
**Rebranded for Sue's Angels:** keep the sticky-cluster mechanic; promo bar in navy `#04121B` with volt `#D6F23A` text, nav opaque; swap the outline buttons to the brand's pill if desired (Vuori is squared — Sue's Angels is pill, so this is where the skins diverge).

## Recipe 2 — Swiper horizontal product rail (peek + arrows)
**Recipe-grade** (Swiper config surface extracted; `left-nav`/`right-nav` + responsive `breakpoints`).

**What it is:** a horizontally-scrolling row of product cards (image + name + price) with chevron arrows, cards peeking off the right edge to signal more.
**How it works:** Swiper with responsive `slidesPerView` via `breakpoints`, `spaceBetween`, `navigation` bound to custom chevron buttons, `slidesPerGroup` to page on arrow click, `grabCursor`, some rails `freeMode`. Slide `speed 300–400ms`.
**Extracted values:** `speed: 300` (up to 400), `spaceBetween: 0` on some rails, `slidesPerView` responsive (~1.2 mobile → 4+ desktop so a card always peeks), MUI easing `cubic-bezier(0.4,0,0.2,1)`.

Dependency-free reconstruction (CSS scroll-snap + arrows):
```css
.rail{display:flex; gap:16px; overflow-x:auto; scroll-snap-type:x mandatory;
  scrollbar-width:none; -webkit-overflow-scrolling:touch;}
.rail::-webkit-scrollbar{display:none;}
.rail > .card{flex:0 0 78%; scroll-snap-align:start;}        /* mobile: ~1.2 peeking */
@media(min-width:600px){ .rail > .card{flex:0 0 42%;} }
@media(min-width:900px){ .rail > .card{flex:0 0 23%;} }      /* desktop: ~4 + peek */
```
```js
const rail = document.querySelector('.rail');
const page = () => rail.clientWidth * 0.9;                    // slidesPerGroup ≈ a page
next.onclick = () => rail.scrollBy({left: page(), behavior:'smooth'});
prev.onclick = () => rail.scrollBy({left:-page(), behavior:'smooth'});
```
**Rebranded for Sue's Angels:** use for a squad / kit / fixtures rail — navy card, volt price/label, 26px radius (Vuori is squared; Sue's Angels rounds).

## Recipe 3 — Product-card hover cross-fade
**Recipe-grade** (`productCardHoverBox` + `.image-overlay` observed).

**What it is:** hovering a product card cross-fades the primary image to a second (alternate-angle) shot — no zoom, no lift, very calm.
**How it works:** two stacked images in an `overflow:hidden` box; the top `.image-overlay` starts `opacity:0` and fades to `1` on hover.
```css
.card-media{position:relative; overflow:hidden;}
.card-media img{display:block; width:100%;}
.card-media .image-overlay{position:absolute; inset:0; opacity:0;
  transition:opacity .25s cubic-bezier(.4,0,.2,1);}
.card-media:hover .image-overlay{opacity:1;}
```
**Rebranded:** swap in an action shot on hover; keep the 250ms calm cross-fade rather than a scale — it's the register that reads "premium retail".

## Recipe 4 — Hero video with poster fade-in
**Recipe-grade** (`hero-media` `<video muted playsinline>` + `*_fallback.png` poster + `transition:opacity 0.3s`).
```html
<video class="hero-video" autoplay muted loop playsinline
       poster="hero_fallback.png"
       style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">
  <source src="hero.mp4" type="video/mp4">
</video>
```
```css
.hero-video{opacity:0; transition:opacity .3s ease;}
.hero-video.ready{opacity:1;}   /* toggle on 'canplay' */
```
Light overlay grid on top (MUI 12-col) carries eyebrow + short headline + two outline CTAs. For Sue's Angels: existing `assets/videos/hero-*.mp4` slots straight in; keep the quiet, non-split headline treatment if cloning Vuori's calm register (vs Wolverine's giant 3-line rise).

## Recipe 5 — Squared outline / solid button pair
**Recipe-grade** (branding + inline styles).
```css
.btn-outline{background:transparent; color:#333; border:1px solid #C6C6C6;
  border-radius:0; padding:.8rem 1.6rem; font-size:.8rem; letter-spacing:.04em;
  text-transform:uppercase; transition:all .25s cubic-bezier(.4,0,.2,1);}
.btn-outline:hover{border-color:#333;}
.btn-solid{background:#333; color:#fff; border:0; border-radius:0; /* …same padding/type… */}
```
The **transparent-outline-with-hairline-border** is the hero's signature "Shop Women's / Shop Men's" button. Sharp corners are load-bearing to the brand feel.

---

## What to reuse from this site
- The **sticky promo-bar + nav cluster** — the calm-retail alternative to Wolverine's 3-state morph; use when the brief wants "stay put, stay legible", not "cinematic hide/reveal".
- The **Swiper (or scroll-snap) product rail with peek + chevrons** — the workhorse of retail homepages; the "card peeks off the edge" cue is the detail most clones miss.
- The **250ms `cubic-bezier(0.4,0,0.2,1)` calm register** — MUI standard easing; pair with hover *cross-fades* (not zooms) and short opacity fades for "quiet premium retail" vs the fast 1.05 hover-zoom of Gymshark/On or the slow 700ms editorial of Wolverine.
- **Squared 0px radius + hairline outline buttons + modest heading sizes** as a system: proof that "premium" can come from restraint and photography scale, not big type or heavy motion.
- **Motion register:** Vuori sits between Wolverine (slow editorial) and Gymshark (fast app-retail) — **calm retail: 200–400ms, Material easing, cross-fades over zooms, sticky-not-morphing nav, no scroll library.**
