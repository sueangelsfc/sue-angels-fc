# Sue's Angels FC — Design System

The core visual system for **suesangelsfc.co.uk**, exported for design work in
Claude Design. Values are the live tokens from `app.css`. Upload or paste this
into a Claude Design "Design system" to keep new work on-brand.

## Brand in a line
A London Sunday-league football club, founded in memory of Susan Anne Martin and
playing to raise sepsis awareness. League Ten champions, unbeaten in the 25/26
inaugural season. The look: **premium, confident, electric on deep navy** —
grassroots heart, top-flight polish. Ethos: *"What we do in life echoes in eternity."*

## Colour

### Anchors (never change)
| Token | Value | Use |
|---|---|---|
| Volt | `#D6F23A` | The one accent. Fills, rings, active states, key numbers. Used sparingly so it feels earned. |
| Volt (bright) | `#E4FB63` | Hover / brighter volt |
| Navy | `#071D29` | Deep base, and the ink that sits on volt fills |

### Dark theme (primary)
| Token | Value |
|---|---|
| Background | `#04121B` |
| Ink 1 (headings) | `#FFFFFF` |
| Ink 2 (body) | `rgba(233,242,247,0.74)` |
| Ink 3 (muted) | `rgba(196,212,222,0.52)` |
| Volt as text | `#D6F23A` |
| Glass 1 / 2 / 3 | `rgba(255,255,255,0.038)` · `rgba(255,255,255,0.062)` · `rgba(10,28,40,0.55)` |
| Edge / Edge-2 | `rgba(255,255,255,0.12)` · `rgba(255,255,255,0.18)` |

### Light theme
| Token | Value |
|---|---|
| Background | `#EAEEF2` |
| Ink 1 | `#07131D` |
| Ink 2 | `rgba(20,38,52,0.78)` |
| Volt as text | `#56660A` (deepened so volt stays readable on light) |
| Glass 1 / 2 / 3 | `rgba(255,255,255,0.55 / 0.74 / 0.80)` |

### Result colours
Win `#2BE38A` · Draw `#F2C744` · Loss `#FF5067` · (secondary accent ink `#FF9D42`)

## Typography
- **Display:** `Clash Display` (fallback system-ui). Big headings only.
- **Body / UI:** `Hanken Grotesk` (fallback system-ui).
- **Hero / display headings:** weight 600, **UPPERCASE**, `line-height: 0.86`, `letter-spacing: -0.04em`, size `clamp(2.8rem, 7vw, 6rem)`. One word in the heading is volt, the rest white.
- **Eyebrow / labels:** Hanken, uppercase, tracked (`letter-spacing` ~0.1em), small, often volt.
- **Body:** Hanken 500, 16px, line-height ~1.6. Two weights do most of the work: 500 and 700.

## Spacing, radius, motion
| Token | Value |
|---|---|
| Radius | `26px` (`--m-radius`) |
| Radius small / xs | `16px` · `11px` |
| Page gutter | `clamp(18px, 4vw, 56px)` |
| Max content width | `1240px` |
| Easing | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Shadows | layered, very soft, dark: `0 18px 46px -28px rgba(0,0,0,.8)` (tier 1) up to tier 3 |
| Blur (glass) | 12 / 20 / 34px |

## Components
- **Buttons:** pill (`border-radius: 999px`), UPPERCASE, `letter-spacing: 0.05em`. Primary = volt fill with navy ink; ghost = hairline border, current ink. Subtle scale/ý-lift on hover.
- **Glass cards:** translucent fill (glass tiers) over photography, hairline edge, soft shadow, `border-radius: var(--m-radius)`. Inner top highlight (`--m-hi`).
- **Result chips:** small W/D/L badge in the result colour, with score and competition meta.
- **Hero:** full-width glass panel, eyebrow → huge uppercase title (one volt word) → lead → pill CTAs. Sits over a graded team photo.
- **Crest:** the badge is sacred. Used for the loading boot screen, share cards, fallback avatars, favicon. A transparent cutout exists for compositing.

## Motion
- **Boot screen:** centred, gently pulsing crest on navy, shown instantly (CSS only), held ~3s, then fades out over ~1s as the app renders. Respects reduced motion.
- Transitions are subtle and purposeful (the `--m-ease` curve). No bouncing, no neon, no noise.

## Voice & rules
- Confident, warm, human. **British spelling. No em dashes** (use commas, periods, ·).
- "League Ten", never "Division". Display headings are UPPERCASE; body is sentence case.
- The cause is handled with dignity and hope, never grief-heavy.
- Restraint with the volt is the whole game: deep navy does the work, volt is the spark.
