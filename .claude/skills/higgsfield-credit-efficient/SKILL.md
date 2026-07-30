---
name: higgsfield-credit-efficient
description: Use whenever generating images or video with the Higgsfield MCP for Sue's Angels FC — enforces the credit-efficient workflow (preflight costs, cheap drafts, approve stills before video, reuse assets) so credits are never wasted.
---

# Higgsfield, credit-efficient

Credits are a real budget (check with `balance`). Video costs many times more than
images, so the whole workflow is shaped around one rule: **never generate video
from an unapproved still.**

## The ladder (cheap → expensive, in order)

1. **Preflight every generation** with `get_cost: true` before submitting. State
   the cost before spending it.
2. **Draft stills first** — `nano_banana_pro` at default `1k` resolution
   (~2 credits) is the workhorse: best text fidelity ("SPORTING SOLUTIONS",
   crest lettering) and follows reference images well. `count: 2` per attempt
   gives a choice for near-zero extra cost. Iterate the PROMPT at this tier,
   never at video tier.
3. **Show Stewart the stills and get approval** before any video generation.
   Judge in order: sponsor lettering legible → crest accurate → fabric real.
4. **Video only from the approved still** — pass the winning image `job_id`
   directly as the video model's `start_image`/`image` media (no re-upload).
   Generate `count: 1`. Preflight the cost and say it out loud first.
5. **Upscale last, once** — `upscale_video`/`upscale_image` only on the final
   accepted result, never on drafts.

## Reference assets (already prepared, reuse — do not recreate)

- Kit reference (volt Joma shirt, navy trim, sponsor serif): torso crop from
  `assets/hero/banner-01.jpg` → `/tmp/savid2/kit-ref.png`
- Crest master 1920px: `~/Desktop/crest-for-higgsfield.png`
  (rebuild recipe: `assets/badge/sue-angels-badge-cutout.png` → 1400px lanczos
  → centred on 1920×1920 `#071D29` canvas)
- Once uploaded in a session, REUSE the returned `media_id`s for every
  follow-up generation — uploads persist in the media library
  (`show_medias` lists them). Never re-upload the same file.

## Upload mechanics (agent path)

`media_upload` (files[]) → `curl PUT` each `upload_url` with the exact
`Content-Type` → `media_confirm` with all `media_ids`. Widget is for
user-picked files only.

## Hero-video constraints (the site's scrub mechanic)

Any hero background video must be: **one continuous shot, locked camera, no
cuts, no zoom**, 6–10s, final frame = the money shot (finished crest / shirt
front-on). Mouse X scrubs the timeline, so a cut reads as a glitch. If AI
lettering shimmers mid-motion, don't burn credits chasing perfection — pin the
real lettering over the final frames in ffmpeg instead.

## Club brand facts (stop drift in prompts)

- Volt `#D6F23A`, deep navy `#0A0F1C`, on-volt ink `#071D29`
- Kit: neon volt Joma shirt, dark navy shoulder/sleeve panels, navy
  "SPORTING SOLUTIONS" serif caps across chest, crest on left chest,
  navy shorts and socks
- Crest: navy shield, volt border, "SUE'S ANGELS", volt angel with halo and
  wings, "EST. 2025", motto "WHAT WE DO IN LIFE ECHOES IN ETERNITY"
- British spelling, no em dashes in any copy
