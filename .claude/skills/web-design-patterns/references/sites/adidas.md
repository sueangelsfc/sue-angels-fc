# Reference: adidas.com/us

Studied 2026-07-07 via Firecrawl (rendered fold screenshot + rawHtml + real Glass `.css` assets, analysed in the context-mode sandbox). The adidas US homepage — a high-volume e-commerce landing app, not a cinematic editorial site. The design lesson here is the **opposite** of Wolverine: **zero radius, grid discipline, restraint on motion, hierarchy from a hard-edged type system + dense merchandising grid**. Capture it as the "premium mass-retail" pattern.

## Identity snapshot
- **Style:** utilitarian **premium retail** — sharp, industrial, black-on-white, everything is a rectangle. Confidence comes from tight grids, big uppercase condensed headlines, and edge-to-edge product photography, NOT from whitespace or motion.
- **Colour (design tokens, `@adl/brand-adidas-design-tokens@10.6.0`):** `--gl-color-white #ffffff` bg, `--gl-color-black #000000` ink, `--gl-color-blue #007bc6` (links/accents), greys `#eceff1 / #d3d7da / #767677`, `--gl-color-red #e32b2b`, orange `#d98916`. Chroma is almost entirely carried by **photography**; UI is monochrome black/white with grey hairlines. (Firecrawl's branding sniffer reported a green `#408267` — that's a seasonal promo/USP-bar tint, not the system.)
- **Type:** self-hosted adidas faces. Body = **AdihausDIN** (`AdihausDIN, Helvetica, Arial, sans-serif`), 400/700, 16px/24px, `letter-spacing:0`. Expressive display = **AdineuePRO** and **AdihausDIN Cn** (condensed) — used UPPERCASE, `letter-spacing:2px`, weight 400/700 for section titles ("FIND YOUR COUNTRY", "SHOP LATEST DROPS"). H1 fold headline is set on the product bricks; page section H2 ≈ 24–38px condensed uppercase.
- **Radius:** **`0px` everywhere** — buttons, inputs, cards, images all square. This is the single most defining token (`--gl-spacing` scale has no radius; components hard-code `border-radius:0`). The only rounded thing on the page is the cart count badge (`border-radius:50%`).
- **Spacing:** token scale in px: `0, 2.5, 5, 10, 15, 20, 30, 40, 60, 80, 100, 120, 150` (`--gl-spacing-0000…1500`). 5px base rhythm.
- **Stack:** **Next.js** (pages router, buildId `ZBQAWvv35sDZoqM3JVFEG`, `_next/static` chunks) + **styled-components** + a shared **"Glass" design system** (`@adl/*` packages: css-reset, design-tokens, collection, typography, grid, stripes-tokens) delivered from `esm.glass.adidas.com`. Assembled from **microfrontends** (`header-mf`, `footer-mf`, `side-panel-mf`, `cookie-consent-mf`, `cprs-form-mf`, `order-widget`) each shipping its own CSS. Product media via Cloudinary (`brand.assets.adidas.com/image/upload/f_auto,q_auto,fl_lossy/…`). Bot-protection script present (Akamai-style obfuscated path).
- **Breakpoints (Glass grid, granular):** `389, 479, 767, 959, 960, 1024, 1366, 1440, 1920px` (utility classes `gl-hidden-mb-s / mb / mb-l / tb-s / tb-l / dt-s / dt / dt-l / dt-xl`). Mobile-s ≤389, tablet break 960, desktop 1024, wide 1366/1440, ultrawide 1920.

