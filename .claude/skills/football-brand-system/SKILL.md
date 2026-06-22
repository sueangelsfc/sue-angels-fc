---
name: football-brand-system
description: Use to design a distinctive, premium football club brand and visual system — colour tokens, type pairing, crest usage, motion/loading screens, and the look-and-feel. Triggers on "club brand", "design system", "colours and fonts", "make it look premium", "visual identity", "boot screen".
---

# Football Brand System

How to make a grassroots club site look like a top-flight one. The goal: **premium, confident, unmistakably theirs** — never generic-AI or templated.

## Tokens first
Define everything as CSS custom properties in `:root` and never hardcode:
- **One electric accent** used sparingly (the club's "volt", e.g. `#D6F23A`) against a **deep brand base** (e.g. navy `#0A0F1C`). Restraint is the whole game — the accent should feel earned.
- A **display face** for big uppercase headings (e.g. Clash Display) and a clean **body face** (e.g. Hanken Grotesk). Self-host as WOFF2; preload the two weights you use first.
- Radii, glass-surface alphas, win/draw/loss colours, light + dark themes via `html[data-theme]` persisted to localStorage.

## The crest is sacred
The badge carries the cause and the identity. Give it room. Use it for: the loading "boot" screen, share cards, fallback avatars, and the favicon/PWA icons. Provide a transparent cutout for compositing.

## Motion with meaning
- A **boot placeholder**: a centred, gently pulsing crest on the brand base, shown instantly (CSS only) and held briefly, then **faded** out as the app renders (move it to a fixed overlay outside the React root so the framework can't wipe it abruptly). Respect `prefers-reduced-motion`.
- Subtle, purposeful transitions only. No bouncing, no noise.

## Type & layout feel
- Huge, tight, uppercase display headings with one word in the accent. British spelling. **No em dashes** (use commas, periods, or ·).
- Generous spacing, hairline rules, glassy surfaces over photography, restrained gradients.
- Match the comment density and class-prefix conventions of the existing code.

## Outputs
Design tokens in `app.css`, the boot screen on the homepage, and a consistent share-card template (hand to **social-card-maker**). Keep it cohesive across every page. Part of **football-website-builder**.
