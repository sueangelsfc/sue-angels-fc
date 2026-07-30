# Reference: salomon.com/en-us

Studied 2026-07-07 via Firecrawl (rawHtml + real `.css` chunks, viewport + full-page screenshots, analysed in sandbox). E-commerce homepage for Salomon (running / trail / ski / sportstyle). This is a **premium retail** teardown — the opposite pole from Wolverine's editorial-corporate: restraint here comes from a *system* (OKLCH neutrals, a tight design-token scale, horizontal product rails), not from oversized type.

## Identity snapshot
- **Style:** clean Nordic **product-first retail** — near-monochrome UI, photography does the colour, tight component library, horizontal scroll-rails everywhere. Feels "expensive" through precision and whitespace, not motion.
- **Colour:** everything is **OKLCH greyscale**. `--color-neutral-0` = `oklch(100% 0 none)` (white) → `--color-neutral-1000` = `oklch(0% 0 none)` (black); ink is `--color-content-primary: oklch(16.84% 0 none)` (near-black, NOT pure black). Chroma reserved for *state* tokens only (success = teal `oklch(67.78% .1017 180)`, information = blue, danger = red for the cart badge). No brand accent hue on the homepage — the brand IS the neutral scale + photography.
- **Type:** **two families.** Headings/wordmark = **SalomonSans** (self-hosted, `--font-salomon-sans`, Bold subset `SalomonSans_Bold_subset`). Body = **Inter** (`--font-inter`, variable 100–900, `font-display:swap`). Firecrawl's LLM guessed "Inter" for everything — wrong; the display face is SalomonSans.
- **Radius:** two poles — **`--radius-full: 624.938rem`** (every button, input, pill, bullet, badge is a full pill) and small structural radii (`--radius-3xs .5rem` → `--radius-m 1.5rem`) on cards/panels. **`--radius-none: 0`** on image tiles. So: pill controls + squared media.
- **Stack:** **Next.js** (App Router, `_next/static/chunks`, Turbopack — `turbopack-*.js` present), **Tailwind v4** (token-driven `@theme`, `oklch()` palette, `--spacing-*`/`--radius-*`/`--text-*` scales), **Swiper** for the product rails, Salesforce-Commerce-style catalog. Bot/consent stack: PerimeterX, OneTrust, DynamicYield, GTM. **Motion is Swiper + Tailwind utilities — only 4 CSS `@keyframes` and all are utility (spinner/spin/wave/pulse).** No GSAP / Lenis / Locomotive / Framer-Motion detected.
- **Breakpoints (Tailwind v4 + custom):** `640, 768(48rem), 870, 1024(64rem), 1280(80rem), 1536(96rem), 1920(120rem)`. The type scale is redefined at several of these — `--text-display1` grows `—→3.5rem→5rem→5.75rem`; `--text-brand-condensed` grows `1.5rem→2rem→3.75rem`.

## Page anatomy (VERIFIED — full-page screenshot + heading order, 9 bands)
Confirmed visually (1920×5149 full-page render) and against DOM heading order:
1. **Utility bar** (BLACK, full-width, tiny) — left "Find a store", centre promo ("S/PLUS Members: Free Shipping and More"), right "Get exclusive news". ~32px tall.
2. **Main nav** (WHITE, sticky) — left **SALOMON** wordmark (inline SVG, single condensed all-caps path); centre **pill search field** ("Search for a product, activity, shoes…"); right icon cluster: account "Log in / Sign up", wishlist heart, cart bag (with red count badge). Below it a **category row**: New · Shoes · Men · Women · Kids · Activities · Explore.
3. **Hero** (LIGHT) — full-bleed lifestyle/product-shelf photo (running shoes lined on a shelf). Bottom-LEFT: H1 **"One staple, infinite stories"** in SalomonSans + one line of grey subcopy + a single **black pill "Shop Now"** CTA. Text sits directly on the photo (no scrim card).
4. **Shop by activity** (WHITE) — small left-aligned H2 label, then a **5-tile horizontal photo row** (Gravel Running / Trail Running / Road Running / Hiking / Sportstyle) — each a squared image with a caption; a round scroll-arrow affordance on the right edge.
5. **Feature duo band** (BLACK) — one full-width dark band **split 50/50** into two feature panels ("X ULTRA 5 GORE-TEX" | "The All-New Aero Blaze 4"), each with heading + pill CTA over its own image half, a hairline divider between.
6. **Best Sellers rail** (WHITE) — H2 "Our Best Sellers" + a **Swiper product carousel** (XT-6, XT-6 GORE-TEX, XT-WHISPER, XT-4 OG, X ULTRA 5 MID…). Cards = squared product image on `--color-background-secondary`, name, price. (In the static shot the rail shows grey skeletons — client-hydrated.)
7. **Trending / New / Sportstyle Icons** (WHITE) — more titled rails ("Trending Now", "New Arrivals", "Sportstyle Icons") + a **4-tile DARK editorial photo row** (close-up lifestyle shots).
8. **Service + membership band** — three reassurance blocks ("Free Returns Within 45 Days", "Free Shipping for S/PLUS Members") then a **"Become a member"** newsletter/CTA panel.
9. **Footer** (LIGHT→neutral) — "Top Categories" multi-column link grid, then brand/Help Center/Legal/Sustainability/Shipping columns, social, legal bar.

