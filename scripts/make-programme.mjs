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
    --paper: ${BRAND.ink};
    --fg: #f4f1ee; --ink-1: #f4f1ee; --ink-2: #c3bdb7; --ink-3: #918b86;
    --line-d: #33343a; --line-l: #26272c; --slab: #17181c; --slab-top: #1d1e23;
    --volt: ${BRAND.orange}; --volt-rgb: 255,112,52; --lift: 255,255,255;
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
  html { background: ${BRAND.ink}; }
  body {
    margin: 0; font-family: var(--body); color: #f4f1ee; background: ${BRAND.ink};
    font-size: 10.2pt; line-height: 1.55;
  }
  .wrap { max-width: none; padding: 0; }
  .sec { padding-block: 0.35rem 0.9rem; }
  h1, h2, h3, h4 { font-family: var(--display); color: #fff; margin: 0 0 0.4rem; }
  .h2 {
    font-size: 16pt; margin-block-start: 0.2rem; padding-block-end: 0.3rem;
    border-block-end: 2.5px solid ${BRAND.orange}; color: #fff;
  }
  .volt { color: ${BRAND.orange}; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .xrail {
    display: flex; justify-content: space-between; font-size: 7.5pt;
    letter-spacing: 0.16em; text-transform: uppercase; color: ${BRAND.orange};
    font-weight: 700; margin-block-end: 5px;
  }
  .xrail__n { margin-inline-end: 7px; opacity: 0.65; }
  a { color: ${BRAND.orange}; text-decoration: none; }
  img { max-width: 100%; }
  p { margin: 0 0 0.5rem; }
  b, strong { color: #fff; }

  /* ---- The long read ---- */
  .pg-h3 {
    font-size: 11.5pt; color: ${BRAND.orange}; margin: 0.9rem 0 0.45rem;
    padding-block-start: 0.35rem; border-block-start: 1px solid var(--line-d);
    letter-spacing: 0.02em; text-transform: uppercase;
  }
  .pg-player { margin-block-end: 0.7rem; page-break-inside: avoid; }
  .pg-player__name { font-size: 12pt; color: #fff; margin: 0 0 0.15rem; }
  .pg-club { margin-block-end: 0.7rem; page-break-inside: avoid; }
  .pg-runs { list-style: none; margin: 0 0 0.8rem; padding: 0; }
  .pg-runs li {
    padding: 0.42rem 0; border-block-start: 1px solid var(--line-d);
    color: var(--ink-2); page-break-inside: avoid;
  }
  .pg-runs li b { color: #fff; }

  /* ---- Charts ---- */
  .pg-chart { margin: 0.6rem 0 1rem; page-break-inside: avoid; }
  .pg-chart svg { width: 100%; height: auto; display: block; }
  .pg-chart figcaption {
    font-size: 8pt; letter-spacing: 0.1em; text-transform: uppercase;
    color: ${BRAND.orange}; margin-block-start: 0.3rem;
  }
  .pg-chart__k { fill: #d8d3ce; font-family: var(--ui); font-size: 11px; }
  .pg-chart__v { fill: ${BRAND.orange}; font-family: var(--ui); font-size: 11px; font-weight: 700; }
  .pg-chart__bar { fill: ${BRAND.orange}; }
  .pg-rib--w { fill: ${BRAND.orange}; }
  .pg-rib--d { fill: #6a6b72; }
  .pg-rib--l { fill: #33343a; }
  .pg-rib--n { fill: #1d1e23; }

  /* A crest beside a club name, and the heading has to become a flex row to
     hold it without the badge pushing the text off its baseline. */
  .pg-h3--crest { display: flex; align-items: center; gap: 3mm; }
  .pg-crest { display: inline-block; width: 9mm; flex: 0 0 auto; }
  .pg-crest img, .pg-crest svg { width: 100%; height: auto; display: block; }
  .h2 .pg-crest { width: 11mm; vertical-align: middle; margin-inline-end: 3mm; }
  .h2 { display: flex; align-items: center; gap: 0; flex-wrap: wrap; }

  /* The club's own match reports: the only prose in here a person wrote. */
  .pg-report { margin-block-end: 1.1rem; }
  .pg-report__meta {
    font-size: 8pt; letter-spacing: 0.12em; text-transform: uppercase;
    color: ${BRAND.orange}; margin-block-end: 0.5rem;
  }
  .pg-report .nw-art__h {
    font-family: var(--display); font-size: 11pt; color: #fff;
    margin: 0.7rem 0 0.3rem; border: 0; padding: 0;
  }
  .pg-answers { color: #e9e5e1; margin: 0 0 0.9rem; padding-left: 1.2rem; }
  .pg-answers li { padding: 0.22rem 0; }
  .pr-quiz__where {
    font-size: 8.5pt; letter-spacing: 0.1em; text-transform: uppercase;
    color: ${BRAND.orange}; margin: 0.2rem 0 0;
  }
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
  @page { size: A4; margin: 13mm 12mm; background: ${BRAND.ink}; }
  @page :first { margin: 0; }
  /* The whole document is on the club's black, so the page box has to be
     painted too: a body background alone leaves white gutters in the margins
     of every page after the first. */
  html, body { background: ${BRAND.ink} !important; }
  .pr-cover { text-align: left; padding-block: 0 0.5rem; }
  .pr-cover__title, .pr-cover__teams, .pr-cover .eyebrow, .pr-cover__where { display: none; }
  .pr-facts, .pr-h2h { border-color: var(--line-d); background: var(--slab); }
  .pr-facts > div, .pr-h2h > div { background: var(--slab); }
  .pr-facts dd, .pr-h2h dd { color: #fff; font-size: 13pt; }
  .pr-facts dt, .pr-h2h dt { color: ${BRAND.orange}; }
  .pr-lede, .pr-note { color: var(--ink-2); }
  .pr-group__h, .pr-partner__role { color: ${BRAND.orange}; }
  .pr-names a { color: #f4f1ee; }
  .pr-quiz li { border-block-end-color: var(--line-d); }
  .pr-quiz__q { color: #fff; }
  .pr-quiz__a summary { display: none; }
  .pr-quiz__a p { display: block; color: ${BRAND.orange}; font-weight: 700; }
  .pr-partner { background: var(--slab); border-color: var(--line-d); }
  .pr-partner__name { color: #fff; }
  .pr-partner__trade, .pr-partner__say { color: var(--ink-2); }
  .pr-partner__mark { background: #fff; border: 1px solid var(--line-d); }
  .pr-ws__grid td { border-color: #43444b; color: #f4f1ee; }
  .pr-list li { border-block-start-color: var(--line-d); color: var(--ink-2); }
  .pr-list li b { color: #fff; }
  .pr-read, .pr-save, .pr-get, .pr-arch { display: none; }
  .pr-quiz li, .pr-partner, .pr-group, .pr-ws, .pr-facts, .pr-h2h { page-break-inside: avoid; }

  /* EVERY PIECE OF TEXT, STATED. Inheriting from body was not enough: the
     band stylesheet is written for a page that loads home.css, and several of
     its rules resolve against tokens that mean something else here. Rather
     than chase which one wins, the document says what colour its text is and
     stops relying on cascade it cannot see. Unreadable body copy on a black
     page is the failure that matters most in a document nobody can adjust. */
  .sec p, .sec li, .sec dd, .sec td, .sec figcaption,
  .pg-runs li, .pr-list li, .pg-player p, .pg-club p {
    color: #e9e5e1;
  }
  .sec dt { color: ${BRAND.orange}; }
  .sec h1, .sec h2, .sec h3, .sec h4 { color: #ffffff; }
  .pg-h3 { color: ${BRAND.orange}; }
  .sec b, .sec strong { color: #ffffff; }
  .sec a { color: ${BRAND.orange}; }
  .pr-lede { color: #ded9d4; }
  .pr-note, .pg-chart figcaption { color: #a9a39d; }
  .pg-chart figcaption { color: ${BRAND.orange}; }
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
