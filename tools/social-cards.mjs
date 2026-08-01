#!/usr/bin/env node
/* ==========================================================================
   SOCIAL SHARE CARDS

     node tools/social-cards.mjs

   Every page shared the same og-default.png, so a link to the squad, a match
   report and the sponsorship page all unfurled identically. A share card is
   usually the only thing a person sees before deciding whether to click.

   Renders 1200x630 PNGs with headless Chrome from the real brand: the tokens
   out of src/styles-home, the self-hosted Geist, and the star crest. Run it
   after changing a card's copy; the output is committed like everything else
   the generator writes.

   Deliberately NOT part of `npm run build`. Spawning Chrome 25 times is slow,
   the cards change perhaps twice a season, and a build that needs a browser
   installed is a build that breaks on someone else's machine.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { CLUB } from '../src/lib/club.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'assets', 'social');
const TMP = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'sa-cards-'));

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
].find((p) => fs.existsSync(p));
if (!CHROME) {
  console.error('No Chrome found. Cards not regenerated; the committed ones still stand.');
  process.exit(1);
}

/* One card per shareable route, plus a fallback per detail family. `stat` is
   the line that makes the card worth looking at: a real number, not a slogan. */
export const CARDS = {
  'og-home': { eyebrow: 'League Ten champions', title: 'Sue’s Angels FC', stat: 'P18 W18 D0 L0 · Unbeaten · Promoted' },
  'og-about': { eyebrow: 'Our story', title: 'Built in her name.', stat: 'Founded 2025 · In memory of Susan Anne Martin' },
  'og-sepsis': { eyebrow: 'Our cause', title: 'We play for sepsis awareness.', stat: '48,000 lives lost a year in the UK' },
  'og-champions': { eyebrow: '25/26', title: 'Champions. Unbeaten.', stat: '18 played · 18 won · 90 scored · 54 points' },
  'og-awards': { eyebrow: 'Honours', title: 'Awards and honours.', stat: 'Best defensive record in League Ten history' },
  'og-sponsors': { eyebrow: 'Partnerships', title: 'Back the Angels.', stat: 'Shirt, matchday and player sponsorship' },
  'og-squad': { eyebrow: 'The squad', title: 'The players.', stat: 'Every player, every number, every season' },
  'og-stats': { eyebrow: 'Player stats', title: 'The numbers.', stat: 'Goals, assists and appearances, all derived' },
  'og-coaches': { eyebrow: 'The staff', title: 'The coaches.', stat: 'The people behind an unbeaten season' },
  'og-fixtures': { eyebrow: 'Fixtures', title: 'What’s next.', stat: 'League Eight · Sunday mornings · The Reeves' },
  'og-results': { eyebrow: 'Results', title: 'Every result.', stat: '33 matches · League and cups' },
  'og-league': { eyebrow: 'League table', title: 'Top of the table.', stat: 'League Ten 25/26 · 54 points from 18' },
  'og-records': { eyebrow: 'Club records', title: 'The record books.', stat: 'Goals, runs, clean sheets and club firsts' },
  'og-live': { eyebrow: 'Watch', title: 'Live and on replay.', stat: 'Free to watch · Nothing to sign up for' },
  'og-news': { eyebrow: 'Club news', title: 'Straight from the club.', stat: 'Match reports and announcements' },
  'og-gallery': { eyebrow: 'Matchday', title: 'The gallery.', stat: '606 photographs · 7 matchdays' },
  'og-videos': { eyebrow: 'Watch', title: 'Goals and highlights.', stat: 'Every clip the club has filmed' },
  'og-join': { eyebrow: 'Get involved', title: 'Join the club.', stat: 'Play · Volunteer · Shoot · Sponsor' },
  'og-contact': { eyebrow: 'Club information', title: 'Get in touch.', stat: 'The Reeves, Hanworth · Sunday mornings' },
  'og-404': { eyebrow: 'Error 404', title: 'Off target.', stat: 'That page does not exist' },
  /* Detail families: one card each, used when a page has no photograph. */
  'og-player': { eyebrow: 'Player profile', title: 'The squad.', stat: 'Goals, assists and appearances' },
  'og-match': { eyebrow: 'Match report', title: 'The result.', stat: 'Line-ups, goals and the report' },
  'og-default': { eyebrow: CLUB.division + ' champions', title: 'Sue’s Angels FC', stat: 'Sunday-league football, Hanworth' },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fontUrl = `file://${path.join(ROOT, 'assets/fonts/Geist-Variable.woff2')}`;
const crestUrl = `file://${path.join(ROOT, 'assets/badge/sue-angels-badge-star.webp')}`;

function html({ eyebrow, title, stat }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Geist;src:url('${fontUrl}') format('woff2');font-weight:100 900;font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#090B0D;font-family:Geist,sans-serif;
  position:relative;overflow:hidden;color:#F7F5F2}
/* The same drifting orange masses the site uses, held still for a still image. */
.a,.b,.c{position:absolute;border-radius:50%;filter:blur(90px)}
.a{width:900px;height:520px;left:-160px;top:-190px;background:rgba(255,106,42,.34)}
.b{width:760px;height:420px;right:-190px;bottom:-170px;background:rgba(255,106,42,.26)}
.c{width:420px;height:300px;left:44%;top:52%;background:rgba(255,154,102,.15)}
.wrap{position:relative;z-index:2;height:100%;padding:74px 80px;
  display:flex;flex-direction:column;justify-content:space-between}
.eyebrow{display:flex;align-items:center;gap:14px;
  font-size:19px;font-weight:700;letter-spacing:.19em;text-transform:uppercase;color:#FF8A52}
.eyebrow i{display:block;width:40px;height:2px;background:#FF6A2A}
h1{font-size:${title.length > 24 ? 74 : 96}px;font-weight:300;line-height:.94;
  letter-spacing:-.045em;max-width:15ch}
h1 b{font-weight:300;color:#FF6A2A}
.foot{display:flex;align-items:flex-end;justify-content:space-between;gap:40px}
.stat{font-size:25px;font-weight:500;letter-spacing:-.01em;color:#C9CFD5;max-width:40ch;line-height:1.35}
.badge{display:flex;align-items:center;gap:16px;flex:0 0 auto}
.badge img{width:88px;height:auto;display:block}
.badge span{font-size:22px;font-weight:700;letter-spacing:-.015em;color:#F7F5F2;white-space:nowrap}
.rule{position:absolute;left:80px;right:80px;bottom:168px;height:1px;background:rgba(255,255,255,.13);z-index:2}
</style></head><body>
<span class="a"></span><span class="b"></span><span class="c"></span>
<span class="rule"></span>
<div class="wrap">
  <p class="eyebrow"><i></i>${esc(eyebrow)}</p>
  <h1>${esc(title).replace(/([.!?])$/, '<b>$1</b>')}</h1>
  <div class="foot">
    <p class="stat">${esc(stat)}</p>
    <p class="badge"><img src="${crestUrl}" alt=""><span>suesangelsfc.co.uk</span></p>
  </div>
</div></body></html>`;
}

fs.mkdirSync(OUT, { recursive: true });
/* Skip cards that already exist unless --force. Chrome takes about ten seconds
   a card and occasionally hangs on one; without this, a stall means starting
   the whole set again. */
const FORCE = process.argv.includes('--force');
let made = 0;
let skipped = 0;
for (const [name, card] of Object.entries(CARDS)) {
  if (!FORCE && fs.existsSync(path.join(OUT, `${name}.jpg`))) { skipped++; continue; }
  const file = path.join(TMP, `${name}.html`);
  fs.writeFileSync(file, html(card));
  const png = path.join(TMP, `${name}.png`);
  execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--hide-scrollbars', '--force-prefers-reduced-motion',
    '--window-size=1200,630', '--default-background-color=00000000',
    '--virtual-time-budget=2500',
    `--screenshot=${png}`, `file://${file}`,
  ], { stdio: 'ignore' });
  /* Chrome only writes PNG. These cards are a full-bleed orange gradient, which
     is the worst case for PNG (150KB each, 3.5MB for the set) and the best case
     for JPEG. Quality 88 is visually identical at share-card size. */
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '88',
    png, '--out', path.join(OUT, `${name}.jpg`)], { stdio: 'ignore' });
  const kb = (fs.statSync(path.join(OUT, `${name}.jpg`)).size / 1024).toFixed(0);
  console.log(`  ${name}.jpg  ${kb}KB`);
  made++;
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${made} share cards written to assets/social/${skipped ? `, ${skipped} already present (use --force to redo)` : ''}`);
