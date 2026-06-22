---
name: matchday-engine
description: Use to build or manage the matchday core of a football site — results, fixtures, the league table, and player statistics that compute themselves from match entries. Triggers on "results and fixtures", "league table", "player stats", "match data model", "appearances and goals".
---

# Matchday Engine

The heartbeat of a club site. Get the data model right and everything (stats, leaderboards, records, profiles, reports) updates itself.

## The golden rule: derive, never duplicate
Store **one source of truth per match** and compute everything else live. Never hand-type a player's season totals — they drift and lie.

- A **match entry**: `{ home, away, hs, as, kind ('normal'|'walkover'|'penalty'), competition, date, starters[], bench[], goals:[{num}], assists:[{num}], motm }`.
- **Players are keyed by squad number.** Every goal/assist/MOTM/lineup references `num`. The roster (`SQUAD`) maps `num → name`. This is why removing a player who has match data orphans his history — check `derivedPlayerStats(num)` before any removal.
- **Derived getters** read all matches and compute: appearances, goals, assists, clean sheets, MOTM, goal involvements, form, the table, leaderboards, club records and milestones. Season is inferred from match date.

## What to build
- **Results** (most recent first, W/D/L colour-coded), **Fixtures** (upcoming, with date/time/venue), **Table** (live or synced), and **player profiles** that pull a player's whole season from the same data.
- A **"next session / next fixture" hero** with a live countdown that rolls over automatically.
- **Records & milestones** that auto-calculate (most goals, biggest win, unbeaten run) with a manual override layer.

## Ops
- Result/fixture entry is admin/CMS data (Supabase, admin-write). Prepare exact values; the **match-reporter** agent handles entry + the report.
- Add `SportsEvent` structured data for fixtures (see **football-seo-schema**).
- After any change, confirm the homepage "recent results", the table, and the affected player profiles all updated, with no console errors. Deploy via **deploy-verifier**.

Part of **football-website-builder**.
