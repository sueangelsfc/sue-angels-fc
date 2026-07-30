# Reference: on.com (On Running)

Studied 2026-07-07 via Firecrawl (full-page screenshot + rawHtml + real `.css`/`.js` assets, analysed in sandbox). Swiss performance-running e-commerce brand (On). This is a **retail/product** reference — the counterpoint to Wolverine's corporate-editorial: same Diatype-grotesk restraint, but built as a fast product-merchandising storefront, not a cinematic scroll story.

## Identity snapshot
- **Style:** Swiss-minimal **retail**. Clean white canvas, one full-bleed lifestyle hero photo, tiny functional nav, product carousels. Precision over drama; whitespace + a single accent do the work. Sportswear-premium, not luxury-editorial.
- **Colour:** `#FFFFFF` bg, `#000000` ink. Accent **blue `#2F7EFE`** (links + focus rings only — not decorative). Price/label brown-gold `#995C00` (tiny mono labels). Greys `#CCC` (rails), `#666` (input text), `#F2F2F2` (input fill). Effectively monochrome + one blue; colour comes from **photography**, never from UI chrome.
- **Type:** self-hosted **On Diatype** (Dinamo Diatype relabelled) in 4 families: `On` (Standard: 400/500/700/900), `On Mono` (400/500/700 — tiny uppercase labels, price/meta), `On Semi Mono`, and **`Suisse Works`** (serif, 400 — editorial/story accents). `font-display:swap`. Grotesk everywhere for UI; serif reserved for story copy.
- **Radius:** `0` (inputs, sharp), `.1875rem`/3px (label chips), `.25rem`/4px (small), **`2.5rem`/40px (buttons — full pill)**. No large card radius — product cards are square-cornered.
- **Stack:** **Nuxt 3 (Vue 3 SSR)**, Vite build (`/_nuxt/*-[hash].js|css`), **155 code-split chunks** + `entry.CoXb0VAY.css`. **Contentful** headless CMS (GraphQL fragments: `BlockHeadline`, `eyebrow`, `subheadline`). Motion = **GSAP + ScrollTrigger + ScrollSmoother** (`registerPlugin(ScrollTrigger, ScrollSmoother)`), exposed via a `useScrollSmoother` composable with `data-lag` parallax effects. Carousels = native CSS **scroll-snap** + **Swiper** for arrow nav. Cloudflare + OneTrust cookie banner + Google Sign-In.
- **Breakpoints:** `768`, `1023`, `1024` (mobile ≤767, tablet 768–1023, desktop ≥1024). Far fewer than Wolverine's granular ladder — a pragmatic 3-tier retail grid.
- **Motion in main CSS is minimal:** 1 cubic-bezier `cubic-bezier(.25,1,.5,1)` (ease-out-quint-ish), 5 keyframes (all utility spinners: `rotate`, `indeterminate-spinner`, `load`, `overflow`, `appear`). The real motion lives in the **GSAP/ScrollSmoother JS chunks**, not CSS — same architecture lesson as Wolverine (JS-driven premium motion).

## Page anatomy (VERIFIED — screenshot hero + rawHtml/markdown for below-fold order)
Screenshot captured the hero above the fold; the SSR DOM + markdown confirm the below-fold band order. Retail merchandising rhythm, not editorial:
1. **Hero** — full-bleed DARK lifestyle photo (runner in motion, environmental). Top nav overlaid transparent: left = On monogram mark; centre-left text links `Shop · Activities · Explore`; right = `AI · Search · Account · Bag` icons. Headline bottom-**LEFT**, white, sentence case: product name (H1, ~heavy) + one-line subhead ("Triple stacked. Fully alive."), then **two pill CTAs** side by side — white pill `Shop women's` + white/outline `Shop men's`. This is a **product launch hero**, not a mission statement.
2. **Shop** band (WHITE) — `## Shop` heading + a **category tile grid** (activity/gender entry points, image tiles).
3. **New arrivals** (WHITE) — `## New arrivals` + a horizontal **product carousel** (scroll-snap track of ProductCards; Swiper arrows on desktop, drag on mobile, custom progress-bar indicator below).
4. **Stories that move** (WHITE) — `## Stories that move` + editorial **story cards** (image + eyebrow + headline; Suisse Works serif accents; links into content).
5. **Our mission** (WHITE, `_dark` block variant) — `## Our mission` full-width image/statement band (brand-values block).
6. **Footer** — link columns, newsletter, social; utility nav; legal.
7. **Locale modal** — `### Select your shipping location and language` (BaseModal, country/currency selector).

