---
name: static-react-no-build
description: Use to build or reason about a fast static website using React via CDN with NO bundler or build step, a Supabase data layer, and Vercel hosting. The architecture pattern behind the club site. Triggers on "no build step", "react via cdn", "static site architecture", "supabase frontend", "vercel static".
---

# Static React, No Build

A site architecture that is fast, cheap, durable, and editable by non-developers — because nothing has to compile.

## The shape
- **One HTML file per route.** Each loads, in order: fonts → `app.css` → React + ReactDOM (UMD, pinned versions) → data/util scripts → the app script, then renders into a single root element.
- **One app script** holds every page component plus header/footer/router (the router picks the component by URL filename). Hand-written `React.createElement` — no JSX transform at runtime. Keep a `.jsx` source if you like, but **the compiled `.js` is what ships** (and tends to drift, so treat the `.js` as source of truth).
- **A data/defaults script** (`PageShell.js`-style) holds static seed data and built-in defaults, merged with cloud data at runtime.
- **A thin data layer** wraps **Supabase** behind `window.*` getters/setters with a localStorage cache. Content tables are public-read / admin-write (RLS); sign-up tables (supporters, enquiries) are write-only for anon. A separate CMS page (kept on its own in-browser-Babel stack) does the admin writes.

## The rules that keep it alive
- **Cache-busting is mandatory.** Host JS/CSS with `immutable, max-age=1yr`, and bump `?v=N` on the asset's `<script>`/`<link>` across **every** HTML file when you change it. Forgetting this ships stale code — the #1 footgun.
- **No bundler, ever.** No minifier, no framework, no build command. Files deploy exactly as they sit. Do not "helpfully" add tooling — it breaks the model.
- **Deploy = git push.** Vercel (framework "Other", no build) auto-deploys `main`. Verify live by polling the domain for the new `?v=`.
- **Performance baked in:** preconnect to the data host, preload the hero font + image (`fetchpriority=high`), `defer` non-critical scripts, WebP with fallback, a CSS-only "boot" placeholder so first paint is instant.
- **Accessibility + mobile:** `lang` on `<html>`, real buttons/links, `alt` on meaningful images, and grids that never overflow (`repeat(auto-fill, minmax(min(100%, Npx), 1fr))`, `min-width:0` on flex children).

## Why it wins for clubs
No build to break, no monthly framework churn, free hosting tiers, and a volunteer can edit content in a CMS while the structure stays rock solid. Pair with **football-website-builder** for the full club build.
