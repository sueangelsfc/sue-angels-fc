---
name: web-design-patterns
description: Use when designing or building new website sections, pages, or motion/interaction effects and you want proven, reconstructable UI patterns distilled from real reference sites — scroll-parallax particles, scroll-reveal easing systems, background-video heroes, big-type editorial layouts, carousels, and similar. A growing library where each entry is a brand-agnostic, rebrandable recipe with REAL extracted config values (durations, easings, thresholds, particle constants) plus a minimal working code snippet. Triggers on "build a section like [site]", "add a [blob/particle/parallax/reveal] effect", "make it feel premium/expensive", "motion recipe", "hero with video", "in the style of the sites we studied".
---

# Web Design Patterns

A curated, growing knowledge base of **how great sites actually work**, reverse-engineered from real reference sites and stored as **buildable recipes**. The point is not to copy any site's brand — it is to hold the *techniques* (with their real numbers) so new designs can be built reliably and in-style, instead of improvised.

## How this library is built (the method)
Each reference site is studied with Firecrawl (see the `firecrawl` + `firecrawl-website-design-clone` skills) and analysed in the context-mode sandbox so raw bytes never bloat context:
0. **SEE IT RENDERED FIRST — non-negotiable.** Get a real visual before any teardown: a full-page screenshot, or `ffmpeg` frames from a screen recording (`ffmpeg -i rec.mov -vf fps=1/1.2,scale=900:-1 frames/f_%03d.jpg`), then Read a spread of frames. Code + tokens tell you the *values*; only the render tells you the *layout, rhythm, and feel*. Skipping this produces a plausible-but-wrong clone — it is the #1 cause of a failed like-for-like. (JS-SPA screenshots often come back blank; a screen recording is the reliable fallback — ask the user for one.)
1. Scrape `branding,images` + `markdown,links` + `rawHtml` → identity, section order, asset URLs, framework.
2. Fetch the real static assets by URL (`.css`, per-component `.js` chunks, the vendor bundle, media).
3. In the sandbox, extract: design tokens (colour/type/spacing/breakpoints/radius), the **motion config** (easing curves, durations, thresholds, spring/particle constants), and the component wiring.
4. Distil into a site file under `references/sites/<name>.md` as **reconstructable recipes** — including a verified **section-by-section page anatomy** from step 0.

Fidelity rule of thumb: **static/unbundled sites** → near-verbatim recipes. **Bundled (Vite/Next/webpack) sites** → CSS + per-component config are readable (real numbers), deep vendor-lib internals are captured at technique level and rebuilt. Always label each recipe **recipe-grade** (real values extracted) vs **rebuild-by-eye** (technique understood, values approximated).

## Keen-eye observation protocol (capture the little things)
A site's quality lives in details that a quick look misses. On step 0, watch the render (and scrub a screen recording frame-by-frame) specifically for these, and record what you find in the site file:
- **Nav behaviour on scroll** — is it static, sticky, hide-on-scroll-down/show-on-up, or a multi-state morph (e.g. Wolverine: transparent bar → floating centered pill → hidden)? Note the exact transitions and thresholds. This is the most commonly-missed detail.
- **Load choreography** — what animates in, in what order, with what stagger (headline lines, nav, hero card)?
- **Scroll-linked motion** — parallax, pinned sections, number count-ups, progress bars, reveal thresholds.
- **Hover / focus / active states** — button lifts, image zooms, link underlines, cursor changes, card tilts.
- **Section-to-section rhythm** — dark↔light alternation, spacing cadence, where the eye is led.
- **Media treatment** — video vs image in each slot, ken-burns, scrims/gradients, aspect ratios, poster frames.
- **Type micro-rules** — weight/tracking per level, sentence-case-with-periods, uppercase letter-spaced labels, wordmark weight split.
- **Responsive shifts** — how nav collapses (hamburger?), how grids reflow, what hides at each breakpoint.
- **The small stuff** — corner radii per element type, border hairlines, shadow depth, empty-state framing, icon style.
Rule: if you can't answer "what does the nav do on scroll?" and "what happens on hover?", you haven't observed closely enough to clone it.

