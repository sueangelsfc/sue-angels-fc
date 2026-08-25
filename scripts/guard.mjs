#!/usr/bin/env node
/* ==========================================================================
   WHAT THE DEPLOY REFUSES TO PUBLISH

   The deploy runs `sync && build && verify`. `verify` reconciles the derived
   figures against the published league table, which is a real check and is
   not a check on the OUTPUT: every page could be generated with a broken
   share image and the deploy would be perfectly happy. That is not
   hypothetical - all forty-three share cards shipped pointing at the host
   `co.ukundefined` for weeks, because `drawnCover()` read a `CLUB.url` that
   does not exist, and nothing between the mistake and production looked.

   `npm test` is the thorough answer and is deliberately NOT the deploy's gate:
   most of it is budgets, and a page that grew two kilobytes must never stop
   the club publishing a result. So this is the narrow middle. Every assertion
   here is something that is unambiguously BROKEN rather than merely
   regrettable, computed over the generated files, and fast.

   The rule for adding to this file: if a reasonable person could look at the
   failure and say "that is a judgement call", it belongs in `npm test`, not
   here. Nothing in this file is a judgement call.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const problems = [];
const note = [];
const bad = (what, detail) => problems.push(`${what}${detail ? ` - ${detail}` : ''}`);

/* WHAT COUNTS AS OUTPUT. The repo root also holds scraped third-party pages,
   recovery copies and tooling caches, and none of those is something this site
   publishes. Guarding them produced three hundred failures about a WordPress
   plugin's flag icons, which is exactly the kind of noise that gets a gate
   switched off. The generator is the authority on what it wrote: every route
   it emits is in the sitemap, plus the handful of pages deliberately kept out
   of it. */
const SKIP_DIR = /^(node_modules|src|scripts|migrations|assets|api|coverage|recovery)$|^\./;
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.test(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
};

/* Anything the generator did not write is not ours to judge. `build.mjs`
   emits a manifest of its own routes for exactly this reason. */
const manifestPath = path.join(ROOT, 'src', 'data', 'build-manifest.json');
let pages;
if (fs.existsSync(manifestPath)) {
  const routes = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).routes || [];
  pages = routes.map((r) => path.join(ROOT, r)).filter((f) => fs.existsSync(f));
  if (pages.length !== routes.length) {
    bad('the build listed routes it did not write', `${routes.length - pages.length} missing`);
  }
} else {
  pages = walk(ROOT);
}
pages = pages.sort();
if (pages.length < 50) bad('the build produced almost no pages', `${pages.length} html files`);

