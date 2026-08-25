/* ==========================================================================
   THE LEAGUE'S OWN PAGES

   The site derives every figure it publishes from its own match records, and
   says so. These are the links to the source: the division on FA Full-Time,
   where the league itself keeps the table, the fixture list and the scoring
   charts. A reader who wants to check the club rather than take its word for
   it should be one click away, and until now they were not - the one Full-Time
   link on the site pointed at fulltime.thefa.com, which is a search box.

   BUILT FROM THE FOUR IDS, never written out. Full-Time addresses a division
   with league + season + division + fixture group and every page takes the
   same four, so writing four URLs by hand is four chances to get one wrong and
   four things to change next August. The ids live in
   src/data/league-eight-2627.json beside the club list they describe.

   Dependency-free and it takes the ids as an argument, so the suite can run it
   over a crafted set rather than only over whatever the club is in this year.

   RETURNS NULL WHEN IT CANNOT BUILD A REAL LINK. A season with no ids on
   record is the normal state of a division nobody has looked up yet, and a
   half-built query string would land a reader on somebody else's league - a
   wrong link is worse than no link, because it looks like it worked.
   ========================================================================== */

/* Every page takes the same query. selectedCompetition=0 is Full-Time's own
   "no cup filter" value and is required: without it the division pages fall
   back to the whole league.

   CUP TIES ARE ASKED FOR, NOT INHERITED. This club plays four cup
   competitions and fifteen of its matches are cup ties, so a fixture list
   that showed league football alone would be missing a quarter of the
   season - and worse, a supporter checking a Sunday would find nothing and
   conclude there was no game.

   `selectedRelatedFixtureOption=3` is Full-Time's "include other groups and
   County Cups". It is ALSO its current default, which is exactly why it is
   pinned: a link that works because of somebody else's default is a link that
   changes when they change it, silently, and nothing here would notice.

   It goes on the fixture and result lists only. A table is league football by
   definition and the scoring charts have their own scope, so adding it there
   would be noise pretending to be a decision. */
const CUPS = 'selectedRelatedFixtureOption=3';
const PAGES = {
  table: { page: 'table.html' },
  fixtures: { page: 'fixtures.html', cups: true },
  results: { page: 'results.html', cups: true },
  scorers: { page: 'statLeaders.html' },
};

export function fulltimeLinks(ids) {
  const { league, season, division, fixtureGroup } = ids || {};
  if (!league || !season || !division) return null;
  const base = [
    `league=${encodeURIComponent(league)}`,
    `selectedSeason=${encodeURIComponent(season)}`,
    `selectedDivision=${encodeURIComponent(division)}`,
    'selectedCompetition=0',
    ...(fixtureGroup ? [`selectedFixtureGroupKey=${encodeURIComponent(fixtureGroup)}`] : []),
  ];
  const out = {};
  for (const [key, spec] of Object.entries(PAGES)) {
    const q = spec.cups ? [...base, CUPS] : base;
    out[key] = `https://fulltime.thefa.com/${spec.page}?${q.join('&')}`;
  }
  return out;
}