**Rhythm:** mostly WHITE with two DARK punctuation bands (the feature-duo #5 and the trending photo row #7). The eye is carried **horizontally** (rails) far more than in a scroll-story site — the vertical rhythm is calm and even, one titled rail per viewport. Photography is the only colour; every control is a neutral pill.

## Type, wordmark & media (verified)
- **Two-family system:** SalomonSans (display/headings/wordmark) + Inter (body/UI). H1 hero ≈ `--text-display2` (`3rem`→`4.5rem` at wide). Section titles = `--text-heading*` (`heading1` `2.25rem`→`2.625rem`). Body = Inter `--text-body3 1rem` / `--leading-body3 1.5rem`. Tracking is near-zero everywhere (`--tracking-heading* .0025rem`, body `0`) — Salomon does NOT use loose letter-spacing; the one exception is the wordmark.
- **Wordmark:** a single **condensed all-caps SALOMON** rendered as inline SVG (`viewBox 0 0 209 24`, `fill:currentColor`) — NOT a two-weight lockup. The condensed brand type has its own token `--text-brand-condensed` with **tight negative tracking `--tracking-brand-condensed: -.0938rem`**. Weight tokens: normal 400 / semibold 600 / bold 700.
- **Buttons:** every button is a **full pill** (`rounded-full`, height `h-2xl`). Primary = black fill / white text; secondary = white fill / black text; inputs = `oklch(97% 0 none)` fill, pill, `.0625rem` neutral-200 hairline border. Transitions are `transition-colors duration-75 ease-in-out` (snappy, colour-only — buttons don't lift/scale).
- **Media:** **no `<video>` on the homepage** — 21 responsive `<picture>` + 63 `<img>`, Contentful-hosted (`images.ctfassets.net`), served as `srcset` with fixed aspect ratios (`aspect-3/4`, `aspect-square`, `aspect-[15/22]`, `aspect-64/91`). Product tiles are squared (`--radius-none`) on a `--color-background-secondary` (`oklch 97%`) plate. **This is a retail site — media treatment is crisp catalog photography, not cinematic video.** (If cloning for a club, that maps to squared match/kit photography on a light-grey plate, not a background-video hero.)
- **Transitions present:** Swiper rail glide (real: `.6s cubic-bezier(.165,.84,.44,1)`), `group-hover:scale-105/110` image zoom on cards, colour-only button hover, scrollbar fade-in on rail hover, sticky-header translate. No masked headline reveal, no ken-burns (no video), no parallax.

## Micro-details (keen-eye pass — the easy-to-miss things)
- **Nav is a hide-on-scroll header (2-state), not a morphing pill.** `<header class="sticky top-0 z-header w-full bg-background-primary transition-transform duration-200 ease-in-out">`. It stays a full-width **solid white bar** (never goes transparent/pill like Wolverine); JS toggles `translateY(-100%)` to hide it on scroll-down and back to `0` to reveal on scroll-up, eased `duration-200 ease-in-out` (`cubic-bezier(.4,0,.2,1)`). Reproduce: `position:sticky;top:0`; add `.hide{transform:translateY(-100%)}` when `deltaY>0 && scrollY>headerHeight`, remove on scroll-up. The utility bar scrolls away with the page (only the main bar is sticky).
- **Rails, not a hero carousel.** Six `.scroller` regions, each a Swiper. The **scrollbar is hidden until you hover the rail** (`.scroller .swiper:hover > .swiper-scrollbar{opacity:1}`), then fades in — a thin `.25–.5rem` pill track (`--radius-full`). On `≥48rem` some rails hide the scrollbar entirely (`swiper-no-scrollbar`) and rely on arrows. Slide glide is `transform .6s cubic-bezier(.165,.84,.44,1) !important`.
- **Card hover = image scale, wrapper stays put.** ~45 `.group` wrappers. On hover the *image* scales (`group-hover:scale-105`, some `110`) inside a clipped squared frame; the card itself doesn't lift or shadow. Borders can thicken on hover (`group-hover:border-medium`, neutral-1000).
- **Ink is never pure black.** Text = `oklch(16.84% 0 none)`; dark bands = `--color-background-content-black oklch(16.84%)`. Pure `oklch(0%)` (`neutral-1000`) is reserved for button fills / hard hairlines. Subtle, deliberate.
- **Hairlines are `.0625rem` (1px).** Border scale: small `.0625rem` / medium `.125rem` / large `.25rem`. Dividers between feature panels and around inputs use `small`.
- **Colour appears ONLY as state.** Success teal, information blue, danger red (the cart-count badge `bg-danger-700`, `rounded-full`, `top-[5px] right-[6px]`). The UI itself is chroma-free.
- **Spacing is a strict 4px scale** (`--spacing-5xs .125rem` … `-6xl 10rem`, base unit 4). Radii share the same t-shirt scale. Everything snaps to the token grid — this regularity is the "premium" tell.
- **Search is centre-stage.** Unlike editorial sites that bury search, Salomon puts a wide pill search field in the *centre* of the nav — a retail signal (find-the-product-fast).
- **Reduced motion:** not separately authored in CSS here (motion lives in Swiper's JS options); a clone should still add a `prefers-reduced-motion` guard that disables rail auto-glide and hover scale.

---

## Recipe 1 — Hover-scale product rail (Swiper-style horizontal scroller)  ★ signature ★
**Recipe-grade** (real easing + hover values extracted from the CSS; Swiper config is rebuild-by-eye).

**What it is:** the titled horizontal product/photo rails that carry the whole page ("Best Sellers", "Trending Now", the activity tiles). Squared image cards on a light-grey plate; drag/scroll to advance; a thin scrollbar fades in on hover; the image scales on card hover.
**How it works:** a flex track (`.swiper-wrapper`) translated on `transform`; slides `flex-shrink:0`. Snap/glide uses one premium ease-out-quart. Each card is a `.group`; the inner `<img>` gets `group-hover:scale-105` inside an `overflow-hidden` squared frame. Scrollbar is `opacity:0` until the rail is hovered.
**Extracted values:** rail glide `transform .6s cubic-bezier(.165,.84,.44,1)` · card image `scale(1.05)` (some `1.10`) · scrollbar track `--radius-full`, size `.25–.5rem`, fade to `opacity:1` on `:hover` · card plate `oklch(97.02% 0 none)` · tile aspect ratios `3/4`, `square`, `15/22`.

Minimal, dependency-free reconstruction (CSS scroll-snap instead of Swiper):
```html
<div class="rail">
  <a class="card group"><span class="thumb"><img src="…"></span><b>XT-6</b><i>$200</i></a>
  <!-- … -->
</div>
```
```css
.rail{display:flex;gap:1rem;overflow-x:auto;scroll-snap-type:x mandatory;
  scrollbar-width:thin;scrollbar-color:transparent transparent;}
.rail:hover{scrollbar-color:#bbb transparent;}          /* fade the bar in on hover */
.card{flex:0 0 auto;width:min(72vw,300px);scroll-snap-align:start;}
.thumb{display:block;aspect-ratio:1/1;overflow:hidden;border-radius:0;background:oklch(97% 0 none);}
.thumb img{width:100%;height:100%;object-fit:cover;
  transition:scale .6s cubic-bezier(.165,.84,.44,1);}      /* ease-out-quart */
.card.group:hover .thumb img{scale:1.05;}
@media(prefers-reduced-motion:reduce){.thumb img{transition:none;}}
```
**Recipe-grade** for the easing/hover/plate; **rebuild-by-eye** for exact Swiper options (slidesPerView/freeMode/breakpoints weren't in static HTML — `slidesPerView` count = 0 in DOM, set in JS). For Sue's Angels: swap the grey plate for `#F4F6F5`, keep squared tiles for kit/player shots, pill "arrows", volt `#D6F23A` only on the active scrollbar drag — colour-as-state, exactly like Salomon.

## Recipe 2 — Hide-on-scroll sticky header (solid bar, no morph)
**Recipe-grade** (header classes + transition extracted from DOM).
**What it is:** a solid white nav that stays put, hides when you scroll down, and slides back in when you scroll up. Simpler and more retail than Wolverine's 3-state pill — the bar never changes shape or goes transparent.
**Extracted:** `position:sticky;top:0`, `transition-transform duration-200 ease-in-out` (`cubic-bezier(.4,0,.2,1)`), `bg-background-primary` (white), hide = `translateY(-100%)`. Utility bar above it is NOT sticky (scrolls away).
```js
let last = 0;
const nav = document.querySelector('.nav');
addEventListener('scroll', () => {
  const y = scrollY;
  if (y > last && y > nav.offsetHeight) nav.classList.add('hide');   // down → hide
  else nav.classList.remove('hide');                                 // up   → show
  last = y;
}, { passive: true });
```
```css
.nav{position:sticky;top:0;background:#fff;transition:transform .2s cubic-bezier(.4,0,.2,1);}
.nav.hide{transform:translateY(-100%);}
```
For Sue's Angels: same behaviour, navy `#04121B` bar instead of white, keep the `.2s ease-std`.

## Recipe 3 — Token-driven neutral (OKLCH) design system
**Recipe-grade** (the whole scale is extracted). The reason the site reads as expensive: a single perceptual greyscale + strict 4px spacing/radius scales, chroma only for state.
```css
:root{
  /* perceptual neutrals — even lightness steps */
  --neutral-0:oklch(100% 0 none); --neutral-50:oklch(98.51% 0 none);
  --neutral-100:oklch(97.02% 0 none); --neutral-200:oklch(92.19% 0 none);
  --neutral-400:oklch(71.55% 0 none); --neutral-500:oklch(55.55% 0 none);
  --neutral-900:oklch(19.13% 0 none); --neutral-1000:oklch(0% 0 none);
  --ink:oklch(16.84% 0 none);                 /* text — NOT pure black */
  --plate:var(--neutral-100);                 /* product-image background */
  /* state-only chroma */
  --success:oklch(67.78% .1017 180); --danger:oklch(58% .18 27);
  /* strict 4px scale */
  --sp-xs:1rem; --sp-l:2rem; --sp-2xl:3rem;
  --radius-full:624.938rem; --radius-none:0; --border-hair:.0625rem;
}
```
**Rebrand:** keep this neutral spine, then let ONE brand hue (volt `#D6F23A`) appear only as state (active tab, focus ring, live-match dot) — mirroring how Salomon uses teal/red only for state. The discipline (pill controls + squared media + hairline borders + 4px grid) transfers directly.

## Recipe 4 — Feature-duo split band
**Rebuild-by-eye** (structure from the render). A single dark full-width band split 50/50 into two promo panels, each an image with a heading + pill CTA, a `.0625rem` divider between. Collapses to stacked on mobile.
```css
.duo{display:grid;grid-template-columns:1fr 1fr;background:var(--ink);color:#fff;}
.duo>*+*{border-left:var(--border-hair) solid oklch(100% 0 none / .15);}
.duo .panel{position:relative;min-height:60vh;display:flex;align-items:flex-end;padding:2rem;}
@media(max-width:768px){.duo{grid-template-columns:1fr;}.duo>*+*{border-left:0;border-top:var(--border-hair) solid oklch(100% 0 none/.15);}}
```

---

## What to reuse from this site
- **Recipe 1 (hover-scale rail)** + its real `.6s cubic-bezier(.165,.84,.44,1)` glide — the single most transferable asset here; answers "add a product/photo carousel that feels premium".
- **Recipe 2 (hide-on-scroll solid header)** — a cleaner, retail-appropriate alternative to the Wolverine 3-state pill when the brand wants a stable, always-legible bar.
- **Recipe 3 (OKLCH token system)** — the "expensive through system, not motion" lesson: perceptual neutrals + strict 4px scale + pill-controls/squared-media + chroma-only-for-state.
- **Counterpoint to Wolverine:** proof that "premium" ≠ big-type + background video. A retail grid can feel just as high-end with restraint, precision tokens, and horizontal rails. Pick this vocabulary when the content is *products/catalog* (kits, shop, gallery) rather than *editorial story*.

## Fidelity note
- **Recipe-grade** (real extracted values): OKLCH colour scale, spacing/radius/type/tracking token scales, breakpoints, font families (SalomonSans + Inter), rail glide easing (`.6s cubic-bezier(.165,.84,.44,1)`), hover-scale (`105/110%`), button transition (`colors .075s ease-in-out`), sticky-header transition (`transform .2s ease-in-out`, hide=`translateY(-100%)`), hairline `.0625rem`, scrollbar-on-hover.
- **Rebuild-by-eye** (technique understood, values approximated): exact Swiper options per rail (`slidesPerView`/freeMode/breakpoint counts live in JS, `slidesPerView`=0 in static DOM), the feature-duo grid split, product-card internal layout. Carousels render as skeletons in the static shot (client-hydrated), so per-rail item counts were read from headings, not from a live rail.
- Homepage has **no background video** and **no scroll-linked/parallax/masked-reveal motion** — do not import Wolverine's video-in-every-slot or ken-burns assumptions here; Salomon's motion budget is Swiper glide + hover scale only.
