# Reference: wolverineworldwide.com

Studied 2026-07-07 via Firecrawl (rawHtml + real `.css`/`.js` assets, analysed in sandbox). Corporate site for Wolverine World Wide (Merrell, Saucony, etc.).

## Identity snapshot
- **Style:** editorial corporate **monochrome**, oversized display type, restrained and expensive.
- **Colour:** `#FFFFFF` bg, `#010101` ink, greys `#4d4d4d / #757575 / #9d9d9d`, accent/near-black `#30363C`. Effectively no chroma — hierarchy comes from **type size + whitespace**, not colour.
- **Type:** self-hosted **ABCDiatype** (Medium 400, Bold 700) + **ABCDiatype-Mono** (labels/meta). Grotesk, tight. Display H2 ≈ 128px; split-line headlines ("Make. / Every Day. / Better.").
- **Radius:** sharp — `4px` and `16px` only.
- **Stack:** React + **Tailwind v4**, Vite build (`/dist/*-[hash].js|css`), **GSAP** for motion, IntersectionObserver for reveals. Motion is JS-driven — **0 CSS keyframes**.
- **Breakpoints (unusually granular):** 340, 500, 700, 1000, 1200, 1400, 1600, 1800, 2000, 2400px — designed all the way to ultrawide.

## Page anatomy (VERIFIED from screen recording — 9 sections)
Confirmed visually, not just from code. This exact rhythm is what makes a clone read as "Wolverine":
1. **Hero** — full-bleed DARK cinematic video. Top-left wordmark `WOLVERINE`(bold)`WORLDWIDE`(light)`| W`; top-right text nav. Giant WHITE 3-line split headline bottom-LEFT ("Make. / Every Day. / Better."). Small dark "LATEST NEWS" card bottom-RIGHT (image + title + ↗).
2. **Statement band** (WHITE) — asymmetric: left column empty, right column big black text + grey rounded-rect pill.
3. **Image-galaxy cascade** (WHITE) — centred giant headline ("...built for every step.") + pill, with ~10-12 small product/lifestyle photos SCATTERED across the section, parallaxing/scaling on scroll. THE signature effect (Recipe 1).
4. **Story band** — full-width DARK rounded card (~18px): left half cinematic image, right half black with big white heading + description + nested dark "Read the Report .PDF" subcard.
5. **Culture band** (WHITE) — two-column: left bold black heading (3 lines), right paragraph.
6. **Snapshot** (WHITE) — left "Market Snapshot" heading; right hairline meta row + GIANT tabular number ("17.01" + "USD") right-aligned.
7. **News row** (WHITE) — 3-across cards: image + tiny uppercase caption + headline, no card background.
8. **Careers band** — full-bleed DARK cinematic video (night runners). Centred giant white headline + paragraph + WHITE full-pill CTA.
9. **Footer** (BLACK) — left mission paragraph + social rows; link columns; uppercase letter-spaced legal bar; then a full-bleed cinematic image with the GIANT wordmark overlaid.

Rhythm: alternating WHITE editorial bands and DARK cinematic video bands (hero/careers/footer dark; everything between white). One idea per ~full-viewport band, huge type, generous whitespace, monochrome except photography, reveal-on-scroll throughout.

## Type, wordmark & video (verified visually)
- **One grotesk everywhere** (ABCDiatype; sub Hanken Grotesk if unavailable). Mega headlines weight ~800, line-height ~0.88, letter-spacing ~-0.035em, **sentence case with periods** ("Make. Every Day. Better."). Body regular. **Tiny uppercase letter-spaced labels** (~0.7rem, tracking .14–.16em) for eyebrows, news captions, legal bar.
- **Wordmark:** first word BOLD + second word LIGHT + monogram — `WOLVERINE`(800)`WORLDWIDE`(400)`| W`. (Clone as `SUE'S`(800)`ANGELS`(400)`| FC`.)
- **Buttons:** grey rounded-rect pill (~8px) on white bands; WHITE full-pill on dark bands. Dark cards ~16–18px radius.
- **Video slots (more than the hero):** hero (dark) · the feature/"report" card's image half is video · careers band (dark) · footer wordmark section is video-backed. All `muted loop playsinline autoplay` + poster. Reuse one clip as placeholder when cloning.
- **Transitions present:** masked line-by-line headline rise on load; slow ken-burns on all bg video; scroll-reveal (threshold .2, once); hover-zoom on news thumbs; button lift. (Generic values in SKILL.md → Shared motion primitives.)

> **Clone status:** fully reproduced and browser-tested as a Sue's Angels like-for-like (`pattern-test.html`), monochrome + Hanken, all 9 sections + the 4 transitions + video in all 4 slots + the 3-state nav.

## Micro-details (keen-eye pass — the things that are easy to miss)
- **Nav is a 3-STATE machine, not a static bar:**
  1. *Top of hero:* full-width transparent bar — wordmark left, text links right, no background.
  2. *On scroll (still in hero):* condenses to a **floating CENTERED dark pill** — wordmark drops to just the monogram, links tuck into a blurred dark capsule.
  3. *Scrolling DOWN past hero:* nav **hides** (`translateY` up, off-screen); **reappears on scroll-UP** (as the pill). Classic hide-on-scroll-down.
  Reproduce: `position:fixed`; toggle `.pill` when `scrollY>40`; add `.hide` when scrolling down past ~220px, remove on scroll-up or near top.
