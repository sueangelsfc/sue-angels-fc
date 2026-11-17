/* ==========================================================================
   A GROUND THE ANGELS PLAY AT  (/grounds/<slug>.html)

   The club records where every match was played and canonicalises the
   spellings, and until this module not one of those fifteen names was a page.
   What a reader wants from a ground is three things the site already holds or
   can derive - where it is, how to get there, and what has happened there -
   and the first of those is the one real gap: `venues.json` knows fifteen
   grounds and carries an address for ONE. So the page says so plainly and
   names the screen that fixes it, rather than printing a map link to a
   search that may land anywhere.

   WHO GETS A PAGE IS EVIDENCE, the same rule the opponent pages keep: a
   match played there, or a fixture still to come. A name in the canonical
   map with neither is a spelling, not a ground.

   AND TWO OF THE NAMES ARE NOT GROUNDS AT ALL. "Woking Veterans Sundays" and
   "Tattenham Rovers" are the opponent's club name typed into the venue field
   on an away tie. venues.json keeps them on purpose - they do say where the
   match was, in the way a Sunday-league player would say it - but a page
   titled with a club's name, carrying a map link and a parking line, would
   be the site inventing a ground. They are named in `notGrounds` there,
   because which strings are grounds is a fact about the data rather than a
   rule anybody can derive from it.
   ========================================================================== */
import { slugify, teamSummary } from './stats.mjs';
import { clubIdentity } from './club-name.mjs';

export function groundPages(d, venuesFile) {
  const notGrounds = new Set(((venuesFile && venuesFile.notGrounds) || [])
    .map((n) => String(n).toLowerCase()));
  const byName = new Map();
  const take = (venue) => {
    const name = String(venue || '').trim();
    if (!name || notGrounds.has(name.toLowerCase())) return null;
    if (!byName.has(name)) byName.set(name, { name, matches: [], fixtures: [] });
    return byName.get(name);
  };

  for (const m of (d.played || [])) {
    const rec = take(m.venue);
    if (rec) rec.matches.push(m);
  }
  for (const f of (d.upcoming || [])) {
    const rec = take(f.venue);
    if (rec) rec.fixtures.push(f);
  }

  return [...byName.values()].map((rec) => {
    const matches = rec.matches.slice()
      .sort((a, b) => String(b.iso || '').localeCompare(String(a.iso || '')));
    const ground = d.groundFor ? d.groundFor(rec.name) : { name: rec.name };
    /* HOME IS WHERE THE CLUB WAS THE HOME SIDE, counted rather than assumed.
       A ground is not "the home ground" because most matches there were
       home: Meadhurst has nine, every one of them home, and Clapham Common
       has four, none of them. A cup final at a neutral ground is neither,
       and the record already carries that. */
    const home = matches.filter((m) => m.weAreHome && !m.neutral).length;
    const away = matches.filter((m) => !m.weAreHome && !m.neutral).length;
    return {
      name: rec.name,
      slug: slugify(rec.name),
      matches,
      fixtures: rec.fixtures.slice()
        .sort((a, b) => String(a.iso || '').localeCompare(String(b.iso || ''))),
      summary: teamSummary(matches),
      home,
      away,
      neutral: matches.filter((m) => m.neutral).length,
      address: ground.address || '',
      parking: ground.parking || '',
      mapQuery: ground.mapQuery || rec.name,
      /* Who has been met here, one row per club rather than per spelling,
         on the identity the head-to-head pages group on so a ground and a
         club page cannot disagree about who was played. */
      clubs: (() => {
        const seen = new Map();
        for (const m of matches) {
          if (!m.opponent) continue;
          const k = clubIdentity(m.opponent) || m.opponent;
          if (!seen.has(k)) seen.set(k, m.opponent);
        }
        return [...seen.values()];
      })(),
    };
  }).filter((g) => g.matches.length || g.fixtures.length)
    .sort((a, b) => b.matches.length - a.matches.length
      || String(a.name).localeCompare(String(b.name)));
}
