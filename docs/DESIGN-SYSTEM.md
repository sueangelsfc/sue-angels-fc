# Sue's Angels FC — design system

Tokens, components, and the reasoning behind them. Source of truth is `src/styles/00-tokens.css`; this document explains it.

---

## Art direction

The club exists so that Susan Anne Martin's name goes back out every Sunday. The crest carries the motto *"What we do in life echoes in eternity."* The design follows from that: a photographic, tactile hero built on the embroidered crest itself, editorial pacing rather than a grid of identical cards, and a background that is alive rather than flat.

Three devices carry the identity:

1. **The framed hero.** A macro photograph of the crest embroidered on the shirt, inside a large-radius frame so the black canvas reads as a mount. Type sits on it in two tones.
2. **The living atmosphere.** Four large orange masses drift and breathe behind every page. Orange into true black in dark mode, orange into warm white in light. It is the same field on every route, so scrolling and navigating feel like moving through one space.
3. **Numbered rails.** A thin rule with an index number and a right-aligned label separates each band, like the running order in a match programme.

---

## Colour

**Orange is the only accent hue.** Win, draw and loss express difference through weight, size and structure — never a second colour. Off-palette greens, cyans and golds were deliberately excluded.

### Brand ramp
| Token | Value | Use |
|---|---|---|
| `--brand-300` | `#FFA97F` | brand text on a photograph |
| `--brand-400` | `#FF8B53` | brand text on dark |
| `--brand-600` | `#FF7034` | **canonical brand orange** |
| `--brand-800` | `#C2410C` | brand text on warm white (AA safe) |

`--brand-rgb: 255 112 52` exists so `rgb(var(--brand-rgb) / 0.14)` can build tints without a second hue.

### Semantic tokens
Never use a ramp value directly in a component. Use the semantic token, which flips with the theme:

`--bg` `--surface` `--surface-2` `--surface-3` `--surface-inset` · `--text` `--text-muted` `--text-subtle` `--text-on-brand` `--brand-text` · `--border` `--border-strong` `--border-brand` `--focus`

### Status colours
`--success` `--warning` `--error` `--info`, each with a `-bg` companion. **UI feedback only** — form validation, toasts, the control panel. They never decorate football data.

### Contrast
Every text token pair is asserted at WCAG AA by `npm test`:

| Pair | Ratio |
|---|---|
| dark: body text on canvas | 18.9:1 |
| dark: muted text on canvas | 9.6:1 |
| dark: subtle text on canvas | 5.8:1 |
| dark: brand text on canvas | 8.0:1 |
| light: body text on canvas | 16.6:1 |
| light: muted text on canvas | 7.0:1 |
| light: subtle text on canvas | 4.6:1 |
| light: brand text on canvas | 5.4:1 |
| text on brand button (both themes) | 8.9:1 |

`--text-on-brand` is **dark ink in both themes**. White on `#FF7034` is only 2.76:1 and fails.

---

## Typography

**Archivo** variable for display, **Geist** variable for body. Two files, 147KB total, covering every weight — and for Archivo, every width.

The width axis is the signature typographic move:

| Token | Value | Use |
|---|---|---|
| `--width-hero` | `116%` | hero and section headlines |
| `--width-title` | `107%` | card titles, sub-headings |
| `--width-num` | `100%` | tables, scores, stat readouts |

Numerals drop back to normal width because expanded figures do not line up in a column even with tabular spacing on.

### Scale
`--step--2` through `--step-8`, each a fluid `clamp()`. **Always use a step token.** The old stylesheet had ~141 distinct font-size values with no scale; that is what this replaces.

---

## Space, radius, shadow

- **Space:** `--space-1` (4px) to `--space-10` (fluid 88–152px). 8px base.
- **Radius:** `--radius-xs` 6px → `--radius-3xl` 44px, plus `--radius-pill` and `--radius-circle`. The geometry is deliberately strongly curved: pill buttons, capsule nav, 28–44px panels, a large-radius footer, circular icon buttons.
- **Shadow:** `--shadow-sm` → `--shadow-xl`, plus `--shadow-float` and `--shadow-brand`. Always soft, never hard.

---

## The glass material

`.glass` is five stacked effects, which is what separates believable glass from a tinted rectangle:

1. **Tint** — a low-alpha gradient fill so the background stays visible.
2. **Backdrop** — `blur()` plus `saturate(1.6)`, the refraction.
3. **Double rim** — a bright outer border and a dark inner one a pixel apart. This is what reads as thickness.
4. **Specular sweep** — a diagonal highlight catching the top-left edge.
5. **Float shadow** — the panel sits above the page, not on it.

### Variants
`.glass--sm/--lg/--xl/--pill` (radius) · `.glass--deep` (heavier blur for overlays) · `.glass--warm` (restrained orange refraction) · `.glass--interactive` (lifts and brightens on hover)

