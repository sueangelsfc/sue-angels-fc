---
name: club-match-report
description: Write and publish a Sue's Angels FC match report from the stored record, as a formatted edition that retires itself when the club edits the text. Use when asked to write up a match, file a report, "do the Brockwell report", add a report the club has written but not typed in, or format an existing stored report with headings, tables and graphics.
---

# Writing a match report for this club

**The voice rules are not in this file, on purpose.** They are shipped, in
`HOUSE` in `src/admin/lazy/15-report.js`, because that is what the panel sends
to the model when somebody presses *Build the report*. A second copy here
would drift, and this repository's recurring fault is two sources for one
fact. **Read that constant before writing a word.**

```bash
sed -n '/var HOUSE = \[/,/\].join/p' src/admin/lazy/15-report.js
```

What this file adds is the part that is not in `HOUSE`: where the words go,
what retires them, and the four ways a report goes wrong after it is written.

---

## Which of the two jobs is this

**A. The club wrote it and has not typed it in.** The `matches` table cannot
be written from a developer machine (`42501`). Put the report in
`src/data/report-editions.json`.

**B. A report is stored and the club wants it formatted** with headings,
tables, a graphic and player links. Same file, same mechanism.

Both are the same device and the thing that makes a second source safe here
is `basedOn`.

---

## `basedOn` is the whole safety mechanism

Each edition carries the **sha256 of the stored report text it was built
from**. The site shows the edition only while the stored text still hashes to
that value. The moment anybody edits the report in Control panel the hash
moves, the edition vanishes from the build, and the club's own words win
outright.

```bash
# job A, nothing stored: the hash of the empty string
printf '' | shasum -a 256
# job B: hash exactly what `rawReport()` reads, no trailing newline added.
# THE FIELD IS `polishedReport` OR `commentary`, never `report`: hashing the
# wrong field gives a valid-looking hash that matches nothing.
python3 -c "
import json,hashlib
d=json.load(open('src/data/recovered-live.json'))
m=[r for r in d['matches'] if r['key']=='r20261108-brockwell'][0]['data']
raw=m.get('polishedReport') or m.get('commentary') or ''
print(hashlib.sha256(raw.encode()).hexdigest())"
```

Get this wrong and the edition silently does not publish. That is the failure
mode: **nothing breaks, the old text just stays**. Always render and check.

---

## The marker vocabulary

Same parser as an article (`articleBody` in `src/templates/news.mjs`). One
marker, one meaning, and anything unrecognised stays on the page as the text
it is, so you can see it did not work.

| Marker | What it is |
|---|---|
| `#` / `##` | heading (h2) |
| `###` | sub-heading (h3, or h2 styled smaller if no heading precedes) |
| `**bold**` | bold |
| `[words](/players/name.html)` | link, site-relative or `https://` only |
| `![caption](/assets/.../x.jpg#WxH)` | photograph |
| `!![caption](/assets/articles/x.jpg#WxH)` | graphic, shown whole, keep under 100KB |
| `> words` | pull quote |
| a paragraph whose every line has TABS or sits between PIPES | table, first row the header |
| a table headed exactly `Club\|P\|W\|D\|L\|GF\|GA\|GD\|Pts` | drawn as the home page's `.tbl` |

Escaping happens **before** markers are read, so a tag pasted into the club's
copy stays text.

---

## The four ways this goes wrong

1. **A figure in the prose that the record does not hold.** Every number must
   be derivable. If the club says something the record contradicts, that is a
   `match-corrections.json` entry, not a sentence. See below.
2. **An em dash.** The suite greps for one. Use a comma or a full stop.
3. **A `basedOn` that does not match.** Silent. Always verify by rendering.
4. **A player link to a slug that does not exist.** `npm run guard` catches a
   local link resolving to nothing, so run it.

## When the club's figure disagrees with the record

Do **not** write the club's figure into the prose and leave the record saying
something else: the page and the statistics then disagree. Put it in
`src/data/match-corrections.json`, which retires itself the same way:

```json
{ "match": "r20260927-barnes",
  "theirGoals": [{"og":false,"name":"","type":"open","minute":"85","penalty":false}],
  "was": [],
  "why": "..." }
```

`was` names the value being corrected, and the correction applies only while
the stored record still holds it. **A correction publishes a figure; it does
not write the record.** So a match named in the suite's lists of incomplete
records stays named. That distinction cost a test failure once.

---

## Publishing

```bash
npm run build          # regenerate
npm run verify         # derived figures against the published table
npm run guard          # what the deploy refuses to publish
npm test               # the suite; the pre-push hook runs it anyway
npm run covers         # the share card, needs a local Chrome, committed output
```

`npm run covers` cannot run on the deploy (Vercel has no browser), so the card
is committed like the generated HTML. A report published without it shares the
generic club image.

Then commit the generated HTML **with** the source change. CI fails if the
output does not match the source.

## The standing rule after a report goes live

Every new article or match report also gets a **9:16 Instagram story cover**
sent in chat with its live link. Do that without being asked.

---

## Related

- `src/lib/prose.mjs`, `plainText`, `hasReport`, `reportText`
- `src/data/article-additions.json`, a line added to a **stored** article,
  skipped once the stored text contains it
- `.claude/skills/club-interview`, the other half of this, for filmed Q&As
