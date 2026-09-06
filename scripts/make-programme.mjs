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

const BRAND = {
  ink: '#0d0d0f', paper: '#ffffff', warm: '#fff8f3',
  orange: '#ff7034', deep: '#7a2d00', rule: '#d8d0c8', mute: '#4a4a4e',
};

/* THE CLUB'S COLOURS, ON PAPER.

   The first version was black on white and the club's word for it was bland,
   which was fair: this is the one thing the club hands out and it looked like
   a spreadsheet. Orange is the only accent hue on the website and it is the
   only one here.

   `print-color-adjust: exact` is the whole trick. Without it a browser drops
   every background when printing, so a black cover prints white with white
   text on it, which is worse than plain. */
const PRINT_TOKENS = `
  :root {
    --fg: ${BRAND.ink}; --ink-1: ${BRAND.ink}; --ink-2: ${BRAND.mute}; --ink-3: #6b6b70;
    --line-d: ${BRAND.rule}; --line-l: #ece5de; --slab: ${BRAND.warm}; --slab-top: #fff;
    --volt: ${BRAND.deep}; --volt-rgb: 122,45,0; --lift: 0,0,0;
    --r: 10px; --r-sm: 7px; --pillr: 999px; --wrap: 100%;
    --display: "Archivo", "Helvetica Neue", Helvetica, Arial, sans-serif;
    --ui: "Geist", "Helvetica Neue", Helvetica, Arial, sans-serif;
    --body: "Geist", "Helvetica Neue", Helvetica, Arial, sans-serif;
  }
  *, *::before, *::after {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body { margin: 0; font-family: var(--body); color: ${BRAND.ink}; background: #fff;
    font-size: 10.5pt; line-height: 1.5; }
  .wrap { max-width: none; padding: 0; }
  .sec { padding-block: 0.45rem; }
  h1, h2, h3 { font-family: var(--display); color: ${BRAND.ink}; margin: 0 0 0.4rem; }
  .h2 { font-size: 15.5pt; margin-block-start: 0.3rem; padding-block-end: 0.25rem;
    border-block-end: 2px solid ${BRAND.orange}; }
  .volt { color: ${BRAND.orange}; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .xrail { display: flex; justify-content: space-between; font-size: 7.5pt;
    letter-spacing: 0.1em; text-transform: uppercase; color: ${BRAND.deep};
    font-weight: 600; margin-block-end: 4px; }
  a { color: ${BRAND.ink}; text-decoration: none; }
  img { max-width: 100%; }
  p { margin: 0 0 0.55rem; }
`;

const COVER_CSS = `
  /* A PHOTOGRAPH, THE CLUB'S NAME UP THE SPINE, AND THE FIXTURE AT THE FOOT.
     The shape every matchday programme has: the picture carries the page, the
     wordmark is the brand, and the details sit where somebody looks last.
     The photograph is darkened rather than trusted to be dark, because the
     club's own match photography is whatever the weather was. */
  .pc {
    page-break-after: always;
    position: relative;
    margin: 0;
    padding: 0;
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    background: ${BRAND.ink};
    color: #fff;
  }
  /* The photograph and its wash sit UNDER everything: the spine stripe, the
     wordmark and the fixture are all painted over them, and without a stated
     order the absolutely-positioned image covered the orange stripe. */
  .pc__shot {
    position: absolute; inset: 0; z-index: 0;
    width: 100%; height: 100%;
    object-fit: cover;
    object-position: 60% 30%;
  }
  .pc__wash {
    position: absolute; inset: 0; z-index: 1;
    background:
      linear-gradient(to right, ${BRAND.ink} 0%, rgba(13,13,15,0.86) 26%, rgba(13,13,15,0.20) 62%, rgba(13,13,15,0.55) 100%),
      linear-gradient(to top, ${BRAND.ink} 4%, rgba(13,13,15,0.0) 42%);
  }
  .pc::before {
    content: ""; position: absolute; left: 0; top: 0; bottom: 0;
    width: 7mm; background: ${BRAND.orange}; z-index: 2;
  }
  .pc__spine {
    position: absolute; z-index: 3;
    left: 13mm; bottom: 92mm;
    transform-origin: left bottom;
    transform: rotate(-90deg);
    margin: 0;
    font-family: var(--display);
    font-weight: 800;
    font-size: 46pt;
    letter-spacing: -0.02em;
    line-height: 0.9;
    color: #fff;
    white-space: nowrap;
    text-transform: uppercase;
  }
  .pc__head {
    position: absolute; z-index: 3; top: 12mm; right: 12mm; left: 26mm;
    display: flex; justify-content: space-between; align-items: baseline;
  }
  .pc__official {
    margin: 0; font-size: 8.5pt; letter-spacing: 0.2em;
    text-transform: uppercase; color: #fff; text-align: right; flex: 1;
  }
  .pc__season {
    margin: 0 0 0 6mm; font-family: var(--display); font-size: 11pt; color: ${BRAND.orange};
  }
  .pc__foot { position: absolute; z-index: 3; left: 26mm; right: 12mm; bottom: 14mm; }
  .pc__badges { display: flex; gap: 5mm; align-items: center; margin-block-end: 5mm; }
  .pc__badge { display: block; width: 17mm; }
  .pc__badge img, .pc__badge svg { width: 100%; height: auto; }
  .pc__opp {
    margin: 0 0 2mm; font-family: var(--display); font-weight: 800;
    font-size: 24pt; line-height: 1; color: #fff; text-transform: uppercase;
  }
  .pc__when { margin: 0 0 1mm; font-size: 10pt; color: ${BRAND.orange};
    letter-spacing: 0.04em; text-transform: uppercase; }
  .pc__where { margin: 0; font-size: 9.5pt; color: #cfc9c3; }
`;


