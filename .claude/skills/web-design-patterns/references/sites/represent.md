# Reference: representclo.com

Studied 2026-07-07 via Firecrawl (rawHtml + branding + real `.css`/`.js`/`font.css` assets, analysed in sandbox). US storefront for **Represent** — luxury British streetwear. Shopify (custom **Prestige**-family theme, `t/168`) + Tailwind-compiled CSS + **Swiper** rails + **Lottie** animated wordmark.

> **Fidelity note:** JS-SPA-ish Shopify — the full-page screenshot came back blank (SKILL.md's known SPA failure). Layout/rhythm below are from the USER'S live browser observations (ground truth), section order verified from `rawHtml` shopify-section order, and every token/motion value is **recipe-grade** (extracted from the real `bundle.dynamic.css`, `font.css`, `bundle.dynamic.js`). Deep Swiper internals are technique-level (vendored lib). **Branding auto-detect reported `light` — this is WRONG; the site is DARK/cinematic.** Trust this file.

## Identity snapshot
- **Style:** DARK, cinematic, moody, **premium** editorial-fashion commerce. Full-bleed campaign photography (models in football-shirt-style kit against a gold corrugated wall); product merchandising layered under it. The opposite of the bright athletic-retail sites (gymshark/on/adidas) — this is a *gallery that happens to sell*.
- **Colour (extracted, by frequency):** `#fff` / `#000` do the structural work; near-black surface `#0d0e0e` and ink `#000`; greys `#737373 · #575757 · #717171 · #4d4d4d · #cacaca · #c2c2c2 · #d9d9d9`; off-white bands `#f7f7f7 · #f2f2f2`; hairline `#e5e7eb`; muted UI blue `#2563eb` (links/focus, sparse); sale red `#ff0000`. Translucency tokens: `#ffffff4d` (white 30%), `#00000073` (black 45%) — these drive the **semi-transparent nav + modal scrims**. Effectively monochrome; the *photography* is the colour.
- **Type:** self-hosted **STKBureau** (Sans + Serif, both 300/400/500/600/700 + italics) is the workhorse; display/label stack is **`baudot, STKBureauSerif, sans-serif`** (Baudot from Adobe Typekit `wdk3ifx`). Serif-flavoured wordmark. `inter` appears only inside embedded third-party widgets — not the theme.
- **Radius:** small/sharp — Tailwind `.rounded` = `.25rem` (4px), `.rounded-lg` = `.5rem` (8px), `.rounded-full` = 9999px pills; branding baseUnit `4px`, borderRadius `3px`. `<progress>` bars are `border-radius:0` (hard edges).
- **Stack:** **Shopify** (theme 168; `bundle.dynamic.css/js`, `bundle.pdp.js`, `bundle.search.js`) with a **Tailwind**-compiled utility layer (arbitrary-value selectors `.w-\[var\(--progress\)\]`, `--tw-*` vars, `.backdrop-blur-md`). Motion: **Swiper** (freeMode + mousewheel rails), **Lottie** (`r-icon-lottie.js` — the animated REPRESENT wordmark, an SVG lottie), a little **GSAP** (36 refs), CSS keyframes, and IntersectionObserver. No React/Vue in the theme (those counts are third-party widgets: Klaviyo, Yotpo, Visually, etc.).
- **Breakpoints (Tailwind-ish, granular):** 480, 625, 640, 672, 673, 681, 767, 768, 799, 835, 899, 1023, 1024, 1025, 1100, 1244, 1280, 1449, 1450, 1536px.

## Page anatomy (VERIFIED — section order from rawHtml shopify-section order, layout from live view)
This rhythm is what makes a clone read as "Represent":
1. **Top bar** — `top-bar-countdown` + `top-bar-animated`: a thin countdown/promo strip and an **animated marquee ticker** above the nav.
2. **Header / nav** (`desktop-menu-header` + dropdowns; `mobile-menu-*`) — FIXED, persistent, **semi-transparent over the hero imagery**. Centred serif-flavoured **REPRESENT** wordmark (a Lottie SVG). Links: `Shop · 247 · Retail · Cafe · The Vault · Prestige · region · icons`. Full-width mega-dropdowns on hover.
3. **Hero** (`hero_banner`) — full-bleed cinematic photo/video, **centred overlay text** (small offer eyebrow → big headline "THE VAULT SALE" → "SHOP NOW" CTA). Dark by nature; scrim for legibility.
4. **Product scroll rail** (`product_scroll_section`) ★ signature ★ — a **horizontal Swiper rail** of product cards ("Owners Club Hoodie": image, `% OFF` flash, price, **colour-swatch dots**) with a **progress bar underneath the row** that fills as you drag/scroll the rail. (Recipe 1.)
5. **Blocks** (`blocks`) — a **4-up product grid** below the rail.
6. **Split banner** (`split_banner`) — two-up editorial/campaign band.
7. **Footer** (`main-footer`) — link columns, newsletter, legal.
8. **Loading screen** (`loading-screen`) — brand loader (the Lottie wordmark) on entry.
- **Entry gates:** a **region/shipping-confirm modal** (geolocation-driven — `region`×59, `shipping`×31, `geolocation`×6) **+ a cookie/consent modal** (`cookie`×161, `consent`×63, `popup`×42), both semi-transparent-scrimmed.

Rhythm: dark cinematic hero → merchandising rail → grid → editorial split → footer. One big campaign image owns the fold; product density increases as you scroll. Monochrome chrome, photography supplies all colour.

## Type, wordmark & video (verified)
- **Two families, clear split:** body/UI = **STKBureau** (sans); display/eyebrows/labels = **`baudot, STKBureauSerif`** (serif-flavoured, the premium-fashion register). Weights run 300–700 with true italics in both cuts.
- **Wordmark:** centred **REPRESENT**, serif-flavoured, rendered as a **Lottie** vector (`r-icon-lottie.js`) so it can animate on the loading screen — not a static SVG. (Clone as a centred serif **SUE'S ANGELS** wordmark; a Lottie is optional flourish.)
- **Buttons:** `.rounded-full` pill CTAs and squared text buttons; sweep/underline hover (keyframe `button_underline`, below). On dark bands, white pills; on light, black.
- **Media:** hero is cinematic photo/video (background `Black_Still_*.png` posters seen in image set); product cards are still packshots on light card footers. Treat the hero + split-banner "image" slots as **video-capable** (`muted loop playsinline autoplay` + poster) per the SKILL video-usage note.

> **Clone status:** recipe extracted, not yet built. Reproduce as a dark-cinematic Sue's Angels variant: centred serif wordmark, semi-transparent persistent nav, cinematic hero, and the horizontal rail-with-progress-bar as the signature.

## Micro-details (keen-eye pass — the things that are easy to miss)
- **Nav is FIXED & PERSISTENT over the hero (homepage) — it does NOT hide on scroll.** It overlays the imagery **semi-transparent** (translucency tokens `#ffffff4d` / `#00000073`, Tailwind `.backdrop-blur-md`) and stays put; the centred wordmark reads through the photo.
  - *Code also contains a scroll-state machine* used on collection/PLP pages (not the homepage hero): body classes `header_sticky` / `header_hide` / `scroll_trigger_active`. Real logic (from `bundle.dynamic.js`): on `scrollY > n` add `header_sticky`; if scroll velocity `c > .15` (downward) add `header_hide`; if `h < 0` (scrolling up) remove `header_hide`. `header_hide` applies `transform:translateY(calc(var(--header-height)*-1))`. So the theme *supports* hide-on-scroll-down / show-on-scroll-up + solidify-on-scroll, but the **homepage nav is pinned/translucent** — reproduce that for a like-for-like of the landing view.
- **Top-bar has an animated marquee ticker** (`top-bar-animated`) above a countdown strip.
- **Horizontal product rail carries a progress bar underneath** — driven either by a `<progress value>` element (`--color:#000; --background:#f9f9f9; border-radius:0`, hard edges, `appearance:none`) or the Swiper scrollbar drag (fill width = `(track-drag)*swiper.progress`). Fills 0→100% as the rail scrolls. (Recipe 1.)
- **Two entry modals**, both scrimmed translucent: region/shipping confirm (geo) + cookie consent.
- **Loading screen** on entry plays the Lottie wordmark before content.
- **Colour-swatch dots** on each product card; **`% OFF` flash** badge on sale items.
- Buttons: **underline/sweep on hover** (keyframes `button_underline`, `sweep` — real bodies below).
- Cards/drawers rise **`from_bottom`** (`translateY(100%)→0`); custom scrollbars fade a `#000` thumb in on hover (`border-width .2s ease-in-out`).
- Radii are small (4/8px) and pills; `<progress>` and some media are **zero-radius** — a hard/luxe edge, not soft.

## Extracted motion values (recipe-grade — from bundle.dynamic.css)
- **Easings present:** `cubic-bezier(.4,0,.2,1)` (Material standard, dominant) · `cubic-bezier(.4,0,.6,1)` · `cubic-bezier(.4,0,1,1)` (accelerate) · `cubic-bezier(0,0,.2,1)` (decelerate) · `cubic-bezier(.35,0,.15,1)` (custom snappy-settle).
- **Durations in use:** .05 · .1 · .15 · .2 · .3 · .4 · .5 · .6 · .7 · .85 · 1 · 1.026 · 1.5 · 2s. UI micro-motion clusters at **.2–.4s** (fast-retail register, like gymshark/on/adidas — NOT the slow-editorial wolverine register), with .85–1.026s for larger reveals.
- **Motion counts:** `transition:`×306 · `transform:`×352 · `animation:`×12 · `@keyframes`×8 · `will-change`×4 · `backdrop-filter`×45 (nav + modal glass) · `mix-blend`×4.
- **Keyframes (real bodies):**
```css
@keyframes pulse            { 50%{opacity:.5} }
@keyframes spin             { to{transform:rotate(1turn)} }
@keyframes from_bottom      { 0%{transform:translateY(100%)} to{transform:translateY(0)} }   /* drawers/cards rise */
@keyframes sweep            { 0%{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }  /* reveal */
@keyframes fadeIn           { 0%{opacity:0} to{opacity:1} }
@keyframes button_underline { 0%{left:auto;right:0;width:100%} 49%{left:auto;right:0;width:0}
                              50%{left:0;right:auto;width:0} to{left:0;right:auto;width:100%} } /* underline flips side then re-draws */
@keyframes details-show     { 0%{opacity:0;transform:var(--details-translate,translateY(-.5em))} }
```

---

## Recipe 1 — Horizontal product rail + progress bar  ★ signature ★
**Recipe-grade** structure (Swiper `freeMode`+`mousewheel`+scrollbar, real classes/vars); Swiper internals are vendored (technique-level).

**What it is:** a full-width horizontal rail of product cards you drag/scroll/wheel through, with a thin **progress bar underneath the row** that fills 0→100% to show how far along the rail you are.
**How Represent does it:** a **Swiper** track (`freeMode: true`, `mousewheel: true`) whose progress drives a bar. Two mechanisms co-exist in the theme: (a) Swiper's own **scrollbar** module — fill/drag width = `(trackW − dragW) * swiper.progress` (from `bundle.dynamic.js`); and (b) a native **`<progress value>`** styled `appearance:none; --color:#000; --background:#f9f9f9; border-radius:0` with its width bound to a `--progress` CSS var (Tailwind `.w-[var(--progress)]`). Cards: packshot in a clipped frame + footer (`.product-card-footer`, `min-height:72px` desktop `52px`) holding title, price, `% OFF`, and colour-swatch dots.
**Extracted values:** rail motion in the fast-retail band (~.2–.4s, `cubic-bezier(.4,0,.2,1)`); scrollbar thumb `#000` fading in on hover over `.2s ease-in-out`; progress bar hard-edged (`border-radius:0`).

Minimal, dependency-free reconstruction (no Swiper — CSS scroll-snap + a scroll-progress bar):
```html
<div class="rail" id="rail">
  <article class="pcard">…</article> <!-- repeat -->
</div>
<div class="rail-progress"><span id="railfill"></span></div>
```
```css
.rail{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x proximity;scrollbar-width:none;}
.rail::-webkit-scrollbar{display:none;}
.pcard{flex:0 0 clamp(240px,26vw,320px);scroll-snap-align:start;}
.rail-progress{height:2px;background:#f9f9f9;border-radius:0;margin-top:14px;}    /* hard edge */
#railfill{display:block;height:100%;width:var(--progress,0%);background:#000;
  transition:width .12s cubic-bezier(.4,0,.2,1);}
```
```js
const rail = document.getElementById('rail'), fill = document.getElementById('railfill');
function sync(){
  const max = rail.scrollWidth - rail.clientWidth;
  const p = max > 0 ? (rail.scrollLeft / max) * 100 : 0;
  fill.style.setProperty('--progress', p + '%'); // or fill.style.width = p+'%'
}
rail.addEventListener('scroll', sync, { passive:true });
addEventListener('resize', sync); sync();
```
**Rebranded for Sue's Angels:** rail of fixture/kit/player cards on the dark navy (`#04121B`) hero underlay; progress fill in volt `#D6F23A` instead of `#000`; keep the hard-edge (`border-radius:0`) progress bar for the luxe feel; card footer 72/52px min-height; add a `% OFF`-style volt flash badge for "NEW"/"MOTM".

## Recipe 2 — Fixed translucent nav (persistent) + optional scroll-state machine
**Recipe-grade** (body-class logic lifted verbatim from `bundle.dynamic.js`).

**What it is:** a persistent nav that overlays the hero **semi-transparent** and stays pinned (homepage). The same theme carries a scroll-state machine (sticky-solidify + hide-on-scroll-down / show-on-scroll-up) used on inner pages.
```css
.nav{position:fixed;inset:0 0 auto;z-index:50;display:grid;grid-template-columns:1fr auto 1fr;
  align-items:center;padding:14px 24px;
  background:rgba(0,0,0,.28);                      /* #00000073-ish translucency */
  -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);}
.nav .wordmark{grid-column:2;justify-self:center;} /* centred serif wordmark */
/* inner-page state machine (opt-in): */
:root{--header-height:64px;}
body.header_sticky .nav{background:#000;backdrop-filter:none;}         /* solidify past threshold */
body.header_hide   .nav{transform:translateY(calc(var(--header-height)*-1));
  transition:transform .3s cubic-bezier(.4,0,.2,1);}                    /* hide on scroll-down */
```
```js
// Homepage: leave the nav fixed+translucent (do NOT add header_hide).
// Inner pages: reproduce Represent's real handler —
let last = window.scrollY, thr = 59;
addEventListener('scroll', () => {
  const y = window.scrollY, dv = y - last;            // dv>0 = scrolling down
  const b = document.body;
  if (y > thr) {
    b.classList.add('header_sticky');
    if (dv > .15) b.classList.add('header_hide');     // hide on down
    else if (dv < 0) b.classList.remove('header_hide'); // show on up
  } else { b.classList.remove('header_sticky','header_hide'); }
  last = y;
}, { passive:true });
```
**For Sue's Angels:** pin a translucent navy nav (`rgba(4,18,27,.35)` + `blur(10px)`) with a centred serif wordmark over the cinematic hero; keep it persistent on the landing view. Reuse the state machine only on inner/list pages if a solid sticky is wanted.

## Recipe 3 — Underline / sweep hover on buttons & links
**Recipe-grade** (keyframe `button_underline` extracted). An underline that redraws by flipping which side it anchors to — a premium detail vs a plain grow.
```css
.lnk{position:relative;}
.lnk::after{content:"";position:absolute;left:0;bottom:-2px;height:1px;width:100%;background:currentColor;}
.lnk:hover::after{animation:button_underline .4s cubic-bezier(.4,0,.2,1) both;}
@keyframes button_underline{0%{left:auto;right:0;width:100%}49%{left:auto;right:0;width:0}
  50%{left:0;right:auto;width:0}to{left:0;right:auto;width:100%}}
```
Pair with `@keyframes sweep` (`opacity 0→1 + translateY(10px→0)`) for content reveals and `from_bottom` for drawers/cards rising in.

## Recipe 4 — Entry gates (region + cookie modals) over a scrim
**Rebuild-by-eye** (structure only). Two stacked translucent-scrim modals on first load: a geolocation region/shipping confirm and a cookie-consent panel. Scrim = `rgba(0,0,0,.45)` (`#00000073`); panel dark, small radius, `from_bottom` or `fadeIn` entrance. Gate content behind them; persist choice to storage.

## Recipe 5 — Animated marquee top-bar + Lottie wordmark
**Rebuild-by-eye.** Thin promo/countdown strip above the nav with a continuously scrolling marquee (`top-bar-animated`). Wordmark is a **Lottie** SVG (`r-icon-lottie.js`) so it can draw-on during the loading screen. Rebuild the marquee with a CSS translate loop; the wordmark can be a static SVG unless the draw-on flourish is wanted.

---

## What to reuse from this site
- **The horizontal rail + progress bar** (Recipe 1) — the signature interaction; directly answers "a merch/fixture rail with a scroll progress indicator." Hard-edge (`border-radius:0`) progress bar is the luxe tell.
- **Fixed translucent nav with a centred serif wordmark** (Recipe 2) — the premium-fashion header, distinct from the hide-on-scroll retail headers already in the library.
- **The dark-cinematic register with monochrome chrome + photography-as-colour** — a DARK counterpoint to wolverine's white editorial and the bright retail sites.
- **Two-family split:** serif display/label (`baudot`/`STKBureauSerif`) + sans body (`STKBureau`) — the fashion-luxe type pairing pattern.
- **Fast-retail motion in `cubic-bezier(.4,0,.2,1)` at .2–.4s** with the `button_underline` / `from_bottom` / `sweep` keyframe set.