- **Mobile:** text links collapse to a hamburger (menu opens a panel) — don't just hide them.
- Buttons/cards **lift on hover**; news thumbnails **zoom** inside a clipped frame.
- Headline entrances are **line-by-line masked rises**, not a single fade.
- Background media is never a frozen still — subtle **ken-burns** drift.
- Tiny labels (eyebrows, captions, legal) are **uppercase, letter-spaced** and much smaller than body.
- The footer wordmark sits over **video**, not a static image.

---

## Recipe 1 — Scroll-parallax particle/shard field  ★ signature ★
**Recipe-grade** (real constants extracted from `Particles-*.js`).

**What it is:** layered decorative elements (shards/dots/images) that drift vertically and scale up as you scroll — depth without a canvas sim.
**How it works:** each element has a per-item `velocity`; on scroll its offset = `scroll × scrollMultiplier × velocity`, applied as GPU `translate3d(0, Ypx, Zpx)`, plus an eased `scale()` ramping toward `scaleMax`. Rebinds on resize. Reads `getBoundingClientRect` for viewport-relative position.
**Extracted values:** `speed: 0.15`, `scrollMultiplier: 0.05`, `scaleMax: 1.4`, eased via `scaleEase` (expo out). z-depth via `translate3d`'s Z.

Minimal, dependency-free reconstruction:
```js
// elements: [{el, velocity: 0.4..1.6, z: -40..40}]
const SPEED = 0.15, SCROLL_MULT = 0.05, SCALE_MAX = 1.4;
function onScroll() {
  const s = window.scrollY;
  for (const p of items) {
    const y = s * SCROLL_MULT * p.velocity * SPEED * 20;   // px drift
    const t = Math.min(1, s / (window.innerHeight));       // 0..1 entry progress
    const scale = 1 + (SCALE_MAX - 1) * easeOutExpo(t);
    p.el.style.transform = `translate3d(0, ${y}px, ${p.z}px) scale(${scale})`;
  }
}
const easeOutExpo = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', measure);
```
**Rebranded for Sue's Angels** (volt shards over navy hero): spawn 12–20 absolutely-positioned volt (`#D6F23A`) diamonds/dots at low opacity over the `#04121B` hero, `velocity` randomised 0.4–1.6, `z` −40→40 for parallax depth; keep `scaleMax 1.4`. Reads as premium motion, on-brand, ~30 lines, no library.
**This is the answer to "a section with a unique blob moving through text":** same skeleton — swap the shard for a blurred SVG-goo blob, put the text above with `mix-blend-mode`, drive its `translate3d` from this scroll loop.

## Recipe 2 — Scroll-reveal system
**Recipe-grade.** IntersectionObserver, `threshold: 0.2`, fire **once**.
```js
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) {
    e.target.classList.add('in'); io.unobserve(e.target);
  }
}, { threshold: 0.2 });
document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
```
```css
[data-reveal]{opacity:0;transform:translateY(24px);
  transition:opacity .7s var(--ease-out-expo), transform .7s var(--ease-out-expo);}
[data-reveal].in{opacity:1;transform:none;}
```
Stagger children with `transition-delay: calc(var(--i) * 80ms)`.

## Recipe 3 — Background-video hero
**Recipe-grade** (`InlineVideo-*.js`). `<video>` with `webm` + `mp4` sources, `muted loop playsinline preload`, `poster` fallback, and a **programmatic `.play()`** on mount (autoplay policies). Dark scrim over it for text legibility; giant headline on top.
```html
<video autoplay muted loop playsinline preload="metadata" poster="hero.jpg">
  <source src="hero.webm" type="video/webm"><source src="hero.mp4" type="video/mp4">
</video>
```
For Sue's Angels: the existing `assets/videos/hero-*.mp4` slot straight in; add a `#04121B` → transparent scrim and volt underline accent.

## Recipe 4 — Big-type editorial system
**Recipe-grade.** Headlines at ~clamp(3rem, 9vw, 128px), line-height ~0.95, split across lines for rhythm, one statement per band, monochrome, whitespace does the work. For Sue's Angels this maps to Clash Display with the italic word-split device instead of monochrome restraint.

## Recipe 5 — Custom snap carousel
**Rebuild-by-eye.** Custom (no Embla/Swiper detected) — `align`-based snap positions, GSAP-driven track. Rebuild with CSS scroll-snap (`scroll-snap-type:x mandatory`) + a GSAP/JS arrow handler; don't over-engineer.

---

## What to reuse from this site
- The **easing palette** (now in SKILL.md as shared primitives) — the single most transferable asset.
- The **scroll-parallax particle** recipe — directly answers the "blob/particle over text" briefs.
- **JS-driven motion + IntersectionObserver reveal** as the default motion architecture for premium feel.
- **Type-size-and-whitespace hierarchy** — a lesson even for a colourful brand: let one big element own each band.