const PRINT_RULES = `
  @page { size: A4; margin: 13mm 12mm; }
  @page :first { margin: 0; }
  /* The website's own cover band is replaced by the front page above it, so
     only its fact table is kept. */
  .pr-cover { text-align: left; padding-block: 0 0.5rem; }
  /* Page one carries no @page margin, so the first section after the cover
     supplies its own top space rather than starting hard against the trim. */
  .pc + .sec { padding-block-start: 4mm; }
  .pr-cover__title, .pr-cover__teams, .pr-cover .eyebrow, .pr-cover__where { display: none; }
  .pr-facts, .pr-h2h { border-color: ${BRAND.rule}; background: ${BRAND.warm}; }
  .pr-facts > div, .pr-h2h > div { background: ${BRAND.warm}; }
  .pr-facts dd, .pr-h2h dd { color: ${BRAND.ink}; font-size: 13pt; }
  .pr-facts dt, .pr-h2h dt { color: ${BRAND.deep}; }
  .pr-byline { color: ${BRAND.deep}; font-size: 8.5pt; letter-spacing: 0.1em;
    text-transform: uppercase; margin-block-end: 0.8rem; }
  .nw-art__h { font-family: var(--display); font-size: 12.5pt; color: ${BRAND.ink};
    margin: 0.9rem 0 0.35rem; padding-block-start: 0.35rem;
    border-block-start: 1px solid ${BRAND.rule}; }
  /* The article is four thousand words and MUST be allowed to flow across
     pages. Without this it is one unbreakable block: it cannot fit on what is
     left of page two, so it is pushed whole to page three and page two is a
     fact table with two thirds of it empty. */
  .pr-notes, .pr-band { page-break-inside: auto; }
  .pr-cover { page-break-after: avoid; }
  .pr-notes p { text-align: justify; hyphens: auto; }
  .pr-notes strong { color: ${BRAND.deep}; }
  .pr-group__h, .pr-partner__role { color: ${BRAND.deep}; }
  .pr-quiz__a summary { display: none; }
  .pr-quiz__a p { display: block; color: ${BRAND.deep}; font-weight: 600; }
  .pr-partner { background: ${BRAND.warm}; border-color: ${BRAND.rule}; }
  .pr-partner__mark { background: #fff; border: 1px solid ${BRAND.rule}; }
  .pr-ws__grid td { border-color: #8a8a8e; color: ${BRAND.ink}; }
  .pr-read, .pr-save, .pr-get { display: none; }
  .pr-quiz li, .pr-partner, .pr-group, .pr-ws, .pr-facts, .pr-h2h { page-break-inside: avoid; }
`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${doc.title}</title>
<style>${PRINT_TOKENS}</style><style>${band}</style><style>${COVER_CSS}</style><style>${PRINT_RULES}</style>
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
