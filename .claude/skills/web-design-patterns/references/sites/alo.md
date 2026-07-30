# Reference: aloyoga.com

Studied 2026-07-07 via Firecrawl (pre-scraped rawHtml + branding + real `.css` assets, analysed in the context-mode sandbox) **plus a live watched scroll in a real browser** (the SPA screenshot came back blank, as expected — the live watch is ground truth). E-commerce home for Alo Yoga (Alo, LLC), a premium athleisure/fashion label.

## Identity snapshot
- **Style:** sophisticated **fashion-editorial commerce** — monochrome UI (black ink on pure white) with a single **seasonal campaign accent** (the studied drop is emerald green). Reads like a fashion magazine that happens to sell leggings: big whitespace, restrained chrome, photography does the talking. NOT a loud athletic store.
- **Colour:** `#FFFFFF` bg, `#000` ink (`--primary`), a full neutral ramp — `--charcoal #242424`, `--mine #3b3b3b`, `--chicago #636363`, `--dawn #a3a3a3`, `--alto #ccc`, `--mercury #e1e1e1`, `--smoke #f2f2f2`. Warm "highlight" accent family for hover underlines/borders: `--highlight-light #f1e8dd`, `--highlight-medium #ceb18f`, `--highlight-dark #826646` (sand/tan). Semantic set: success `#758e6d`, alert `#b00020`, accent-blue `#7183b0`, plus `--sand #e0d7d1`. **Seasonal campaign colour (emerald) is applied per-drop in the React banner content, not a theme token** — it swaps with each campaign.
- **Type:** body/UI is **proxima-nova** (Adobe Typekit) — `--primary-font: "proxima-nova",Helvetica,sans-serif`. (Legacy Arquitecta woff2 files ship in the theme but the live root font is proxima-nova.) The **campaign display accent is an ITALIC SERIF** ("*Emerald Isle*", "*New Drop*") rendered in the hero/banner content over imagery — the theme CSS declares it inline as `var(--primary-font),sans-serif` with `font-style:italic`, so the serif face itself is carried by the campaign artwork/asset, not a global @font-face. Treat the italic-serif as an **art-directed accent per drop**, not a system font.
- **Type micro-rules:** drop/section eyebrow headings are UPPERCASE, heavy, tracked-out — `.block-title--new{font-size:36px;font-weight:900;letter-spacing:3.5px}`. Product card titles small and quiet — `font-size:16px;font-weight:700;letter-spacing:.25px;line-height:20px`, `text-transform:none`. Hero CTA buttons `font-weight:900`, `letter-spacing:.0833em` (~1.33px), `font-size:1.125rem`.
- **Radius:** near-zero — buttons `border-radius:0` (hard-edge), inputs `0`, small surfaces `5px` (dropdown menus). Sharp, fashion-catalogue feel.
- **Stack:** **Shopify** theme (`/cdn/shop/t/5371/`) with a **React "HomepageReact"** app for the merchandising sections, **Swiper** for the product carousels (`--swiper-theme-color` default), **Semantic UI** as the base component CSS (Lato) + **MUI** for the sort/filter controls, **Pixlee** for UGC feeds. Motion is a mix of the Semantic UI keyframe library (50 named `@keyframes`: `fadeIn/scaleIn/slideInY/...`) and simple CSS `transition` on the homepage sections. No GSAP/scroll-lib detected.
- **Spacing scale:** 4px base — `--spacing-xs 4 / sm 8 / md 16 / lg 24 / xl 32 / 2xl 40 / 3xl 48 … 9xl 120`. Shadow ramp `--shadow-level-1..4`.
- **Breakpoints:** Bootstrap-grid style — `767.98`, `991.98`, `1199.98` (max) and `768`, `992` (min). Separate desktop-only / mobile-only hero slideshows.

