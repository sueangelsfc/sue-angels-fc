# Sue's Angels FC — Website UI Kit

Hi-fi recreation of the Sue's Angels FC website homepage, built with React + JSX from the design system tokens in `../../colors_and_type.css`.

## Files

```
index.html        ← entry point, loads React + Babel + all components
App.jsx           ← top-level layout
Nav.jsx           ← sticky blurred nav with badge + menu + CTA
Hero.jsx          ← cinematic full-bleed hero with title + CTAs + badge
Fixtures.jsx      ← upcoming-matches row + fixture card component
Results.jsx       ← latest-results row + result card component
TablePreview.jsx  ← compact league table with Sue's Angels row highlighted
Sponsors.jsx      ← three-tier sponsor showcase
Gallery.jsx       ← scrolling matchday gallery strip
Statement.jsx     ← oversized brand statement block
JoinCTA.jsx       ← bottom volt CTA block
Footer.jsx        ← dark footer with columns + utility row
```

## Components covered

- Sticky nav with blur, club badge, hover states
- Hero with cinematic gradient, eyebrow + display title + dual CTAs
- Fixture card (with date stack + volt accent rail)
- Result card (score-line + W/D/L chip)
- League table row (with Sue's Angels highlight)
- Sponsor tier blocks (Main / Official / Community)
- Gallery image grid with hover lift
- Club statement (oversized type)
- Final volt CTA
- Footer with hairline columns

## What it isn't

The brief calls for 10 pages (HOME, ABOUT, TEAMS, FIXTURES, RESULTS, TABLE, NEWS, GALLERY, SPONSORS, CONTACT, JOIN). The kit covers the **homepage** end-to-end — every other page is a composition of these same building blocks. The interactive demo on `index.html` is the homepage with light click-thru (nav links scroll to the relevant section; the JOIN CTA opens a sample trial form).

## Caveats

All photography is placeholder (CSS gradients + silhouettes). Sponsors are placeholder wordmarks. The roster, fixtures, results and table are sample data — replace with the real CMS feed.

See `../../README.md` for the full asset wishlist.
