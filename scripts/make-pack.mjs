#!/usr/bin/env node
/* ==========================================================================
   SPONSORSHIP PACK -> PDF

     npm run pack

   Renders src/pack/pack.html to assets/sue-angels-sponsorship-pack.pdf with
   headless Chrome. The previous pack existed only as a committed binary, so a
   typo in it could not be fixed without rebuilding the whole thing by hand.

   It serves the repo over a throwaway port rather than using file://, because
   the page loads the crest, the team photograph and the variable font by
   absolute path, and file:// resolves those against the filesystem root.
   ========================================================================== */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { buildDataset } from '../src/lib/dataset.mjs';
import { teamSummary, biggestWin, longestRun } from '../src/lib/stats.mjs';
import { CLUB } from '../src/lib/club.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'assets', 'sue-angels-sponsorship-pack.pdf');

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => { try { fs.accessSync(p, fs.constants.X_OK); return true; } catch { return false; } });

if (!CHROME) {
  console.error('No Chrome or Chromium found. Install one, or edit the CHROME list above.');
  process.exit(1);
}

/* ---- The figures, derived ----------------------------------------------
   The site's one inviolable rule is that no page hard-codes a number. A pack
   that a prospect reads next to the website has to obey it too, or the two
   drift the moment a result is added. Same engine, same dataset. */
const d = buildDataset();
const leagueGames = d.played.filter((m) => m.competition === CLUB.division);
const league = teamSummary(leagueGames);
const ourRow = (d.table || []).find((r) => r.us);
const nextBest = (d.table || []).slice().sort((a, b) => a.goalsAgainst - b.goalsAgainst)
  .find((r) => !r.us);
const big = biggestWin(leagueGames.filter((m) => !m.weAreHome)) || biggestWin(leagueGames);
const bigH = biggestWin(leagueGames.filter((m) => m.weAreHome));
const shortClub = (n) => String(n || '').replace(/\s+FC( 2\.0)?$/, '');

const FIGURES = {
  played: league.played,
  won: league.won,
  winPct: league.winPct,
  conceded: ourRow ? ourRow.goalsAgainst : league.goalsAgainst,
  cleanSheets: league.cleanSheets,
  gaGap: ourRow && nextBest ? nextBest.goalsAgainst - ourRow.goalsAgainst : '',
  csRun: longestRun(leagueGames, (m) => m.theirGoals === 0, { goalRecordOnly: true }),
  bigWin: big ? `${big.ourGoals}-${big.theirGoals} away at ${shortClub(big.opponent)}` : '',
  bigHome: bigH ? `${bigH.ourGoals}-${bigH.theirGoals} at home against ${shortClub(bigH.opponent)}` : '',
};

const missing = [];
const render = (html) => html.replace(/\{\{(\w+)\}\}/g, (m, k) => {
  if (!(k in FIGURES) || FIGURES[k] === '' || FIGURES[k] === undefined) { missing.push(k); return m; }
  return String(FIGURES[k]);
});

const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const full = path.join(ROOT, rel);
  if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  if (full.endsWith('pack.html')) {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(render(fs.readFileSync(full, 'utf8')));
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(full)] || 'application/octet-stream' });
  fs.createReadStream(full).pipe(res);
});

/* Port 0: the OS picks a free one, so a dev server already running does not
   collide with this. */
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

/* --virtual-time-budget lets the font and the two photographs settle before
   the print snapshot; without it the first render can go out unstyled. */
const args = [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  '--virtual-time-budget=6000',
  '--no-pdf-header-footer',
  `--print-to-pdf=${OUT}`,
  `http://127.0.0.1:${PORT}/src/pack/pack.html`,
];

const code = await new Promise((resolve) => {
  const p = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => { err += d; });
  p.on('close', (c) => {
    if (c !== 0) console.error(err.split('\n').filter((l) => /error/i.test(l)).slice(0, 5).join('\n'));
    resolve(c);
  });
});

server.close();

if (code !== 0 || !fs.existsSync(OUT)) {
  console.error(`Pack render failed (exit ${code}).`);
  process.exit(1);
}

/* An unresolved token would ship as a literal {{played}} in a document that
   goes to businesses, so it fails the run rather than warning quietly. */
if (missing.length) {
  console.error(`Unresolved placeholders in pack.html: ${[...new Set(missing)].join(', ')}`);
  process.exit(1);
}

const kb = fs.statSync(OUT).size / 1024;
console.log(`PACK complete -> assets/sue-angels-sponsorship-pack.pdf (${kb.toFixed(0)} KB)`);
console.log(`derived: P${FIGURES.played} W${FIGURES.won} ${FIGURES.winPct}% · `
  + `${FIGURES.conceded} conceded (${FIGURES.gaGap} fewer than next best) · ${FIGURES.cleanSheets} clean sheets`);
if (kb > 6000) console.warn(`  warning: ${kb.toFixed(0)}KB is large for an emailed pack.`);
