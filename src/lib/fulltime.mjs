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
   back to the whole league. */
const PAGES = {
  table: 'table.html',
  fixtures: 'fixtures.html',
  results: 'results.html',
  scorers: 'statLeaders.html',
};

export function fulltimeLinks(ids) {
  const { league, season, division, fixtureGroup } = ids || {};
  if (!league || !season || !division) return null;
  const q = [
    `league=${encodeURIComponent(league)}`,
    `selectedSeason=${encodeURIComponent(season)}`,
    `selectedDivision=${encodeURIComponent(division)}`,
    'selectedCompetition=0',
    ...(fixtureGroup ? [`selectedFixtureGroupKey=${encodeURIComponent(fixtureGroup)}`] : []),
  ].join('&');
  const out = {};
  for (const [key, page] of Object.entries(PAGES)) {
    out[key] = `https://fulltime.thefa.com/${page}?${q}`;
  }
  return out;
}
