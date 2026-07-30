# DESIGN.md — Sue's Angels FC

Design system + brand identity of the **`/redesign/` build** — the 26/27 orange-on-black rebrand. This supersedes the earlier volt-lime concept (that was reverse-engineered from the current live site; the rebuild deliberately moved to orange). Values below are the **real tokens** in `redesign/styles.css`.

## Source
- Authoritative: `redesign/styles.css` `:root` (dark, default) and `html[data-theme="light"]`.
- Build: standalone static HTML + `styles.css` + `main.js` (+ `profile.js`, `player-profiles.js` on the squad page). No framework, Geist + Mluvka self-hosted.
- Data is faithful to the live site's own computations (see `REDESIGN-BRIEF.md`, `CLAUDE.md`).

---

## Design Summary
A **modern-sports, premium-grassroots** identity: near-black canvas, one confident **burnt-orange** accent, glass surfaces, big athletic display type, and stats treated as hero graphics. It should never read "clip-art Sunday league." Two ideas are always held together: **winners** (League Ten champions, unbeaten) and a **memorial with a mission** (founded in memory of Susan Anne Martin; sepsis awareness). The orange is the club's **26/27 kit colour**, so the brand and the shirt are the same thing.

---

## Design Tokens

### Colours
Dark is the primary/default theme (`<meta name="theme-color" content="#090B0D">`). Light is a warm-cream theme via `html[data-theme="light"]`; the toggle persists to `localStorage('sa-mode')` and respects `prefers-color-scheme` on first visit.

**Dark theme (primary)**
| Role | Token | Value |
|---|---|---|
| Background (canvas) | `--navy-deep` | `#090B0D` |
| Secondary background | `--navy-2` | `#101316` |
| Elevated surface / dark text-on-orange | `--navy` | `#171A1E` |
| **Accent — "volt" (orange)** | `--volt` | **`#FF6A2A`** (rgb 255,106,42) |
| Accent hover / highlight | `--volt-2` / `--volt-hi` | `#FF7D42` / `#FF9A66` |
| **Accent as TEXT (AA on dark)** | `--volt-text` | `#FF6A2A` |
| Text primary | `--fg` | `#F7F5F2` (warm, not pure white) |
| Text secondary / tertiary | `--ink-2` / `--ink-3` | `#A7ADB4` / `#8A9198` |
| Hairline border / glass surface | `--line-d` / `--glass-d` | `rgba(255,255,255,.10)` / `rgba(23,26,30,.72)` |

**Light theme** (`html[data-theme="light"]`)
| Role | Token | Value |
|---|---|---|
| Background (warm cream) | `--navy-deep` | `#F5F2ED` |
| Secondary background | `--navy-2` | `#ECE8E1` |
| Text primary | `--fg` | `#111315` |
| **Accent (fills/icons)** | `--volt` | `#E95012` (rgb 233,80,18) |
| **Accent as TEXT (AA on cream)** | `--volt-text` | `#C2410C` |
| Text secondary / tertiary | `--ink-2` / `--ink-3` | `#60666D` / `rgba(17,19,21,.6)` |
| Hairline / glass | `--line-d` / `--glass-d` | `rgba(17,19,21,.12)` / `rgba(255,255,255,.76)` |

**Result colours** (shared): win green / draw amber / loss red chips on result rows and filters.

**Accessibility rule (critical):** bright `--volt` is for **fills, buttons, icons** only. For orange **text**, always use `--volt-text` (a deeper orange that clears WCAG AA on its background — `#FF6A2A` on dark, `#C2410C` on cream). `--navy` (`#171A1E`) stays near-black in **both** themes because it is used both as the dark surface and as the ink on orange fills — never override it in light.

### Typography
- **Display / headings — `Mluvka`** (SIL OFL, self-hosted variable `.woff2`). An athletic grotesque with a full set of **numerals** (so scorelines, `18/18`, the `26/27` ghost render correctly). Token `--display: 'Mluvka','Geist'`.
- **Body + UI — `Geist`** (self-hosted variable). Tokens `--body` / `--ui`.
- **Do not** substitute Inter/Roboto/Poppins/system defaults — the self-hosted pairing is core to the brand. (Mories/Ethereal were evaluated and rejected: caps-only/no-digits and demo-license respectively.)
- Numbers are a design feature — oversized in Mluvka for stat blocks, rings, bars.

**Signature headline device:** an orange full-stop accent closes display headings — `The campaign` + `<span class="volt">.</span>`. Reinforced by a ghost `26/27` watermark and orange "kicker" rules above key sections (rationed: at most ~1 per 3 sections, not every one).

### Spacing, radius, shape
- Radii: cards/panels `--r: 26px`; medium `--r-sm: 16px`; **buttons are full pills (`--pillr: 9999px`)**. One radius system, applied consistently.
- Surfaces are **glass**: translucent fills + backdrop blur, thin hairline borders, soft low shadows.
- Every card grid uses `repeat(auto-fill, minmax(min(100%, Npx), 1fr))`; `html { overflow-x: hidden }`. No horizontal overflow at 320/375/768.

---

