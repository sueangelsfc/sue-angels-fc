---
name: club-interview
description: Turn a filmed or recorded Sue's Angels FC interview into a published Q&A article, with the video encoded for the web, a poster frame, timestamped questions and a pull quote. Use when handed a .mov/.mp4/.m4a of a player or the manager speaking, or asked to write up a post-match interview, add the gaffer's interview, or publish a Q&A.
---

# Publishing an interview

The club films the manager or a player after a match and sends the clip. The
output is an article of category **Interview** in
`src/data/articles-extra.json`, with the film at the top, the answers as a
Q&A, and one quote pulled out.

Worked examples already in the file, read one first:
`art-extra-20261101-stephen-epathite`, `art-extra-20261108-stephen-epathite`.

---

## 1. The file

The `articles` table cannot be written from a developer machine (`42501`), so
the piece ships in `src/data/articles-extra.json` under `articles`. **It loses
to the database on the slug or the key**, so the moment the club enters it in
Control panel → News the stored row wins outright and this copy vanishes from
the build. Forgetting to delete it costs nothing.

```json
{ "key":  "art-extra-20261108-stephen-epathite",
  "data": { "id":    "art-extra-20261108-stephen-epathite",
            "cat":   "Interview",
            "title": "The gaffer on a statement, and ten men seeing it out",
            "date":  "8 Nov 2026",
            "iso":   "2026-11-08",
            "lede":  "…the whole piece…" } }
```

**The whole article lives in `lede`.** `body` is empty on every row and
reading it would ship a headline with nothing under it. That is a property of
how the records were captured, not a choice.

---

## 2. The video

The club's originals are 4K HEVC `.mov` straight off a phone, often portrait.
Encode to web H.264 with the moov atom at the front, and draw a poster from a
frame where he is actually looking at the camera.

```bash
ffmpeg -i "/path/to/original.mov" \
  -vf "scale=720:1280:force_original_aspect_ratio=decrease" \
  -c:v libx264 -crf 23 -preset slow -profile:v high \
  -c:a aac -b:a 128k -movflags +faststart \
  assets/video/r20261108-brockwell-stephen-epathite.mp4

ffmpeg -ss 78 -i assets/video/<same>.mp4 -frames:v 1 -q:v 3 \
  assets/video/r20261108-brockwell-stephen-epathite.jpg
```

Name it `<match-id>-<speaker-slug>`. Portrait clips are **720x1280**; that
number goes in the marker and must be true or the page reserves the wrong box.
Both files are committed.

---

## 3. The markers

Parsed by `articleBody` in `src/templates/news.mjs`. One marker, one meaning;
anything unrecognised stays on the page as text, so you can see it failed.

| Marker | What it is |
|---|---|
| `@@[caption](/assets/video/x.mp4\|/assets/video/x.jpg#WxH)` | the film |
| `@[caption](/assets/audio/x.mp3#M:SS)` | an audio recording, with a waveform and playhead |
| `?? the question` | a question; everything until the next marker is the answer |
| `?? 2:18 the question` | with the second it was asked, which becomes a seek link |
| `?? 2:18 \| Short label \| the question` | with a chapter label for the player |
| `> the words` | the pull quote |
| `> 2:18 the words` | pull quote carrying its own seek |
| `++[Ade Owolana]` | a stat plate for a player, counted as at the day of writing |
| `!![caption](/assets/articles/x.jpg#WxH)` | a graphic, under 100KB |
| `[words](/players/ade-owolana.html)` | a link; site-relative or `https://` only |

Structure that works: intro paragraph, `@@` film, `>` pull quote, then the
`??` pairs, then `## The match` with a link to `/matches/<id>.html`.

---

## 4. The words

**It is a transcript, not a composition.** Every word in an answer is what he
said, tidied only for filler. Do not improve his grammar into something he did
not say, do not merge two answers, do not invent a question to fit an answer.
Say in the commit message that it is a machine transcript and should be read
back.

The questions are the club's own, as asked. Where the asker's wording is
rambling, tighten it; the answer is untouchable, the question is not.

Everything else follows the shipped house rules in `HOUSE`
(`src/admin/lazy/15-report.js`), and these in particular:

- **No em dashes.** The suite greps for one. An en dash in a scoreline (`6–1`)
  is fine.
- British spelling. "League Eight", never "Division".
- Understate it. A real number instead of an adjective.
- Literal characters (`·`, `’`, `–`), never HTML entities: a named entity
  passed through `esc()` renders as `&MIDDOT;`.
- Do not bolt the cause onto a football piece. It has its own page.

**The headline names what he said**, not that an interview happened. *"The
gaffer on a statement, and ten men seeing it out"*, not *"Manager reacts to
win"*.

---

## 5. The cover is the plate, and that is decided

An interview gets the drawn `coverPlate`, like every other article, **not** the
speaker's face. The face is already in the player a few lines below, and the
news cards in the feed were showing the plate all along. The club looked at
both and chose the plate; `ivCover()` is gone. Do not reintroduce it.

The plate carries the recording's length in its corner, so **the length is
said once on screen**: the digits are the graphic, the spoken form ("3 minutes
11 seconds with the manager") is `.sr-only`.

---

## 6. Publish

```bash
npm run build
npm run guard          # local links, missing alt, undefined in attributes
npm test
npm run covers         # the share card; needs a local Chrome, output committed
```

Then commit the generated HTML with the source change, or CI fails on output
not matching source. Check the rendered page actually has what you think:

```bash
python3 - <<'PY'
import re
h=open('news/the-gaffer-on-a-statement-and-ten-men-seeing-it-out.html').read()
print('questions', len(re.findall(r'qa__qt', h)))
print('video', h.count('<video'), 'quote', h.count('<blockquote'))
print('player links', len(re.findall(r'/players/[a-z-]+\.html', h)))
PY
```

## Afterwards

Standing rule: every new article or match report also gets a **9:16 Instagram
story cover** sent in chat with its live link. Do that without being asked.

---

## Related

- `.claude/skills/club-match-report`, the report that the interview sits beside
- `src/data/article-additions.json`, add a line to a **stored** article
  without touching its text
- `src/data/match-clips.json`, goal footage, a different thing from this
