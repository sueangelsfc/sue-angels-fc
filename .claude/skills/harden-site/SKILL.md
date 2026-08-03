---
name: harden-site
description: Sweep the codebase for real defects that are shipping, fix each at its source, and lock every fix with a test proven to fail without it. Use when asked to audit, harden, find fail points, clean up bad code, check nothing is broken, or "make the site bulletproof". Keeps a committed ledger so each run starts where the last one finished.
---

# Harden the site

Find defects that are **actually shipping**, fix each one where it originates,
and leave behind a test that fails if it comes back.

**This is not a refactoring pass.** Nothing changes without a measured defect or
a failing test behind it. Code that works and reads fine is left alone, however
much you would have written it differently.

## Before anything else: read the ledger

`.harden/ledger.md`, committed to the repo. Every run reads it first and appends
to it at the end. It is the only reason a second run is cheaper than the first.

It records, per run: what was swept, what was found, what was fixed, **what was
checked and turned out to be fine**, and what was deliberately left. That last
pair is the valuable half. Without it every run re-derives the same twenty
things and re-discovers that nineteen of them were never broken.

If `.harden/ledger.md` does not exist, create it with the template at the end of
this file and say so in the write-up.

## The rule that makes this worth running

**A finding is not a finding until it is demonstrated on the built output.**

Reading code and reasoning that something "would break" produces plausible
nonsense at a high rate. This project has a generator, so there is always a
concrete artefact to point at: the HTML in the repo root, the derived dataset,
the live URLs. Every claim gets evidence of that kind or it does not go in the
report.

The corresponding rule for fixes:

**A fix is not finished until its test has been seen to fail without it.**

Write the test, revert the fix, watch the test fail, restore the fix, watch it
pass. A test that has never failed is a test that proves nothing, and this
codebase has already been bitten by two that passed 0 of 0.

## What to sweep

Pick the passes that fit what changed. Do not run all of them every time; the
ledger says which are overdue.

### 1. The panel's promises
The control panel makes claims in its own labels and hint text. Check each is
true of the site.

Read every user-facing string in `src/admin/` that promises an outcome, then
verify the generator honours it. Past finds: a box labelled "What the website
publishes" that nothing published; an editor whose uploads reached the database
and no page; three sponsorship slots sold with sentences the site never drew.

### 2. Derived figures against their own source
Every published number is derived. Check each derivation against an independent
route to the same answer.

- The league table against the division results the site already prints
- A player's totals against the match records they come from
- Bar widths and gauges against the figure printed beside them
- Any "Nth of M" against its own population

### 3. Data reaching the page
For each table in the snapshot, pick a record and prove its content appears on
the page that should carry it. Records that reach no page are the single most
common defect class in this repo.

### 4. House style in shipped copy
Not in the source, in the built HTML: em dashes, "Division" for a league,
entity-escaped punctuation, a hard-coded season, a squad number in the UI.

### 5. Staleness
Anything the build computes from "now" and then serves statically. Fixture
cards, countdowns, "this season", age. Move the clock and check what lies.

### 6. Orphans and duplicates
Pages for records that no longer exist. One record rendered twice under two
ids. Assets referenced but absent, or present and referenced by nothing.

### 7. The two-implementations problem
Anywhere the same rule is written twice — once for the build, once for the
browser — check they still agree. `src/lib/squad-status.mjs` and
`src/admin/lazy/30-squad.js` are the standing example.

## How to run it

1. **Read** `.harden/ledger.md`. Note what was cleared and when.
2. **Confirm the tree is clean and green** first: `npm run build && npm run verify && npm test`. Hardening a broken tree buries the signal.
3. **Sweep**, one pass at a time, gathering evidence from built output.
4. **Fix at the source.** Not at the render site: at the place the wrong value
   is produced, so every consumer gets the fix.
5. **Lock it.** A check in `src/test/run.mjs` (page-level truths) or
   `src/lib/verify-dataset.mjs` (figure reconciliation). Prove it fails
   without the fix.
6. **Commit each fix on its own**, message written the way this repo writes
   them: what was wrong, what it cost, what the fix is, how it was proven.
7. **Append to the ledger** and commit that too.

## What not to do

- Do not rename, reformat, or restructure working code.
- Do not raise a budget to fit a change without writing down what bought it.
- Do not report a finding you have not reproduced.
- Do not fix a symptom on a page when the cause is in the dataset.
- Do not delete a record, a page or an asset to make a check pass.
- Do not touch `src/data/recovered-live.json` as a fix: it is a database
  mirror and `npm run sync` overwrites it. Correct at the build boundary or
  in the panel.

## Ledger template

```markdown
# Hardening ledger

Append-only. Each run reads this first.

## Run YYYY-MM-DD

**Swept:** which passes, over what.

**Found and fixed**
- One line each: the defect, where it originated, the commit.

**Checked, and sound**
- One line each. This is what stops the next run redoing the work.

**Left deliberately**
- One line each, with the reason and what would change the decision.

**Overdue**
- Passes not run this time, and why.
```
