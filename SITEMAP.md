# Sue's Angels FC — Full Site Inventory (for Relume)

A complete map of the current site: every page and the sections it contains, in order.
Section labels use Relume-style types (Navbar, Header, Layout, Stats, Gallery, Table, CTA, Footer…).

---

## Global (every page)
- **Navbar** — floating glass header. Badge + "SUE'S ANGELS" wordmark · links: Home, About, Champions, Team, Schedule, Media, Sponsors, Contact · light/dark theme toggle · "Join" button · mobile hamburger drawer · skip-to-content link.
- **Footer** — glass, uppercase. Badge + "Sue's Angels FC" · nav columns (Club / Follow / Get involved) · strapline: "Founded 2025 · In memory of Susan Anne Martin · League Ten Champions 25/26 · Supporting sepsis awareness" · legal row.
- **Back-to-top** button (appears on scroll).

---

## 1. Home (`index.html`)
- **Header (hero)** — cinematic team photo, oversized "Sue's Angels FC" title, tagline "Built in memory. Driven by purpose.", primary CTAs (Join the club / Get in touch).
- **Layout / route cards** — quick links: Fixtures · Results · Gallery.
- **Header card / Next match** — home vs away crests + VS, date/time/venue, live countdown, View-fixtures CTA (falls back to next training session / new-season state).
- **Stats / dashboard cards (3)** — Season record (P/W/D/L + goals), League position (1st, points, form), Club stats (founded, squad size, goal difference).
- **Stats / season ledger** — "The campaign": big win-rate ring + stat tiles (all competitions).
- **Layout / recent results** — horizontal rail of result cards (W/D/L, scoreline, crests, competition).
- **Table** — league-table preview (top rows) → link to full table.
- **CTA band** — Join the club / get involved.

## 2. About (`about.html`)
- **Header** — "Built in her name" story hero.
- **Quote** — mission: "What we do in life echoes in eternity."
- **Stats** — club records (top scorer, most assists, most apps, clean sheets, biggest win, trophies).
- **Timeline** — 25/26 journey (founding → sponsors → 12–0 → title → unbeaten → promoted).
- **Layout** — Sue's story (text + photo) + sepsis-awareness band.
- **Layout / values** — club values (Discipline, Brotherhood, Remembrance, Ambition).
- **CTA band** — be part of 26/27.

## 3. Champions (`champions.html`)
- **Header** — celebration hero (badge + "Champions").
- **Stats / rings (4)** — Win rate · Points won · Goals per game · Clean sheets.
- **Stats** — final league record (P/W/D/L/GF/GA/GD/Pts cells).
- **Layout / insights** — "What it took" (unbeaten, goals scored, conceded).
- **Layout / results rail** — league results.
- **CTA band** — promoted, 26/27.

## 4. Team (`teams.html`)
- **Header** — page hero.
- **Tabs:**
  - **First team** — position-grouped player **photo cards** (GK / DEF / MID / FWD).
  - **Leaderboards** — full table: `# PLAYER APPS G A G+A MOTM`, with season + competition filters.
  - **Coaches** — staff cards (photo + bio).
  - **Team stats** — squad-level stat highlights.
- **Modal / Player profile (the showpiece)** — opens on tapping a player. Dense real analytics, GK-aware:
  - Hero (photo, name, role, headline stats) · **rings** (G+A per game, win rate, availability, MOTM rate) · goal-breakdown bars · "Season impact" (share of club goals, scoring/assist/MOTM rank) · cumulative G+A **sparkline** · **position pitch** · per-competition splits · **last-10** form. (GK variant: clean sheets/conceded/pens-saved, defensive bars, clean-sheet rate, etc.)

## 5. Schedule (`schedule.html`; entry points `fixtures.html`, `results.html`, `table.html`)
- **Header** — page hero.
- **Tabs:**
  - **Results** — result cards with competition filter (league + cups).
  - **League table** — full standings `# CLUB P W D L GF GA GD PTS`, promotion crumbs (volt = champions, orange = 2nd).
  - **Fixtures** — upcoming fixtures; **26/27 "League Eight"** shows provisional opponent line-up with crests + a vacancy slot, or pre-season state.

## 6. Media (`media.html`; entry points `news.html`, `gallery.html`)
- **Header** — page hero.
- **Tabs:**
  - **News / match reports** — article cards; match reports use a **full-time score-cover** (home crest · score · away crest · competition).
  - **Gallery** — matchday photo albums with lightbox viewer.
  - **Video** — match videos (VEO / YouTube embeds).

## 7. Sponsors (`sponsors.html`)
- **Header** — "Behind the badge".
- **Stats** — partner count / champions / record tiles.
- **Logo / partners** — sponsor cards (Sporting Solutions, Hodgson Roofing) → **detail modal** each.
- **Layout / "What you get"** — partnership benefits (4).
- **CTA / Support** — donate (club / sepsis cause) + sponsorship options (sponsor a player/match/ball/section).
- **CTA band** — enquiry.

## 8. Contact (`contact.html`)
- **Header** — "Contact".
- **Layout / route picker** — General · Sponsor enquiry · Player trial · Media volunteer.
- **Form** — name/email/subject/phone/message, inline success (no popup) + direct contact (email, Instagram, TikTok).

## 9. Join (`join.html`)
- **Header** — "Join the club".
- **Tabs / routes** — Player trials · Volunteer · Media team · Sponsorship.
- **Form** — application form per route (inline success).
- **FAQ** — accordion (trials, media, volunteering, sponsorship).

## Utility
- **404** page · `sitemap.xml` · `robots.txt` · SEO meta + JSON-LD on every page.

---

## Brand quick-reference (for styling in Relume)
- **Colours:** volt yellow `#D6F23A` (accent/fills) · navy `#071D29` (base/ink) · light bg `#EAEEF2` · win `#25E27B` / draw `#F2C744` / loss `#FF4D5E`.
- **Type:** Clash Display (headlines/stats) + Hanken Grotesk (body/UI).
- **Style:** premium glassmorphism, light + dark mode, subtle motion. British English, no em dashes.
