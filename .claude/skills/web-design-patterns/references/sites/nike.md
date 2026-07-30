# Reference: nike.com

Studied 2026-07-07 via Firecrawl (full-page screenshot + rawHtml + real `_next` CSS chunks and `ncss` token stylesheet, analysed in sandbox). The Nike.com homepage — mass-market athletic retail, editorial full-bleed merchandising.

## Identity snapshot
- **Style:** confident, high-contrast **athletic editorial** on a WHITE canvas. Full-bleed cinematic hero(s) with corner-anchored UPPERCASE headlines, then a long stack of merchandising "cards" (image/video panels with overlaid heading + pill CTA), a shop-by-icon grid, and a trending carousel. Restrained chrome, loud photography — the product/athlete imagery does all the talking.
- **Colour:** near-monochrome UI. `#FFFFFF` bg, ink `#111111` (their "black"), a full grey ramp `#FAFAFA/#F5F5F5/#E5E5E5/#CACACB/#9E9EA0/#707072/#4B4B4D/#39393B/#28282A/#1F1F21`. Secondary text = grey-500 `#707072`. Accents only inside imagery + a red `#D30005` (critical) and blue `#1151FF` (links). Effectively **no brand chroma in the layout** — hierarchy is type + photography, same monochrome discipline as Wolverine but warmer/louder.
- **Type:** self-hosted **Helvetica Now** family — `Helvetica Now Text` (body/heading) + `Helvetica Now Text Medium` + `Helvetica Now Display Medium` (large display), stack `…,Helvetica,Arial,sans-serif`. Marketing headlines use **Nike Futura ND / Nike Futura** (the italic-caps "marketing-font" class) — that condensed all-caps italic is the *signature* look on hero/card headlines ("HIS LEGEND LIVES ON", "SWEAT. PROOF."). Branding probe reported display H2 ≈ 96px, H1 ≈ 24px (section labels), body 12px.
- **Radius:** token scale `4 / 8 / 12 / 24px` (s/m/l/xl); **buttons are full pills — `border-radius: 30px`** (`--podium-cds-button-border-radius`); form inputs 24px.
- **Stack:** **Next.js** (`_next/static`, `__NEXT_DATA__`, webpack) + **React 18.3.1** (UMD vendor) + **Emotion** (`@emotion/core|styled` CSS-in-JS) over a design-token layer branded **"podium-cds"** (Nike's "Podium" design system; every colour/space/transition is a `--podium-cds-*` var). Motion is **plain CSS transitions + native `IntersectionObserver` + `requestAnimationFrame`** — **no GSAP, Lenis, Locomotive, Framer-Motion, Swiper, Embla, or keen-slider detected** (grepped framework/main/vendor + shop + video bundles). Carousels are **native CSS scroll-snap** (`overflow-x:scroll; scroll-behavior:smooth`, custom scrollbar). Video via a self-hosted `nike-one-video-player` (video.js-based).
- **Motion tokens (real):** `--podium-cds-transition-duration-fast: 150ms`, `--podium-cds-transition-duration-normal: 250ms`, and one shared easing `--podium-cds-transition-timing-function-ease: cubic-bezier(.25, .1, .25, 1)` (CSS `ease`, essentially). That's the whole motion vocabulary — short, snappy, un-fancy. Slideshow dots use `transition: all .3s ease`.
- **Breakpoints:** the classic **600 / 960 / 1440 / 1600 / 1880 / 1920px** ladder (`min-width` media queries throughout); mobile-first base, `600px` is the primary phone→desktop switch, plus ultrawide hero heights at 1440/1600/1880.

## Page anatomy (VERIFIED — screenshot of the top fold + heading order from rawHtml)
Screenshot confirms the fold; the rest is ordered from the DOM heading sequence + card CSS. Nike A/B-tests the homepage constantly, so exact card copy shifts — the *rhythm* is stable:
1. **Utility top bar** (tiny, grey `#F5F5F5`) — left: Jordan / Converse brand links; right: Find a Store · Help · Join Us / Sign In. ~12px.
2. **Primary nav** (white, sticky) — swoosh logo far-left; centered text links (Men · Women · Kids · Jordan · [seasonal] · Nike SKIMS · Football); right utility cluster: **search field** (pill, `#F5F5F5` bg, 24px radius, expands), favourite (heart), bag. Black text on white.
3. **Hero slideshow** — full-bleed **cinematic dark image/video**, ~`aspect-ratio 72/35` desktop (`2/3` mobile), fixed heights 700→900px at ≥1440. Corner-anchored overlay bottom-LEFT: UPPERCASE Futura-italic headline ("HIS LEGEND LIVES ON") + one-line sub + a **secondary pill CTA** ("Shop …"). Slideshow controls bottom: **dot indicators centered** (5×5px, `.5`→`1` opacity), **pause + prev/next round buttons bottom-RIGHT** (36px circles, `opacity .7`→`1` on hover). Slides push in via `translateX(±100%)→0` keyframe (`_22kD7MgC` / `_1Io7Ckl7`, 1s ease-in-out).
4. **Merch card stack** — a long vertical sequence of full-width (and split 40/60) **image-card / video-card** panels. Each: full-bleed media + a `_13xDDA0A` overlay box (absolutely positioned, `top/left:24px→48px`, `justify-content:flex-end`) holding a tiny label, a big heading, and a pill CTA. Overlay alignment variants: left / centered (`left:20%;width:60%`) / right (`right:24px`). Examples in DOM: "Run Free, Play Forever" · "Nike Vapor Edge 360" · "Lock In. Level Up." · "FULL HORSEPOWER".
5. **Shop-by-icon grid** — centered row of circular product/category thumbnails (`img{width:72px}`), `flex-basis 33.33%` mobile → `12.5%` (8-up) desktop, label under each, hover → `--podium-cds-color-text-hover` (grey-500).
6. **"TRENDING" carousel** — `H2 TRENDING` + tab row (Featured / Shoes / Clothing / Kids) then a **native scroll-snap product carousel** (`.slider`, `overflow-x:scroll; scroll-behavior:smooth`, hidden scrollbar on mobile, arrow `.carousel-btn` shown ≥600px). Product cards `aspect-ratio:1`.
7. **Editorial / marquee blocks** — occasional `_1aWPUELV` centered text bands (`margin:96px 0; width:80%`) between card runs — a headline + centered paragraph breather.
8. **Footer** (dark) — multi-column link menu (`footer-menu-column-0..n`, each a header + children), region/social row, legal bar. Rendered by a separate `dotcom-nav-v3` header/footer micro-frontend bundle.

Rhythm: **one WHITE canvas throughout** (not Wolverine's dark↔light alternation) — the "dark bands" are the *photographs inside the hero and cards*, not the page. Cadence is a relentless **full-bleed-media-with-corner-overlay** beat, one merch story per ~viewport, generous whitespace between card runs, monochrome chrome so the imagery pops.

## Type, wordmark & video (verified)
- **Two type registers:** (a) UI/body = **Helvetica Now Text / Text Medium** (clean neutral grotesk, regular weight, sentence case); (b) marketing headlines = **Nike Futura ND** condensed **ALL-CAPS ITALIC** (the `marketing-font` / `headline-*-marketing` classes) — this is the brand's shout. Card/hero headings are almost always this Futura-caps, short, punchy, often with periods ("SWEAT. PROOF." / "Nothing Sweet About It").
- **Wordmark:** there is no text wordmark — it's the **Swoosh SVG** (inline `viewBox 0 0 24 24`, `fill:currentColor`), 24px in the nav. (For a Sue's Angels clone, substitute the crest where Nike puts the swoosh; keep it monochrome-inherit so it flips on dark cards.)
- **Buttons:** **full-pill `border-radius:30px`**, heights 34/46/58px (s/m/l), side padding 16/24/24px. Primary on-light = black bg `#111` / white text; primary on-dark = white bg / black text; secondary = transparent with grey-300 hairline border. Hover swaps bg to a grey step (grey-500 on light). No shadow (`box-shadow-width:0`).
- **Labels/eyebrows:** tiny, grey-500, above headings inside card overlays.
- **Video slots:** the hero and any card can be `video-card` (same overlay system as `image-card`). `<video>` fades in via `transition:opacity .5s ease .3s` with a poster (`.vjs-poster` cross-fades `opacity .5s`), `object-fit:cover`. Self-hosted video.js player, autoplay/muted/loop for background clips.
- **Transitions present:** slide push-in (`translateX`), media/poster opacity cross-fade (`.5s ease .3s`), snappy hover colour/opacity on controls & links (150–250ms `cubic-bezier(.25,.1,.25,1)`), scroll-snap carousels, and IntersectionObserver-gated lazy media reveal. **No masked line-rise, no ken-burns, no parallax** — Nike's premium read comes from *photography scale + tight snappy micro-motion*, not slow cinematic easing.

> **Clone status:** analysed from screenshot + real assets; **not yet rebuilt**. Config-grade on tokens/type/radius/motion-durations; card-overlay + carousel are recipe-grade; exact hero slideshow JS is rebuild-by-eye (React/Emotion component, logic inferred from keyframes + control CSS).

## Micro-details (keen-eye pass — the things that are easy to miss)
- **Nav is sticky, NOT a morph.** Unlike Wolverine's 3-state pill, Nike keeps a **plain white sticky bar** — `.is-sticky{position:fixed;top:0}` with a `.sticky-container-animation{top:-65px;transition:top .3s ease-in-out}` used to **slide a secondary/local sub-nav in and out** on scroll (the `top:-65px→0` reveal). Primary bar stays put; only sub-navs animate. Don't over-engineer a hide-on-scroll here.
- **Slideshow controls live in the bottom corners:** centered dots + a **pause** button and prev/next **circular** buttons bottom-right, all `opacity:.7` idling → `1` on hover/focus; focus-visible draws a 2px outline with 3–4px offset (accessibility is thorough — every control has focus-visible states).
- **Dots** are 5×5px, `opacity .5` → active `1`, `transition:all .3s ease`; focus scales them `scale(1.2)`.
- **Card overlay text NEVER intercepts clicks** — `_13xDDA0A{pointer-events:none}` on the overlay, only the CTA is clickable. Overlay insets step 24px→48px→96px as viewport grows.
- **Hover is colour/opacity, not lift or zoom.** Links → grey-500; icon buttons → full opacity; category thumbs → text-hover colour. There is essentially **no translate-Y lift and no image scale-zoom** — a deliberately flatter, faster interaction language than the "premium slow-settle" sites.
- **Carousel scrollbar is custom** (`::-webkit-scrollbar` 14px, rounded thumb, colour fades in on hover `rgba(112,112,114,0)→#707072`); arrows hidden <600px (touch swipe), shown ≥600px.
- **Marketing headings are the ONLY italic** — the italic-caps Futura is reserved for merch headlines; UI/body stays upright Helvetica Now.
- **Everything is a `--podium-cds-*` token** — recolouring the whole site = swap ~a dozen root vars (grey ramp + black/white + link/critical). Extremely rebrandable.
- **Merch mega-menu** (nav dropdown) animates heading ellipsis→wrap via `@keyframes _3FGhfyw3` and `transition:max-height 1s` — a nice touch when a column expands.

---

## Recipe 1 — Full-bleed media card with corner-anchored overlay + pill CTA  ★ signature ★
**Recipe-grade** (overlay geometry + button tokens extracted).

**What it is:** the workhorse Nike homepage unit — a full-width image OR video panel with a heading/CTA overlay pinned to a corner. The entire merch stack is this one component, re-aligned.
**How it works:** a positioned media layer (`object-fit:cover`, fades in on load) + an absolutely-positioned overlay box that is `pointer-events:none` (so only the CTA is clickable), `justify-content:flex-end`, inset 24→48→96px by breakpoint, with alignment modifier classes (left / centered `left:20%;width:60%` / right).
**Extracted values:** overlay inset `24px` (→48 at 960 →96 top/bottom), heading = Futura-italic caps, CTA pill `border-radius:30px` height 46px pad 24px, media fade `transition:opacity .5s ease .3s`.

```html
<div class="mediacard">
  <video class="mc-media" autoplay muted loop playsinline poster="poster.jpg">
    <source src="clip.mp4" type="video/mp4"></video>
  <!-- swap <video> for <img class="mc-media"> for an image-card -->
  <div class="mc-overlay mc-left">
    <span class="mc-eyebrow">Just In</span>
    <h3 class="mc-head">SWEAT. PROOF.</h3>
    <a class="mc-cta" href="#">Shop</a>
  </div>
</div>
```
```css
.mediacard{position:relative;overflow:hidden;aspect-ratio:72/35}
@media(max-width:600px){.mediacard{aspect-ratio:2/3}}
.mc-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
  opacity:0;transition:opacity .5s ease .3s}
.mc-media.loaded{opacity:1}
.mc-overlay{position:absolute;inset:24px;display:flex;flex-direction:column;
  justify-content:flex-end;pointer-events:none;color:#fff}
@media(min-width:960px){.mc-overlay{inset:48px}}
.mc-left{text-align:left}
.mc-center{left:20%;width:60%;text-align:center}
.mc-right{left:auto;right:24px;text-align:right;width:75%}
.mc-eyebrow{font-size:.8rem;color:#e5e5e5;margin-bottom:8px}
.mc-head{font-family:"Nike Futura ND",Impact,sans-serif;font-style:italic;
  text-transform:uppercase;font-size:clamp(2rem,6vw,5rem);line-height:.95;margin:0 0 16px}
.mc-cta{pointer-events:auto;align-self:flex-start;background:#fff;color:#111;
  border-radius:30px;height:46px;padding:0 24px;display:inline-flex;align-items:center;
  font-weight:500;text-decoration:none;
  transition:background-color 250ms cubic-bezier(.25,.1,.25,1)}
.mc-cta:hover{background:#e5e5e5}
```
**Rebranded for Sue's Angels:** put the crest where the swoosh sits, use Clash Display (italic word-split) for `.mc-head` instead of Futura, volt `#D6F23A` pill on navy cards / navy pill on light. Keep the 24→48px overlay inset and `pointer-events` split. This is the answer to "a section that's just a big photo with a headline in the corner and a button".

## Recipe 2 — Hero slideshow (push-in slides, corner controls)
**Recipe-grade** (keyframes + control CSS extracted; slide logic rebuild-by-eye).

**What it is:** a full-bleed hero that auto-advances between cinematic slides; each new slide **pushes in horizontally** while dots + pause + prev/next sit in the bottom corners.
**Extracted values:** slide-in `@keyframes{0%{transform:translateX(100%)}to{translateX(0)}}` (and `-100%` for reverse), `1s ease-in-out both`; dots 5×5px `opacity .5→1` `transition:all .3s ease`; control buttons 36px circles `opacity .7→1`; media aspect `72/35` desktop.
```js
// minimal: advance active index, toggle direction class, respect reduced-motion
const slides=[...root.querySelectorAll('.slide')];let i=0,timer;
function go(n,dir){slides[i].classList.remove('active');
  i=(n+slides.length)%slides.length;
  const s=slides[i];s.classList.remove('in-l','in-r');void s.offsetWidth;
  s.classList.add('active',dir<0?'in-l':'in-r');dots[i]&&setActiveDot(i);}
function auto(){timer=setInterval(()=>go(i+1,1),6000);}
if(!matchMedia('(prefers-reduced-motion:reduce)').matches)auto();
```
```css
.slide{position:absolute;inset:0;opacity:0}
.slide.active{opacity:1}
.slide.in-r{animation:pushR 1s ease-in-out both}
.slide.in-l{animation:pushL 1s ease-in-out both}
@keyframes pushR{from{transform:translateX(100%)}to{transform:translateX(0)}}
@keyframes pushL{from{transform:translateX(-100%)}to{transform:translateX(0)}}
.dot{width:5px;height:5px;border-radius:50%;background:#fff;opacity:.5;margin:0 4px;
  transition:all .3s ease}.dot.on{opacity:1}
.ctrl{width:36px;height:36px;border-radius:50%;opacity:.7;
  transition:background-color 250ms cubic-bezier(.25,.1,.25,1)}.ctrl:hover{opacity:1}
```
**Rebrand:** same skeleton; slides = matchday photos/hype clips, volt dots.

## Recipe 3 — Native scroll-snap product carousel (no library)
**Recipe-grade.** Nike ships **zero carousel library** — it's a flex track in an `overflow-x:scroll` rail with `scroll-behavior:smooth`, hidden scrollbar on mobile, JS arrow buttons that scroll by one card width.
```css
.rail{display:flex;gap:12px;overflow-x:scroll;scroll-behavior:smooth;
  scroll-snap-type:x mandatory;-ms-overflow-style:none;scrollbar-width:none}
.rail::-webkit-scrollbar{display:none}
.card{flex:0 0 auto;scroll-snap-align:start;aspect-ratio:1}
.carousel-btn{display:none}@media(min-width:600px){.carousel-btn{display:flex}}
```
```js
next.onclick=()=>rail.scrollBy({left:rail.querySelector('.card').offsetWidth+12,behavior:'smooth'});
```
Matches Recipe 5 of wolverine (also custom) — the shared lesson: **CSS scroll-snap + a JS arrow handler beats pulling in Swiper/Embla** for a simple product rail.

## Recipe 4 — Token-driven monochrome system (Podium-style)
**Recipe-grade.** Every colour/space/motion value is a CSS var, so the whole look recolours from ~a dozen roots. Nike's real values:
```css
:root{
  --c-black:#111111; --c-white:#FFFFFF;
  --grey-50:#FAFAFA; --grey-100:#F5F5F5; --grey-200:#E5E5E5; --grey-300:#CACACB;
  --grey-400:#9E9EA0; --grey-500:#707072; --grey-600:#4B4B4D; --grey-900:#1F1F21;
  --text-primary:var(--c-black); --text-secondary:var(--grey-500);
  --text-hover:var(--grey-500); --link:#1151FF; --critical:#D30005;
  --btn-radius:30px; --radius-s:4px; --radius-m:8px; --radius-l:12px; --radius-xl:24px;
  --dur-fast:150ms; --dur-normal:250ms; --ease:cubic-bezier(.25,.1,.25,1);
}
```
Body = Helvetica Now Text; headings/marketing = a condensed italic-caps display face. For Sue's Angels, keep this token skeleton but map `--c-black→#04121B`, add `--volt:#D6F23A`, `--btn-radius` stays pill, display face → Clash Display.

---

## What to reuse from this site
- **The full-bleed-media-card-with-corner-overlay** (Recipe 1) — the single most transferable Nike unit; drop-in for any "hero photo + headline + button" band.
- **Native scroll-snap carousel** (Recipe 3) — reinforces the "don't reach for Swiper" lesson.
- **The token-driven monochrome discipline** (Recipe 4) — layout hierarchy from grey ramp + type scale, chroma only inside photography; trivially rebrandable.
- **Snappy micro-motion** (`150/250ms`, one `cubic-bezier(.25,.1,.25,1)`) as a *counterpoint* to the Wolverine "slow-settle" palette — use Nike's fast timing when the brand should feel athletic/energetic rather than luxe/cinematic.
- **The italic-caps display headline** device for merch shouts (map to Clash Display italic word-split).
- **Thorough focus-visible states** on every control — a genuine accessibility model worth copying.
