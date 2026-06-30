---
name: grassroots-grant-application
description: >-
  Find and apply for grants and community funding for a grassroots, Sunday-league, non-league or amateur sports club (UK-focused). Use this whenever the user wants to fund a club, asks "what grants can we get", "how do we raise money for the club", "are we eligible for funding", mentions the Football Foundation, FA grants, Sport England, National Lottery Awards for All, council/community funds, or wants a grant shortlist, a Case for Support, or a funding readiness checklist. Trigger even if they only say "we need money for the club" or "find funding" without naming a specific grant. Always verify the club's real facts first, never assume its make-up.
---

# Grassroots grant & community funding

This skill turns "we need money for the club" into a verified, ready-to-apply funding pack. It exists because grassroots clubs leave real money on the table, applications fail on avoidable eligibility mistakes, and a wrong assumption about the club (its make-up, location, or status) can send someone applying for funds they can never get.

The single most important rule: **verify the club's facts before recommending anything. Never assume.** A men's club is not eligible for women's-only funds; a Hounslow club cannot apply to Kingston's council fund. Getting this wrong wastes the club's time and credibility with funders.

## Workflow

### Step 1 — Verify the club's facts FIRST (do not assume)
Before shortlisting a single grant, establish the facts that drive eligibility. If a club website or repo is available, check it (grep/read); if a fact cannot be confirmed, **ask the user a direct question** rather than guessing. The facts that change which grants apply:

- **Make-up:** men's / women's / girls' / boys' / mixed / disability / veterans / youth. (Many football grants are gender- or age-specific.)
- **Location → local authority:** which town and which council/borough? Local-authority grants are postcode-gated. Confirm the actual home ground, not a nearby city that appears in a league name.
- **Affiliation:** which county FA, and the affiliation number. This unlocks all football-specific funding.
- **Legal status:** constituted club? not-for-profit? any charitable/CASC status? a club bank account?
- **Cause / mission:** any community, health, memorial or social angle. This is what community funders back.
- **Track record:** founded when, league, results, squad size, sessions run. Evidence of delivery strengthens every bid.

If you used assumptions to get here, say so and flag them for the user to confirm.

### Step 2 — Shortlist grants, and VERIFY them live
Use the funder categories in `references/uk-funders.md` as the starting map, then **verify current status, amounts, eligibility and deadlines on the funder's own site** (use web research — `deep-research` or `firecrawl-search`). Funding rounds open and close; never state an amount or deadline you have not just checked. If you cannot confirm a detail, write "verify on funder site" with the link rather than inventing a figure.

For each candidate grant capture: funder, grant name, typical/max amount, what it funds (facilities vs equipment vs activity/running costs), key eligibility, deadline or "rolling", application difficulty (Low/Med/High), the specific fit angle for THIS club, and the direct application link.

### Step 3 — Match eligibility honestly (cut what does not fit)
Cross the shortlist against the Step 1 facts and **strike anything the club cannot get**, with a one-line reason (e.g. "women/girls only — not eligible, club is men's"). It is better to surface five grants the club genuinely qualifies for than fifteen with three that waste effort. Rank the survivors by best fit + biggest cheque + lowest effort, and mark the top 3 "apply first".

### Step 4 — Write the Case for Support
A reusable 3-4 paragraph narrative the club pastes (and lightly adapts) into any application. Follow `references/case-for-support-template.md`. It should carry: the club's story and purpose, the community/cause angle a funder cares about, evidence of delivery, who benefits, and a closing line on what the money enables. British spelling, warm but factual, no em or en dashes.

### Step 5 — Produce the readiness checklist
Most applications fail or stall on the same missing items. Output the checklist in `references/readiness-checklist.md`, marking each item [GATHER] (must obtain) or [CONFIRM] (quick check), and name the single biggest blocker (almost always: a dedicated club bank account requiring two signatories — without it, most funders cannot pay out).

## Output format
Produce a single markdown **Grant Funding Pack** with these sections, in order:
1. **Header** — club name, location/authority, date, and any unconfirmed assumptions flagged.
2. **Shortlist table** — the verified, eligibility-matched grants (columns from Step 2).
3. **Top 3 "apply first"** — each expanded: amount, what it covers, why this club fits, eligibility, match-funding, difficulty, link.
4. **Case for Support** — the reusable narrative.
5. **Readiness checklist** — grouped (governance, financial, football-specific, story/evidence), with the biggest blocker called out.
6. **Realistic funding range** — an honest year-one total if the top picks land (ranges, not a single optimistic number).

Write the pack to a file (the caller decides where) and return a short summary: top 3 grants, the biggest blocker, and the realistic range.

## Hard rules
- **Never assume the club's make-up, location, or status — verify or ask.** This is the difference between a useful pack and a misleading one.
- **Never invent funder amounts or deadlines.** Verify live, or mark "verify on funder site" with the link.
- Be honest about fit. Striking an ineligible grant is more valuable than padding the list.
- British spelling, no em or en dashes, warm but factual tone.

## Bundled references
- `references/uk-funders.md` — the map of UK grassroots football + community/cause funders to check (with what each typically funds and the eligibility gotchas).
- `references/case-for-support-template.md` — the narrative template with guidance.
- `references/readiness-checklist.md` — the full pre-application checklist.
