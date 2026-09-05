/* ==========================================================================
   DRAW THE SHARE COVERS

     node scripts/make-covers.mjs          only the ones that are missing
     node scripts/make-covers.mjs --all    redraw every one

   Writes assets/covers/<id>.jpg for every match report and every article, and
   the output is COMMITTED, exactly like the generated HTML. The deploy does
   not run this: Vercel's build has no browser, and a deploy that needed one
   would be a deploy that could fail for a reason nothing on this site can fix.

   THE CONSEQUENCE, SAID OUT LOUD: a match published from the panel has no
   cover of its own until somebody runs this. It does not break - build.mjs
   falls back to the generic card the way it always has - but the share image
   for that one match is generic until then. `npm run covers` is the whole
   job, and it says which ones it drew.

   Chrome is asked for a full-page screenshot at exactly 1200x630, which is
   the size the card is laid out at, so nothing is scaled. `sips` converts to
   JPEG because a PNG of this is about five times the size for no visible
   difference at the size these are actually looked at.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { execFileSync, spawn } from 'node:child_process';
import { buildDataset } from '../src/lib/dataset.mjs';
import { matchCover, articleCover, COVER_W, COVER_H } from '../src/lib/cover-art.mjs';
import { articleSlug } from '../src/templates/news.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'assets', 'covers');
const TMP = path.join(ROOT, '.covers-tmp');
/* Outside the repository, so a run that is interrupted does not leave a
   60MB browser profile sitting in the project. */
const PROFILE = path.join(os.tmpdir(), 'sa-covers-profile');
const ALL = process.argv.includes('--all');

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
].find((p) => fs.existsSync(p));

if (!CHROME) {
  console.error('No Chrome found. The covers already committed are untouched.');
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

/* A server rather than file:// URLs, because the cards reference the crest,
   the opponent badges and the two variable fonts by absolute path and file://
   resolves those against the temp directory. */
const TYPES = {
  '.html': 'text/html', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = url.startsWith('/.covers-tmp/')
    ? path.join(ROOT, url)
    : path.join(ROOT, url.replace(/^\//, ''));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end(); return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;

const d = buildDataset();

/* An opponent's badge resolves the same way it does on the site: an uploaded
   row, then the extra registry, then the recovered one, then a needle. Only
   Mala Vida has none, and a card with a missing image is worse than one that
   never asked for it, so it falls back to the club's own mark. */
const badgeFor = (name) => {
  const b = d.badges && d.badges[name];
  const src = b && (b.src || b);
  return typeof src === 'string' && src ? `/${src.replace(/^\//, '')}` : '/assets/badge/sue-angels-badge-star.webp';
};

const jobs = [];
for (const m of d.matches || []) {
  if (!m.played) continue;
  /* A REAL PHOTOGRAPH BEATS A DRAWN CARD, and drawing one anyway is not
     harmless. The page correctly ships the stored photograph, so the card is
     never used - but the build seeds the panel from "does a card exist on
     disk", which then disagreed with the pages: 39 records seeded as drawn
     against 38 pages actually shipping one. The panel's own ensure() already
     skips these; this script did not. */
  if (m.detail && m.detail.cover) continue;
  jobs.push({ id: m.id, html: matchCover(m, badgeFor), what: `${m.opponent} ${m.ourScoreline}` });
}
for (const a of d.articles || []) {
  jobs.push({ id: `a-${articleSlug(a)}`, html: articleCover(a), what: a.title.slice(0, 46) });
}

let drew = 0;
let kept = 0;
for (const job of jobs) {
  const jpg = path.join(OUT, `${job.id}.jpg`);
  if (!ALL && fs.existsSync(jpg)) { kept += 1; continue; }

  const htmlPath = path.join(TMP, `${job.id}.html`);
  fs.writeFileSync(htmlPath, job.html);
  const png = path.join(TMP, `${job.id}.png`);

  /* CHROME DOES NOT EXIT, so waiting for it is waiting for ever. With an
     old-headless screenshot it writes the file and then sits there holding
     the profile, and execFileSync blocks until its own timeout - forty-three
     of those is a script that never finishes and never says why. It also has
     to have `--user-data-dir` of its own: without one the launch hands the
     URL to the Chrome the person at this machine already has open and waits
     for a window that is never going to appear.

     `--headless=new` is not the answer either. On this machine it tries to
     open a display link, fails with CVDisplayLinkCreateWithCGDisplay, and
     hangs in a different place. The old flag draws correctly.

     So: start it, wait for the file to appear, kill it. */
  const child = spawn(CHROME, [
    '--headless', '--disable-gpu', '--hide-scrollbars',
    `--user-data-dir=${PROFILE}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    `--window-size=${COVER_W},${COVER_H}`,
    '--virtual-time-budget=5000',
    `--screenshot=${png}`,
    `http://localhost:${PORT}/.covers-tmp/${job.id}.html`,
  ], { stdio: 'ignore' });

  for (let i = 0; i < 60 && !fs.existsSync(png); i += 1) {
    await new Promise((r) => setTimeout(r, 250));
  }
  /* A moment for the write to finish before it is read. */
  if (fs.existsSync(png)) await new Promise((r) => setTimeout(r, 150));
  child.kill();

  if (!fs.existsSync(png)) {
    console.error(`  could not draw ${job.id}`);
    continue;
  }
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', png, '--out', jpg],
    { stdio: 'ignore' });
  drew += 1;
  console.log(`  ${job.id}  ${job.what}`);
}

server.close();
fs.rmSync(TMP, { recursive: true, force: true });
fs.rmSync(PROFILE, { recursive: true, force: true });

const bytes = fs.readdirSync(OUT).filter((f) => f.endsWith('.jpg'))
  .reduce((t, f) => t + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`\ndrew ${drew}, kept ${kept}, ${fs.readdirSync(OUT).length} covers, `
  + `${(bytes / 1024 / 1024).toFixed(1)}MB total`);
if (!ALL && kept) console.log('Pass --all to redraw the ones that already exist.');