## Page anatomy (VERIFIED from live watched scroll)
Confirmed by watching it scroll in a real browser (SPA screenshot was blank). This rhythm is what makes it read as "Alo":
1. **Announcement bar** (top, above nav) — thin bar in the seasonal accent (emerald) with **auto-rotating messages** that cross-fade, and a **PAUSE button** to stop the rotation. Class `uni-banner` → `uni-banner__text fade-in`, `nativeapp-hide`.
2. **Sticky white nav** — persists on scroll (`position:fixed`, Shopify `StickyEnable`). Lowercase **"alo"** wordmark (the double-`o` logo SVG). Left/centre links: **WOMEN · MEN · SHOES · ATELIER** — Atelier carries a `<span class="menu-item-badge">NEW</span>`. Right cluster: search · sign-in · wishlist (heart) · bag. Stays white on scroll (not transparent-over-hero).
3. **Hero — split editorial slideshow** — desktop `hero-slideshow--desktop-only`, separate `--mobile-only` variant. Layout: left full-bleed image, **centre campaign lockup ("NEW DROP / *Emerald Isle*" in italic serif)** framed over an image, right a second image column. `hero-button` CTA (also `hero-button--white-bg`).
4. **"Discover Our Latest Drop"** band — UPPERCASE heavy tracked heading (`.block-title--new`, 36px/900/3.5px) + a "Shop [campaign]" text link.
5. **Product carousel (5-up)** — horizontal **Swiper** rail of product images, next arrow control; **hover reveals a wishlist heart** on each card and swaps to the second product photo. `transition:transform .3s ease-in-out` on the track.
6. **Repeating merchandising bands** — "Trending Now", "Most-Loved Pieces", "Shades of Sport", "Seasonal Essentials", "Best-selling styles…", each an editorial heading (`h2` sentence-case-with-period + `h3` eyebrow) over another carousel or image-duo. UGC / "New to ALO?" educational blocks near the foot.
7. **Footer** — quiet multi-column link footer on white, uppercase letter-spaced column labels.

Rhythm: one merchandising idea per band, generous whitespace, monochrome chrome with photography carrying all the colour, the seasonal accent used sparingly (announcement bar, campaign lockup, hover underline). Editorial restraint over retail loudness.

## Type, wordmark & media (verified)
- **Body/UI:** proxima-nova everywhere; product titles quiet 16/700, section eyebrows 36/900/3.5px-tracked uppercase.
- **Campaign display:** art-directed **italic serif** for drop names — per-drop asset, not a global font. Clone it as an intentional serif-italic accent laid over hero imagery, contrasting the sans UI.
- **Wordmark:** lowercase **"alo"** as a single SVG (the two `o`s form the mark). No bold/light split (unlike Wolverine).
- **Buttons:** hard-edge (`border-radius:0`), black fill / white text primary, or `--white-bg` variant on dark imagery; `font-weight:900`, letter-spaced, `padding:15px 30px` desktop / `10px 20px` mobile.
- **Media:** **imagery-led, not video** — hero and every merchandising rail are photography (fashion editorial + product shots). Two images per product card (primary + hover-swap). Emerald campaign photography is the colour source.
- **Transitions present:** announcement cross-fade + pause; product image-swap on hover (`.3s ease-in-out`); Swiper track slide (`transform .3s ease-in-out`); quick-add dropdown on tile hover; wishlist-heart reveal on hover; size-option hover underline (`3px solid var(--highlight-medium)`).

> **Clone status:** analysed from real Shopify theme CSS + live watched scroll. CSS/tokens/structure are **config-grade**; the React/Swiper merchandising internals and the per-drop italic-serif campaign lockup are **rebuild-by-eye** (art-directed content, not in the static theme).

