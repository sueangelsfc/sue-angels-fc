/* 9:16 STORY COVERS, FOR THE PHONE AND NOT FOR THE SITE.
   One 1080x1920 card per article or match report, written to a folder the
   club can post from. They are NOT committed and nothing on the site links
   them: a share card is the og:image and lives in assets/covers, while this
   is a picture somebody puts on a story, so putting it in the repository
   would be weight the website carries for a thing the website never serves.

   Chrome's CLI, not the DevTools protocol, for the reasons make-covers.mjs
   and make-programme.mjs already paid for: `--headless=new` hangs on this
   machine, a launch with no `--user-data-dir` hands the URL to the Chrome
   the person already has open, and Chrome does not exit afterwards. Start
   it, wait for the file, kill it.

   Usage: node scripts/make-stories.mjs <out-dir> <slug|match-id> [...]     */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { buildDataset } from '../src/lib/dataset.mjs';

const ROOT = process.cwd();
const PROFILE = path.join(os.tmpdir(), 'sa-stories-profile');
const TMP = path.join(ROOT, '.stories-tmp');
const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  process.env.CHROME_PATH,
].filter(Boolean).find((p) => p && fs.existsSync(p));
if (!CHROME) { console.error('No Chrome found. Set CHROME_PATH.'); process.exit(2); }