## Page anatomy (VERIFIED — fold from full 1920×1080 render; below-fold from rawHtml DOM order)
Fold confirmed visually; deeper sections confirmed from heading + `data-testid` order in raw HTML (this is a JS app, so a full-page screenshot only captured the hero band before lazy sections mounted — flagged where inferred).
1. **USP utility bar** (top, full-width, black text on white/grey) — `data-testid="usp-bar"` wrapping a `transition-group` that **rotates USP messages** ("FREE STANDARD SHIPPING WITH ADICLUB" …), each a `usp-item` with an icon. Whole bar is one big button opening an info panel.
2. **Header** (`header-mf`, sticky) — 3-column grid `grid-template-columns:2fr 1fr 2fr`: left = primary nav MEN / WOMEN / KIDS + campaign links (FIFA WORLD CUP 26™ / BACK TO SCHOOL / SALE / SPORTS); center = adidas 3-bar logo (48px mobile → 64px desktop); right = utility (help / orders / gift cards / join) + Search field + account + wishlist + bag. Below it a thin **promo sub-bar** ("Code SAVE … 30% off …"). Hover a nav item → full-width **mega-flyout** (`_flyout_content` grid of link columns + `_spotlight` image cards).
3. **Hero editorial grid** — the fold: a **3-up row of full-bleed teasers** (lifestyle model · product flatlay · lifestyle model), each with an overlaid black label chip + "SHOP NOW". Square corners, images bleed to the gutter. This is the campaign hero (a `promo-banner` / teaser-grid component).
4. **"FIND YOUR COUNTRY"** (H2) — country/flag **colour-swatch selector row** (horizontal band of small square country tiles).
5. **Email / adiClub capture slot** — inline green promo card ("Sign up free" / awareness `side-panel`), `_emailSignup_` component.
6. **"SHOP FIFA WORLD CUP 26™"** (H2) — 4-up teaser grid of H4 cards (ORIGINALS × COCA-COLA / ROAD TO GLORY PACK / EQT × FIFA / WIN A MATCH BALL).
7. **"SHOP LATEST DROPS"** (H2) — 4-up product/story cards (H4: FOR THE GLORY / ADISTAR XLG / ADIZERO EVO SL ZIP / SAMBA GETS A MAKEOVER).
8. **"SHOP YOUR STYLE"** (H2) — `styles-carousel` (UGC): 8× `style-card` in a horizontal **carousel** with `carousel-system-button-prev/next` arrows + "See all" `see-all-link`.
9. **Category quick-links** — H3 tiles: SUMMER SPORTS / SCHOOL READY / WORLD CUP / SOCCER OBSESSED.
10. **SEO copy block** (H1 "Sneakers, Activewear and Sporting Goods" + "RELATED RESOURCES" H4 link list) — the real semantic H1 sits at the *bottom* for SEO; the visual hero uses styled bricks, not an `<h1>`.
11. **"Your opinion counts"** (H5) survey nudge + **"JOIN OUR ADICLUB & GET 15% OFF"** (H2) conversion band.
12. **Footer** (`footer-mf`, black) — link columns H5: PRODUCTS / Sports / Collections / SUPPORT / COMPANY INFO / FOLLOW US; country selector; legal.

Rhythm: **NOT** dark/light band alternation. It is a **continuous white merchandising scroll** — teaser row after teaser row after carousel, one campaign per band, each band a tight edge-aligned grid of square cards. Density and grid rigor are the identity; the only "dark" is the footer. One idea per band, but the bands are packed, not airy.

## Type, wordmark & media (verified)
- **Two-tier type:** functional UI + body in **AdihausDIN** (neutral DIN grotesk, `letter-spacing:0`); expressive section titles in **AdineuePRO / AdihausDIN Cn** — **UPPERCASE, `letter-spacing:2px`, 24–28px line-height**, weight 400 or 700. The uppercase-condensed-tracked title is adidas's signature type gesture (vs Wolverine's sentence-case-with-periods).
- **Wordmark:** the **3-bar mountain logo** (SVG), not a text wordmark. Centered in the header on desktop, 48→64px. There is no "first-word-bold" text lockup to clone; use the crest instead.
- **Buttons:** **square** (`border-radius:0`), UPPERCASE, bold, `text-transform:uppercase`. Primary = solid black (`buttonSecondary` token `#000` bg / white text) or seasonal solid; outline CTA = 1px black border, fills black on hover (`:hover{background:var(--color-text-primary);color:inverse}`). Height ~44–48px, generous horizontal padding.
- **Inputs:** grey fill `#E9ECEF`, square, no border, no shadow (`components.input`).
- **Media:** **still product/lifestyle photography**, edge-to-edge, square-cropped, served responsive via Cloudinary `f_auto,q_auto,fl_lossy`. **Video is used sparingly** — there is a full `_yehsf_` ambient/inline video player component (custom controls, subtitles, watch-video button) for hero campaign spots, but the default teaser is a still image, not background video. This is the inverse of the Wolverine "treat every image slot as video" note.
- **Transitions present but minimal:** USP-bar message rotation (transition-group), mega-flyout reveal, carousel slide, hover border/underline. No ken-burns, no masked headline rise, no parallax. Motion is *functional*, not *cinematic*.

