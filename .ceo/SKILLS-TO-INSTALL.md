# Skills worth installing (verified Jun 2026)

The firm's installed skill set is already broad. Web research (verified against real repos) found only four genuine gaps: **accessibility auditing, CRO/A-B testing, local SEO / Google Business Profile, and analytics measurement.** Install narrowly; piling on marketing packs causes trigger-collision without new capability.

## Recommended (install these two, then stop)
1. **AccessLint** — dedicated WCAG 2.2 live-DOM accessibility auditing (axe-style). Fills the a11y gap; relevant because the site is hand-written `React.createElement` where ARIA/contrast/focus regress easily.
   - `claude plugin marketplace add accesslint/skills`
   - `claude plugin install accesslint@accesslint`
2. **rampstack `claude-skills`** (selective) — tool-agnostic skills for `cro-optimization`, `analytics-strategy`, and `local-seo` (closes the other three gaps in one marketplace).
   - `/plugin marketplace add rampstackco/claude-skills`
   - `/plugin install rampstack-skills@rampstack` (or a focused subset)
   - Caveat: its SEO *audit* suite assumes a paid Ahrefs MCP; the CRO/analytics/local-SEO/a11y skills are free and tool-agnostic.

## Optional / situational
- **coreyhaines31 `marketingskills`** — install ONLY the `cro` + analytics skills (rest overlaps our stack). `github.com/coreyhaines31/marketingskills`.
- **Community-Access `accessibility-agents`** — enforces a11y at generation time (prevention vs AccessLint's audit). Pick one a11y approach, not both.
- **PostHog MCP** — only if adopting PostHog as the analytics layer (free tier). Lets CRO/analytics skills read real numbers. Skip if staying GA-only.

## Already installed (do NOT re-install)
frontend-design, ui-ux-pro-max, web-performance-optimization, aeo-audit, schema-generator, seo-content-engine, brand-guidelines/theme-factory/canvas-design, image-gen, and the 17 official anthropics/skills (docx/pptx/xlsx/pdf/etc.). These are the most-recommended 2026 installs and we have them.

## Note
`/plugin` and `claude plugin` commands are run by Stewart in an interactive terminal — the CEO cannot install plugins itself. The firm recommends; Stewart installs.

Sources: anthropics/skills, rampstackco/claude-skills, coreyhaines31/marketingskills, accesslint/claude-marketplace, Community-Access/accessibility-agents, travisvn/awesome-claude-skills, Firecrawl "Best Claude Code Skills 2026".
