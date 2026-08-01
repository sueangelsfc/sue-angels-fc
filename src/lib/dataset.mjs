/* ==========================================================================
   DATASET ASSEMBLY
   Turns the recovered evidence (production PageShell data + live Supabase
   rows) into one canonical in-memory dataset that both the generator and the
   control panel read. Single source of truth for every published figure.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { POSITION_GROUPS, POSITION_LABEL } from './club.mjs';
import { normaliseMatch, normaliseTable, playerStats, slugify, isUs, seasonOf, toISO } from './stats.mjs';

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
    /* The counts are what make a heat map possible: how OFTEN a player lined
       up somewhere, not merely that they once did. A bench slot counts half,
       because being named there is not the same as playing there. */
    out.set(num, {
      code: top, label: POSITION_LABEL[top] || top, group,
      all: ranked.map((r) => r[0]),
      weights: ranked.map(([c, n]) => ({ code: c, n })),
    });
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

  /* Upcoming fixtures. The production `fixtures` table is empty: the 26/27
     pre-season schedule was published as a news article rather than entered
     as fixtures, so nothing reached the site. It is transcribed in
     fixtures-2627.json until the rows exist. Anything already in the results
     baseline wins, so a fixture that has since been played is not duplicated
     by its own placeholder. */
  const known = new Set(rawResults.map((r) => r.id));
  const upcoming = (read('fixtures-2627.json').fixtures || [])
    .filter((f) => !known.has(f.id))
    .map((f) => ({ kind: 'fixture', competition: 'Pre-season friendly', ...f }));

  /* A cup final is played at a neutral ground. The fixture list still names
     one club as home, so weAreHome stays as the record has it, but the site
     must not caption the match Home or Away: the Dylan Rigobert Trophy final
     was at Robert Parker Stadium and neither side was at home. */
  const neutral = read('neutral-venues.json').matches || {};
  /* Which round of a knockout each cup tie was. Nothing in the match record
     carries it, and without it a cup run reads as a list of friendlies. */
  const rounds = read('cup-rounds.json').rounds || {};
  const matches = [...rawResults, ...upcoming]
    .map((r) => normaliseMatch(r, detailById.get(r.id) || null))
    .map((m) => (neutral[m.id]
      ? { ...m, neutral: true, neutralNote: neutral[m.id], homeAway: 'Neutral' }
      : m))
    .map((m) => (rounds[m.id]
      ? { ...m, round: rounds[m.id].round, roundShort: rounds[m.id].short,
        roundAssumed: Boolean(rounds[m.id].assumed) }
      : m));

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

  /* Squad status. The recovered PageShell marks every player active, which is
     wrong: two ended their playing careers during 25/26 and nine have moved
     on. The truth lives in the production `roster:status` blob, whose row was
     recovered without its data, so it is mirrored here by shirt number. See
     the note in the file itself for provenance. */
  const rosterStatus = read('roster-status.json').status || {};

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
      positionWeights: pos?.weights || [],
      bio: bios[p.num] || bios[name] || null,
      hasPhoto: photoKeys.has(String(p.num)),
      status: rosterStatus[String(p.num)] || p.status || 'active',
    };
  });

  /* ---- Player statistics (derived) ---- */
  const players = playerStats(matches, squad);
  const statsByNum = new Map(players.map((p) => [p.num, p]));
  const nameFor = (num) => statsByNum.get(num)?.name || `No. ${num}`;

  /* ---- Coaches ----
     The recovered PageShell holds only the two founding staff. Anyone who has
     joined since lives in the production `roster:coaches` row, whose data the
     recovery captured without its contents, so it is mirrored in
     coaches-extra.json. Merged by id so a later edit to a founding coach in
     that file wins rather than duplicating the person. */
  const extraCoaches = read('coaches-extra.json').coaches || [];
  const coachSource = [...(ps.COACHES || [])];
  for (const extra of extraCoaches) {
    const at = coachSource.findIndex((c) => c.id === extra.id || c.name === extra.name);
    if (at > -1) coachSource[at] = { ...coachSource[at], ...extra };
    else coachSource.push(extra);
  }

  const coaches = coachSource.map((c) => ({
    ...c,
    slug: c.id || slugify(c.name),
    bio: Array.isArray(c.bio) ? c.bio : c.bio ? [c.bio] : [],
  }));

  /* ---- League ---- */
  const table = normaliseTable(ps.RAW_TABLE);
  /* Two charts, not one: FA Full-Time publishes an all-competitions list and
     a league-only list, and they disagree by design (Frazier is 25 across
     everything and 18 in the league). Only the combined one was being read,
     so the league-only figures had nowhere to go. */
  const mapScorers = (rows) => (rows || []).map((r) => ({
    pos: r.pos, name: r.name, club: r.club, goals: r.g, assists: r.a, apps: r.ap, us: !!r.us || isUs(r.club),
  }));
  const leagueScorers = mapScorers(ps.LEAGUE_STATS?.all);
  const leagueScorersByComp = {
    all: leagueScorers,
    league: mapScorers(ps.LEAGUE_STATS?.league),
  };

  /* The division the club has gone up into. Not yet played, so it is a club
     list rather than a standing. */
  const nextDivisionTable = read('league-eight-2627.json');
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
        iso: d.iso || toISO(d.date || '') || null,
        lede: d.lede || '',
        body: d.body || d.text || '',
        cover: d.cover || d.img || '',
        author: d.author || "Sue's Angels FC",
        updatedAt: row.updated_at,
      };
    })
    /* Sort on the ISO date, never on the display string: "20 Jul 2026" and
       "28 Jun 2026" compare by day-of-month as text, which put July's article
       third in the feed. Ties fall back to the title so the order is stable
       between builds. */
    .sort((a, b) => String(b.iso || '').localeCompare(String(a.iso || ''))
      || String(a.title).localeCompare(String(b.title)));

  /* ---- Recognition ---- */
  const recognition = [
    ...(live.recognition || []).map((row) => ({ key: row.key, ...(row.data || {}), source: 'cloud' })),
    ...(ps.SA_DEFAULT_RECOGNITION || []).map((r) => ({ ...r, source: 'baseline' })),
  ];

  /* ---- Galleries ---- */
  /* Array parallel to photos, or an object keyed by index. Either way out
   comes a map of index -> names, with empty entries dropped. */
  /* ---- Photograph tags ---------------------------------------------------
     A tag says who is in a photograph. Two shapes are accepted:

       "Luke Munns"                              present in the shot
       { name, role, focus, rating, note }       the precise form

     The plain string is what the club's existing 624 tags use and it stays
     valid forever: it means "in this photograph somewhere".

     The object form exists because "in the photograph" is not enough to pick
     a picture OF someone. A wide shot with eight players in it is a genuine
     tag for all eight and a usable portrait of none of them. So:

       role    'subject'  the photograph is OF this player, usable as their
                          picture anywhere on the site
               'present'  they are in it; not offered as their picture
                          (the default, and what every existing tag means)
       focus   [x, y] percentages of where they are in the frame, so any crop
               at any aspect ratio keeps them in it
       rating  1-5, higher is preferred when the site picks between several
       note    free text for whoever tags next

     Nothing has to be filled in. A tag upgraded from a string to an object
     with role 'subject' immediately becomes eligible; until then the site
     behaves exactly as it does now. */
  const normaliseTag = (t) => {
    if (typeof t === 'string') return t.trim() ? { name: t.trim(), role: 'present' } : null;
    if (!t || typeof t !== 'object' || !t.name) return null;
    const focus = Array.isArray(t.focus) && t.focus.length === 2
      ? [Number(t.focus[0]), Number(t.focus[1])].map((n) => (Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50))
      : null;
    return {
      name: String(t.name).trim(),
      role: t.role === 'subject' ? 'subject' : 'present',
      focus,
      rating: Number.isFinite(Number(t.rating)) ? Math.min(5, Math.max(1, Number(t.rating))) : null,
      note: t.note ? String(t.note) : '',
    };
  };

  const normalisePhotoTags = (raw) => {
    const out = {};
    const put = (k, list) => {
      const tags = (list || []).map(normaliseTag).filter(Boolean);
      if (tags.length) out[String(k)] = tags;
    };
    if (Array.isArray(raw)) raw.forEach((names, i) => put(i, names));
    else if (raw && typeof raw === 'object') {
      for (const [k, names] of Object.entries(raw)) put(k, names);
    }
    return out;
  };

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
      /* Per-photograph player tags. The club has ALREADY tagged 448 of the
         606 photographs through the old backend, and it stores them as an
         array running parallel to `photos`: entry i names who is in photo i,
         with an empty array where nobody is tagged.

         Normalised to an index-keyed map here so the templates do not care
         which shape a record arrived in. An object keyed by index is accepted
         too, because that is the obvious thing for a future writer to send.

         The album-level `tags` list says who appears in the album somewhere;
         this says who is in a given frame, which is what makes a tag worth
         clicking. */
      photoTags: normalisePhotoTags(d.photoTags),
    };
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)));

  /* ---- Photographs of a player -------------------------------------------
     Which gallery photographs may be used as a picture of a given player,
     best first. This is what makes precise tagging pay off: tag someone as
     the SUBJECT of a frame and the site can use that frame for them without
     anyone choosing it by hand.

     Only 'subject' tags qualify. A player merely present in a wide shot is
     not offered, because the whole point is a picture that is actually of
     them. Ordering is rating first, then most recent album, so the newest
     good photograph wins and the list stays stable between builds.

     A pin in src/data/photo-pins.json overrides all of it: that is the
     "unless specifically stated" case. */
  const pins = read('photo-pins.json').pins || {};
  const playerPhotos = {};
  for (const g of galleries) {
    for (const [idx, tags] of Object.entries(g.photoTags || {})) {
      const src = (g.photos || [])[Number(idx)];
      if (!src) continue;
      for (const t of tags) {
        if (t.role !== 'subject') continue;
        const slug = slugify(t.name);
        (playerPhotos[slug] ||= []).push({
          src,
          focus: t.focus,
          rating: t.rating || 0,
          note: t.note || '',
          album: { slug: g.slug, title: g.title, date: g.date, photographer: g.photographer },
        });
      }
    }
  }
  for (const slug of Object.keys(playerPhotos)) {
    playerPhotos[slug].sort((a, b) => b.rating - a.rating
      || String(b.album.date || '').localeCompare(String(a.album.date || ''))
      || String(a.src).localeCompare(String(b.src)));
  }
  /* A pin becomes the first entry, and is marked so a caller can tell an
     explicit choice from an automatic one. */
  for (const [slug, pin] of Object.entries(pins)) {
    if (slug.startsWith('_')) continue;
    const rec = typeof pin === 'string' ? { src: pin } : pin && { src: pin.url, focus: pin.focus };
    if (!rec || !rec.src) continue;
    playerPhotos[slug] = [{ ...rec, pinned: true, rating: 99, album: {} },
      ...(playerPhotos[slug] || []).filter((p) => p.src !== rec.src)];
  }

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
  /* The recovered registry misses clubs whose badge files are already in
     assets/badge/, which is how a new opponent ends up on the initial-letter
     fallback with its own crest sitting unused on disk. */
  const badges = { ...(ps.BADGES || {}), ...(read('badges-extra.json').badges || {}) };
  const pages = read('recovered-pages.json');

  return {
    matches, played, fixtures, orphanDetails,
    squad, players, statsByNum, nameFor,
    coaches, table, leagueScorers, leagueScorersByComp, nextDivisionTable, leagueResults,
    articles, recognition, galleries, playerPhotos,
    seasons, seasonInfo, competitions, knownClubs, badges,
    currentSeason: ps.CURRENT_SEASON,
    leagueTotalGames: ps.LEAGUE_TOTAL_GAMES,
    promotionSpots: ps.LEAGUE_PROMOTION_SPOTS,
    pages,
  };
}
