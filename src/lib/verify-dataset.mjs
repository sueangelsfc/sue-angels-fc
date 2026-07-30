/* Verifies the derived stats engine against independently-known truth:
   the published League Ten table row for Sue's Angels. If the engine's
   League Ten figures do not match that row exactly, something is wrong and
   no page should publish a number. */
import { buildDataset } from './dataset.mjs';
import { teamSummary, leaderboard, clubRecords, formGuide, homeAwaySplit, byCompetition } from './stats.mjs';

const d = buildDataset();
let fails = 0;
const check = (label, actual, expected) => {
  const ok = String(actual) === String(expected);
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: got ${actual}${ok ? '' : `, expected ${expected}`}`);
};

console.log('=== DATASET ===');
console.log(`matches=${d.matches.length} played=${d.played.length} fixtures=${d.fixtures.length}`);
console.log(`squad=${d.squad.length} players(with stats rows)=${d.players.length} coaches=${d.coaches.length}`);
console.log(`articles=${d.articles.length} galleries=${d.galleries.length} recognition=${d.recognition.length}`);
console.log(`table rows=${d.table.length} leagueScorers=${d.leagueScorers.length}`);
console.log(`orphan Supabase match details (id not in results baseline)=${d.orphanDetails.length}`,
  d.orphanDetails.length ? d.orphanDetails.join(', ') : '');
console.log(`matches with detail records: ${d.matches.filter((m) => m.detail).length}/${d.matches.length}`);

console.log('\n=== VERIFY vs PUBLISHED LEAGUE TABLE ROW ===');
const ourRow = d.table.find((r) => r.us);
console.log('published row:', JSON.stringify(ourRow));

const leagueMatches = d.played.filter((m) => m.competition === 'League Ten');
const ls = teamSummary(leagueMatches);
console.log('derived League Ten:', JSON.stringify({
  played: ls.played, won: ls.won, drawn: ls.drawn, lost: ls.lost,
  gf: ls.goalsFor, ga: ls.goalsAgainst, gd: ls.goalDifference,
}));

check('league played', ls.played, ourRow.played);
check('league won', ls.won, ourRow.won);
check('league drawn', ls.drawn, ourRow.drawn);
check('league lost', ls.lost, ourRow.lost);
check('league goals for', ls.goalsFor, ourRow.goalsFor);
check('league goals against', ls.goalsAgainst, ourRow.goalsAgainst);
check('league goal difference', ls.goalDifference, ourRow.goalDifference);
check('league points', ls.points, ourRow.points);
console.log(`  (of which ${ls.walkovers} walkovers, ${ls.onGoalRecord} with a goal record)`);

console.log('\n=== ALL COMPETITIONS ===');
const all = teamSummary(d.played);
console.log(JSON.stringify(all, null, 1));
console.log('\nby competition:');
for (const c of byCompetition(d.played)) {
  console.log(`  ${c.competition.padEnd(24)} P${c.played} W${c.won} D${c.drawn} L${c.lost} GF${c.goalsFor} GA${c.goalsAgainst}`);
}
console.log('\nhome/away:', JSON.stringify(homeAwaySplit(d.played), null, 1).slice(0, 400));
console.log('\nform:', formGuide(d.played).map((f) => f.outcome).join(' '));

console.log('\n=== PLAYER LEADERBOARDS (derived) ===');
const fmt = (rows, k) => rows.map((r) => `${r.name} ${r[k]}`).join(', ');
console.log('goals  :', fmt(leaderboard(d.players, 'goals', 6), 'goals'));
console.log('assists:', fmt(leaderboard(d.players, 'assists', 6), 'assists'));
console.log('apps   :', fmt(leaderboard(d.players, 'apps', 6), 'apps'));
console.log('motm   :', fmt(leaderboard(d.players, 'motm', 6), 'motm'));

console.log('\n=== CROSS-CHECK: derived goals vs league scorer chart ===');
for (const s of d.leagueScorers.filter((r) => r.us).slice(0, 6)) {
  const mine = d.players.find((p) => p.name === s.name);
  const note = mine
    ? `derived ${mine.goals}g ${mine.assists}a in ${mine.apps} starts (all comps)`
    : 'NOT FOUND in squad';
  console.log(`  league chart: ${s.name} ${s.goals}g ${s.assists}a in ${s.apps} apps  |  ${note}`);
}

console.log('\n=== CLUB RECORDS (derived) ===');
for (const r of clubRecords(d.played, d.players)) console.log(`  ${String(r.value).padEnd(7)} ${r.label} - ${r.who}`);

console.log('\n=== SQUAD POSITION INFERENCE ===');
for (const g of ['gk', 'def', 'mid', 'fwd']) {
  const list = d.squad.filter((p) => p.positionGroup === g);
  console.log(`  ${g}: ${list.length} - ${list.map((p) => `${p.num} ${p.last}(${p.positionCode || '?'})`).join(', ')}`);
}
const noPos = d.squad.filter((p) => !p.positionCode);
console.log(`  no position evidence: ${noPos.length}`, noPos.map((p) => `${p.num} ${p.last}`).join(', '));
const noPhoto = d.squad.filter((p) => !p.hasPhoto);
console.log(`  without photograph: ${noPhoto.length}/${d.squad.length}`);

console.log(`\n${fails === 0 ? 'ALL CHECKS PASSED' : `${fails} CHECK(S) FAILED`}`);
process.exit(fails === 0 ? 0 : 1);
