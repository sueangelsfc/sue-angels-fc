# Fable kickoff prompt

Paste the block below into a fresh Fable 5 session opened in this repo
(`~/Desktop/sue-angels-fc`).

**Effort: run this session at `high` reasoning effort.** This is a reinvention where shallow decisions
are costly, so think deeply — but `high` gets that without the token burn of heavier modes. Reserve
`max` only for the genuinely hard decisions (stack choice, the 3D-crest hero, and the data migration).
The single step to think hardest about is **redesigning the backend without losing the club's live
content or its ability to edit it** — treat that as keep-or-deliberately-migrate, never lose.

---

You are redesigning the **Sue's Angels FC** website — a live football club site — from the ground up.
This is a complete reinvention, not a refresh.

**First, read `REDESIGN-BRIEF.md` in the repo root, in full.** It is the source of truth and links
everything else (`SITEMAP.md` for the content/feature inventory, `CLAUDE.md` for the current build).
Do not skim it — the mandate, the hard constraints, the backend map and the prepared assets are all in
there. Then read the live site at https://www.suesangelsfc.co.uk/ (all pages listed in the brief) as a
**content and feature reference only — never a design reference.**

The bar is an **Awwwards Site of the Day** winner that is also genuinely usable, accessible and fast —
Apple / Stripe / Linear / Vercel / Framer / Nothing / Rivian / Arc tier. Build an experience: cinematic
GSAP motion, Three.js where it earns its place, spring-based micro-interactions, every scroll revealing
something. Motion must guide attention, never distract. Hold the three balances in the brief:
beauty↔usability, innovation↔accessibility (keyboard/screen-reader/`prefers-reduced-motion`),
creativity↔performance (60fps, fast paint, mobile-tested).

**The club's must-haves:**
- **Hero = a bespoke, award-winning 3D animation of the club crest** (not squad photos). Vectors are
  prepared for you: `assets/badge/sue-angels-crest-silhouette.svg` (shield) and
  `sue-angels-crest-marks.svg` (volt angel/wings/text), overlay-aligned in a `0 0 512 512` space.
- **Modernise the profile cards + player modal** (tactile depth, 3D tilt, spring motion, elegant data
  viz; graceful fallback where a player has no photo — photos are cloud-fed and sparse).
- **The backend is in scope too** — redesign the admin CMS into something modern and phone-friendly,
  **but keep the club's live content and its ability to edit it. The Supabase data + Row-Level Security
  is keep-or-deliberately-migrate, never lose.** (Full backend map is in the brief.)
- **No generic "AI default" fonts** (no Inter/Roboto/Poppins/system stack). Distinctive, premium,
  self-hosted type only.

**You have licence to go further** — improve anything you touch and propose ideas beyond the brief. The
only lines that hold are the HARD CONSTRAINTS in the brief: don't lose the live content/CMS, keep the
existing routes + SEO, keep it accessible + fast + mobile-safe, keep the Vercel deploy working (update
the config if you introduce a build step).

**Working method:**
1. Study the live site + the backend, then tell me your chosen **stack and approach** and your concept
   for the **3D-crest hero** before building everything.
2. Build the **homepage first as the flagship** that establishes the new design language. Show it to me
   and confirm direction.
3. Then roll the language across every page in `SITEMAP.md`, and redesign the admin.
4. Keep it deployable to Vercel throughout.

Start now by reading `REDESIGN-BRIEF.md`, then come back to me with your stack + hero concept.