## Micro-details (keen-eye pass — the things that are easy to miss)
- **Sticky white nav, not a morph:** unlike Wolverine's 3-state pill, Alo's header is a **plain white bar that stays fixed and white** through the whole scroll (`position:fixed`, Shopify `StickyEnable`). No transparent-over-hero phase, no hide-on-scroll. The restraint IS the statement. Reproduce: `position:fixed;top:0;background:#fff` from load; optional 1px bottom hairline appears once scrolled.
- **Announcement bar has a PAUSE control:** the emerald top bar auto-rotates multiple messages with a cross-fade (`uni-banner__text fade-in`) and exposes a **pause/replay button** so a user can stop the rotation — an accessibility-minded detail most clones omit. Reproduce: `setInterval` swap of message nodes with a fade class, a toggle button that clears/restores the interval, honour `prefers-reduced-motion` by defaulting to paused.
- **Italic-serif campaign accent:** the ONE type flourish in an otherwise all-sans, all-caps system. A lowercase italic serif ("*Emerald Isle*") set large over the hero image — instantly signals "fashion" not "gym". It's per-campaign art direction, swapped each drop.
- **Product card = two-image hover-swap:** each card holds a primary + a `.reveal .hidden` second image (`opacity:0;transition:all .3s ease-in-out`); on `:hover` the second fades in (`opacity:1`). Editorial, not a zoom.
- **Wishlist heart reveals on card hover:** `wishlist-icon-wrapper` / `wishlist-static` heart sits hidden and fades in on card hover (top corner of the image).
- **Quick-add appears on tile hover:** a size-selector dropdown (`quick-add-variant-selection-dropdown`, `bottom:75px`) slides up over the tile; size options get a `3px solid var(--highlight-medium)` (sand) underline on hover.
- **Carousels are Swiper rails** with a single next-arrow affordance and `transform .3s ease-in-out` — snappy retail motion, not slow cinema.
- **Hard-edge buttons** (`border-radius:0`) and heavy tracked-out uppercase eyebrows (`letter-spacing:3.5px`) are the two loudest catalogue cues; everything else is quiet.
- **Seasonal accent is a variable, not the brand:** the emerald is a per-drop colour applied to announcement bar + campaign lockup + a few links; the permanent brand is monochrome. Design the accent as one swappable token.

---

## Recipe 1 — Auto-rotating announcement bar with pause  ★ signature ★
**Recipe-grade** (structure `uni-banner__text fade-in` + pause control observed live; timing rebuild-by-eye).

**What it is:** a thin top bar in the seasonal accent that cycles a set of short messages with a cross-fade, plus a pause/replay toggle for accessibility.
**How it works:** an array of message nodes stacked in one slot; an interval advances the active index; the outgoing message fades out and the incoming fades in via an opacity class. A button toggles the interval on/off; reduced-motion users get it paused by default.

```html
<div class="anno" role="region" aria-label="Announcements">
  <span class="anno__msg is-on">Free shipping over £50</span>
  <span class="anno__msg">New drop just landed</span>
  <button class="anno__pause" aria-label="Pause announcements" aria-pressed="false">❚❚</button>
</div>
```
```css
.anno{position:relative;display:grid;place-items:center;min-height:34px;background:var(--accent);color:#fff;font-size:.8rem;letter-spacing:.06em}
.anno__msg{grid-area:1/1;opacity:0;transition:opacity .5s ease-in-out}
.anno__msg.is-on{opacity:1}
.anno__pause{position:absolute;right:12px;background:none;border:0;color:inherit;cursor:pointer}
```
```js
const msgs=[...document.querySelectorAll('.anno__msg')]; let i=0,timer=null;
const show=n=>{msgs.forEach((m,k)=>m.classList.toggle('is-on',k===n));};
const start=()=>timer=setInterval(()=>show(i=(i+1)%msgs.length),4500);
const stop =()=>{clearInterval(timer);timer=null;};
const btn=document.querySelector('.anno__pause');
btn.onclick=()=>{const on=!!timer; on?stop():start(); btn.setAttribute('aria-pressed',String(on)); btn.textContent=on?'▶':'❚❚';};
if(!matchMedia('(prefers-reduced-motion:reduce)').matches) start();
```
**Rebranded for Sue's Angels:** swap `--accent` to volt `#D6F23A` (dark text on it), rotate matchday/ticket/sponsor messages.

## Recipe 2 — Product card with hover image-swap + reveal-on-hover heart
**Recipe-grade** (`.reveal .hidden{opacity:0;transition:all .3s ease-in-out}` extracted).

**What it is:** an editorial product tile that cross-fades to a second photo on hover and reveals a wishlist heart — no zoom, pure fashion restraint.
```html
<a class="card">
  <span class="card__img reveal">
    <img src="front.jpg" alt="">
    <img class="hidden" src="alt.jpg" alt="">
    <button class="card__heart" aria-label="Save">♥</button>
  </span>
  <p class="card__title">Airbrush Legging</p>
</a>
```
```css
.card__img{position:relative;display:block;overflow:hidden}
.reveal .hidden{position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .3s ease-in-out}
.card__heart{position:absolute;top:10px;right:10px;opacity:0;transition:opacity .3s ease-in-out;background:none;border:0;cursor:pointer}
@media(hover:hover) and (pointer:fine){
  .card:hover .reveal .hidden{opacity:1}
  .card:hover .card__heart{opacity:1}
}
.card__title{font-size:16px;font-weight:700;letter-spacing:.25px;line-height:20px}
```
**Rebranded for Sue's Angels:** two kit/matchday photos per card; heart → a "★ save" in volt; keep the 16/700 quiet title. (Contrast with the *retail-zoom* recipes on Nike/On — Alo's swap-not-zoom reads more editorial.)

