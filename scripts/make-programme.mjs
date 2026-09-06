/* ==========================================================================
   THE MATCH PROGRAMME, AS A PDF

   The club's decision: a programme is a thing you take away. So the page is a
   cover, a contents list and a button, and this is what the button points at.

   CHROME'S CLI, NOT THE DEVTOOLS PROTOCOL, for exactly the reasons written
   into make-covers.mjs and paid for there: `--headless=new` hangs on this
   machine trying to open a display link, a launch without `--user-data-dir`
   hands the URL to whatever Chrome the person already has open and waits for
   a window that never appears, and Chrome does not exit after doing the job.
   So: start it, wait for the file, kill it.

   THE DEPLOY CANNOT RUN THIS. Vercel's build has no browser, which is why the
   output is committed like the drawn share cards, and why the page checks for
   the file rather than assuming it: a fixture whose programme nobody has made
   offers no download instead of a dead link.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { buildDataset } from '../src/lib/dataset.mjs';
import { programmeDoc } from '../src/templates/programme.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'assets', 'programme');
const TMP = path.join(ROOT, '.programme-tmp');
const PROFILE = path.join(os.tmpdir(), 'sa-programme-profile');
const ALL = process.argv.includes('--all');

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  process.env.CHROME_PATH,
].filter(Boolean).find((p) => fs.existsSync(p));

if (!CHROME) {
  console.error('No Chrome found. Install one, or set CHROME_PATH.');
  process.exit(2);
}

const d = buildDataset();
const m = d.nextFixture;
if (!m) {
  console.log('No fixture to come, so there is no programme to make.');
  process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const doc = programmeDoc(d);
/* THE PDF GETS ITS OWN STYLESHEET, NOT THE SITE'S.

   The first version loaded home.css and produced a 22MB file: that sheet is
   built for a dark, animated page and drags in every font weight and every
   atmospheric layer, none of which belongs on paper and all of which Chrome
   embeds. A programme nobody can send in a WhatsApp group is not a programme.

   So: the page band, which is the layout, plus a small block declaring the
   tokens it reads in ink rather than in neon. An undefined custom property
   deletes its whole declaration, so these have to be stated or the cards lose
   their borders and the grid loses its lines. */
const band = fs.readFileSync(path.join(ROOT, 'src', 'styles-home', 'pages', '45-programme.css'), 'utf8');

const PRINT_TOKENS = `
  :root {
    --fg: #111; --ink-1: #111; --ink-2: #444; --ink-3: #666;
    --line-d: #c9c9c9; --line-l: #e6e6e6; --slab: #fafafa; --slab-top: #fff;
    --volt: #d1490d; --volt-rgb: 209,73,13; --lift: 0,0,0;
    --r: 10px; --r-sm: 7px; --pillr: 999px; --wrap: 100%;
    --display: "Archivo", Helvetica, Arial, sans-serif;
    --ui: "Geist", Helvetica, Arial, sans-serif;
    --body: "Geist", Helvetica, Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: var(--body); color: #111; background: #fff;
    font-size: 10.5pt; line-height: 1.45; }
  .wrap { max-width: none; padding: 0; }
  .sec { padding-block: 0.45rem; }
  h1, h2, h3 { font-family: var(--display); color: #111; margin: 0 0 0.4rem; }
  .h2 { font-size: 15pt; margin-block-start: 0.2rem; }
  .volt { color: var(--volt); }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .xrail { display: flex; justify-content: space-between; font-size: 7.5pt;
    letter-spacing: 0.08em; text-transform: uppercase; color: #777;
    border-block-start: 1px solid var(--line-d); padding-block-start: 4px;
    margin-block-end: 6px; }
  .xrail__n { margin-inline-end: 6px; }
  a { color: #111; text-decoration: none; }
  img { max-width: 100%; }
`;

const PRINT_RULES = `
  @page { size: A4; margin: 13mm 12mm; }
  .pr-cover { text-align: center; padding-block: 0 0.6rem; }
  .pr-cover__title { font-size: 22pt; margin: 0.2em 0 0.5em; }
  .pr-team__badge { width: 74px; }
  .pr-team__name { font-size: 12pt; }
  .pr-quiz__a summary { display: none; }
  .pr-quiz__a p { display: block; }
  .pr-partner__mark { background: #fff; border: 1px solid var(--line-d); }
  .pr-quiz li, .pr-partner, .pr-group, .pr-ws, .pr-facts, .pr-h2h { page-break-inside: avoid; }
  .pr-cover { page-break-after: avoid; }
  .pr-ws__grid td { border-color: #555; }
`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${doc.title}</title>
<style>${PRINT_TOKENS}</style><style>${band}</style><style>${PRINT_RULES}</style>
</head><body class="is-home is-sub is-programme">
${doc.cover}${doc.body}
</body></html>`;

const file = `${m.id}.html`;
fs.writeFileSync(path.join(TMP, file), html);

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(ROOT, url);
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    res.writeHead(404).end(); return;
  }
  const ext = path.extname(p);
  const types = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;

const pdf = path.join(OUT, `${m.id}.pdf`);
if (!ALL && fs.existsSync(pdf)) {
  console.log(`  kept ${m.id}.pdf (pass --all to redraw)`);
  server.close();
  process.exit(0);
}
fs.rmSync(pdf, { force: true });

const child = spawn(CHROME, [
  '--headless', '--disable-gpu', '--hide-scrollbars',
  `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--virtual-time-budget=8000',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdf}`,
  `http://localhost:${PORT}/.programme-tmp/${file}`,
], { stdio: 'ignore' });

for (let i = 0; i < 100 && !fs.existsSync(pdf); i += 1) {
  await new Promise((r) => setTimeout(r, 250));
}
if (fs.existsSync(pdf)) await new Promise((r) => setTimeout(r, 400));
child.kill();
server.close();
fs.rmSync(TMP, { recursive: true, force: true });

if (!fs.existsSync(pdf)) {
  console.error(`  could not make ${m.id}.pdf`);
  process.exit(1);
}
const kb = Math.round(fs.statSync(pdf).size / 1024);
console.log(`  ${m.id}.pdf  ${doc.title}  ${kb}KB`);
