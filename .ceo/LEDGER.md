# LEDGER — the firm's books

One block per working day. Appended by the CEO each run. Newest at the bottom.

Format:
```
## Day <N> — <YYYY-MM-DD>
- Objective: <one line>
- Branch: ceo/day-<N>-<slug>
- Shipped: <what landed on the branch>
- Verified: <how>
- Cost note: <staff used / rough effort / anything that cost money>
- Staff scores: <agent>=<score>/40 (I<>·Q<>·E<>), ...
- Venture added: <one line, see VENTURES.md>
```

---

## Day 1 — 2026-06-30
- Objective: Make the club more findable in Google + AI search by fixing the biggest on-page SEO/AEO gap.
- Branch: ceo/day-1-seo-visibility (pushed, awaiting review)
- Shipped: Expanded 4 too-short meta descriptions (champions, join, about, squad) to 120-155 chars, synced across meta/OG/Twitter/JSON-LD (16 edits).
- Verified: sync check all 4 spots per page; json.loads on every JSON-LD block passes; CEO re-checked only 4 files changed, no dashes.
- Cost note: cheap, 1 staff agent (~42k tokens), single pass, no CSS/version churn.
- Staff scores: seo-optimizer=32/40 (I7·Q9·E9).
- Venture added: Grassroots club SEO/AEO retainer (productise today's work).