const rel = (p) => path.relative(ROOT, p);
const exists = (u) => fs.existsSync(path.join(ROOT, u.replace(/^\//, '').split(/[?#]/)[0]));

/* Keyed BY BUNDLE. The first version watched `sa.css` and `sa.js` alone, and
   the home page loads neither - it is on `home.css`, which is the split this
   project made on purpose. A version check that cannot see the busiest page's
   stylesheet is not a version check. */
const versions = new Map();
let checkedLinks = 0;

for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8');
  const where = rel(p);

  /* 1. A page that did not render. */
  if (html.length < 400) bad('page is essentially empty', where);

  /* 2. A template that leaked. `undefined`, `[object Object]` and `NaN` in
        shipped markup are never intentional - the gallery shipped literal
        [object Object] under 624 photographs for exactly this reason. */
  /* CASE-SENSITIVE, AND BOUNDED. The first version matched case-insensitively
     and reported three failures on Christopher FerNANdes - a player, on his
     own page, with his name spelled correctly. A gate that fails on a real
     surname is a gate somebody removes, and it would have been removed before
     it ever caught the thing it is for. */
  for (const leak of ['undefined', '[object Object]', 'NaN']) {
    const body = leak.replace(/[[\]]/g, '\\$&');
    /* The leak may be the WHOLE value (`alt="undefined"`), not only embedded
       in it, so the character before it is optional. The first version
       required one and so missed the commonest shape of the bug. */
    const re = new RegExp(`(?:src|href|content|alt|srcset)="(?:[^"]*[^A-Za-z"])?${body}(?![A-Za-z])[^"]*"`);
    const m = re.exec(html);
    if (m) bad(`a template leaked ${leak} into an attribute`, `${where}: ${m[0].slice(0, 90)}`);
  }

  /* 3. Every image says what it is. Missing entirely is a defect; alt="" is a
        decision this file does not second-guess. */
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    if (!/\balt\s*=/.test(tag)) bad('an image has no alt attribute at all', `${where}: ${tag.slice(0, 80)}`);
  }

  /* 4. Local assets and links resolve. */
  for (const m of html.matchAll(/(?:src|href)="(\/[^"#?]*)"/g)) {
    const u = m[1];
    if (/^\/(api|_)/.test(u)) continue;
    checkedLinks += 1;
    if (u.endsWith('/')) continue;
    if (!exists(u) && !exists(u + '.html') && !exists(path.join(u, 'index.html'))) {
      bad('a link or asset points at something that is not there', `${where} -> ${u}`);
    }
  }

  /* 5. Absolute URLs must name this site, not a host built by accident. */
  for (const m of html.matchAll(/(?:content|href|src)="(https?:\/\/[^"]+)"/g)) {
    const host = (/^https?:\/\/([^/]+)/.exec(m[1]) || [, ''])[1];
    if (/undefined|NaN|\.co\.uk[a-z]/i.test(host)) {
      bad('an absolute URL has a host that was built by accident', `${where} -> ${m[1].slice(0, 80)}`);
    }
  }

  /* 6. One asset version across every page. Mixed versions were a recurring
        production bug: half the site styled by the old sheet. */
  for (const m of html.matchAll(/\/([\w.-]+\.(?:css|js))\?v=([a-z0-9]+)/g)) {
    if (!versions.has(m[1])) versions.set(m[1], new Set());
    versions.get(m[1]).add(m[2]);
  }

  /* 7. Nothing that must never be published. */
  if (/service_role/.test(html)) bad('a service-role key reached shipped output', where);
}

for (const [file, vs] of versions) {
  if (vs.size > 1) {
    bad('pages disagree about which version of a bundle they load',
      `${file}: ${[...vs].join(', ')}`);
  }
}
note.push(`${versions.size} versioned bundles, one version each`);

/* 8. The share cards the build committed must actually be on disk, because a
      card referenced and absent is worse than the generic one: it is a broken
      image in every preview. */
let coversRef = 0;
for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8');
    /* A share card is quoted as an ABSOLUTE url in og:image and as a relative
       one in a card, and the first version of this only understood the second
       - so the match pages, which are the whole reason the cards exist, were
       not checked at all. Both forms, reduced to a path. */
  for (const m of html.matchAll(/(?:https?:\/\/[^"'()\s]*?)?(\/assets\/covers\/[^"')\s]+)/g)) {
    coversRef += 1;
    if (!exists(m[1])) bad('a share card is referenced but not on disk', `${rel(p)} -> ${m[1]}`);
  }
}
note.push(`${pages.length} pages, ${checkedLinks} local links, ${coversRef} share cards`);

/* 9. The sitemap must not advertise a page that is not there. */
const smPath = path.join(ROOT, 'sitemap.xml');
if (fs.existsSync(smPath)) {
  const sm = fs.readFileSync(smPath, 'utf8');
  const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  let missing = 0;
  for (const u of urls) {
    const p = u.replace(/^https?:\/\/[^/]+/, '') || '/';
    if (p === '/' ) continue;
    if (!exists(p) && !exists(p + '.html') && !exists(path.join(p, 'index.html'))) missing += 1;
  }
  if (missing) bad('the sitemap advertises pages that were not generated', `${missing} of ${urls.length}`);
  note.push(`${urls.length} sitemap urls`);
}

console.log('\n=== GUARD: is this output publishable? ===');
note.forEach((n) => console.log('  ' + n));
if (!problems.length) {
  console.log('\nNothing here would ship broken.\n');
  process.exit(0);
}
console.log(`\n${problems.length} problem(s) that must not be published:\n`);
problems.slice(0, 40).forEach((p) => console.log('  - ' + p));
if (problems.length > 40) console.log(`  ... and ${problems.length - 40} more`);
console.log('');
process.exit(1);