## Supporting skills (compose freely — you are allowed and encouraged to)
This skill is a spider in a web of others. Invoke them as needed so the library learns thoroughly:
- **`firecrawl`, `firecrawl-scrape`, `firecrawl-website-design-clone`** — fetch pages, raw HTML, real CSS/JS assets, branding tokens, screenshots.
- **`context-mode` (`ctx_execute`, `ctx_execute_file`)** — analyse large CSS/JS/vendor bundles in the sandbox so raw bytes never bloat context.
- **`frontend-design` / `ui-ux-pro-max`** — for building/skinning the reconstruction to a high craft bar.
- **`responsive-sweep`** — verify the rebuilt clone has no overflow at 320/375/768.
- **`image-gen` / video tools** — generate placeholder media in the target brand when real assets are missing.
- **`skill-creator`** — when improving THIS skill (adding a site, refining a recipe, tightening triggers).
Also use whatever local tooling helps observation: `ffmpeg` for recording frames, the preview server for DOM/computed-style verification. Reach for the right tool; don't hand-roll what a skill already does well.

## How to USE a recipe (this is the payoff)
When asked to build a section/effect:
1. Find the closest recipe in `references/sites/*` (or compose from several).
2. Take its **structure + real config values** (easing, duration, thresholds, constants).
3. **Rebrand it** — swap in the target project's tokens (for Sue's Angels: navy `#04121B`, volt `#D6F23A`, Clash Display / Hanken Grotesk, 26px card radius / pill buttons). The *motion* stays; the *skin* changes.
4. If the effect isn't captured, build from the nearest related recipe + the shared **easing palette** below, and note it as rebuild-by-eye.

## Shared motion primitives (harvested, reuse everywhere)
**Premium ease-out palette** (the "slow-settle, expensive" feel — from wolverineworldwide.com):
```
--ease-out-expo:  cubic-bezier(.19, 1, .22, 1);
--ease-out-quint: cubic-bezier(.23, 1, .32, 1);
--ease-out-quart: cubic-bezier(.165, .84, .44, 1);
--ease-out-cubic: cubic-bezier(.215, .61, .355, 1);
--ease-std:       cubic-bezier(.4, 0, .2, 1);   /* Material standard */
```
**Scroll-reveal default:** IntersectionObserver, `threshold: 0.2`, play **once**; reveal = opacity 0→1 + `translateY(24px→0)` over ~0.7s on `--ease-out-expo`. Stagger siblings `transition-delay: calc(var(--i) * 80ms)`.

**These four transitions are what make a clone read as "premium" rather than static — verified reproducing wolverineworldwide.com. Omitting them is the #2 fidelity failure (after not seeing the render):**
1. **Masked headline reveal (on load):** wrap each headline line in `.ln{overflow:hidden}` with an inner `<span>` that starts `translateY(116%)` and animates to `0` over ~1.05s `--ease-out-expo`, staggered ~0.13s per line. This line-by-line rise is the signature entrance of big-type sites.
2. **Ken-burns on background video/imagery:** `@keyframes kb{from{transform:scale(1.03)}to{transform:scale(1.15)}}` ~30s `--ease-std` infinite alternate. Stops cinematic bands feeling like a frozen still.
3. **Hover-zoom on cards/thumbs:** wrap image in `overflow:hidden`; `img{transition:transform .7s var(--ease-out-expo)}` → `:hover img{transform:scale(1.05)}`.
4. **Button/card lift:** `transition:transform .4s var(--ease-out-expo)` → `:hover{translateY(-2/3px)}`.

Always add `@media(prefers-reduced-motion:reduce)` that disables load animations, ken-burns and reveals (set final state directly). Non-negotiable for accessibility.

**Video usage (accuracy note):** premium editorial sites use background video in FAR more slots than the hero — commonly the hero, the feature/"report" card's image side, the careers/CTA band, AND the footer wordmark section. When cloning, treat those "image" slots as video by default (`muted loop playsinline autoplay` + `poster`, programmatic `.play()`), and reuse one clip as a placeholder until real footage exists.

