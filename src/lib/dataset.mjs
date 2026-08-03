/* ==========================================================================
   DATASET ASSEMBLY
   Turns the recovered evidence (production PageShell data + live Supabase
   rows) into one canonical in-memory dataset that both the generator and the
   control panel read. Single source of truth for every published figure.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { POSITION_GROUPS, positionName } from './positions.mjs';
import { readStatusRecord, statusIn, statusLabelIn, isPlaying } from './squad-status.mjs';
import { houseRecord } from './prose.mjs';
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
      /* A name, never the code. `|| top` here is what put "RDM" on a player
         page in place of a position. */
      code: top, label: positionName(top), group,
      all: ranked.map((r) => r[0]),
      weights: ranked.map(([c, n]) => ({ code: c, n })),
    });
  }
  return out;
}

export function buildDataset() {
  const ps = read('recovered-pageshell.json');
  /* Club-written prose gets the house typography on the way in, once, rather
     than at each of the places that render a piece of it. See prose.mjs: it
     sets dashes, apostrophes and the league's name and changes nothing else.

     The snapshot on disk is left exactly as Supabase returned it, because it
     is a mirror of the database and `npm run sync` overwrites it. The
     normalising belongs to the build, so a report typed with an em dash is
     published without one and still reads back into the panel as the coach
     typed it. */
  const live = houseRecord(read('recovered-live.json'));

  /* ---- Match detail records, keyed by match id ---- */
  const detailById = new Map();
  for (const row of live.matches || []) detailById.set(row.key, row.data);

  /* ---- Matches ----------------------------------------------------------
     A match used to be assembled from two places that only one of them could
     change: the SCORELINE, the opponent, the date and the competition came
     from SEASON_RESULTS in the code baseline, and only the line-up, goals and
     report came from the database. The control panel therefore could not
     record a result at all. It could describe a match, but the match itself
     had to be added by a developer, which is why its editor looked like it
     was letting you fill in half a form.

     A database row may now carry the whole match. The baseline is the
     starting point, any of these fields present on the row overrides it, and
     a row with no baseline entry at all becomes a match in its own right, so
     a result entered in the panel appears on the site after `npm run sync`.

     Existing rows carry none of these fields, so nothing about the recorded
     season moves: `npm run verify` still reconciles the derived figures
     against the published league table. */
  const FIXTURE_FIELDS = ['date', 'kick', 'home', 'away', 'hs', 'as', 'kind',
    'competition', 'venue', 'wo'];

  const byId = new Map((ps.SEASON_RESULTS || []).map((r) => [r.id, r]));
  for (const [key, data] of detailById) {
    if (!data) continue;
    const overlay = {};
    for (const f of FIXTURE_FIELDS) if (data[f] !== undefined && data[f] !== '') overlay[f] = data[f];
    if (!Object.keys(overlay).length) continue;
    byId.set(key, { ...(byId.get(key) || { id: key }), ...overlay });
  }
  const rawResults = [...byId.values()];

  /* Upcoming fixtures. Real rows in the `fixtures` table win; the transcribed
     26/27 pre-season card in fixtures-2627.json is the fallback for as long
     as that table is empty. Anything already in the results baseline wins
     over both, so a fixture that has since been played is not duplicated by
     its own placeholder. */
  const known = new Set(rawResults.map((r) => r.id));
  const storedFixtures = (live.fixtures || [])
    .map((row) => ({ id: row.key, kind: 'fixture', ...(row.data || {}) }))
    .filter((f) => !known.has(f.id));
  const storedIds = new Set(storedFixtures.map((f) => f.id));
  /* Every fixture known to the club, played or not. `upcoming` below is the
     subset still to come; this one is the raw pool the match list is built
     from, so it deliberately keeps dates that have already passed. */
  const allFixtures = [
    ...storedFixtures,
    ...(read('fixtures-2627.json').fixtures || [])
      .filter((f) => !known.has(f.id) && !storedIds.has(f.id))
      .map((f) => ({ kind: 'fixture', competition: 'Pre-season friendly', ...f })),
  ];

  /* A cup final is played at a neutral ground. The fixture list still names
     one club as home, so weAreHome stays as the record has it, but the site
     must not caption the match Home or Away: the Dylan Rigobert Trophy final
     was at Robert Parker Stadium and neither side was at home. */
  const neutral = read('neutral-venues.json').matches || {};
  /* Which round of a knockout each cup tie was. Nothing in the match record
     carries it, and without it a cup run reads as a list of friendlies. */
  const rounds = read('cup-rounds.json').rounds || {};
  const matches = [...rawResults, ...allFixtures]
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

  /* WHAT IS STILL TO COME, worked out once.
     Six pages each sorted `fixtures` by date and took the first, and not one
     of them dropped a date that had already been. The morning after a match
     the home page still led with it and the countdown beside it ran
     backwards. Two of the six also filtered on `m.played`, which a plain
     fixture row does not carry, so the guard did nothing.

     A fixture with no date is KEPT and sorted last: a friendly agreed with a
     club but not yet given a day is still a fixture, and dropping it would
     lose the only record that it exists.

     A match today counts as upcoming. The site is static and may have been
     built this morning for a game this afternoon, and it is generated fresh
     on every publish, so this is as current as the last deploy. */
  const todayISO = new Date().toISOString().slice(0, 10);
  const upcoming = fixtures
    .filter((m) => !m.iso || m.iso >= todayISO)
    .sort((a, b) => (a.iso || '9999-99-99').localeCompare(b.iso || '9999-99-99'));
  const nextFixture = upcoming[0] || null;

  /* PLAYED, BUT NOBODY HAS SAID WHAT HAPPENED.

     A fixture whose date has been and gone is no longer upcoming, and with no
     score on it, it is not a result either. Until now that meant it appeared
     NOWHERE: the morning after a match the club's own game vanished off the
     website, and stayed vanished until somebody opened the panel. A match the
     club played is a fact whether or not the score has been typed in yet.

     These carry no goals, no outcome and no `played` flag, so nothing derived
     ever counts them: `teamSummary`, the league reconciliation and every
     player figure read `played`, which they are not in. They exist to be
     shown and to ask for a scoreline. */
  const awaiting = fixtures
    .filter((m) => m.iso && m.iso < todayISO)
    .sort((a, b) => (b.iso || '').localeCompare(a.iso || ''));

  /* ---- Squad ---- */
  const posByNum = inferPositions(matches);
  const bios = ps.PLAYER_BIOS || {};
  const photoKeys = new Set((live.player_photos || []).map((p) => String(p.key)));

  /* Squad status. The recovered PageShell marks every player active, which is
     wrong: two ended their playing careers during 25/26 and nine have moved
     on. roster-status.json mirrors the production `roster:status` blob, whose
     row was recovered without its data. See the note in that file.

     The database row now wins over it where one exists, which is what makes
     the control panel's squad editor mean anything: moving somebody to
     retired, retained or the coaching staff writes that row, and this is
     where the change enters the website. */
  const blob = (key) => (live.player_photos || []).find((p) => p.key === key)?.data;
  const statusRow = blob('roster:status');
  const rawStatus = {
    ...(read('roster-status.json').status || {}),
    ...((statusRow && (statusRow.status || statusRow)) || {}),
  };
  /* A status is now a fact about a player IN A SEASON rather than one value
     that had to be true forever. See src/lib/squad-status.mjs for why, and
     for how the three tenure labels - new, retained, back at the club - stop
     being things anybody types and start being worked out. Both the old flat
     shape and the per-season one are read, so nothing already saved is lost. */
  const statusRecord = readStatusRecord(rawStatus);
  /* The player's status TODAY, which is what a page with no season in mind
     wants. Kept under the old name so every existing caller is unaffected. */
  /* The most recent thing the club has said about a player, which is what a
     page with no season in mind means by "status". Needs no evidence, so it
     can be worked out here, before the squad it describes exists. The
     season-aware answers hang off `d.statusIn` further down. */
  const rosterStatus = Object.fromEntries(Object.entries(statusRecord).map(([num, rec]) => {
    if (rec.__flat) return [num, rec.__flat];
    const all = ps.ALL_SEASONS || [];
    for (let i = all.length - 1; i >= 0; i--) if (rec[all[i]]) return [num, rec[all[i]]];
    return [num, 'active'];
  }));

  /* Players signed since the recovery. The panel writes them here rather than
     into the code baseline, so a new signing does not need a developer. */
  const addedPlayers = (blob('roster:s2627')?.players || []).filter((p) => p && p.num);

  /* Where the cause page's donate button points. Set in the panel; the page
     keeps its own fallback so an empty record can never leave the button
     pointing nowhere. */
  const donate = blob('donate:config') || {};

  /* The home page banner, if the club has chosen one. Stored as three widths
     because that is what the page's srcset promises; the home template falls
     back to the built-in banner when there is no record, so removing it puts
     the original back rather than leaving a hole. */
  const heroRow = blob('hero:home') || {};
  const hero = heroRow.w1344 ? {
    src: heroRow.w1344,
    srcset: [640, 960, 1344].filter((w) => heroRow[`w${w}`])
      .map((w) => `${heroRow[`w${w}`]} ${w}w`).join(', '),
    alt: heroRow.alt || '',
  } : null;

  /* WHO CAME FROM THE CODE BASELINE, and who the panel signed.

     It matters because the twenty photographs that ship as files in
     assets/players/ are named after a SHIRT NUMBER and nothing else, and
     shirt numbers get reused: the panel gives a new player the lowest free
     one. Ade Owolona was signed into number 12, a `12.webp` was still sitting
     on disk from whoever had it before, and his profile showed a stranger's
     face.

     A player the panel signed cannot have a file on disk, because those files
     were exported by hand before the panel existed. Marking where each record
     came from is what lets the site refuse a photograph it cannot prove
     belongs to the person. */
  const addedNums = new Set(addedPlayers.map((p) => String(p.num)));
  const squad = [...(ps.SQUAD || []), ...addedPlayers].map((p) => {
    const name = `${p.first} ${p.last}`.trim();
    const pos = posByNum.get(p.num);
    const isGk = p.gk || pos?.code === 'GK';
    /* A stated position wins over the inferred one. Inference reads where
       somebody actually lined up, which is the right answer for anyone with a
       season behind them and no answer at all for a player who has not played
       yet: without this a new signing is a "Squad player" forever. */
    const said = p.position || '';
    if (said && !pos) {
      const group = /goal/i.test(said) ? 'gk' : /def|back/i.test(said) ? 'def'
        : /forward|strik/i.test(said) ? 'fwd' : 'mid';
      return {
        num: p.num, first: p.first, last: p.last, name, slug: slugify(name),
        gk: group === 'gk',
        position: said,
        positionCode: group === 'gk' ? 'GK' : '',
        positionGroup: group,
        positionsPlayed: [], positionWeights: [],
        bio: p.bio || bios[p.num] || bios[name] || null,
        hasPhoto: photoKeys.has(String(p.num)),
        status: rosterStatus[String(p.num)] || p.status || 'active',
        signedHere: addedNums.has(String(p.num)),
      };
    }
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
      /* Signed through the panel rather than present in the code baseline,
         so no hand-exported photograph can belong to them. */
      signedHere: addedNums.has(String(p.num)),
    };
  });

  /* PLAYER PHOTOGRAPHS, AND WHY THEY LIVE HERE.

     A photograph uploaded in the panel used to be written as a data URL onto
     the `player_photos` row for that shirt number, and it never reached the
     website. Two reasons, both structural. The snapshot reduces every base64
     row to {key, kind, bytes} on purpose, because twenty photographs inline
     would be megabytes in a committed JSON file. And the squad page read
     `assets/players/<num>.webp` off disk, which only exists for the twenty
     somebody exported by hand. So the panel said "photograph saved" and the
     site went on showing initials.

     One small record instead: `roster:photos`, shirt number to a set of
     addresses, one per season plus a default. The images themselves go to the
     club's storage, so the record holds URLs and stays a few hundred bytes,
     which survives the snapshot whole and reaches the build.

     Resolution order for a given season: that season's photograph, then the
     default, then the file on disk, then their initials. A club that has not
     taken 26/27 photographs yet therefore shows last season's, which is what
     you want in August. */
  const photoRec = blob('roster:photos') || {};
  const photoFor = (num, season) => {
    const rec = photoRec[String(num)] || {};
    return (season && rec[season]) || rec.default || '';
  };
  /* SPONSORSHIPS SOLD DURING A SEASON.

     The panel sells three slots and a player's season, and tells the club
     exactly what each one buys: "their name on every match report", "named as
     the match ball sponsor on that game's report", "named alongside the award".
     The generator read none of them, so every one of those sentences was a
     promise the site did not keep. Recording a sale changed the database and
     nothing a sponsor could ever be shown.

     Keyed without the prefix, so `sponsorships.matchreport` and
     `sponsorships['player-30']`. A record with no name is not a sale. */
  const sponsorships = Object.fromEntries((live.player_photos || [])
    .filter((r) => String(r.key).startsWith('sponsor:') && r.key !== 'sponsor:pipeline')
    .map((r) => [String(r.key).slice(8), typeof r.data === 'string' ? { name: r.data } : (r.data || {})])
    .filter(([, v]) => v && v.name));

  const photoSeasons = [...new Set(
    Object.values(photoRec).flatMap((r) => Object.keys(r || {})),
  )].filter((k) => k !== 'default');

  /* THE WHOLE RESOLUTION, IN ONE PLACE.

     Six templates each kept their own copy of "is there a file on disk for
     this shirt number", which is six chances to disagree and, worse, six
     copies of a bug: the twenty photographs in assets/players/ are named
     after a SHIRT NUMBER and nothing else, and numbers are reused. The panel
     gives a new signing the lowest free one, so Ade Owolona was signed into
     number 12, a 12.webp from a previous holder was still on disk, and his
     profile carried a stranger's face.

     A file on disk is only trusted for a player who was in the code baseline
     when those files were exported by hand. Anybody the panel has signed
     since gets an uploaded photograph or their initials, which is the honest
     answer rather than somebody else's photograph. */
  const signedHere = new Set(squad.filter((p) => p.signedHere).map((p) => String(p.num)));
  const diskPhotos = (() => {
    try {
      return new Set(fs.readdirSync(path.join(process.cwd(), 'assets', 'players'))
        .filter((f) => /^\d+\.webp$/.test(f)).map((f) => f.replace('.webp', '')));
    } catch { return new Set(); }
  })();
  const shotFor = (num, season) => {
    const key = String(num);
    const own = photoFor(num, season);
    if (own) return own;
    if (signedHere.has(key)) return '';
    return diskPhotos.has(key) ? `/assets/players/${key}.webp` : '';
  };

  /* Trialists. Somebody having a look, who turns out in a friendly and is
     named on the team sheet. They are deliberately NOT in `squad`, so no
     profile page is generated and they appear on no squad listing; they exist
     here only so a match they played in can say who they were rather than
     "No. 901". Shirt numbers are allocated from 900 up by the panel, so they
     can never collide with a real one. */
  const trialists = Object.fromEntries(
    ((blob('roster:trialists') || {}).players || [])
      .filter((t) => t && t.num && t.name)
      .map((t) => [String(t.num), t.name]),
  );

  /* ---- Player statistics (derived) ---- */
  const players = playerStats(matches, squad, trialists);
  const statsByNum = new Map(players.map((p) => [p.num, p]));
  const nameFor = (num) => statsByNum.get(num)?.name || `No. ${num}`;

  /* THE SAME ENGINE, RUN ONCE PER SEASON.
     The squad page showed one set of numbers under every season tab, so a
     26/27 tab that has not seen a ball kicked reported 25/26's goals: the
     tab looked like a filter and behaved like a label. `playerStats` already
     derives everything from whatever match list it is handed, so a season is
     the same call with a shorter list, and a season with no matches yields
     the zeroes it should. Keyed by season name; `players` above stays the
     career total and is what an "all seasons" view reads. */
  const playersBySeason = {};
  for (const name of (ps.ALL_SEASONS || [])) {
    playersBySeason[name] = playerStats(
      matches.filter((m) => m.season === name), squad, trialists,
    );
  }

  /* WHO WAS ACTUALLY HERE, PER SEASON, from the team sheets.
     This is the evidence the status record leans on. A player named in a
     match that season was at the club that season, whatever anybody has or
     has not typed since, which is how the site can tell a first season from
     a second from a return without being told. Nobody keeps it true; it is
     true because it is counted. */
  const appearedIn = {};
  for (const [name, list] of Object.entries(playersBySeason)) {
    appearedIn[name] = new Set(list
      .filter((r) => (r.starts || 0) + (r.subApps || 0) > 0)
      .map((r) => String(r.num)));
  }
  /* The season the club is IN. A season with fixtures but no results yet is
     still the current one: a squad member with nothing recorded belongs to
     it, because it has not been played. */
  const latestSeason = (ps.ALL_SEASONS || [])[(ps.ALL_SEASONS || []).length - 1]
    || ps.CURRENT_SEASON;

  /* THE SEASON AHEAD. Eight pages said "26/27" in the copy: five as
     `d.nextSeason || '26/27'`, and `d.nextSeason` did not exist, so all five
     fell through to the literal and the fallback WAS the value. The other
     three had the year typed straight into the sentence. Every one of them
     would have been wrong from July 2027 and only a developer could have
     fixed them.

     Taken from the season list when there is one after the current season,
     and otherwise counted on from it, so the site never runs out of an answer
     and never needs a release to move a year forward. */
  const nextLabel = (name) => {
    const m = String(name || '').match(/^(\d{2})\/(\d{2})$/);
    if (!m) return name;
    const pad = (n) => String(n % 100).padStart(2, '0');
    return `${pad(Number(m[1]) + 1)}/${pad(Number(m[2]) + 1)}`;
  };
  const seasonList = ps.ALL_SEASONS || [];
  const currentIdx = seasonList.indexOf(ps.CURRENT_SEASON);
  const nextSeason = (currentIdx > -1 && seasonList[currentIdx + 1])
    || (ps.CURRENT_SEASON === latestSeason ? nextLabel(latestSeason) : latestSeason);
  const statusOpts = {
    seasons: ps.ALL_SEASONS || [],
    latestSeason,
    wasHere: (num, season) => (season === latestSeason
      /* Nothing has been played yet, so absence of evidence is not evidence
         of absence: a squad member belongs to the season about to start. */
      ? !(appearedIn[season] && appearedIn[season].size)
        || appearedIn[season].has(String(num))
      : Boolean(appearedIn[season] && appearedIn[season].has(String(num)))),
  };

  /* ---- Coaches ----
     The recovered PageShell holds only the two founding staff. Anyone who has
     joined since lives in the production `roster:coaches` row, whose data the
     recovery captured without its contents, so it is mirrored in
     coaches-extra.json. Merged by id so a later edit to a founding coach in
     that file wins rather than duplicating the person. */
  const extraCoaches = [
    ...(read('coaches-extra.json').coaches || []),
    /* And anyone the control panel has appointed since, including a player
       moved off the pitch and onto the staff. */
    ...((blob('roster:coaches')?.coaches) || []),
  ];
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

     EVERY tag qualifies, and this is the fix for a feature that produced
     nothing at all. It used to take only tags marked 'subject', on the
     reasoning that a player merely present in a wide shot is not a picture OF
     him. The reasoning was fine and the result was an empty index: all 624
     tags in the database say `role: 'present'`, because nobody has ever
     pressed the Subject button and nothing told them to. A feature gated on a
     step nobody is asked to take is a feature that does not exist.

     So every tagged frame is offered and 'subject' simply sorts first. The
     club can then pick one on a player's page in the panel, which is the
     judgement that was being asked of the tagger and is better asked here,
     looking at the pictures side by side.

     Ordering is subject first, then rating, then most recent album, so the
     newest good photograph wins and the list stays stable between builds.

     A pin in src/data/photo-pins.json overrides all of it: that is the
     "unless specifically stated" case. */
  const pins = read('photo-pins.json').pins || {};
  const playerPhotos = {};
  for (const g of galleries) {
    for (const [idx, tags] of Object.entries(g.photoTags || {})) {
      const src = (g.photos || [])[Number(idx)];
      if (!src) continue;
      for (const t of tags) {
        const slug = slugify(t.name);
        (playerPhotos[slug] ||= []).push({
          src,
          index: Number(idx),
          subject: t.role === 'subject',
          focus: t.focus,
          rating: t.rating || 0,
          note: t.note || '',
          /* Who else is in the frame, so a page can caption it rather than
             printing a photograph with nothing said about it. */
          with: tags.map((o) => o.name).filter((n) => n && slugify(n) !== slug),
          album: { slug: g.slug, title: g.title, date: g.date, photographer: g.photographer },
        });
      }
    }
  }
  for (const slug of Object.keys(playerPhotos)) {
    playerPhotos[slug].sort((a, b) => (b.subject ? 1 : 0) - (a.subject ? 1 : 0)
      || b.rating - a.rating
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
  /* AND THE ONES THE CLUB HAS UPLOADED. The panel has an Opponent badges
     editor that writes the `team_badges` table, keyed by club name with
     exactly the shape used here, and the generator never read it: uploading a
     crest changed the database and nothing else, for as long as the editor
     has existed. A row here wins over both baselines, because it is the most
     recent thing anybody chose. */
  const badges = {
    ...(ps.BADGES || {}),
    ...(read('badges-extra.json').badges || {}),
    ...Object.fromEntries((live.team_badges || [])
      .filter((row) => row && row.key && row.data && row.data.src)
      .map((row) => [row.key, row.data])),
  };
  const pages = read('recovered-pages.json');

  return {
    matches, played, fixtures, upcoming, nextFixture, awaiting, orphanDetails,
    /* The merged baseline+database match list, before normalisation. The
       control panel needs it to pre-fill a match whose scoreline still comes
       from the code baseline rather than from a row it can edit. */
    rawMatches: rawResults,
    squad, players, playersBySeason, statsByNum, nameFor,
    /* What each player was in each season, and the helpers that read it. A
       page asking "what was he in 25/26" gets an answer about 25/26 rather
       than about today. */
    statusRecord,
    statusIn: (num, season) => statusIn(statusRecord, num, season, statusOpts),
    statusLabelIn: (num, season) => statusLabelIn(statusRecord, num, season, statusOpts),
    isPlayingStatus: isPlaying,
    coaches, table, leagueScorers, leagueScorersByComp, nextDivisionTable, leagueResults,
    articles, recognition, galleries, playerPhotos, donate, hero, trialists,
    photoFor, photoSeasons, shotFor, sponsorships,
    seasons, seasonInfo, competitions, knownClubs, badges,
    currentSeason: ps.CURRENT_SEASON,
    nextSeason,
    latestSeason,
    leagueTotalGames: ps.LEAGUE_TOTAL_GAMES,
    promotionSpots: ps.LEAGUE_PROMOTION_SPOTS,
    pages,
  };
}
