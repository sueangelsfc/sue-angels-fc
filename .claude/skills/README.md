# Football Website Skills

A set of skills for building and running football (soccer) club websites — the
expertise distilled from building **suesangelsfc.co.uk**. Skills are the
**playbooks** (methodology + domain knowledge); the agents in
`.claude/agents/` are the **workers** the skills dispatch.

## The flagship
- **football-website-builder** — the end-to-end method to design, build and launch a club site. Orchestrates every agent across all phases.

## The expertise set
| Skill | Area of expertise |
|---|---|
| **static-react-no-build** | Architecture — fast static React via CDN, Supabase data, Vercel, no build step |
| **football-brand-system** | Brand & design — tokens, type, crest, motion/boot screen, premium feel |
| **matchday-engine** | Results, fixtures, league table, and stats that derive themselves |
| **football-seo-schema** | Sports SEO — SportsTeam/SportsEvent JSON-LD, local SEO, meta, sitemap |
| **club-growth-sponsorship** | Leads, sponsorship funnel, newsletter, consented retargeting |
| **club-content-studio** | Editorial voice — news, match reports, bios, sensitive cause storytelling |

## How skills + agents fit together
A skill decides **what good looks like and in what order**; it then hands the
hands-on work to a specialist agent:

- `football-website-builder` → runs the whole phased build, dispatching all agents
- `matchday-engine` → **match-reporter**
- `club-content-studio` → **news-writer**, **match-reporter**
- `football-brand-system` → **social-card-maker**
- `football-seo-schema` → **seo-optimizer**, **social-card-maker**
- `club-growth-sponsorship` → **growth-manager**, **newsletter-manager**
- every skill → **site-health-auditor** (quality) and **deploy-verifier** (ship + verify)

Squad/awards work is owned by the **squad-manager** and **awards-curator** agents,
drawing on `matchday-engine`.

## Shared principles (every skill + agent)
British spelling · no em dashes · real claims only · the cause handled with
dignity · verify every change live · the club must be able to edit content
without a developer.