Rhythm: **one DARK cinematic hero, then an all-WHITE merchandising stack** — category grid → product carousel → story cards → mission band → footer. Unlike Wolverine there is no dark↔light alternation; it's hero-dark-then-white-storefront. One idea per band, big grotesk headings, generous whitespace, product photography carries all colour.

## Type, wordmark & media (verified)
- **Grotesk (On Diatype) for all UI**; **Suisse Works serif** for story/editorial copy only. Headings 700–900 weight, sentence case (product names + short subheads, e.g. "Triple stacked. Fully alive."). Body 400, line-height 1.5. Fluid sizing via `clamp()` everywhere (e.g. product info `clamp(.875rem,.84rem + .13vw,1rem)`).
- **Tiny mono labels:** `On Mono`, `font-size:.75rem`, `font-weight:500`, `letter-spacing:.09rem`, `text-transform:uppercase`, colour `#995C00` — used for price/product meta chips. This is On's equivalent of Wolverine's mono eyebrows.
- **Wordmark:** On uses the **monogram mark** (the two-arc "On" glyph) top-left, not a split bold/light wordmark. (For a Sue's Angels clone, keep the crest/monogram-left pattern.)
- **Buttons:** full **40px pill** (`border-radius:2.5rem`). Two variants: `_light` = white bg / black text (on dark hero), `_dark` = black bg / white text (on white bands). No shadow. Hero pairs two pills side by side.
- **Media = responsive images, NOT video** in the base SSR (51 `<picture>` / 52 `<img>`, **0 `<video>`** in delivered HTML). The hero is a high-res lifestyle photo with `<picture>` art-direction, not a background video — a key difference from Wolverine. (Video may lazy-mount client-side in some campaigns, but the default treatment is stills.) No ken-burns on the hero — it's a crisp static photo; motion comes from ScrollSmoother parallax on the sections below.
- **Transitions present:** GSAP headline-block reveal (`data-gsap-headline-block`) on scroll; ScrollSmoother `data-lag` parallax; product-card quick-add slide-up; carousel drag + snap; image fade-in on load; blue focus ring. (Real values in recipes below.)

> **Clone status:** analysed from screenshot + real Nuxt CSS/JS. Motion is GSAP/ScrollSmoother-driven (config-grade for CSS/structure; ScrollSmoother internals are rebuild-by-eye — reproduce with Lenis or GSAP ScrollSmoother). Not yet built as a Sue's Angels clone.

## Micro-details (keen-eye pass — the easy-to-miss things)
- **Nav:** overlaid **transparent bar** on the hero (monogram left, text links centre-left, utility icons right). It is `position:fixed`/sticky; the NavigationRoot exposes `--navigation-root-top-offset` custom props (offset vars adjust when banners/drawers open). On scroll it condenses to a solid white bar (state managed in the Nuxt Navigation chunk). It does **not** morph into a floating centered pill like Wolverine — it stays a full-width bar, just swaps transparent→solid. Mobile collapses text links into a hamburger drawer (`_drawer_` section in DOM).
- **Product card quick-add:** the favourites/add control sits in a `_floatingContainer` top-right and the card's action row starts **hidden below** (`transform:translateY(100%)`) and **slides up** on hover — `transition:transform .25s ease-in .05s`. Note the unusual `ease-in` (not ease-out) and `.05s` delay.
- **Product image:** fades in when loaded — `transition:opacity .3s ease-out`; `._isLoading{opacity:.25}`. No hover-zoom on product media (retail keeps the product still/true).
- **Carousel:** native `overflow-x:auto; scroll-snap-type:x mandatory`, scrollbar hidden (`scrollbar-width:none` + `::-webkit-scrollbar{display:none}`), **grab/grabbing** cursor when draggable. Custom **progress indicator**: a `.125rem` (2px) rail, grey `#ccc` base + black `#000` thumb whose position/width are driven by CSS vars `--position` and `--proportion` (`left:calc(var(--position)*(100% - var(--proportion)*100%))`). Desktop arrow buttons live inside the carousel, hidden by default and **fade in on carousel hover** (`--carousel-lite-scroll-buttons-opacity:0` → `:hover ... :1`, `transition:opacity .2s ease-out .1s`); hidden entirely ≤1023px (touch-drag instead).
- **Focus ring:** blue `#2F7EFE`, `box-shadow:0 0 0 .25rem #2f7efe` + `outline:.25rem solid transparent`, applied **only on `:focus-visible`** (cleared on mouse `:focus:not(:focus-visible)`). Consistent across every interactive element — a rigorous a11y detail worth copying.
- **Radii are tiny and purposeful:** inputs `0` (sharp Swiss), label chips `.1875rem`, misc `.25rem`, buttons `2.5rem` pill. No soft 16–26px cards.
- **Labels/meta** are uppercase mono, letter-spaced `.09rem`, brown-gold `#995C00` — a warm accent that keeps the otherwise cold monochrome from feeling sterile.
- Section blocks use shared `_section_ _paddingTop_ _block_` utility classes → consistent vertical rhythm (`padding-top` cadence between bands).

---

## Recipe 1 — Native scroll-snap product carousel with progress-bar indicator  ★ signature ★
**Recipe-grade** (real values from `CarouselLite`/`ProductCard` CSS). On's core merchandising unit.

**What it is:** a horizontal, drag-and-snap product rail with a hidden scrollbar, a slim custom progress indicator, and desktop arrow buttons that fade in on hover.
**How it works:** the viewport is a flex track with `scroll-snap-type:x mandatory`; scrollbar hidden; `cursor:grab`→`grabbing` when draggable. A 2px indicator bar reads two CSS custom props the JS updates on scroll — `--proportion` (visible fraction = thumb width) and `--position` (0→1 scroll progress = thumb offset). Arrows use Swiper's prev/next but are pure CSS-fade on hover.
**Extracted values:** indicator height `.125rem` (2px), base `#ccc` / thumb `#000`; thumb `width:calc(var(--proportion)*100%)`, `left:calc(var(--position)*(100% - var(--proportion)*100%))`. Arrow fade `opacity .2s ease-out .1s`, buttons `display:none` under `1024px`. Track `scroll-snap-type:x mandatory`, `scrollbar-width:none`. Image fade-in `opacity .3s ease-out`.

```html
<div class="rail" style="--position:0;--proportion:.33">
  <div class="viewport">            <!-- scroll-snap track -->
    <a class="card">…</a> …
  </div>
  <div class="indicator"><i></i></div>
</div>
```
```css
.viewport{display:flex;gap:1rem;overflow-x:auto;scroll-snap-type:x mandatory;
  scrollbar-width:none;cursor:grab;}
.viewport::-webkit-scrollbar{display:none}
.viewport:active{cursor:grabbing}
.card{scroll-snap-align:start;flex:0 0 auto}
.indicator{height:.125rem;background:#ccc;position:relative;width:min(100%,12.5rem)}
.indicator i{position:absolute;inset-block:0;background:#000;
  width:calc(var(--proportion)*100%);
  left:calc(var(--position)*(100% - var(--proportion)*100%));}
```
```js
// update --position/--proportion on scroll
const vp=document.querySelector('.viewport'), rail=document.querySelector('.rail');
vp.addEventListener('scroll',()=>{
  const max=vp.scrollWidth-vp.clientWidth;
  rail.style.setProperty('--position', max?vp.scrollLeft/max:0);
  rail.style.setProperty('--proportion', vp.clientWidth/vp.scrollWidth);
},{passive:true});
```
**Rebranded for Sue's Angels:** swap product cards for match/player cards, thumb `#000`→volt `#D6F23A`, keep 40px→26px pill on card CTAs. Native snap = zero-dependency, mobile-perfect. Use over Swiper unless you need loop/autoplay.

## Recipe 2 — Quick-add slide-up on card hover
**Recipe-grade** (`_productCardAnimation` + `_floatingContainer`). The action row hides below the card and rises on hover.
**Extracted values:** start `transform:translateY(100%)`; `transition:transform .25s ease-in .05s`. Favourites control absolutely positioned top-right (`_floatingContainer`, `right:.5rem;top:.5rem` ≥768px).
```css
.card .actions{transform:translateY(100%);transition:transform .25s ease-in .05s}
.card:hover .actions,.card:focus-within .actions{transform:none}
.card .fav{position:absolute;right:.5rem;top:.5rem;z-index:10}
```
Note On's deliberate `ease-in` + `.05s` delay (most sites use ease-out) — gives a quick, mechanical "snap up" rather than a soft settle. Add `:focus-within` for keyboard parity (On relies on hover; improve on it).

## Recipe 3 — GSAP ScrollSmoother + data-lag parallax
**Rebuild-by-eye** (lib present — `registerPlugin(ScrollTrigger, ScrollSmoother)`, `useScrollSmoother` composable, `data-lag`/`data-speed` effects — but GSAP ScrollSmoother is paid/minified; internals not extractable). On wraps the page in a smoother and applies per-element lag so bands drift at slightly different rates.
**Technique:** one `ScrollSmoother.create({wrapper, content, smooth, effects:true})`; elements tagged `data-speed` / `data-lag` parallax automatically. Reproduce free with **Lenis** (smooth scroll) + IntersectionObserver/GSAP for element lag:
```js
// Free equivalent: Lenis smooth-scroll + rAF lag on [data-lag]
const lenis=new Lenis({lerp:0.1}); function raf(t){lenis.raf(t);requestAnimationFrame(raf)} requestAnimationFrame(raf);
lenis.on('scroll',({scroll})=>{
  document.querySelectorAll('[data-lag]').forEach(el=>{
    const lag=parseFloat(el.dataset.lag); // e.g. 0.1–0.5
    el.style.transform=`translate3d(0,${scroll*lag*-0.1}px,0)`;
  });
});
```
Pair with reduced-motion guard. For Sue's Angels, apply `data-lag` to hero foreground vs background layers for depth.

## Recipe 4 — GSAP headline-block reveal on scroll
**Rebuild-by-eye** (attribute `data-gsap-headline-block` confirmed; the tween is in a minified GSAP chunk — values not literal). On animates each Contentful `BlockHeadline` in as it enters. Reproduce with the shared masked-line-rise primitive (SKILL.md) driven by ScrollTrigger/IntersectionObserver: wrap lines in `overflow:hidden`, inner span `translateY(100%)`→`0`, stagger. Use the shared `--ease-out-expo` (~1.05s, .13s stagger). This is functionally the same signature as Wolverine's masked headline — reuse that recipe.

## Recipe 5 — Full-bleed photo hero with bottom-left headline + pill pair
**Recipe-grade** (structure). Product-launch hero: one art-directed `<picture>` (NOT video), dark enough for white text, headline + subhead bottom-left, two 40px pills.
```html
<section class="hero">
  <picture><source media="(max-width:767px)" srcset="hero-m.jpg"><img src="hero.jpg" alt=""></picture>
  <div class="hero__copy">
    <h1>Product Name</h1><p>Short subhead. Two clauses.</p>
    <div class="cta"><a class="pill light">Shop women's</a><a class="pill light">Shop men's</a></div>
  </div>
</section>
```
```css
.hero{position:relative;min-height:100svh}
.hero picture,.hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hero__copy{position:absolute;left:clamp(1rem,4vw,2rem);bottom:clamp(1.5rem,5vw,3rem);color:#fff;max-width:32rem}
.pill{border-radius:2.5rem;padding:.75rem 1.5rem;background:#fff;color:#000}
.pill.dark{background:#000;color:#fff}
```
Optional light bottom scrim (`linear-gradient(transparent,rgba(0,0,0,.35))`) for legibility. For Sue's Angels: reuse `assets/hero/*` stills, recolour a pill to volt.

## Recipe 6 — Focus-visible ring (a11y, copy verbatim)
**Recipe-grade.** On's uniform keyboard-focus treatment — worth adopting wholesale.
```css
:where(a,button,[tabindex],.viewport):focus-visible{
  box-shadow:0 0 0 .25rem #2F7EFE;   /* brand-accent ring */
  outline:.25rem solid transparent;   /* high-contrast-mode fallback */
}
:where(a,button):focus:not(:focus-visible){box-shadow:none;outline:none}
```
Swap `#2F7EFE` for Sue's Angels volt `#D6F23A` (check contrast on light) or navy.

---

## What to reuse from this site
- **Native scroll-snap carousel + CSS-var progress indicator** (Recipe 1) — the best zero-dependency product/match rail; prefer over Swiper.
- **Quick-add slide-up** (Recipe 2) with On's `ease-in .25s .05s` timing — a crisp retail micro-interaction.
- **Focus-visible ring** (Recipe 6) — a rigorous, directly copyable a11y pattern.
- **Photo-hero-not-video** discipline — proof that a crisp art-directed still + big sentence-case headline + pill pair reads just as premium as a video hero, at a fraction of the weight (matters for a grassroots site).
- **Tiny mono uppercase labels in a warm accent** (`#995C00`) over an otherwise monochrome UI — a cheap way to add warmth.
- **Contrast to Wolverine:** same Diatype grotesk restraint, but retail-merchandising rhythm (hero-dark → white product stack) instead of alternating cinematic bands. Pick On's anatomy when the site sells/ shows *things*; pick Wolverine's when it tells a *story*.