## Micro-details (keen-eye pass — the things that are easy to miss)
- **Header does NOT morph into a pill.** It's a conventional **sticky top bar** that stays full-width; nav collapses to a hamburger below the 960px break. No hide-on-scroll-down pill state (contrast Wolverine). The sticky/condense behaviour is JS-driven in `header-mf` and can't be fully measured from static CSS — flagged.
- **USP bar auto-rotates** its message via a `transition-group` (React Transition Group) — a fading/sliding vertical ticker of shipping/offer lines, not a static string.
- **Mega-menu flyout** on nav hover: full-width panel, `_flyout_columns` = `display:grid; grid-auto-flow:column; gap:24px`, capped `max-width:1280px` centered at ≥1440px, with `_spotlight` image cards (`247×327px`, `1px solid #D3D7DA` border that goes **`1px solid #000` on hover**). Flyout link hover draws a **2px black underline bar** via `:after` (`height:2px; bottom:0; background:#000`).
- **Everything is square** — the single strongest tell. Cards, images, buttons, inputs, flag tiles: `border-radius:0`. A rounded corner would immediately read as "not adidas".
- **Hover states are hairline, not lifts:** border goes grey→black, or an underline bar appears. No `translateY` card lift, no `scale` zoom on the landing bundle (`scale(` count in landing CSS = **0**). Card zoom, if any, lives in shared Glass components, not the homepage.
- **Focus is taken seriously:** `:focus-visible` outlines `.1rem solid var(--color-border-accent)` with `.3rem` offset on every button (accessibility-grade, worth copying).
- **Skeleton loading** via `_shimmer` keyframes (two variants) — grey placeholder shimmer while lazy sections/products hydrate.
- **Tiny labels / promo chips** are UPPERCASE tracked, sitting as black rectangles over imagery ("US94 OFFICIAL LICENSED PRODUCT COLLECTION").
- **SEO H1 at the bottom**, visual hero uses styled non-heading bricks — a deliberate merchandising-vs-semantics split.

## Motion inventory (REAL numbers, landing bundle `b9d8fd193dfaf692.css`, 311KB)
- **@keyframes (5 total):** `slideUp`, `backdropFadeIn` (panel/modal entrances), `shimmer` ×2 (skeleton loaders), `restoreScroll`. **No hero/scroll animation keyframes** — this is a deliberately calm landing surface.
- **Easings (cubic-bezier, landing):** `cubic-bezier(.17,.67,.83,.67)` ×2, `cubic-bezier(0,.5,.2,1)` ×2, `cubic-bezier(.3,0,.45,1)` ×1. Shared Glass components (`collection@7`) use `cubic-bezier(.3,0,0,1)` for control state changes and `.2s ease` for chips. Video player uses `cubic-bezier(0.65,0.05,0.36,1)` for 1.5s filter/colour cross-fades and Material `cubic-bezier(0.4,0,0.2,1)` for 150–250ms UI.
- **Counts (landing):** 32 `transition:`, 6 `animation:`, 268 `transform:`, 95 `:hover` rules, **0 `scale()`**, 11 `translateY`. Dominant durations: `.3s` and `2s` (the 2s is the USP-bar rotation / pulsate). Overall: high transform count (layout/positioning) but very low animation count — **restraint is the signal.**

---

## Recipe 1 — Square merchandising teaser grid  ★ signature ★
**Recipe-grade** (structure + tokens from Glass grid + landing CSS).

