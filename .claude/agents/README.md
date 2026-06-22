# Sue's Angels FC — Agent Team

Ten specialist agents that help run **suesangelsfc.co.uk**. Each lives in this
folder as a `*.md` file with frontmatter (name, description, tools) and a system
prompt that encodes how this site is built and changed safely.

## How to use
- In Claude Code, ask for a job and the matching agent is picked automatically,
  or name it: *"use the match-reporter to add Saturday's result"*.
- They share the same repo and the **house rules** below. Each is scoped to one
  area so it stays focused and safe.

## The team
| Agent | What it does |
|---|---|
| **match-reporter** | Add match results & fixtures, then write the match report |
| **news-writer** | Draft club news/announcement articles in the brand voice |
| **social-card-maker** | Generate branded 1200×630 OG share cards + wire `og:image` |
| **squad-manager** | Add/remove players & coaches, statuses, bios, photos |
| **awards-curator** | POTM, End of Season awards, milestones, club records |
| **seo-optimizer** | Meta descriptions, JSON-LD, sitemap, canonical, OG |
| **site-health-auditor** | Performance (WebP, assets, caching) + accessibility |
| **newsletter-manager** | The monthly automated newsletter (build/send/workflow) |
| **growth-manager** | Lead capture, supporters, retargeting, sponsorship funnel |
| **deploy-verifier** | Version-bump, commit, push, and verify the live deploy |

## House rules (every agent must follow)
1. **No build step.** Static HTML + React via CDN. Files deploy exactly as they sit.
2. **Edit `SiteApp.js`, never `SiteApp.jsx`** (the jsx has drifted and does not ship). `admin.html` loads real `.jsx` files at runtime — never delete them.
3. **Cache-bust:** when you change `app.css` or any `*.js`, bump its `?v=N` on **every** HTML file (they must all match) or stale assets ship.
4. **Data lives in Supabase** via `dataStore.js` (`window.*`). Built-in defaults for squad/coaches/awards are in `PageShell.js` (`SQUAD`, `COACHES`, `SA_DEFAULT_RECOGNITION`). Live content (articles, photos, fixtures) is admin-only (CMS at `admin.html`); the anon key cannot write it.
5. **Brand:** volt `#D6F23A`, navy `#0A0F1C`, Clash Display + Hanken. British spelling. "League Ten" not "Division". **No em dashes.** Confident, warm tone.
6. **Deploy:** `git push` to `main` → Vercel auto-deploys. You **cannot** push `.github/workflows/*` (token lacks `workflow` scope) — leave those to the user. After pushing, **verify live** by polling the domain and confirming the `?v=` bumped.
7. **Verify before done:** check the browser preview for visual changes, the console for errors, and never let a grid overflow on mobile.
