/* ==========================================================================
   DATASET ASSEMBLY
   Turns the recovered evidence (production PageShell data + live Supabase
   rows) into one canonical in-memory dataset that both the generator and the
   control panel read. Single source of truth for every published figure.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { POSITION_GROUPS, POSITION_LABEL } from './club.mjs';
import { normaliseMatch, normaliseTable, playerStats, slugify, isUs, seasonOf } from './stats.mjs';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));

/* Position is not stored on the squad record; it is inferred from where the
   player actually lines up across real match records, which is more accurate
   than a static label. Falls back to the goalkeeper flag. */
function inferPositions(matches) {
  const tally = new Map();
  for (const m of matches) {
    for (const s of m.detail?.starters || []) {
      if (!tally.has(s.num)) tally.set(s.num, new Map());
      for (const code of s.positions || []) {
        const t = tally.get(s.num);
        t.set(code, (t.get(code) || 0) + 1);
      }
    }
    for (const b of m.detail?.bench || []) {
      if (!tally.has(b.num)) tally.set(b.num, new Map());
      for (const code of b.positions || []) {
        const t = tally.get(b.num);
        t.set(code, (t.get(code) || 0) + 0.5);
      }
    }
  }
  const out = new Map();
  for (const [num, codes] of tally) {
    const ranked = [...codes.entries()].sort((a, b) => b[1] - a[1]);
    const top = ranked[0]?.[0];
    if (!top) continue;
    const group = POSITION_GROUPS.find((g) => g.codes.includes(top))?.key || 'mid';
    out.set(num, { code: top, label: POSITION_LABEL[top] || top, group, all: ranked.map((r) => r[0]) });
  }
  return out;
}

export function buildDataset() {
  const ps = read('recovered-pageshell.json');
  const live = read('recovered-live.json');

  /* ---- Match detail records, keyed by match id ---- */
  const detailById = new Map();
  for (const row of live.matches || []) detailById.set(row.key, row.data);

  /* ---- Matches ---- */
  const rawResults = ps.SEASON_RESULTS || [];
  const matches = rawResults.map((r) => normaliseMatch(r, detailById.get(r.id) || null));

  // Any Supabase match detail whose id is missing from the results baseline
  // would otherwise be invisible. Surface it rather than dropping it.
  const knownIds = new Set(matches.map((m) => m.id));
  const orphanDetails = [...detailById.keys()].filter((k) => !knownIds.has(k));

  const played = matches.filter((m) => m.played);
  const fixtures = matches.filter((m) => !m.played);

  /* ---- Squad ---- */
  const posByNum = inferPositions(matches);
  const bios = ps.PLAYER_BIOS || {};
  const photoKeys = new Set((live.player_photos || []).map((p) => String(p.key)));

  const squad = (ps.SQUAD || []).map((p) => {
    const name = `${p.first} ${p.last}`.trim();
    const pos = posByNum.get(p.num);
    const isGk = p.gk || pos?.code === 'GK';
    return {
      num: p.num,
      first: p.first,
      last: p.last,
      name,
      slug: slugify(name),
      gk: isGk,
      position: isGk ? 'Goalkeeper' : pos?.label || 'Squad player',
      positionCode: isGk ? 'GK' : pos?.code || '',
      positionGroup: isGk ? 'gk' : pos?.group || 'mid',
      positionsPlayed: pos?.all || [],
      bio: bios[p.num] || bios[name] || null,
      hasPhoto: photoKeys.has(String(p.num)),
      status: p.status || 'active',
    };
  });

  /* ---- Player statistics (derived) ---- */
  const players = playerStats(matches, squad);
  const statsByNum = new Map(players.map((p) => [p.num, p]));
  const nameFor = (num) => statsByNum.get(num)?.name || `No. ${num}`;

  /* ---- Coaches ---- */
  const coaches = (ps.COACHES || []).map((c) => ({
    ...c,
    slug: c.id || slugify(c.name),
    bio: Array.isArray(c.bio) ? c.bio : c.bio ? [c.bio] : [],
  }));

  /* ---- League ---- */
  const table = normaliseTable(ps.RAW_TABLE);
  const leagueScorers = (ps.LEAGUE_STATS?.all || []).map((r) => ({
    pos: r.pos, name: r.name, club: r.club, goals: r.g, assists: r.a, apps: r.ap, us: !!r.us || isUs(r.club),
  }));
  const leagueResults = (ps.LEAGUE_RESULTS || []);

  /* ---- Articles ---- */
  const articles = (live.articles || [])
    .map((row) => {
      const d = row.data || {};
      return {
        key: row.key,
        id: d.id || row.key,
        title: d.title || d.h || 'Untitled',
        slug: slugify(d.title || d.h || row.key),
        category: d.cat || 'News',
        date: d.date || '',
        iso: d.iso || null,
        lede: d.lede || '',
        body: d.body || d.text || '',
        cover: d.cover || d.img || '',
        author: d.author || "Sue's Angels FC",
        updatedAt: row.updated_at,
      };
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  /* ---- Recognition ---- */
  const recognition = [
    ...(live.recognition || []).map((row) => ({ key: row.key, ...(row.data || {}), source: 'cloud' })),
    ...(ps.SA_DEFAULT_RECOGNITION || []).map((r) => ({ ...r, source: 'baseline' })),
  ];

  /* ---- Galleries ---- */
  const galleries = (live.gallery || []).map((row) => {
    const d = row.data || {};
    return {
      key: row.key,
      id: d.id || row.key,
      title: d.title || 'Album',
      slug: slugify(d.title || row.key),
      category: d.category || 'Matchday',
      cover: d.cover || d.src || '',
      src: d.src || '',
      photos: d.photos || [],
      photoCount: (d.photos || []).length,
      tags: d.tags || [],
      photographer: d.photographer || '',
      date: d.date || '',
      homeBadge: d.homeBadge || '',
      awayBadge: d.awayBadge || '',
    };
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)));

  /* ---- Seasons ---- */
  const seasonInfo = ps.SEASON_INFO || {};
  const seasons = (ps.ALL_SEASONS || []).map((name) => {
    const list = matches.filter((m) => m.season === name);
    const info = seasonInfo.current?.name === name ? seasonInfo.current
      : seasonInfo.next?.name === name ? seasonInfo.next : {};
    return { name, ...info, matchCount: list.length };
  });

  const competitions = (ps.COMPETITIONS || []).filter((c) => c.key !== 'all');
  const knownClubs = ps.KNOWN_CLUBS || [];
  const badges = ps.BADGES || {};
  const pages = read('recovered-pages.json');

  return {
    matches, played, fixtures, orphanDetails,
    squad, players, statsByNum, nameFor,
    coaches, table, leagueScorers, leagueResults,
    articles, recognition, galleries,
    seasons, seasonInfo, competitions, knownClubs, badges,
    currentSeason: ps.CURRENT_SEASON,
    leagueTotalGames: ps.LEAGUE_TOTAL_GAMES,
    promotionSpots: ps.LEAGUE_PROMOTION_SPOTS,
    pages,
  };
}