## Recipe 3 — Sticky white nav (restraint version)
**Recipe-grade.** A fixed white bar from load; no transparent phase, no hide-on-scroll. The opposite move to Wolverine's 3-state pill — the calm IS the brand.
```css
.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;
     height:64px;padding:0 24px;background:#fff;transition:box-shadow .2s ease}
.nav.scrolled{box-shadow:0 1px 0 rgba(0,0,0,.08)}   /* hairline once scrolled */
.nav__badge{font-size:.6rem;font-weight:900;letter-spacing:.1em;vertical-align:super} /* the ATELIER "NEW" pill */
```
```js
addEventListener('scroll',()=>document.querySelector('.nav').classList.toggle('scrolled',scrollY>8),{passive:true});
```
**Rebranded:** wordmark lowercase; links WOMEN/MEN → SQUAD/FIXTURES/etc; the `NEW` badge maps to a "NEW" tag on a fresh section. Keep it white — don't add the morph.

## Recipe 4 — Uppercase drop-heading + Swiper product rail
**Recipe-grade** heading (`36px/900/3.5px`), **rebuild-by-eye** rail (Swiper).

**Heading:**
```css
.drop-title{font-size:36px;font-weight:900;letter-spacing:3.5px;text-transform:uppercase}
.drop-link{font-weight:700;text-decoration:underline}   /* "Shop [campaign]" */
```
**Rail:** Alo uses **Swiper** with `transition:transform .3s ease-in-out` and a single next-arrow. Rebuild dependency-free with CSS scroll-snap + an arrow handler (don't pull Swiper for a static site):
```css
.rail{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}
.rail>*{flex:0 0 clamp(214px,20vw,320px);scroll-snap-align:start}
```
```js
next.onclick=()=>rail.scrollBy({left:rail.clientWidth*0.8,behavior:'smooth'});
```
Show ~5 cards on desktop with a peek of the next.

## Recipe 5 — Italic-serif campaign accent over imagery
**Rebuild-by-eye** (per-drop art direction; not a theme font).

**What it is:** the single serif-italic flourish in an all-sans system — a large lowercase italic serif campaign name laid over the hero photo, contrasting the tracked-out sans UI. Signals "fashion" instantly.
```css
.campaign-eyebrow{font:900 .8rem/1 proxima-nova,sans-serif;letter-spacing:.14em;text-transform:uppercase} /* "NEW DROP" */
.campaign-name{font-family:"Reckless","Canela",Georgia,serif;font-style:italic;font-weight:400;
               font-size:clamp(2.5rem,6vw,5rem);line-height:1.02}   /* "Emerald Isle" */
```
**Rebranded for Sue's Angels:** keep Clash Display for the sans UI, add ONE italic serif (e.g. a Reckless/Canela-class face) purely for campaign/section names ("*Cup Final*") over a hero photo, tinted with the seasonal accent. Use sparingly — its power is scarcity.

---

## What to reuse from this site
- **The restraint model:** monochrome UI + ONE swappable seasonal accent token, photography carries all colour. The most transferable idea — a calm, expensive commerce look without loud chrome.
- **Auto-rotating announcement bar WITH a pause button** — the accessibility-minded top-bar pattern (Recipe 1).
- **Hover image-swap + reveal-heart product card** (editorial, `.3s ease-in-out`, not a zoom) — the fashion alternative to the retail hover-zoom in Nike/On/Salomon.
- **Sticky-plain-white nav** as the deliberate opposite of a morphing nav — restraint as identity (Recipe 3).
- **Italic-serif accent over an all-sans, all-caps system** — one type flourish, art-directed, scarce (Recipe 5).
- **Hard-edge (0-radius) buttons + heavy tracked-out uppercase eyebrows** as catalogue cues.

**Motion register:** **fast editorial retail** — `.3s ease-in-out` on swaps/rails, `.5s` cross-fades. Between Wolverine's slow scroll-cinema and Gymshark's snappy app-flow; leans editorial (image-led, no video, no scroll-parallax).