### Where glass is and is not used
**Used:** navigation, buttons, feature panels, match highlights, overlays, modals, drawers, dropdowns, the auth card, dashboard tiles, the footer.

**Not used:** dense tables and long forms. Those get `.panel`, an opaque surface, because transparency hurts sustained reading. This is a deliberate constraint, not an oversight.

### Degradation
A `@supports not (backdrop-filter)` block falls back to a solid surface — without the blur, the tint alone is too transparent to read against. Blur thins on small screens, where it is expensive to composite.

---

## Motion

| Token | Value |
|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` |
| `--ease-spring` | `cubic-bezier(0.34, 1.46, 0.64, 1)` |
| `--dur-instant` → `--dur-slower` | 90ms → 720ms |

The atmosphere animates on `transform` and `opacity` only, so the compositor handles it on the GPU without repainting.

`prefers-reduced-motion: reduce` collapses durations to 1ms — **not 0** — so `transitionend` listeners still fire and JS state machines do not stall. The atmosphere stops moving entirely; the field stays, held still.

---

## Component library

Every component carries default, hover, focus-visible, active and disabled states, plus loading and error where meaningful, in both themes.

**Actions** `.btn` (`--primary` `--glass` `--ghost` `--quiet` `--danger`, `--sm` `--lg` `--block`, `data-loading`) · `.icon-btn` · `.btn-group`

**Navigation** `.hdr` + `.nav` capsule with dropdowns · `.mnav` drawer with focus trap · `.crumbs` · `.tabs` · `.segmented` · `.pager` · `.cp-nav`

**Selection** `.chip` / `.chip-row` · `.switch` · `.check`

**Football** `.fixture` · `.scoreboard` · `.player` · `.crest` · `.rform` (W/D/L) · `.timeline` · `.lineup` · `table.data` · `.ltable` · `.record` · `.honour`

**Content** `.card` · `.ncard` · `.awc` · `.bento__card` · `.media-card` · `.gal` · `.quote` · `.sponsor` · `.tier` · `.path` · `.sign` · `.stat`

**Feedback** `.toast` · `.badge` (`--brand` `--neutral` `--solid` `--success` `--warning` `--error` `--live`) · `.state` (empty and error) · `.skeleton` · `.progress` · `.error-summary` · `.tip`

**Overlay** `.modal` · `.drawer` · `.menu` · `.consent`

**Forms** `.field` · `.input` · `.select` · `.textarea` · `.dropzone` · `.form-grid`

**Layout** `.wrap` · `.section` · `.grid--2/3/4/wide` · `.stack` · `.row` · `.split` · `.prose` · `.scroll-x` · `.sr-only`

---

## Responsive rules

1. **Every grid uses `repeat(auto-fill, minmax(min(100%, Npx), 1fr))`.** The `min(100%, …)` is what guarantees a column can never exceed its track, which is what prevents horizontal overflow on mobile. `npm test` fails on an unguarded `minmax`.
2. **`overflow-x: hidden` on `html`, not just `body`.** A single wide child otherwise scrolls the page sideways even when body is clipped.
3. **Flex children get `min-width: 0`** so long club names ellipsis instead of pushing the row wider than the viewport.
4. **Wide content scrolls inside its own `.scroll-x` box**, never the page.

Verified: zero horizontal overflow across all 23 route types at 320, 375, 768 and 1024px.

---

## Accessibility

- Semantic landmarks, one `h1` per page, no skipped heading levels.
- Skip link to `#main`.
- `:focus-visible` everywhere; pills and glass carry the ring as a `box-shadow` so it follows the curve. Over the hero photograph the ring switches to black-and-white so it stays visible.
- The nav dropdown opens on `:focus-within` **deliberately** — that is what lets a keyboard user tab straight in. Escape moves focus back to the trigger first, otherwise `focus-within` keeps the menu open and the key appears to do nothing.
- The mobile drawer traps focus and restores it on close.
- Carousels are scroll-snap rails: usable by touch, trackpad and arrow keys with JavaScript blocked. The buttons are an enhancement and hide themselves when there is nothing to scroll.
- The FAQ is native `<details>`.
- Tables use `<caption>`, `<th scope>` and `<abbr title>` on abbreviated column heads.
- Forms have visible labels, an error summary, per-field errors, and a polite status region.
- The countdown sets `aria-live="off"` on purpose: a value changing every second would flood a screen reader, and the full date is already in the card.
- Decorative graphics are `aria-hidden`; the gauge carries a real text alternative.

---

## Anything that starts hidden

**Anything hidden by default and revealed by JavaScript must be scoped to `html.js`**, a class set by an inline head script. If a script fails, nothing was ever hidden, so a failure can never blank a section. `.reveal` follows this rule.