## Components
- **Primary button** — `--volt` orange fill, `--navy` (#171A1E) ink, pill. Labels are verbs of belonging: *Join the club · Pull on the shirt · Back the Angels · Request a pack.*
- **Secondary button** — ghost: transparent, hairline border, `--fg` text, pill.
- **Theme toggle** (`.tsw`) — sun/moon pill switch, `role="switch"`; ≥44px pointer target via an invisible `::before`.
- **Inputs / forms** — glass fill, hairline border, pill/rounded. The footer newsletter posts to `/api/subscribe`; the sponsor-pack form posts to `/api/notify-enquiry`; both show loading/success/error states announced via `aria-live`.
- **Cards** — glass panel, 26px radius, hairline border (news, awards, results, feature tiles, squad photo cards).
- **Stat blocks** — oversized Mluvka number + small-caps label; animated with rings/bars/counters.
- **Player profile modal** (`.pm-*`, squad page) — a deliberate **dark analytics console** in both themes: gauge rings, contribution radial, real position heatmap, cumulative charts, by-competition table, form. In light theme the page dims to a warm near-black behind it with a faint brand rim, so it reads as an intentional spotlight.
- **Crest (`TeamBadge`)** — favicon, header lockup, result rows; opponent crests resolved by fuzzy name match.

---

## Imagery & Crest
- **Crest**: shield with the winged, haloed angel and "SUE'S ANGELS", recoloured to the 26/27 **orange-on-black**; ribbon `EST. 2025`, base motto **"WHAT WE DO IN LIFE ECHOES IN ETERNITY."** Flat, two-tone, screen-print friendly. Give it room; don't recolour further.
- **Photography**: real documentary team/action shots — the squad in the **orange kit** (brand colour = shirt), authentic and un-glossy. Treatment: subtle dark gradient/scrim for legibility, small orange accent mark. Don't over-saturate or add stock gloss.
- **Motto**: "What we do in life echoes in eternity." (Gladiator / Maximus) — on the crest and as a recurring pull-quote. Treat with reverence.

---

## Page Patterns
- **Header**: crest lockup left; grouped dropdown nav — *The Club · On the Pitch · Media · Get Involved*; orange "Join the club" CTA pinned right (hidden ≤560px, carried by the burger menu); theme toggle.
- **Home order**: framed photo hero ("Built in her name. For each other." + record line) → sponsor strip → next-match card + countdown → identity/cause tiles → award winners → "The campaign" all-comps stat dashboard → recent results → league table snippet → FAQ → 26/27 join/partner CTA → footer.
- **Footer**: crest + mission, socials, link columns, quiet newsletter capture ("we keep it rare"), locality line.
- **Responsive**: fluid root font drives scaling; a late "mobile hardening" `@media` section overrides earlier blocks; `html { overflow-x: hidden }`.

---

## Content Style (Voice)
- **Confident, earned, understated.** Let stats brag: *"Played 18, won 18."* No hype adjectives.
- **Warm, belonging-led.** CTAs are invitations, not sales.
- **Reverent about Sue, never mawkish.** Grief stated plainly and with dignity.
- **British, plain-spoken.** UK spelling; **"League Ten / League Eight"** (never "Division"); *Our Story / Our Cause*. **No em dashes.** No invented squad numbers (initials monograms). 26/27 focus — honest pre-season/history states, never invented scores.
- **Cause handled responsibly.** Sepsis section is factual, signs-led, links UK Sepsis Trust + NHS — informational, not fear-mongering.
- **This is a MEN'S club.** Despite the name "Angels," squad, results and voice are all men's football — keep visuals and language accurate.

---

## Agent Build Instructions
1. Ship the **dark theme** as default (`#090B0D` canvas, orange `#FF6A2A` accent); provide the warm-cream light theme (`#F5F2ED`) via `html[data-theme]`, toggle persisted to `localStorage('sa-mode')`, first visit respecting `prefers-color-scheme`.
2. Self-host **Mluvka** (display) + **Geist** (body/UI). Never fall back to generic sans. Use `--volt-text` for any orange text (never bright `--volt`).
3. Build on **glass surfaces** over near-black: translucent panels, backdrop blur, hairline borders, 26px card radius, **pill buttons**, soft low shadows.
4. Treat **statistics as hero graphics** — oversized Mluvka numbers with small-caps labels; animate with rings/bars/counters; honour `prefers-reduced-motion`.
5. Use the **orange accent sparingly and deliberately** — CTAs, key numbers, active states, the crest, kicker rules (rationed). Avoid covering large areas in orange.
6. Photography: real, documentary, dark scrim for legibility, small orange accent. No stock gloss.
7. Every card grid uses `repeat(auto-fill, minmax(min(100%, Npx), 1fr))`; `html { overflow-x:hidden }`. No horizontal overflow at 320/375/768.
8. Keep the crest orange-on-black and otherwise un-recoloured; keep the motto as a reverent recurring line.
9. Preserve the dual message everywhere: **champions on the pitch, a memorial + sepsis cause off it.** Never let one erase the other.
10. Preserve existing routes, the Supabase/CMS content layer, and Vercel static deploy (see `REDESIGN-BRIEF.md` + `CLAUDE.md`). Prototype — do not deploy over the live site without sign-off.