## Cloning a WHOLE site like-for-like (not just one effect)
When the ask is "build a site like X" / "make it like-for-like", do NOT just apply a few motion recipes to a bespoke layout — that is the #1 failure. Reproduce the site's **full anatomy, rhythm, type treatment, and transitions**, then swap in the target brand's content. Procedure:
1. **See it rendered** (step 0 above) and write the verified **section-by-section anatomy** into the site file.
2. Identify the **band rhythm** — e.g. Wolverine alternates dark-cinematic-video bands (hero/careers/footer) with white-editorial bands. The rhythm is half the identity.
3. Reproduce each section's **structure and alignment exactly** (headline position, asymmetric columns, card nesting, where the news/wordmark/number sits).
4. Match the **type system**: usually one grotesk everywhere; mega headlines heavy weight (~800), line-height ~0.88, letter-spacing ~-0.035em, sentence-case WITH periods; tiny uppercase letter-spaced labels for eyebrows/captions/legal; wordmark = first word bold + second light + monogram.
5. Apply ALL four transition primitives above + the video-usage note.
6. **Skin** with the target brand (content, crest, photos, and — depending on the fidelity the user chose — either keep the reference's palette for a true look-clone, or recolour to the brand).

### Accuracy checklist (run before claiming a like-for-like)
- [ ] Saw the real site rendered (screenshot or recording), not just its code.
- [ ] Every section from the verified anatomy is present, in order, correctly aligned.
- [ ] Band rhythm (dark vs light / video vs editorial) matches.
- [ ] Type treatment matches (weights, tracking, case, periods, label style, wordmark).
- [ ] **Nav behaviour reproduced** — scroll states (bar/pill/hide), show-on-scroll-up, mobile collapse (hamburger).
- [ ] Hover/focus states present (button lift, thumb zoom, link states).
- [ ] All four transition primitives present (masked headline, ken-burns, hover-zoom, lift) + reduced-motion guard.
- [ ] Video used in every slot the reference uses it (hero/feature/careers/footer), placeholder OK.
- [ ] Verified in-browser (DOM + screenshots), 0 broken assets.

## Captured sites (index)
| Site | Style | Standout recipes | Fidelity |
|---|---|---|---|
| [wolverine-worldwide](references/sites/wolverine-worldwide.md) | Editorial corporate monochrome, big-type, alternating dark-video / white bands | image-galaxy cascade, masked headline reveal, ken-burns video, scroll-reveal, big-type editorial, footer-wordmark-over-video | **Visually verified + full like-for-like clone built & tested** (Vite+GSAP; config-grade) |
| [nike](references/sites/nike.md) | Athletic editorial on white, full-bleed media cards, italic-caps headlines, snappy micro-motion | full-bleed media card w/ corner overlay + pill CTA, hero push-in slideshow, native scroll-snap carousel, token-driven monochrome system | **Screenshot-verified; config-grade tokens/motion, recipe-grade cards/carousel** (Next.js+React+Emotion, NO motion lib) |
| [on](references/sites/on.md) | Swiss-minimal **retail** e-commerce, monochrome + one blue, photo hero + white product stack | native scroll-snap carousel w/ CSS-var progress bar, quick-add slide-up, ScrollSmoother `data-lag` parallax, GSAP headline reveal, photo-hero-not-video, focus-visible ring | **Screenshot + real Nuxt CSS/JS analysed** (Nuxt3+GSAP ScrollSmoother+Contentful; CSS/structure config-grade, ScrollSmoother rebuild-by-eye) |
| [adidas](references/sites/adidas.md) | Premium mass-retail, **zero-radius** hard-edge, dense square merchandising grid, uppercase condensed type, motion-restrained | square teaser grid, auto-rotating USP ticker, full-width mega-flyout, zero-radius type/button system, UGC carousel | **Fold visually verified + tokens/motion recipe-grade** (Next.js + styled-components + "Glass" `@adl/*` DS; below-fold from DOM order) |
| [gymshark](references/sites/gymshark.md) | Athletic **commerce** — black/white chrome, condensed UPPERCASE display, full-bleed photography hero grid, sharp cards + pill CTAs, fast app-like motion | hide-on-scroll transparent-over-hero header, full-bleed photo hero grid, slick merch carousel, underline sweep, slide+fade+backdrop drawer trio, stateful buttons | **Screenshot-verified + real CSS/JS analysed**; config-grade recipes (Next.js+CSS-keyframes+react-slick; **no GSAP/scroll lib**) |
| [salomon](references/sites/salomon.md) | Nordic product-first **retail** — OKLCH neutrals, pill controls + squared media, horizontal Swiper rails, "premium via system not motion" | hover-scale product rail (`.6s ease-out-quart`), hide-on-scroll solid header, OKLCH neutral token system, feature-duo split band | **Screenshot-verified (viewport + full-page) + real CSS analysed**; config-grade tokens/motion, rail-JS rebuild-by-eye (Next.js+Tailwind v4+Swiper; **no GSAP/scroll lib, no video**) |
| [castore](references/sites/castore.md) | British performance sportswear — strict B&W photography + one signal RED, square merch grids, winged-crest wordmark | 1.5s cinematic B&W→colour desaturate shift, rotating announcement carousel + red sale bar (two-tier utility stack), IntersectionObserver reveal (700ms/90px), square category grid | **Live-watched + real Shopify theme CSS**; config-grade tokens/motion, slider rebuild-by-eye (Shopify/keen-slider; no GSAP/video) |
| [represent](references/sites/represent.md) | Luxury British streetwear — **DARK cinematic**, monochrome chrome, photography-as-colour, football-shirt styling | horizontal product rail w/ hard-edge progress bar, fixed translucent-over-hero centred nav (+ hide-down/show-up state machine on inner pages), Lottie wordmark, Swiper freeMode rails | **Live-watched (dark, corrected auto-"light") + real bundle CSS/JS**; recipe-grade tokens/motion, Swiper internals technique-level (Shopify+Tailwind+Swiper+GSAP) |
| [vuori](references/sites/vuori.md) | Calm warm-neutral **retail** athleisure — monochrome UI, 0px corners, photography does the scale | sticky promo+nav cluster (no morph), Swiper rails with edge-peek cards + chevrons, card hover cross-fade (not zoom), hero video poster fade | **Live-watched + real Next/MUI CSS**; config-grade tokens/motion, MUI/Swiper internals rebuild-by-eye (Next.js+MUI+Swiper; no scroll lib) |
| [alo](references/sites/alo.md) | Sophisticated **fashion-editorial** commerce — monochrome + one seasonal accent, italic-serif campaign flourish | pausable announcement bar, editorial card `.3s` hover image-swap + reveal-on-hover wishlist heart, italic-serif campaign lockup over hero, Swiper rails | **Live-watched + real Shopify theme CSS**; config-grade tokens/structure, React/Swiper + art-directed lockup rebuild-by-eye (Shopify+React+Swiper; no video) |
| [rapha](references/sites/rapha.md) | Premium **cinematic-editorial** cycling — ink `#272F38` + pink ramp, zero-radius, custom condensed-caps + serif | seamless pausable marquee (`175s linear`), slow ease-out-quint hover-zoom (`.6s`), centred-wordmark condensed nav, full micro-interaction pack (shimmer/heart-pop/icon-morph) | **Live-watched + screenshot + real vanilla-extract CSS**; recipe-grade tokens/motion/keyframes (Next.js+vanilla-extract; **CSS-only motion, no GSAP, no video**) |

*(Grow this table as sites are added. Keep each site file self-contained. Note: **Lululemon** was in the requested top-10 but hard-blocks scraping — substituted with **Rapha**.)*

**Motion register (use to pick timing):** **slow editorial / scroll-cinema** (Wolverine; 700–1050ms, expo/quint ease-out) → **cinematic-retail hybrid** (Represent, Rapha, Castore, Alo; dark or B&W heroes, `.6s` ease-out hover-zoom, editorial restraint) → **fast retail** (Gymshark, On, Adidas, Nike, Vuori, Salomon; 200–400ms, Material `cubic-bezier(.4,0,.2,1)`, UI-flow choreography). Match register to whether the build should feel like a *gallery* or a *store*.

**Nav taxonomy (harvested — pick one deliberately):**
1. **Hide-on-scroll-down / show-on-up** — On, Gymshark, Salomon (+ Represent inner pages). Maximises content; `translateY(-100%)` on down-scroll.
2. **Sticky-persistent** (never hides/morphs) — Nike, Castore, Vuori, Alo. Calm, always-available; the retail default.
3. **Fixed translucent-over-hero** — Represent (homepage). Cinematic; `backdrop-blur` + low-alpha bg, centred wordmark.
4. **3-state morph** (bar → floating pill → hide) — Wolverine. The most expressive; most work.
Almost universal: an **auto-rotating/marquee announcement bar** above the nav (Castore, Rapha, Alo, Adidas, Gymshark) — usually pausable.

## Quality bar
- Store **techniques and config**, never third-party logos/copy/trademarked assets.
- Every recipe: *what it is · when to use · how it works · real extracted values · minimal snippet · recipe-grade vs rebuild-by-eye*.
- Prefer parameterised, rebrandable recipes over one-off copies.
- Keep the target project's own design system (e.g. `DESIGN.md`) as the source of truth for skinning.
