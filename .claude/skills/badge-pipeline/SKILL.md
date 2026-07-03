---
name: badge-pipeline
description: Process a club crest/badge image into the site's badge system - strip the background, name it correctly, resize, generate png+webp, set the registry aspect, and deploy. Use when the user provides a new or updated opponent badge, says "add this badge", "new crest", "update X's badge", or a badge shows with a white/black box behind it.
---

# Badge Pipeline

Turn any crest image (any name, any format, background or not) into a correct,
transparent, deployed badge. This exact dance was done 6+ times by hand in Jun
2026 — follow it verbatim and nothing breaks.

## Rules learned the hard way
- **Filenames are load-bearing.** The registry references exact slugs, e.g.
  `assets/badge/brentford-town-badge.webp`. Spaces or new names silently break.
- **BOTH `.png` and `.webp` must exist** — different call-sites use each.
- **Size:** max edge ~420px, webp quality 92 (target < 60KB; source files are often 1MB+).
- **Aspect:** shields (taller than wide) need `aspect: 'shield'` in BOTH
  `PageShell.js` and `PageShell.jsx` registries or they render squished as circles.
- **Admin-uploaded badges override files.** If a badge still shows a box after a
  file fix, the boxed copy lives in localStorage `sa-team-badges` (fixture-form
  uploads) — repoint or clear it (see FixtureEntry.js `fixBoxedOpponentBadges`).

## The processing script (Pillow flood-fill — preserves artwork exactly)

```python
from PIL import Image
import collections
def strip_bg(im, thresh=50):
    im = im.convert('RGBA'); px = im.load(); w, h = im.size; bg = px[0, 0]
    if bg[3] < 200: return im                      # already transparent
    seen = bytearray(w*h); dq = collections.deque()
    for x in range(w): dq.append((x,0)); dq.append((x,h-1))
    for y in range(h): dq.append((0,y)); dq.append((w-1,y))
    while dq:
        x, y = dq.popleft()
        if x<0 or y<0 or x>=w or y>=h: continue
        i = y*w+x
        if seen[i]: continue
        seen[i] = 1
        r, g, b, a = px[x, y]
        if abs(r-bg[0])<thresh and abs(g-bg[1])<thresh and abs(b-bg[2])<thresh:
            px[x, y] = (0,0,0,0); dq.extend([(x+1,y),(x-1,y),(x,y+1),(x,y-1)])
    return im

im = strip_bg(Image.open(SRC))
bb = im.getbbox()
if bb: im = im.crop(bb)                            # autocrop
s = min(1, 420/max(im.size))
if s < 1: im = im.resize((round(im.width*s), round(im.height*s)), Image.LANCZOS)
im.save(f'assets/badge/{slug}.png')
im.save(f'assets/badge/{slug}.webp', quality=92, method=6)
```

## Steps
1. Locate the source image (often `~/Desktop` or `~/Downloads`, any filename).
2. Run the script above with the correct existing slug (check `ls assets/badge/`
   and `BADGE_REGISTRY` for the club's entry; new clubs need a registry entry in
   BOTH PageShell files).
3. **Visually verify**: composite the result on a dark AND light swatch, Read the
   image, confirm no box and artwork intact.
4. Check/fix `aspect` ('shield' vs 'circle') in both registries if shape changed.
5. If registry changed: `./scripts/bump.sh PageShell.js` + bump `PageShell.jsx?v=`
   in admin.html, and run `./scripts/drift-check.sh`.
6. Ship: `./scripts/ship.sh "Badge: <club> updated"`.
7. Tell the user to hard-refresh (Cmd+Shift+R).
