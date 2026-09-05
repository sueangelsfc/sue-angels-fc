/* ==========================================================================
   DATASET ASSEMBLY
   Turns the recovered evidence (production PageShell data + live Supabase
   rows) into one canonical in-memory dataset that both the generator and the
   control panel read. Single source of truth for every published figure.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { POSITION_GROUPS, positionName } from './positions.mjs';
import { readStatusRecord, statusIn, statusLabelIn, isPlaying, joinedAfter, signedOn,
  statusDetail } from './squad-status.mjs';
import { houseRecord } from './prose.mjs';
import { partnersFrom } from './partners.mjs';
import { fulltimeLinks } from './fulltime.mjs';
import { normaliseMatch, normaliseTable, playerStats, slugify, isUs, seasonOf, toISO, isLeague, isCup,
  isCompetitive, isFriendly, figuresSeason, tableSeasonOf,
} from './stats.mjs';

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

/* `overrides.live` replaces the database snapshot, and exists for one reason:
   the suite needs to render every page against a club that has recorded
   NOTHING. That is not a hypothetical state. `npm run sync` pulls whatever
   Supabase returns, the deploy runs the generator, and the generator throwing
   now fails the club's own publish - so an empty table must produce an empty
   page, not an exception. The campaign band read `scored[0]` with no guard and
   crashed on exactly this, and was unreachable only for as long as the band
   was hard-coded onto a page with 33 matches behind it. */
