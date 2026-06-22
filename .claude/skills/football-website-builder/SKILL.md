---
name: football-website-builder
description: Use to design, build, or substantially extend a football (soccer) club website — grassroots, Sunday-league, academy or semi-pro. The flagship playbook that orchestrates the specialist club agents across brand, matchday, content, SEO, growth and deploy. Triggers on "build a football site", "club website", "new team site", "football club web".
---

# Football Website Builder

The end-to-end method for building a football club website that looks premium, runs fast, and is easy for a non-technical club to keep alive. Proven on **suesangelsfc.co.uk** (League Ten champions, unbeaten 25/26).

## What makes a great club site
1. **A story, not a brochure.** The badge, the cause, the season. Lead with identity and emotion, back it with data.
2. **Matchday is the heartbeat.** Results, fixtures, the table and live-derived player stats must feel alive and update themselves.
3. **Built for the volunteer who runs it.** A simple CMS, content that updates from data, and automation (newsletter, share cards) so one person can sustain it.
4. **Fast and findable.** Sub-second feel, real structured data, a card for every shared link.
5. **Convert the love.** Supporters, players and sponsors should always have an obvious next step.

## The architecture (default)
Use the **static-react-no-build** skill: per-page HTML + React via CDN, **no bundler/build step**, a **Supabase** data layer (public-read content, write-only sign-up tables), a CMS page on a separate stack, and **Vercel** auto-deploy on push. It is cheap, fast, durable, and a non-developer can run it.

## The build, phase by phase (dispatch the agent at each step)
1. **Brand & design system** → use **football-brand-system**. Lock colour tokens, type pairing, crest usage, motion (the loading "boot" badge), and the share-card style.
2. **Scaffold the pages** — home, about, the cause, champions, squad/teams, schedule/results/fixtures, table/league, news, media/gallery/videos, sponsors, contact, join, awards, records, stats, coaches (+ 404, admin).
3. **Matchday data** → dispatch **match-reporter**; see **matchday-engine** for the model (stats derived from match entries, players keyed by squad number).
4. **Squad, coaches, awards** → dispatch **squad-manager** and **awards-curator**.
5. **Editorial** → dispatch **news-writer**; see **club-content-studio** for voice and cause-handling.
6. **Findability** → dispatch **seo-optimizer** and **social-card-maker**; see **football-seo-schema**.
7. **Growth** → dispatch **growth-manager** and **newsletter-manager**; see **club-growth-sponsorship**.
8. **Health** → dispatch **site-health-auditor** (performance + accessibility).
9. **Launch** → dispatch **deploy-verifier** every time: bump cache `?v=`, commit (never push `.github/workflows/*` without `workflow` scope), push, and confirm live.

## The agent team (workers this skill commands)
`match-reporter · news-writer · social-card-maker · squad-manager · awards-curator · seo-optimizer · site-health-auditor · newsletter-manager · growth-manager · deploy-verifier` — see `.claude/agents/README.md`.

## Non-negotiables
- British spelling, **no em dashes**, real claims only, the cause handled with dignity.
- Verify every change **live** before calling it done. No horizontal overflow on mobile.
- The club must be able to edit content without a developer.