**What it is:** the continuous scroll of edge-aligned, zero-radius teaser rows (3-up hero, 4-up campaign, 4-up drops) — one campaign per band, each band a tight grid of full-bleed square-cornered image cards with an overlaid uppercase label chip + CTA.
**When to use:** a home/landing page that must merchandise many things at once and feel like a confident mass retailer, not a boutique. The anti-whitespace pattern.
**How it works:** CSS grid with a fixed column count per breakpoint, `gap` = 0 or a hairline, images `object-fit:cover` to a fixed aspect box, `border-radius:0` on everything, a black `position:absolute` label chip bottom-left, uppercase tracked type.
**Real values:** radius `0`; gaps from the `--gl-spacing` scale (`10/20/30px`); breakpoints `960/1024/1366`; label type UPPERCASE `letter-spacing:2px`; hover = border `#d3d7da → #000` (no lift/zoom).

```css
.teaser-grid{display:grid;grid-template-columns:1fr;gap:var(--sp-10,10px)}
@media(min-width:768px){.teaser-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1024px){.teaser-grid{grid-template-columns:repeat(4,1fr)}} /* 3 for hero row */
.teaser{position:relative;border-radius:0;overflow:hidden;background:#eceff1}
.teaser img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block}
.teaser .chip{position:absolute;left:0;bottom:0;background:#000;color:#fff;
  padding:6px 12px;font:700 12px/1.2 "AdihausDIN Cn",sans-serif;
  text-transform:uppercase;letter-spacing:2px;border-radius:0}
.teaser{border:1px solid transparent;transition:border-color .3s cubic-bezier(.3,0,.45,1)}
.teaser:hover{border-color:#000} /* hairline, NOT a lift */
```
**Rebranded for Sue's Angels:** keep the square-grid discipline but this fights the club's 26px-radius/volt brand — use it only for a "shop/merch" or "fixtures grid" band where a harder, sportier grid is wanted; swap chip bg to navy `#04121B`, label type to Clash Display uppercase, and (brand call) either honour 0px for an authentic adidas-hard look or relax to the club's radius. Recipe-grade.

## Recipe 2 — Auto-rotating USP / announcement ticker
**Recipe-grade** (structure from `usp-bar` + `transition-group`; timing from landing durations).

**What it is:** the top utility bar that cycles through shipping/offer messages one at a time with a soft fade/slide, each with a leading icon — the whole bar is a button opening a details panel.
**How it works:** a list of `usp-item`s, one visible at a time, advanced on a timer; enter/leave via React Transition Group (fade + small `translateY`). Landing bundle shows `2s`-class durations and `slideUp`/fade keyframes consistent with this.
**Real values:** cycle ~2s dwell; transition `.3s`; ease `cubic-bezier(0,.5,.2,1)`; message = UPPERCASE `letter-spacing:2px`, icon 32px.

```js
// vanilla equivalent of the transition-group ticker
const items=[...bar.querySelectorAll('.usp-item')]; let i=0;
setInterval(()=>{items[i].classList.remove('in');i=(i+1)%items.length;
  items[i].classList.add('in');},4000);
```
```css
.usp-item{position:absolute;inset:0;opacity:0;transform:translateY(30%);
  transition:opacity .3s cubic-bezier(0,.5,.2,1),transform .3s cubic-bezier(0,.5,.2,1)}
.usp-item.in{opacity:1;transform:none}
```
**Rebrand:** perfect for a Sue's Angels top bar rotating "NEXT MATCH: … · DONATE · SHOP THE 26 KIT". Recipe-grade.

## Recipe 3 — Full-width mega-menu flyout
**Recipe-grade** (real geometry from `header-mf` CSS).