export function buildDataset(overrides = {}) {
  const ps = overrides.pageshell || read('recovered-pageshell.json');
  /* Club-written prose gets the house typography on the way in, once, rather
     than at each of the places that render a piece of it. See prose.mjs: it
     sets dashes, apostrophes and the league's name and changes nothing else.

     The snapshot on disk is left exactly as Supabase returned it, because it
     is a mirror of the database and `npm run sync` overwrites it. The
     normalising belongs to the build, so a report typed with an em dash is
     published without one and still reads back into the panel as the coach
     typed it. */
  const live = houseRecord(overrides.live || read('recovered-live.json'));

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
  /* A FIXTURE AND ITS RESULT ARE THE SAME MATCH, and the id does not say so.

     Entering a result writes `r20260802-pure` while the fixture it came from
     is `f20260802-pure`: the same game, the same afternoon, two keys that
     differ by one letter. Matching on the id therefore did not notice, and
     Pure Football 2.0 away appeared twice on the site at once, with the 0-2
     on the results page and the same match still on the home page under
     "Played, not yet counted".

     So identity is the match itself: the day it was played and the two clubs,
     in whatever order they were typed. The panel is meant to clear the
     fixture when a result is saved and mostly does, but the site should not
     depend on that having worked. */
  const identity = (m) => [
    String(m.date || '').slice(0, 10),
    toISO(m.date || '') || '',
    [String(m.home || '').toLowerCase(), String(m.away || '').toLowerCase()].sort().join(' v '),
  ].filter(Boolean).slice(-2).join('|');

  const known = new Set(rawResults.map((r) => r.id));
  const knownMatches = new Set(rawResults.map(identity));
  const storedFixtures = (live.fixtures || [])
    .map((row) => ({ id: row.key, kind: 'fixture', ...(row.data || {}) }))
    .filter((f) => !known.has(f.id) && !knownMatches.has(identity(f)));
  const storedIds = new Set(storedFixtures.map((f) => f.id));
  /* Every fixture known to the club, played or not. `upcoming` below is the
     subset still to come; this one is the raw pool the match list is built
     from, so it deliberately keeps dates that have already passed. */
  const allFixtures = [
    ...storedFixtures,
    /* The same identity test as above, and it has to be here too. Filtering
       the database fixtures alone dropped the played one out of `storedIds`,
       which is what this list checks against, so the transcribed card put it
       straight back and the duplicate survived a fix aimed at it. */
    ...(read('fixtures-2627.json').fixtures || [])
      .filter((f) => !known.has(f.id) && !storedIds.has(f.id) && !knownMatches.has(identity(f)))
      .map((f) => ({ kind: 'fixture', competition: 'Pre-season friendly', ...f })),
  ];

  /* ONE SPELLING PER GROUND. A venue is typed by hand into the match form and
     nothing compared it with what had been typed before, so sixteen strings
     were stored for about nine grounds: "Meadhurst Sports Clun", the club's
     own ground written out as a postal address, Barn Elms spelled two ways
     and capitalised two ways, Prince George's with and without its
     apostrophe, and one opponent's name pasted in twice in a row.

     A stated map rather than a fuzzy match, so a new mistake appears as a new
     venue instead of being quietly absorbed into an existing one. See
     src/data/venues.json, which also lists what it deliberately leaves. */
  const venues = read('venues.json');
  const CANON = venues.canonical || {};
  const KNOWN = new Set(venues.known || []);
  const tidyVenue = (v) => {
    const said = String(v || '').replace(/\s+/g, ' ').trim();
    return CANON[said] || said;
  };
  /* Anything neither corrected nor recognised, reported once so it can be
     fixed at the source rather than accumulating another variant. */
  const unknownVenues = new Set();

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
    .map((m) => {
      if (!m.venue) return m;
      const venue = tidyVenue(m.venue);
      if (!KNOWN.has(venue)) unknownVenues.add(venue);
      return venue === m.venue ? m : { ...m, venue };
    })
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
  /* THE TWO SETS. `played` is every completed match and is what the results
     list, the match pages and the gallery links read, because a friendly is a
     real game and belongs on the site. `competitive` is what every FIGURE
     reads: the club record, the player stats, the club records, the form.
     `friendlies` is the rest, kept so it can be shown on its own rather than
     silently dropped. */
  const competitive = played.filter(isCompetitive);
  const friendlies = played.filter(isFriendly);
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
    .sort((a, b) => (b.iso || '').localeCompare(a.iso || ''))
    /* Marked, never given `played`. A copy, so the row in `fixtures` is
       untouched and nothing that reads that list inherits a flag meant only
       for the way these are shown. */
    .map((m) => ({ ...m, awaitingScore: true }));

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
  /* When the club says somebody joined. Passed into playerStats so a shirt
     number handed on does not credit its previous holder's matches to the
     man wearing it now. Null for anyone the club has given no date. */
  const signedOnNum = (num) => signedOn(statusRecord, num);
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
  /* THE PAYMENT LINK, WHATEVER THE RECORD CALLS IT.

     The panel writes `stripeLink`. The record in production holds `clubUrl`,
     written by an older version of this screen, and the cause page reads
     `stripeLink || link`. So the stored link was read by nothing and the page
     fell back to a link hard-coded in the template, which happened to be the
     same address, so it looked correct.

     It is a donate button on a page about a woman who died of sepsis. "Looks
     correct because the fallback matches" is not good enough for it: the
     moment the club edits that record the site would keep publishing the old
     address and nothing would say so. Every alias the record has ever used is
     read, and normalised to the one the page asks for. */
  const donateRow = blob('donate:config') || {};
  const donate = {
    ...donateRow,
    stripeLink: String(donateRow.stripeLink || donateRow.link || donateRow.clubUrl || '').trim(),
  };

  /* The home page banner, if the club has chosen one. Stored as three widths
     because that is what the page's srcset promises; the home template falls
     back to the built-in banner when there is no record, so removing it puts
     the original back rather than leaving a hole. */
  /* WHICH BANDS THE HOME PAGE SHOWS, AND IN WHAT ORDER. Passed through raw:
     home-layout.mjs is what decides what a missing, empty or nonsense record
     means, and it decides it once for the page and the panel together. Reading
     it here would be a second opinion. */
  const homeLayout = blob('home:layout') || null;

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
  /* SIGNED BY THE PANEL, WHICH IS NOT THE SAME AS EDITED IN IT. This gates
     whether a photograph file on disk may be trusted for somebody: those
     files were exported by hand before the panel existed, so they belong only
     to players who were in the code baseline then. Now that a panel record
     can be an OVERRIDE of a baseline player, "has a roster:s2627 row" no
     longer means "the panel signed him" - correcting a spelling would have
     taken away a photograph that was always his. */
  const addedNums = new Set(addedPlayers
    .map((p) => String(p.num))
    .filter((n) => !(ps.SQUAD || []).some((b) => String(b.num) === n)));
  /* MERGED BY NUMBER, NOT CONCATENATED. These two lists were joined end to
     end, so a panel record sharing a number with a player from the code
     baseline produced TWO of him: two cards, two profiles, one archive split
     across them. That made editing an existing player impossible to offer, so
     the panel could add somebody and remove somebody and never fix a
     misspelt name. Merged, a panel record is an OVERRIDE - the same rule the
     coaches already use - and the club can correct anybody.

     Field by field, so an override that carries only a bio does not blank the
     position it never mentioned. */
  const baseSquad = [...(ps.SQUAD || [])];
  for (const extra of addedPlayers) {
    const at = baseSquad.findIndex((p) => String(p.num) === String(extra.num));
    if (at > -1) baseSquad[at] = { ...baseSquad[at], ...extra };
    else baseSquad.push(extra);
  }
  /* Who the code baseline knows, so the panel can tell an override from a
     signing: removing an override leaves the baseline player standing, which
     makes a Remove button on one a button that does nothing. */
  const baseNums = new Set((ps.SQUAD || []).map((p) => String(p.num)));
  const squad = baseSquad.map((p) => {
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

  /* THE CLUB'S PARTNERS, which the panel can now write. Absent means the code
     baseline, so a club that has never opened the screen gets the pages it has
     today, byte for byte. See src/lib/partners.mjs. */
  const partners = partnersFrom(live);

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

  /* ---- Player statistics (derived) ----
     FROM COMPETITIVE MATCHES ONLY. A pre-season friendly is a real game with
     a real report and a real page, and it counts towards nothing: not a
     player's goals, not his assists, not his appearances. See isFriendly() in
     stats.mjs for why. Friendlies are counted separately, below, so they can
     be shown on their own rather than disappearing. */
  const players = playerStats(matches.filter(isCompetitive), squad, trialists, signedOnNum);
  const statsByNum = new Map(players.map((p) => [p.num, p]));

  /* NAMING SOMEBODY IS NOT A STATISTIC, and separating the two is the whole
     point of this pair.

     `players` is competitive-only, because a friendly counts towards nothing.
     Names were being read off it too, so anybody who has only ever played a
     friendly had no row to look up and the site called him "No. 901" on the
     team sheet of the match he played in. A trialist is exactly that person:
     the panel's trialist screen exists, in its own words, so that a friendly
     he played in can name him instead of saying No. 901.

     So the name index is built over EVERY match. It answers "who is number
     901", which is true regardless of what the match counted towards. */
  const nameByNum = new Map(playerStats(matches, squad, trialists, signedOnNum)
    .map((p) => [p.num, p.name]));
  const nameFor = (num) => nameByNum.get(num) || `No. ${num}`;

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
      matches.filter((m) => m.season === name && isCompetitive(m)), squad, trialists,
      signedOnNum,
    );
  }

  /* ==========================================================================
     WHICH DIVISION THE CLUB WAS IN, AND WHEN.

     `CLUB.division` was 'League Ten', typed into a constants file, and 102
     references across sixteen files read it. That is right until 6 September
     2026 and wrong from the first whistle of League Eight: every league figure
     would quietly keep counting last season's division, and "promoted to
     League Eight" would read as something still to come for as long as the
     club exists. Exactly the fault the hard-coded seasons had.

     Derived, in three steps, most authoritative first:

       1. THE MATCHES. If league matches were played in a season, the
          competition they were played in IS the division. Nothing can argue
          with that and nobody has to maintain it.
       2. THE PROMOTION. A season that has not kicked off has no matches to
          read, but the club records "Promoted to League Eight" against the
          season it went up FROM, so the season after it is League Eight. It
          is the club's own statement about itself.
       3. UNCHANGED. Otherwise a season is played in whatever the one before
          it was, which is what happens when a club stays put.

     Historical copy stays correct by construction: "League Ten champions
     25/26" asks for the division in 25/26 and gets League Ten forever.
     ========================================================================== */
  /* dataset.mjs deliberately does not import club.mjs - the club constants
     read the dataset, not the other way round - so the last-resort answer is
     the earliest league competition on record. */
  const FOUNDING_DIVISION = (competitive.filter(isLeague)
    .slice().sort((a, b) => String(a.iso || '').localeCompare(String(b.iso || '')))[0] || {}).competition
    || 'League Ten';

  const divisionPlayedIn = {};
  for (const m of competitive) {
    if (m.season && isLeague(m) && !divisionPlayedIn[m.season]) divisionPlayedIn[m.season] = m.competition;
  }
  /* "Promoted to League Eight" / "Relegated to League Twelve", read off the
     club's own recognition record. A title is a loose thing to parse, so it
     has to match the whole shape or it is ignored: a near miss falls through
     to "unchanged", which is the safe answer. */
  const movedInto = {};
  /* BOTH SOURCES. The assembled list is built two hundred lines below this,
     and it merges the database rows with the code baseline - which is where
     "Promoted to League Eight" actually lives, because the club recorded the
     promotion before the panel could write one. Reading only the database
     found four Player of the Month entries and no promotion at all. */
  for (const row of [...(live.recognition || []), ...(ps.SA_DEFAULT_RECOGNITION || [])]) {
    const r = row && row.data ? row.data : row;
    if (!r) continue;
    const said = String(r.title || r.name || '');
    const hit = said.match(/\b(?:promoted|relegated)\s+(?:in)?to\s+(.+?)\s*$/i);
    if (hit && r.season) movedInto[r.season] = hit[1].trim();
  }
  const seasonsInOrder = (ps.ALL_SEASONS || []).slice().sort();
  const divisionOf = (season) => {
    if (!season) return FOUNDING_DIVISION;
    if (divisionPlayedIn[season]) return divisionPlayedIn[season];
    /* A season the club has not reached yet is not in the list, so indexOf
       gives -1 and the walk never ran: 27/28 fell all the way through to the
       founding division and answered League Ten for a club two divisions on
       from it. An unknown season is a FUTURE season, so it starts from the
       end and inherits forward. */
    const known = seasonsInOrder.indexOf(season);
    /* And an unknown season BEFORE the first one the club played is not a
       future season, it is one the club did not exist for. Inheriting forward
       gave 24/25 the division the club was promoted into a year later.
       Season labels sort correctly as strings: "24/25" < "25/26". */
    if (known === -1 && seasonsInOrder.length && season < seasonsInOrder[0]) {
      return FOUNDING_DIVISION;
    }
    const at = known === -1 ? seasonsInOrder.length : known;
    for (let i = at - 1; i >= 0; i--) {
      const before = seasonsInOrder[i];
      if (movedInto[before]) return movedInto[before];
      if (divisionPlayedIn[before]) return divisionPlayedIn[before];
    }
    /* Nothing to go on: the founding division, which is the only sensible
       answer for a club with no recorded league match anywhere. */
    return FOUNDING_DIVISION;
  };

  /* WHAT SOMEBODY DID IN A FRIENDLY, kept apart rather than thrown away.

     No figure on this site counts it and that does not change. But the player
     page said "Nothing has been played in 26/27 that we hold a team sheet
     for" on the profile of a man who had started, scored and made one on 2
     August, because the only sentence it had was written for a season that
     has not begun. Excluding a match from the figures is right; saying it did
     not happen is not.

     Same engine, same shape as `playersBySeason`, over the other list. */
  const friendliesBySeason = {};
  for (const name of (ps.ALL_SEASONS || [])) {
    friendliesBySeason[name] = new Map(
      playerStats(friendlies.filter((m) => m.season === name), squad, trialists, signedOnNum)
        .filter((p) => p.starts || p.subApps)
        .map((p) => [p.num, p]),
    );
  }
  const friendlyFor = (num, season) => {
    const rows = friendliesBySeason[season];
    return (rows && rows.get(Number(num))) || null;
  };

  /* WHO WAS ACTUALLY HERE, PER SEASON, from the team sheets.
     This is the evidence the status record leans on. A player named in a
     match that season was at the club that season, whatever anybody has or
     has not typed since, which is how the site can tell a first season from
     a second from a return without being told. Nobody keeps it true; it is
     true because it is counted. */
  /* THE LAST DAY SOMEBODY ACTUALLY PLAYED, from the team sheets.
     Eight of the fourteen players who have left carry no leaving date, so
     their card says "Left the club" and nothing else. The archive knows when
     they were last named in a side, and that is worth showing - but it is NOT
     a leaving date and must never be printed as one: a man can play his last
     game in April and leave in June. It is published as what it is, and the
     panel offers it as a suggestion the club can confirm into a real date in
     one press. Four of the eight never played at all, so they stay dateless,
     which is the honest answer rather than a guessed one. */
  const lastPlayedBy = {};
  for (const m of matches) {
    const iso = String(m.iso || '');
    if (!iso) continue;
    const dt = m.detail || {};
    for (const x of [...(dt.starters || []), ...(dt.bench || [])]) {
      const k = String(x && x.num);
      if (k && (!lastPlayedBy[k] || iso > lastPlayedBy[k])) lastPlayedBy[k] = iso;
    }
  }

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
  const seasonsAll = ps.ALL_SEASONS || [];
  const statusOpts = {
    seasons: seasonsAll,
    latestSeason,
    /* Passed in rather than imported, so this module keeps having no
       dependencies of its own and the suite runs the shipped rule. */
    seasonOf,
    lastPlayed: (num) => lastPlayedBy[String(num)] || null,
    wasHere: (num, season) => {
      /* THE SIGNING DATE WINS OVER THE SHIRT. A number on a team sheet is an
         inference about identity; a signing date is the club stating a fact
         about a person. Number 3 was worn by somebody else in October 2025,
         so reading that sheet as evidence made Leon Burnett's first season
         look like his second. Where no date is recorded the evidence still
         decides, so nothing already saved needs migrating. */
      if (joinedAfter(statusRecord, num, season, seasonsAll, seasonOf)) return false;
      return season === latestSeason
        /* Nothing has been played yet, so absence of evidence is not evidence
           of absence: a squad member belongs to the season about to start. */
        ? !(appearedIn[season] && appearedIn[season].size)
          || appearedIn[season].has(String(num))
        : Boolean(appearedIn[season] && appearedIn[season].has(String(num)));
    },
  };

  /* See `unavailableFrom` on the returned object. A season label is turned
     back into its first day: 26/27 starts on 1 July 2026, the boundary the
     club sets and seasonOf() uses. */
  const GONE_KEYS = new Set(['departed', 'retired', 'staff']);
  const seasonStart = (name) => {
    const m = /^(\d{2})\/\d{2}$/.exec(String(name || ''));
    return m ? `20${m[1]}-07-01` : '';
  };
  /* The day after, so somebody is still pickable for the last match he
     actually played in. */
  const dayAfter = (iso) => {
    const d = new Date(`${iso}T12:00:00Z`);
    if (Number.isNaN(+d)) return '';
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  const unavailableFrom = (num) => {
    for (const season of seasonsAll) {
      const key = statusIn(statusRecord, num, season, statusOpts);
      if (!GONE_KEYS.has(key)) continue;
      const detail = statusDetail(statusRecord, num, season);
      if (detail.from) return detail.from;
      /* NO LEAVING DATE, SO THE ARCHIVE ANSWERS. The season's first day is
         the blunt answer and it is wrong for anybody who actually turned out
         that season: David Jones is recorded as leaving in 25/26 and played
         in January of it, so the season start would have made his own
         appearance ineligible. The day after his last match is the tightest
         thing the record can honestly say. */
      const last = lastPlayedBy[String(num)];
      if (last) return dayAfter(last);
      return seasonStart(season) || null;
    }
    return null;
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
  /* The club list for the division ahead, and whether it has started.
     `started` was a flag typed into that file, so the league page would have
     gone on saying "not started" through a season the club was playing in
     until somebody remembered to edit a JSON file. The matches know. */
  const nextDivisionTable = (() => {
    const t = read('league-eight-2627.json');
    const forSeason = t.season || latestSeason;
    const played = competitive.some((m) => m.season === forSeason && isLeague(m));
    /* THE NEW DIVISION'S OWN STANDING, once the league publishes one.
       Transcribed into `table` in the same compact shape as the League Ten
       one - p/c/pl/w/d/l/gf/ga/gd/pts - and normalised by the same function,
       so the two tables cannot disagree about what a row is. Absent until
       then, and the page falls back to the alphabetical club list.

       `started` follows the EVIDENCE either way: a transcribed row with a
       match played in it is a started season even before the club has played
       in it, which happens whenever the division kicks off on a weekend the
       club is not involved in. */
    const rows = normaliseTable(t.table || []);
    const anyPlayed = rows.some((r) => (r.played || 0) > 0);
    return {
      ...t,
      division: t.division || divisionOf(forSeason),
      started: t.started || played || anyPlayed,
      rows,
    };
  })();
  /* The league's own pages for this division, built from the ids recorded
     beside its club list. Null when there are none, and every caller is
     written to draw nothing rather than an empty link. */
  const fulltime = fulltimeLinks(nextDivisionTable.fulltime);
  const leagueResults = (ps.LEAGUE_RESULTS || []);

  /* ---- Articles ---- */
  /* A HALF-WRITTEN ARTICLE IS NOT A PUBLISHED ONE.

     Saving in the panel writes to the database, and the club publishes with a
     button that puts everything in the database on the website. So an article
     somebody started on a Tuesday and meant to finish at the weekend went
     live the moment anybody pressed Publish for an unrelated reason. There
     was nowhere to leave a piece unfinished.

     `draft: true` on the record keeps it out of the build entirely: no feed
     card, no page, no sitemap entry. Absent means published, so the five
     articles already written are unaffected and nothing has to be re-saved. */
  const articles = (live.articles || [])
    .filter((row) => !(row.data && row.data.draft))
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

  /* ---- An article the club has written but has not yet entered -----------
     THE SAME DEVICE AS fixtures-2627.json, and for the same reason: the
     `articles` table cannot be written from a developer machine. Anonymous
     INSERT is refused by row-level security, which is the posture working as
     designed, so a piece that is finished and wanted today would otherwise
     wait on somebody being at a laptop with a login.

     IT LOSES TO THE DATABASE, on the slug. The moment the same article is
     entered in the panel the stored row wins and this copy vanishes from the
     build, so the file can never produce a duplicate and forgetting to delete
     it costs nothing. Exactly the rule the transcribed fixtures follow. */
  const storedSlugs = new Set(articles.map((a) => a.slug));
  /* AND NOT INTO AN EMPTY DATABASE. This file is a copy of one club's own
     article; a generator handed nothing is being asked what a brand-new club's
     site looks like, and a hard-coded piece about Sue's Angels has no business
     turning up in that answer. The suite renders exactly that case.

     Gated on the STORED matches, not on `matches`: that list already carries
     the transcribed pre-season fixtures, so an empty database still has eight
     of them and the obvious gate let the article straight through. */
  const extraArticles = ((live.matches || []).length
    ? (read('articles-extra.json').articles || []) : [])
    .filter((row) => !(row.data && row.data.draft))
    .map((row) => {
      const x = row.data || {};
      return {
        key: row.key,
        id: x.id || row.key,
        title: x.title || 'Untitled',
        slug: slugify(x.title || row.key),
        category: x.cat || 'News',
        date: x.date || '',
        iso: x.iso || toISO(x.date || '') || null,
        lede: x.lede || '',
        body: x.body || x.text || '',
        cover: x.cover || '',
        author: x.author || "Sue's Angels FC",
        updatedAt: x.sortISO || null,
        fromFile: true,
      };
    })
    .filter((a) => !storedSlugs.has(a.slug));
  if (extraArticles.length) {
    articles.push(...extraArticles);
    articles.sort((a, b) => String(b.iso || '').localeCompare(String(a.iso || ''))
      || String(a.title).localeCompare(String(b.title)));
  }

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

  /* ---- WHICH MATCH AN ALBUM IS OF -----------------------------------------
     Every album is 17 to 175 photographs of one game, and until now neither
     page knew about the other: no album linked to its report and no report
     linked to its photographs.

     Worse, each album RE-TYPED the match. The title carried the fixture, the
     competition, the matchday and the date as one hand-written string, and
     two of the seven lost their separator on the way in, so the gallery
     printed "Sue's Angels 4-2 BPR Men's League Ten" as the fixture with the
     competition swallowed into it. The `date` field held the moment the
     album was uploaded, not the day of the match, so all seven said June
     2026 for games played between September 2025 and February 2026, each
     card contradicting the date written in its own title.

     So it is resolved instead. `matchId` on the record wins, which is what
     the panel now writes. Failing that the date is read out of the title and
     matched against the results, and where a date somehow lands on two
     matches the opponent's name settles it. All seven existing albums
     resolve this way, and every one agrees with its record on scoreline,
     competition and which side was at home.

     Nothing is invented: an album that resolves to no match keeps its title
     exactly as typed and simply carries no link. */
  const matchForAlbum = (d) => {
    if (d.matchId) return matches.find((m) => m.id === d.matchId) || null;
    const said = String(d.title || '');
    const when = said.match(/\b(\d{1,2}\s+[A-Za-z]+\s+20\d{2})\b/);
    if (!when) return null;
    const parsed = new Date(`${when[1]} UTC`);
    if (Number.isNaN(parsed.getTime())) return null;
    const iso = parsed.toISOString().slice(0, 10);
    const sameDay = matches.filter((m) => m.iso === iso && m.played);
    if (sameDay.length <= 1) return sameDay[0] || null;
    const said2 = said.toLowerCase();
    return sameDay.find((m) => said2.includes(String(m.opponent).toLowerCase().slice(0, 10)))
      || null;
  };

  const galleries = (live.gallery || []).map((row) => {
    const d = row.data || {};
    const of = matchForAlbum(d);
    return {
      key: row.key,
      id: d.id || row.key,
      title: d.title || 'Album',
      slug: slugify(d.title || row.key),
      /* The match this album is of, and the facts drawn from it rather than
         from the title. A page shows `fixture` and `competition` where they
         exist and falls back to splitting the title where they do not. */
      matchId: of ? of.id : '',
      matchHref: of ? `/matches/${of.slug}.html` : '',
      matchIso: of ? of.iso : '',
      /* The two clubs and the score kept apart, not joined into a string. A
         template shortens a club name with its own rule, and running that
         rule over a joined fixture cut the FC out of the MIDDLE of "Hillside
         Elite FC Blues". */
      home: of ? of.home : '',
      away: of ? of.away : '',
      scoreline: of ? (of.scoreline || 'v') : '',
      competition: of ? of.competition : '',
      season: of ? of.season : '',
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
  })
    /* Newest MATCH first, not newest upload. Sorting on the record's own date
       ordered the albums by the afternoon somebody sat down and uploaded
       them, which for these seven was one afternoon, so the run order was
       whatever the loop happened to produce. */
    .map((g) => ({ ...g, shownDate: g.matchIso || g.date }))
    .sort((a, b) => String(b.shownDate).localeCompare(String(a.shownDate)));

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
  /* ---- WHAT THE CLUB HAS WON, AND IN WHICH DIVISION -----------------------

     Derived, because the two places that stated it were each right only by
     coincidence and both were going to become wrong without anybody touching
     them.

     `CLUB.division` is the club's CURRENT division. Thirty-seven player pages
     told Google "part of the squad that won League Ten unbeaten" by reading
     it, so the claim was true only while the club still played in the division
     it had won - which stopped being true on promotion. Changing that one
     constant would have rewritten a historical fact on 37 pages.

     The archive knows: a season carries its own league name and its status, so
     the title season names itself and keeps naming itself correctly however
     many the club wins. */
  const titles = (seasons || [])
    .filter((s) => String(s.status || '').toUpperCase() === 'CHAMPIONS')
    .map((s) => ({ season: s.name, division: s.league || divisionOf(s.name) }));
  const lastTitle = titles.length ? titles[titles.length - 1] : null;

  /* ---- THE THREE SEASONS THIS SITE TALKS ABOUT ---------------------------

     `CURRENT_SEASON` was one typed string, '25/26', doing three jobs at once
     across eighty-eight call sites. It reads correctly today only because all
     three answers happen to be the same season, and they stop being the same
     on 6 September when League Eight starts. Flipping it by hand in a scratch
     build changed 53 files and made 144 pages say the squad won League Ten in
     26/27, which is what a single name meaning three things looks like when
     one of them moves.

     So they are three names, each derived from the archive:

     `currentSeason`  THE SEASON THE CLUB'S FIGURES DESCRIBE. The latest season
                      with a competitive match played. Pre-season friendlies do
                      not move it, which is why it is still 25/26 in August
                      with six 26/27 friendlies on the record, and why it moves
                      itself on the first competitive whistle of League Eight.

     `lastTitle`      THE SEASON THE CLUB WON, and the division it won. A fact
                      about the past that must never move.

     `tableSeason`    THE SEASON `d.table` DESCRIBES. The published table is a
                      transcription and there is only one; a page captioning it
                      with the season the club is now PLAYING would relabel
                      last season's final standings the moment a new season
                      started.

     Derived, not typed, so none of them needs a release to stay true. */
  const currentSeason = figuresSeason(competitive, ps.CURRENT_SEASON || latestSeason);
  const tableSeason = tableSeasonOf(table, competitive, currentSeason);
  const titleSeason = (lastTitle && lastTitle.season) || currentSeason;
  const titleDivision = (lastTitle && lastTitle.division) || divisionOf(currentSeason);

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
    matches, played, competitive, friendlies, fixtures, upcoming, nextFixture, awaiting, orphanDetails,
    /* THE DAY THE SITE WAS GENERATED, derived once here with `upcoming` and
       `nextFixture` rather than a second time by whoever needs it. Anything
       asking what today is has to get the same answer as the fixture list did,
       or the page can say a match is still to come and that today is the day
       after it. */
    todayISO,
    unknownVenues: [...unknownVenues],
    /* The merged baseline+database match list, before normalisation. The
       control panel needs it to pre-fill a match whose scoreline still comes
       from the code baseline rather than from a row it can edit. */
    rawMatches: rawResults,
    squad, players, playersBySeason, statsByNum, nameFor, friendlyFor,
    /* WHERE THE CLUB PLAYS, derived. `division` is this season's, which rolls
       on its own when the club goes up or down; `divisionOf(season)` answers
       for any year, so "League Ten champions 25/26" stays right forever. */
    divisionOf,
    division: divisionOf(latestSeason),
    previousDivision: divisionOf(ps.CURRENT_SEASON),
    /* What each player was in each season, and the helpers that read it. A
       page asking "what was he in 25/26" gets an answer about 25/26 rather
       than about today. */
    statusRecord,
    /* The day the club says somebody signed, or null. Exposed because two
       derivations need it and neither should re-read the record shape. */
    signedOn: (num) => signedOn(statusRecord, num),
    lastPlayedOn: (num) => lastPlayedBy[String(num)] || null,
    /* THE DAY SOMEBODY STOPS BEING PICKABLE, derived once here so no screen
       has to carry its own copy of the rule. Three already did, and one of
       them - the match form - had quietly drifted to a different season
       boundary from this file.

       It is the leaving date where the club gave one, and otherwise the first
       day of the season they are recorded as gone in, because being gone in a
       season means gone for it and the season is the only granularity the
       record has. Null for anybody still here, so a comparison against it is
       the whole test: `!on || iso < on`. */
    unavailableFrom: (num) => unavailableFrom(num),
    /* WHICH SEASONS A SHIRT NUMBER IS NAMED IN, from the team sheets. The
       website already leans on this to tell a first season from a second; the
       panel could not see it, so a player it labelled "Retained" carried no
       reason with it and there was no way to tell a genuine second season
       from a shirt number that changed hands. One array per number, which is
       small enough to seed. */
    namedIn: (() => {
      const by = {};
      for (const season of Object.keys(appearedIn)) {
        for (const num of appearedIn[season] || []) (by[num] = by[num] || []).push(season);
      }
      for (const num of Object.keys(by)) by[num].sort();
      return by;
    })(),
    statusIn: (num, season) => statusIn(statusRecord, num, season, statusOpts),
    statusLabelIn: (num, season) => statusLabelIn(statusRecord, num, season, statusOpts),
    isPlayingStatus: isPlaying,
    coaches, table, leagueScorers, leagueScorersByComp, nextDivisionTable, leagueResults,
    fulltime,
    articles, recognition, galleries, playerPhotos, donate, hero, homeLayout, trialists,
    photoFor, photoSeasons, shotFor, sponsorships, partners,
    seasons, seasonInfo, titles, lastTitle, competitions, knownClubs, badges,
    currentSeason,
    tableSeason, titleSeason, titleDivision,
    nextSeason,
    latestSeason,
    leagueTotalGames: ps.LEAGUE_TOTAL_GAMES,
    promotionSpots: ps.LEAGUE_PROMOTION_SPOTS,
    pages,
  };
}
