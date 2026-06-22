---
name: football-seo-schema
description: Use for football/sports-specific search optimization — SportsTeam and SportsEvent JSON-LD, local SEO for a club's towns, per-page meta + social cards, sitemap. Triggers on "club SEO", "sports structured data", "rank on google", "schema for fixtures", "local football SEO".
---

# Football SEO & Schema

Get a grassroots club found by the people searching for it: locals, opponents, prospective players and sponsors.

## Structured data (the football edge)
Ship a JSON-LD `@graph` on every page:
- **`SportsTeam`** (the org): name, `sport: "Association football"`, foundingDate, logo, location/`PostalAddress`, `areaServed` (the towns the club draws from), `sameAs` (Instagram/TikTok), email.
- **`WebSite`** + per-page **`WebPage`**, all wired with `@id` references and `inLanguage: "en-GB"`.
- **`SportsEvent`** for fixtures (home/away teams, date, location) — this is what can surface match listings.
- Always validate that it parses; a broken block helps nobody.

## On-page
- **Meta descriptions ~120–155 chars**, brand tone, real claims, British spelling, **no em dashes**. The same text usually lives in `description`, `og:description`, `twitter:description` and the JSON-LD `description` — keep all in sync.
- Canonical on every page; pick **one host** (e.g. `www`) and use it everywhere, especially if the apex has cert issues.
- A `sitemap.xml` listing every public page with `lastmod`; `robots.txt` allowing all and pointing to it. Never list verification-token files.

## Local SEO
- Name the **towns** in copy, schema `areaServed`, and FAQ content ("Where are we based?", "What league?"). Grassroots search is hyper-local.
- Link out to the league/FA fixtures pages with `rel="nofollow noopener"`.

## Social discoverability
Every page needs its **own** 1200×630 share card (hand to **social-card-maker**) and matching `og:image:alt` — a shared link should look intentional, not generic.

Dispatch the **seo-optimizer** agent for the edits; verify the live page serves the tags. Part of **football-website-builder**.