**What it is:** hover a top-nav item → a full-width panel drops with grid link columns + spotlight image cards.
**How it works:** panel `position:absolute` under the header, `left:-24px;width:calc(100% + 40px)` (breaks the container to go edge-to-edge), `_flyout_columns{display:grid;grid-auto-flow:column;gap:24px;max-width:1280px;margin:0 auto}` at wide breakpoints. Link hover = 2px black underline `:after`; spotlight card = `247×327` image, `1px solid #D3D7DA` border → `#000` on hover.
**Real values:** gap `24px`; max-width `1280px`; spotlight `247×327px`; borders `#D3D7DA/#000`; underline `2px #000`; breakpoints `1366/1440`.
```css
.flyout{position:absolute;left:0;width:100%;background:#fff;border-top:1px solid #eceff1;
  border-bottom:1px solid #eceff1;display:none}
.nav-item:hover .flyout{display:block}
.flyout-cols{display:grid;grid-auto-flow:column;gap:24px;max-width:1280px;margin:0 auto;padding:0 24px}
.flyout a:hover:after{content:"";display:block;height:2px;background:#000;margin-top:2px}
.spotlight{border:1px solid #d3d7da}.spotlight:hover{border-color:#000}
```
**Rebrand:** works for a club "Teams / Fixtures / Shop" mega-nav. Recipe-grade.

## Recipe 4 — Zero-radius hard type + button system
**Recipe-grade** (tokens).

**What it is:** the whole identity in miniature — square everything, UPPERCASE condensed tracked titles, square solid-black or outline CTAs that invert on hover, DIN body.
**Real values:** radius `0`; title `AdineuePRO/AdihausDIN Cn` UPPERCASE `letter-spacing:2px` `24–28px`; body `AdihausDIN` `16px/24px` `letter-spacing:0`; outline CTA fills black on hover; `:focus-visible` outline `.1rem accent` offset `.3rem`.
```css
:root{--ink:#000;--paper:#fff;--line:#d3d7da;--accent:#007bc6;--r:0}
.title{font:700 clamp(20px,3vw,38px)/1.05 "AdihausDIN Cn",sans-serif;
  text-transform:uppercase;letter-spacing:2px}
.btn{border-radius:var(--r);text-transform:uppercase;font-weight:700;
  padding:14px 32px;background:var(--ink);color:#fff;border:1px solid var(--ink)}
.btn--outline{background:transparent;color:var(--ink)}
.btn--outline:hover{background:var(--ink);color:#fff}
.btn:focus-visible{outline:.1rem solid var(--accent);outline-offset:.3rem}
```
**Rebrand note:** this is the *counter-example* to the club's soft brand — reach for it only when a build should feel sport-hard/industrial. Recipe-grade.

## Recipe 5 — UGC style carousel
**Rebuild-by-eye.** `styles-carousel` = horizontal track of 8 `style-card`s with prev/next system arrow buttons + "See all". No Embla/Swiper/keen id detected in the landing bundle (custom Glass carousel). Rebuild with CSS scroll-snap (`scroll-snap-type:x mandatory; scroll-snap-align:start`) + JS arrow handlers; square cards, `gap` from the spacing scale, arrows as square icon buttons. Don't over-engineer.

---

## What to reuse from this site
- The **zero-radius, grid-dense merchandising** pattern — the definitive "confident mass retailer" look; the opposite pole from Wolverine's airy editorial. Keep it in the library as a deliberate contrast.
- **Auto-rotating USP ticker** and **full-width mega-flyout** — two directly liftable, genuinely useful commerce components.
- **Uppercase condensed tracked titles** (`letter-spacing:2px`) as an alternative to sentence-case-with-periods.
- **Accessibility-grade `:focus-visible`** (`.1rem accent`, `.3rem` offset) — copy verbatim.
- **The restraint lesson:** premium ≠ heavy motion. 5 keyframes, 0 `scale()`, no parallax — density + grid rigor + hard type carry it. When a brief wants "sporty/retail confident," *remove* motion rather than add it.

## Fidelity note
Fold **visually verified** (1920×1080 render). Below-fold section order **verified from rawHtml** heading + `data-testid` DOM order (the JS app lazy-mounts, so the single screenshot only captured the hero band — deeper bands are structurally confirmed, not pixel-confirmed). Tokens, type sets, spacing, radius, breakpoints, easings, keyframe names and motion counts are **recipe-grade** (extracted from the real Glass `@adl/*` token CSS + the landing `_next` bundle). **Header sticky/scroll-condense behaviour and exact carousel timing are JS-driven** in `header-mf` / Glass components and could not be measured from static assets — flagged rebuild-by-eye. No adidas logos, product imagery, or copy are reproduced — techniques and config only.