const [outDir, ...wanted] = process.argv.slice(2);
if (!outDir || !wanted.length) {
  console.error('usage: node scripts/make-stories.mjs <out-dir> <slug|match-id> [...]');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const d = buildDataset();
const esc = (s) => String(s == null ? '' : s)
  /* The club's own name is stored with a straight apostrophe in some records
     and a typographic one in others, and a card showing Sue's beside Sue’s
     is the site disagreeing with itself in the largest type it ever sets. */
  .replace(/'/g, '\u2019')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* What each card says. A match report leads with the scoreline, because the
   scoreline is the news; an article leads with its headline. */
/* The badge registry is keyed by the name as stored, and a match's own
   `home`/`away` are not always that spelling (`TSM Rovers` against the
   registry's `TSM Rovers FC`), so an exact lookup silently draws nothing.
   Reduced forms, the way oppBadge() matches. Our own side takes the orange
   badge: the registry's shield is the old volt crest. */
const reduce = (s) => String(s || '').toLowerCase()
  .replace(/\b(fc|afc|football club|men's|mens)\b/g, '').replace(/[^a-z0-9]/g, '');
const BADGES = new Map(Object.entries(d.badges || {}).map(([k, v]) => [reduce(k), v]));
function badgeFor(club) {
  if (reduce(club) === reduce("Sue's Angels FC")) return 'assets/badge/sue-angels-badge-orange.png';
  const b = BADGES.get(reduce(club));
  return b && b.src;
}

function cardFor(key) {
  /* THE PROGRAMME. Not a report and not an article: the news is that a file
     exists to download, so the card carries the fixture rather than a result,
     and what is inside it is read from the same file the programme PAGE reads
     rather than typed here. Two sources for one list is how a story comes to
     promise a page the document does not hold. */
  if (key === 'programme') {
    const f = d.nextFixture;
    if (!f) return null;
    let inside = [];
    try {
      const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/programme-contents.json'), 'utf8'));
      inside = (((c.fixtures || {})[f.id] || {}).items || []).slice(0, 3);
    } catch { inside = []; }
    return {
      file: `programme-${f.id}.jpg`,
      eyebrow: 'Matchday programme',
      home: esc(f.home), away: esc(f.away),
      homeBadge: badgeFor(f.home), awayBadge: badgeFor(f.away),
      vs: true,
      inside: inside.map(esc),
      sub: esc([f.venue, f.kickoff || '10:30'].filter(Boolean).join(' \u00b7 ')),
      foot: 'suesangelsfc.co.uk/programme.html',
      date: esc(f.date || ''),
    };
  }
  const m = (d.played || []).find((x) => x.id === key || x.slug === key);
  if (m) {
    const nameOf = (n) => (d.players || []).find((p) => p.num === n);
    /* The scorers, in the order they scored, a man with two goals named once.
       Surnames only: a story is read at arm's length on a phone. */
    const seen = [];
    for (const g of (m.detail && m.detail.goals) || []) {
      const p = nameOf(g.num);
      const who = p ? (p.last || p.name) : 'Sue\u2019s Angels';
      const row = seen.find((x) => x.who === who);
      const min = g.min || g.minute;
      if (row) row.mins.push(min); else seen.push({ who, mins: [min] });
    }
    const ours = seen.map((x) => `${esc(x.who)} ${x.mins.filter(Boolean).map((v) => `${v}\u2032`).join(', ')}`.trim());
    const theirs = ((m.detail && m.detail.opponentGoals) || [])
      .map((g) => `${esc(g.name || m.opponent)} ${g.minute ? `${g.minute}\u2032` : ''}`.trim());
    return {
      file: `${m.slug}.jpg`,
      eyebrow: `Match report \u00b7 ${esc(m.competition || '')}`.replace(/ \u00b7 $/, ''),
      home: esc(m.home), away: esc(m.away),
      homeBadge: badgeFor(m.home), awayBadge: badgeFor(m.away),
      hs: m.hs, as: m.as, ours, theirs,
      sub: esc(m.venue || ''),
      foot: `suesangelsfc.co.uk/matches/${m.slug}.html`,
      date: esc(m.date || ''),
    };
  }
  const a = (d.articles || []).find((x) => x.slug === key || x.key === key);
  if (!a) return null;
  /* THE ARTICLE'S OWN FIGURES, READ OFF THE ARTICLE. A piece carrying a
     figure strip - `= 18 | Points, and first` - has already decided which
     three numbers it leads on, so the card takes those rather than being
     given its own. Two sources for one figure is how a story comes to
     advertise a number the page it links to does not print.

     THE FIRST RUN ONLY, and at most three. A later strip in the same piece
     is a detail of a section; the first is the piece's headline figures. A
     card with six numerals on it is a card nobody reads at arm's length. */
  const figs = [];
  for (const line of String(a.lede || a.body || '').split('\n')) {
    const m2 = /^=\s*([^|]+)\|\s*(.+)$/.exec(line.trim());
    if (m2) { figs.push({ v: esc(m2[1].trim()), k: esc(m2[2].trim()) }); continue; }
    if (figs.length && line.trim()) break;
  }
  return {
    file: `${a.slug}.jpg`,
    eyebrow: a.category === 'Interview' || /Interview/i.test(a.cat || '') ? 'Interview' : 'Club news',
    title: esc(a.title),
    figs: figs.slice(0, 3),
    foot: `suesangelsfc.co.uk/news/${a.slug}.html`,
    date: esc(a.date || ''),
  };
}

const page = (c) => `<!doctype html><html><head><meta charset="utf-8">
<style>
@font-face{font-family:Archivo;src:url('/assets/fonts/Archivo-Variable.woff2')format('woff2');font-weight:100 900;font-display:block}
@font-face{font-family:Geist;src:url('/assets/fonts/Geist-Variable.woff2')format('woff2');font-weight:100 900;font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;background:#000;overflow:hidden}
.bg{position:absolute;inset:0;
  background:radial-gradient(900px 900px at 86% 6%,rgba(255,112,52,.5),transparent 62%),
             radial-gradient(760px 760px at 6% 98%,rgba(255,112,52,.26),transparent 64%),#000;}
.grain{position:absolute;inset:0;opacity:.05;
  background-image:repeating-linear-gradient(0deg,#fff 0 1px,transparent 1px 3px)}
/* Instagram draws its own furniture over the top ~220px and bottom ~250px of
   a story, so the padding is not symmetry: it is keeping the crest and the
   address out from under it. The middle block takes the slack. */
.in{position:absolute;inset:0;display:flex;flex-direction:column;
  padding:132px 96px 96px}
.mid{flex:1;display:flex;flex-direction:column;justify-content:center}
.crest{width:150px;height:auto;display:block}
.eyebrow{margin-top:54px;font-family:Geist;font-weight:700;font-size:28px;
  letter-spacing:.24em;text-transform:uppercase;color:#FF7034}
.title{font-family:Archivo;font-weight:500;font-size:104px;line-height:1.02;
  letter-spacing:-.035em;font-variation-settings:'wdth' 108;color:#FFF8F3}
.rule{width:132px;height:5px;background:#FF7034;margin:52px 0 0}
.date{font-family:Geist;font-weight:700;font-size:26px;letter-spacing:.2em;
  text-transform:uppercase;color:rgba(255,248,243,.42)}
/* The address is not printed. A story carries a link STICKER, which the club
   places itself and which Instagram draws over the bottom of the frame, so a
   typed URL is both unclickable and the thing most likely to be covered.
   This is the room it goes in: nothing is drawn here on purpose. */
.sticker{height:300px}
/* The match card: the two badges either side of the scoreline, home on the
   left the way the score is written, and the scorers underneath, because a
   story that says only 6-1 makes the reader open the page to learn nothing. */
.score{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:40px}
.side{display:flex;flex-direction:column;align-items:center;gap:28px}
.badge{width:220px;height:220px;object-fit:contain}
.club{font-family:Archivo;font-weight:600;font-size:34px;line-height:1.14;
  letter-spacing:-.01em;text-align:center;color:#FFF8F3;max-width:300px}
.nums{font-family:Archivo;font-weight:600;font-size:170px;line-height:.9;
  letter-spacing:-.05em;font-variation-settings:'wdth' 100;color:#fff;white-space:nowrap}
.scorers{margin-top:84px;border-top:2px solid rgba(255,248,243,.16);padding-top:48px;
  display:flex;flex-direction:column;gap:38px}
.sc{font-family:Geist;font-size:40px;line-height:1.26;color:rgba(255,248,243,.9)}
.sc i{display:block;margin-bottom:12px;font-style:normal;color:#FF7034;font-weight:700;
  font-size:25px;letter-spacing:.22em;text-transform:uppercase}
.sc--them{color:rgba(255,248,243,.56)}
.nums--v{font-size:120px;font-weight:500;color:#FF7034;text-transform:lowercase}
.venue{margin-top:48px;font-family:Geist;font-size:32px;color:rgba(255,248,243,.5)}
/* THE FIGURES AN ARTICLE LEADS ON, under the headline. Three at most, in a
   row, each a numeral and the words that say what it counts - the same pair
   the piece prints, at the size a story is read at. The hairline above every
   figure is the rule the headline already sits on, continued. */
.figs{display:grid;grid-template-columns:repeat(3,1fr);gap:40px;margin-top:92px}
.fig{display:flex;flex-direction:column;gap:18px;padding-top:30px;
  border-top:3px solid rgba(255,112,52,.42)}
.fig b{font-family:Archivo;font-weight:600;font-size:106px;line-height:.86;
  letter-spacing:-.04em;font-variation-settings:'wdth' 100;color:#FF7034}
.fig i{font-family:Geist;font-style:normal;font-weight:700;font-size:25px;
  line-height:1.32;letter-spacing:.11em;text-transform:uppercase;
  color:rgba(255,248,243,.62)}
</style></head><body>
<div class="bg"></div><div class="grain"></div>
<div class="in">
  <div><img class="crest" src="/assets/badge/sue-angels-badge-orange.png" alt="">
    <div class="eyebrow">${c.eyebrow}</div></div>
  <div class="mid">
    ${c.vs ? `
      <div class="score">
        <div class="side"><img class="badge" src="/${c.homeBadge}" alt=""><div class="club">${c.home}</div></div>
        <div class="nums nums--v">v</div>
        <div class="side"><img class="badge" src="/${c.awayBadge}" alt=""><div class="club">${c.away}</div></div>
      </div>
      <div class="scorers">
        ${c.inside.length ? `<div class="sc"><i>Inside the issue</i>${c.inside.join('<br>')}</div>` : ''}
      </div>
      ${c.sub ? `<div class="venue">${c.sub}</div>` : ''}`
    : c.hs == null ? `<div class="title">${c.title}</div><div class="rule"></div>${(c.figs || []).length ? `<div class="figs">${c.figs.map((f) => `<div class="fig"><b>${f.v}</b><i>${f.k}</i></div>`).join('')}</div>` : ''}` : `
      <div class="score">
        <div class="side"><img class="badge" src="/${c.homeBadge}" alt=""><div class="club">${c.home}</div></div>
        <div class="nums">${c.hs}&ndash;${c.as}</div>
        <div class="side"><img class="badge" src="/${c.awayBadge}" alt=""><div class="club">${c.away}</div></div>
      </div>
      <div class="scorers">
        ${c.ours.length ? `<div class="sc"><i>Our scorers</i>${c.ours.join(' &middot; ')}</div>` : ''}
        ${c.theirs.length ? `<div class="sc sc--them"><i>Theirs</i>${c.theirs.join(' &middot; ')}</div>` : ''}
      </div>
      ${c.sub ? `<div class="venue">${c.sub}</div>` : ''}`}
  </div>
  <div><div class="date">${c.date}</div><div class="sticker"></div></div>
</div></body></html>`;

const PORT = 4399;
const TYPES = { '.png': 'image/png', '.woff2': 'font/woff2', '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

let made = 0;
for (const key of wanted) {
  const c = cardFor(key);
  if (!c) { console.error(`  no article or match called ${key}`); continue; }
  const tmpFile = `s-${c.file.replace(/\.jpg$/, '')}.html`;
  fs.writeFileSync(path.join(TMP, tmpFile), page(c));
  const out = path.join(outDir, c.file);
  fs.rmSync(out, { force: true });
  const child = spawn(CHROME, [
    '--headless', '--disable-gpu', '--hide-scrollbars',
    `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--virtual-time-budget=6000',
    '--window-size=1080,1920', `--screenshot=${out}`,
    `http://localhost:${PORT}/.stories-tmp/${tmpFile}`,
  ], { stdio: 'ignore' });
  for (let i = 0; i < 80 && !fs.existsSync(out); i += 1) await new Promise((r) => setTimeout(r, 250));
  if (fs.existsSync(out)) await new Promise((r) => setTimeout(r, 300));
  child.kill();
  if (fs.existsSync(out)) { made += 1; console.log(`  ${c.file}`); }
  else console.error(`  could not draw ${c.file}`);
}
server.close();
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\ndrew ${made} of ${wanted.length} into ${outDir}`);
