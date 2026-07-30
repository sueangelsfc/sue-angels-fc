# Reference: rapha.cc (US/en_US)

Studied 2026-07-07 via Firecrawl (rawHtml + branding + real per-component `.css` chunks, analysed in sandbox) plus a live browser scroll (ground-truth for layout/rhythm/feel). Premium cycling apparel e-commerce. Used here as the **premium editorial retail** reference (a Lululemon substitute — Lululemon hard-blocks scraping).

## Identity snapshot
- **Style:** premium **cinematic editorial** e-commerce. Dark full-bleed photographic hero, big condensed uppercase display, editorial serif for prose. Feels like a magazine that happens to sell kit — gallery restraint, not store noise.
- **Colour:** dark-blue ink **`#272F38`** (near-black, the brand's signature "not-quite-black"), `#000` text, `#fff` bg. Brand accent is a **pink ramp** `#f67599 / #fa3c6e / #ea0643` (sale/hover/RCC energy) used sparingly. System greys `#929499 / #e9eaeb / #949494 / #767676`; status green `#3a8700`, red `#c00`, orange `#ef5307`, blue `#2d87e2` link `#756ba7`. Hierarchy is carried by **type + full-bleed photography**, not chroma.
- **Type:** fully self-hosted **custom family**:
  - **RaphaSansCondensed** (400/600/700) — UPPERCASE condensed **display + nav + section headings**. THE signature face.
  - **RaphaSerifText** (400/600, roman + italic) — editorial **body/prose**.
  - **RaphaSerifHead** (400, roman + italic) — serif headline variant.
  - **RaphaSans** (300/400/500) — UI/utility sans. **RaphaSansNumerals** (400/600) — tabular numerals (prices).
  - Display sizes tokenized at **64px / 128px**; weights 100–700 all tokenized.
- **Radius:** **0px everywhere** (hard-edged). Only exceptions: `50% / 100%` for round controls (chips, radios, icon buttons). Sharp, editorial, un-rounded — the opposite of the friendly-pill retail look.
- **Stack:** **Next.js** (App Router, **Turbopack** — `/_next/static/chunks/*`), **vanilla-extract** CSS (atomic hashed classes `_17h42jb0`, CSS custom-prop token layer `--_1r5fuqt*`), Netlify hosting (`.netlify` RUM), GTM + Google Ads, Algolia `search-insights`. Motion is **CSS-only** (keyframes + transitions) — **no GSAP / no scroll library detected**. Commerce is Salesforce-ish headless but that's invisible to the front-end recipes.
- **Breakpoints:** `360, 480, 768, 992, 1200, 1400, 1600, 1900px`. Grid is a 12-col (`repeat(12,1fr)` at ≥992).

## Page anatomy (VERIFIED from live scroll + rawHtml section order)
Top-to-bottom, this rhythm is what makes it read as "Rapha":
1. **Announcement marquee** (top, full-width) — a slow auto-scrolling UPPERCASE condensed ticker of promos ("Bundle & Save up to 20%", "New In | Shop Now", "Peak Summer | Shop Now") with a **Pause button** (`aria-pressed`). Recipe 1.
2. **Nav bar** — **centred wordmark** ("Rapha") in the middle; condensed UPPERCASE links **MEN · WOMEN · ACCESSORIES · CLUB · GIFTS** on the LEFT; **Search · Account · Store · Bag** icons on the RIGHT. Recipe 2.
3. **Hero** — full-bleed **DARK cinematic photo** (rider in kit), giant condensed headline (`SHOW YOUR COLOURS`, the sole `<h1>`) + a single **SHOP** button. Ken-burns-free but photographic and moody.
4. **Special Editions** (`<h2>`, centred) — a **3-up product-card grid**, cyclists in colourful kit, 2:3 / 4:5 portrait imagery, hover-zoom.
5. **Shop by Category** — 3 tiles: **Jerseys · Bibs & Tights · Base Layers** (`<h3>` labels over imagery).
6. **BEAT THE HEAT** (`<h2>`) — seasonal editorial band, full-bleed image + copy.
7. **RCC + Yinka Ilori** (`<h2>` / `<h3>`) — club/collab feature (16:9 + portrait media).
8. **THE NEW RCC APP IS HERE** (`<h2>`) — app promo band.
9. **Latest stories** (`<h2>`) — editorial story cards (`USA CYCLING`, `The Sky's The Limit: Kate Courtney`).
10. **Newsletter** — "Sign up to receive 15% off your first order" + inline form (zero-radius input + black square button).
11. **Footer** — Customer services · Information · Follow Rapha · **Change Region** columns; region + cookie modals gate entry.

Rhythm: full-bleed **photographic** bands, one idea per band, centred `<h2>` section headings in condensed uppercase, portrait product cards in tidy 2/3-up grids, editorial serif for any prose. Dark hero → predominantly light editorial bands below. **Photography does all the colour work.**

## Type, wordmark & media (verified)
- **Two-face system:** condensed uppercase sans (RaphaSansCondensed) for ALL display/nav/section headings; serif (RaphaSerifText / RaphaSerifHead, with true italics) for prose and refined captions. This sans-condensed-caps ↔ serif-prose pairing IS the brand voice. (Clone with e.g. a condensed grotesk for caps + a text serif for body; for Sue's Angels map display→Clash Display, prose→Hanken Grotesk.)
- **Wordmark:** single centred word **"Rapha"** (SVG), dead-centre in the nav — not a split bold/light monogram like Wolverine. Centred wordmark is the nav's defining move.
- **Buttons:** **zero-radius**. Primary = solid black (`#000`) fill, white text; secondary = transparent with `#949494` hairline border. On dark hero the SHOP button inverts. No pills anywhere.
- **Labels/nav:** `text-transform:uppercase`, condensed face; prices in tabular RaphaSansNumerals.
- **Media:** full-bleed photography in nearly every slot (Cloudinary `media.rapha.cc`, `f_auto,q_auto,dpr_1,c_fill` + `ar_2:3 / ar_16:9 / ar_1:1 / ar_4:5`, `g_auto` smart-crop). No hero video observed — **photographic, not video-driven** (unlike Wolverine). Cards zoom on hover.
- **Transitions present:** slow marquee scroll; card/image hover-zoom (`.6s` ease-out-quint); nav/flyout slide (`.3s .22cubic`); icon-morph on the bag/menu; heart-pop on wishlist; skeleton shimmer + spinner for loading. All wrapped in `@media (prefers-reduced-motion:no-preference)`.

> **Fidelity note:** **Screenshot/live-scroll verified for anatomy + rhythm; tokens, fonts, breakpoints, easings, durations and keyframes are recipe-grade (real values extracted from the shipped vanilla-extract CSS).** The site is Next.js+Turbopack with atomic hashed classes, so per-component *class names* are opaque but the *computed values* (below) are exact. No clone was built.

## Micro-details (keen-eye pass — the easy-to-miss things)
- **Centred-wordmark nav** — brand centred, nav links pushed LEFT, utility icons RIGHT. Distinct from the usual left-logo bar. Nav hover uses `transition:transform .22s cubic-bezier(.23,1,.32,1)` (a subtle lift), gated behind `prefers-reduced-motion:no-preference`.
- **Announcement marquee has a real Pause control** (`aria-pressed="true"`, inline white SVG) — accessibility-correct auto-scroll, not a dumb loop.
- **Everything is zero-radius** except round controls (`50%`). The hard edge is a deliberate premium/editorial signal.
- **Hover-zoom on product cards** is slow and expensive — `.6s cubic-bezier(.23,1,.32,1)` (ease-out-quint), not a snappy retail `.2s`.
- **Bag / hamburger icon morphs** via paired split transitions (top bar eases out on `cubic-bezier(.55,.055,.675,.19)`, in on `cubic-bezier(.215,.61,.355,1)` with a `.1s` stagger) — the little X-morph most sites fake.
- **Wishlist heart pops** with an overshoot bounce: `.35s cubic-bezier(.6,1.6,.6,.9) 2 alternate` (the `1.6` control point = the bounce past 1.0).
- **Loading states are first-class:** a 1s linear infinite spinner + a 1.5s ease-in-out **skeleton shimmer** (`background-position:-200% → 200%`). Premium sites never show a raw blank.
- **Focus is animated:** focus ring grows via `@keyframes` `outline-width:0 → var(--focus-width)` over `.15s ease-out forwards` — visible, branded, accessible focus.
- **Region + cookie modals gate entry** (geo `Change Region`) — expected for a global retailer; don't reproduce as a "feature", but note the region-switch footer link.
- Numerals use a dedicated tabular face (RaphaSansNumerals) so prices align.

---

## Recipe 1 — Seamless auto-scroll announcement marquee (with pause)  ★ signature ★
**Recipe-grade** (real keyframe + duration extracted).

**What it is:** a full-width top bar of UPPERCASE promo phrases scrolling horizontally forever, seamlessly, with a working Pause button.
**How it works:** the track is **duplicated** (content rendered twice back-to-back); the keyframe translates it from `0%` to `-50%` — at exactly half, the second copy sits where the first started, so the loop is invisible. `will-change:transform`, `white-space:nowrap`, `text-transform:uppercase`. Pause = toggle `animation-play-state:paused` (button flips `aria-pressed`). Speed is intentionally glacial.
**Extracted values:** `@keyframes { transform: translate(0%) → translate(-50%) }`, `animation: 175s linear infinite` (yes — 175 seconds; slow-drift, never distracting). Reduced-motion should stop it.

```css
.marquee{overflow:hidden;display:flex}
.marquee__track{
  display:flex; white-space:nowrap; text-transform:uppercase;
  will-change:transform;
  animation:marquee 175s linear infinite;   /* real Rapha value */
}
.marquee[data-paused="true"] .marquee__track{animation-play-state:paused}
@keyframes marquee{0%{transform:translate(0)} to{transform:translate(-50%)}}
@media(prefers-reduced-motion:reduce){.marquee__track{animation:none}}
```
```html
<div class="marquee">
  <div class="marquee__track"><!-- render the promo list TWICE for the seamless -50% loop -->
    <span>Bundle &amp; Save</span><span>New In</span><span>Peak Summer</span>
    <span>Bundle &amp; Save</span><span>New In</span><span>Peak Summer</span>
  </div>
  <button aria-pressed="false" onclick="this.setAttribute('aria-pressed',this.getAttribute('aria-pressed')==='true'?'false':'true');
    this.closest('.marquee').dataset.paused = this.getAttribute('aria-pressed')">Pause</button>
</div>
```
**Rebranded for Sue's Angels:** navy `#04121B` bar, volt `#D6F23A` text, Clash Display condensed caps, phrases like "NEXT FIXTURE · SAT 3PM" / "JOIN THE SQUAD" / "SHOP THE 26/27 KIT". Keep the duplicate-track + `-50%` mechanic and the pause button (accessibility). Drop the 175s to ~30–40s for a shorter phrase list (speed = distance/time; fewer items → shorter loop).

## Recipe 2 — Centred-wordmark nav (links left, utilities right)
**Recipe-grade** (structure + hover easing).

**What it is:** a three-zone header where the brand wordmark is dead-centre, primary nav sits left, utility icons sit right — an editorial/luxury signature (vs the default left-logo bar).
**How it works:** a 3-column flex/grid: left cluster (nav links), centre (absolutely-centred or `justify-self:center` wordmark), right cluster (search/account/store/bag). Links are condensed uppercase; hover does a micro transform-lift.
**Extracted values:** hover `transition:transform .22s cubic-bezier(.23,1,.32,1)` behind `@media(prefers-reduced-motion:no-preference)`. Zero radius. Bag/menu icon uses the split-morph easings from the micro-details.

```css
.nav{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 24px}
.nav__links{display:flex;gap:24px;justify-self:start}
.nav__brand{justify-self:center}          /* centred wordmark */
.nav__utils{display:flex;gap:16px;justify-self:end}
.nav__links a{text-transform:uppercase;font-family:var(--display);letter-spacing:.02em}
@media(prefers-reduced-motion:no-preference){
  .nav__links a{display:inline-block;transition:transform .22s cubic-bezier(.23,1,.32,1)}
  .nav__links a:hover{transform:translateY(-1px)}
}
@media(max-width:768px){                   /* links collapse to hamburger, brand stays centred */
  .nav__links{display:none} .nav{grid-template-columns:auto 1fr auto}
}
```
For Sue's Angels: centre the crest+wordmark, put MEN/... → your real routes (FIXTURES · SQUAD · TABLE · CLUB · SHOP) left, search/account/join-CTA right.

## Recipe 3 — Cinematic photographic hero (no video)
**Recipe-grade** (aspect + treatment). The counterpoint to Wolverine's video hero: Rapha's premium feel comes from **one full-bleed, art-directed dark photograph**, a single condensed headline, and one button. Cloudinary delivers responsive `f_auto,q_auto,dpr_1,c_fill,g_auto` crops at `ar_16:9` (desktop) / `ar_2:3` or `ar_4:5` (mobile/portrait). A dark scrim keeps the white headline legible.
```css
.hero{position:relative;min-height:88vh;display:grid;place-items:end start}
.hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.55))}
.hero__h1{position:relative;font-family:var(--display);text-transform:uppercase;
  color:#fff;font-size:clamp(3rem,9vw,128px);line-height:.95;margin:0 0 8vh 5vw}
```
Serve the mobile crop via `<picture>`/`srcset` at 2:3–4:5; keep the headline the sole `<h1>`. For Sue's Angels, drop the existing `assets/hero/*` dressing-room shot in, navy scrim + volt SHOP button.

## Recipe 4 — Slow hover-zoom product card
**Recipe-grade.** Portrait product cards (2:3 / 4:5) whose image scales up slowly inside a clipped frame — the "gallery, not store" tell. Rapha uses a deliberately slow ease-out-quint, far slower than fast-retail `.2s`.
**Extracted value:** `transition:transform .6s cubic-bezier(.23,1,.32,1)` on the image; frame clips overflow.
```css
.card{overflow:hidden}                              /* clip */
.card img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;
  transition:transform .6s cubic-bezier(.23,1,.32,1)}   /* real Rapha value */
.card:hover img{transform:scale(1.05)}
@media(prefers-reduced-motion:reduce){.card img{transition:none}}
.card__title{font-family:var(--display);text-transform:uppercase}
.card__price{font-variant-numeric:tabular-nums}      /* dedicated numerals face */
```
Lay out as a centred `<h2>` + `repeat(auto-fill,minmax(min(100%,260px),1fr))` 3-up grid (keep the `min(100%,…)` pattern to avoid mobile overflow).

## Recipe 5 — Micro-interaction pack (loaders, icon-morph, focus, heart)
**Recipe-grade** (all keyframes/easings extracted). The polish layer that separates premium from generic — all CSS-only, all reduced-motion-guarded.
```css
/* spinner */           @keyframes spin{0%{transform:rotate(0)}to{transform:rotate(360deg)}}
.spinner{animation:spin 1s linear infinite}
/* skeleton shimmer */  @keyframes shimmer{0%{background-position:-200% 0}to{background-position:200% 0}}
.skeleton{background:linear-gradient(90deg,#eee,#f5f5f5,#eee);background-size:200% 100%;
  animation:shimmer 1.5s ease-in-out infinite}
/* wishlist heart pop (overshoot) */
@keyframes pop{0%{transform:translateY(0)}50%{transform:translateY(-3px)}to{transform:translateY(0)}}
.heart:where(:hover,:focus-visible){animation:pop .35s cubic-bezier(.6,1.6,.6,.9) 2 alternate}
/* animated focus ring */
@keyframes grow{0%{outline-width:0}to{outline-width:var(--focus-width,3px)}}
:focus-visible{animation:grow .15s ease-out forwards;outline-style:solid}
/* bag / hamburger split-morph — two bars, opposite easings, .1s stagger */
.bar-out{transition:transform .2s cubic-bezier(.55,.055,.675,.19)}                 /* ease-in-cubic  */
.bar-in {transition:transform .2s cubic-bezier(.215,.61,.355,1) .1s}                /* ease-out-cubic */
```

## Extracted motion constants (reference table)
| Purpose | Value |
|---|---|
| Announcement marquee | `translate(0)→(-50%)`, `175s linear infinite`, pause via `animation-play-state` |
| Card / image hover-zoom | `transform .6s cubic-bezier(.23,1,.32,1)` → `scale(1.05)` |
| Nav / flyout / drawer slide | `.3s cubic-bezier(.22,1,.36,1)` (top/left/right/bottom/transform/opacity) |
| Nav link hover-lift | `transform .22s cubic-bezier(.23,1,.32,1)` |
| Icon split-morph | out `cubic-bezier(.55,.055,.675,.19)`, in `cubic-bezier(.215,.61,.355,1)`, `.1s` stagger |
| Wishlist heart pop | `.35s cubic-bezier(.6,1.6,.6,.9) 2 alternate` (overshoot) |
| Spinner | `1s linear infinite rotate` |
| Skeleton shimmer | `1.5s ease-in-out infinite`, bg-position `-200%→200%` |
| Focus ring grow | `.15s ease-out forwards`, `outline-width 0→var(--focus-width)` |
| Everyday UI fades | `.2–.25s ease-in-out` (opacity/colour/background) |
| Radius | `0` everywhere; `50%/100%` for round controls only |
| Breakpoints | `360, 480, 768, 992, 1200, 1400, 1600, 1900` |
| Display sizes | `64px / 128px`; weights 100–700 tokenized |

**Easings seen (map to shared palette):** `cubic-bezier(.23,1,.32,1)` = **ease-out-quint** (SKILL.md primitive — Rapha's dominant "expensive" curve); `cubic-bezier(.22,1,.36,1)` = a quint variant for slides; `cubic-bezier(.215,.61,.355,1)` = **ease-out-cubic**; `cubic-bezier(.55,.055,.675,.19)` = ease-in-cubic; `cubic-bezier(.6,1.6,.6,.9)` = overshoot bounce; `cubic-bezier(.2,1,.25,1)` = another quint-ish slide.

---

## What to reuse from this site
- **Centred-wordmark nav** (Recipe 2) — the fastest way to make a header read "editorial/luxury" instead of "store".
- **Seamless pause-able marquee** (Recipe 1) — real duplicate-track + `-50%` mechanic with an accessible Pause; perfect for a fixtures/promo ticker.
- **Photographic (not video) cinematic hero** (Recipe 3) — proof that a premium feel doesn't require video; one art-directed dark image + one condensed headline + one button.
- **Slow ease-out-quint hover-zoom** (`.6s`, Recipe 4) — the "gallery, not store" motion register; contrast with fast-retail `.2s`.
- **The micro-interaction pack** (Recipe 5) — loaders, icon-morph, animated focus, heart-pop — the polish that reads as expensive, all CSS-only and reduced-motion-guarded.
- **Zero-radius + condensed-caps-display ↔ serif-prose** two-face system — a distinct, non-pill premium look; recolour/retype to the target brand.
