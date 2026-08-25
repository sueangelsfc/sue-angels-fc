/* ==========================================================================
   PULL THE DIVISION'S TABLE FROM FA FULL-TIME

   Run by .github/workflows/league-table.yml on a Sunday afternoon, and by
   hand with `node scripts/pull-league-table.mjs`.

   IT PREPARES, IT DOES NOT PUBLISH. It writes the rows into
   src/data/league-eight-2627.json and stops. The workflow around it runs the
   build, the verify and the suite, and opens a pull request. Nothing reaches
   the live site without somebody looking, because `npm run verify` reconciles
   the League Ten table against that division's ninety transcribed results and
   there are no League Eight results on record to check a new table against.
   The usual guard does not exist yet, so a person is the guard.

   IT WOULD RATHER WRITE NOTHING THAN WRITE SOMETHING WRONG. Every exit that
   is not a clean parse leaves the file untouched and says why:

     0  wrote a new table, or found nothing had changed
     3  blocked (Cloudflare) - report it, do not retry, do not evade
     4  fetched but could not find a table on the page
     5  found a table that does not add up

   A wrong league table on a club's own website is worse than a stale one: a
   stale table is last week's truth and everybody can see the date on it.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fulltimeLinks } from '../src/lib/fulltime.mjs';
import { clubIdentity } from '../src/lib/club-name.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'src', 'data', 'league-eight-2627.json');

const die = (code, msg) => { console.error(msg); process.exit(code); };
const say = (msg) => console.log(msg);

/* ---- The page ----------------------------------------------------------- */
export function findTable(html) {
  /* The division page carries three tables: a plain one and two that split
     home from away. Take the one whose header is exactly the ten columns of a
     league table, rather than the first one on the page, because which comes
     first is Full-Time's layout decision and not a promise to us. */
  const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
  for (const t of html.match(/<table[\s\S]*?<\/table>/gi) || []) {
    const rows = (t.match(/<tr[\s\S]*?<\/tr>/gi) || [])
      .map((r) => (r.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) || []).map(strip));
    /* EXACTLY TEN COLUMNS, and GD and PTS where a league table puts them.

       "Starts with Pos, Team and has at least ten columns" is not specific
       enough: the split tables carry a second header row reading
       Pos|Team|P|W|D|L|F|A|... across TWENTY columns, six of which are the
       home half, so a loose test matches the wrong table and silently
       publishes home-only figures as the standing. Caught by testing the
       parser against a fixture with the split table placed first. */
    const head = rows.find((r) => r.length === 10
      && /^pos$/i.test(r[0] || '') && /^(team|club)$/i.test(r[1] || '')
      && /^gd$/i.test(r[8] || '') && /^pts$/i.test(r[9] || ''));
    if (!head) continue;
    const body = rows.filter((r) => r !== head && r.length === 10 && /^\d+$/.test(r[0] || ''));
    if (body.length) return body;
  }
  return null;
}

/* ---- Does it add up? ---------------------------------------------------- */
export function toRows(cells, knownClubs) {
  const n = (x) => {
    const v = Number(String(x).replace(/[+\s]/g, ''));
    return Number.isFinite(v) ? v : null;
  };
  const rows = cells.map((c) => ({
    p: n(c[0]), c: c[1], pl: n(c[2]), w: n(c[3]), d: n(c[4]), l: n(c[5]),
    gf: n(c[6]), ga: n(c[7]), gd: n(c[8]), pts: n(c[9]),
  }));
  const problems = [];
  for (const r of rows) {
    const where = `${r.p} ${r.c}`;
    for (const k of ['p', 'pl', 'w', 'd', 'l', 'gf', 'ga', 'gd', 'pts']) {
      if (r[k] == null) problems.push(`${where}: ${k} is not a number`);
    }
    if (!r.c) problems.push(`${where}: no club name`);
    if (r.w + r.d + r.l !== r.pl) problems.push(`${where}: W+D+L (${r.w + r.d + r.l}) is not P (${r.pl})`);
    if (r.gf - r.ga !== r.gd) problems.push(`${where}: GF-GA (${r.gf - r.ga}) is not GD (${r.gd})`);
    /* A points deduction is real and the club would want to know, so it is
       reported and NOT treated as a parse failure. */
    const expect = (r.w * 3) + r.d;
    if (r.pts !== expect) say(`  note: ${where} has ${r.pts} points where 3W+D is ${expect} - a deduction, or a parse worth checking`);
  }
  /* Every club must be one this division is known to contain. A name that is
     not on the list means either a club nobody recorded or the wrong
     division, and both are reasons to stop. */
  const known = new Map(knownClubs.map((k) => [clubIdentity(k), k]));
  for (const r of rows) {
    if (!known.has(clubIdentity(r.c))) problems.push(`${r.c} is not a club recorded in this division`);
  }
  return { rows, problems };
}

/* ---- Main --------------------------------------------------------------- */
const same = (a, b) => JSON.stringify(a || []) === JSON.stringify(b || []);

async function main() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const links = fulltimeLinks(data.fulltime);
  if (!links) die(4, 'No FA Full-Time ids on record for this division, so there is nothing to fetch.');

  say(`Reading ${links.table}`);
  let res; let html;
  try {
    res = await fetch(links.table, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
    });
    html = await res.text();
  } catch (e) {
    die(3, `Could not reach FA Full-Time: ${e.message}`);
  }

  if (res.status === 403 || /Attention Required|cf-error|Cloudflare/i.test(html)) {
    die(3, `FA Full-Time returned ${res.status} and a Cloudflare block page.\n`
      + 'Not retrying and not working around it. Ask for the table to be pasted in instead.');
  }
  if (!res.ok) die(3, `FA Full-Time returned ${res.status}.`);

  const cells = findTable(html);
  if (!cells) die(4, 'Fetched the page but found no league table on it. The markup may have changed.');

  const { rows, problems } = toRows(cells, data.clubs || []);
  if (problems.length) {
    die(5, `The table does not add up, so nothing was written:\n  - ${problems.join('\n  - ')}`);
  }
  say(`Parsed ${rows.length} rows.`);

  if (same(rows, data.table)) { say('No change since the last run.'); process.exit(0); }

  /* --dry-run answers one question - can this machine read the page at all -
     without touching the record. Worth having because the interesting failure
     is a network one, and finding that out on the first Sunday of the season
     is finding it out too late. */
  if (process.argv.includes('--dry-run')) {
    say(`Would have written ${rows.length} rows. Dry run, so nothing was changed.`);
    for (const r of rows) say(`  ${String(r.p).padStart(2)}  ${r.c.padEnd(34)} P${r.pl} W${r.w} D${r.d} L${r.l}  ${r.gf}-${r.ga}  ${r.pts}pts`);
    process.exit(0);
  }

  data.table = rows;
  data._tableRead = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(FILE, `${JSON.stringify(data, null, 2)}\n`);
  say(`Wrote ${rows.length} rows to src/data/league-eight-2627.json.`);
  for (const r of rows) say(`  ${String(r.p).padStart(2)}  ${r.c.padEnd(34)} P${r.pl} W${r.w} D${r.d} L${r.l}  ${r.gf}-${r.ga}  ${r.pts}pts`);
  say('CHANGED');
}

if (process.argv[1] && process.argv[1].endsWith('pull-league-table.mjs')) await main();
