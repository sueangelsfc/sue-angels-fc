/* ==========================================================================
   WHAT THE HOME PAGE SHOWS, AND IN WHAT ORDER

   The home page was eight bands in one fixed order typed into one line of
   home.mjs. That order was a developer's opinion from July, and the club had
   no way to change it: in August the table band led with an empty League Eight
   season while the news of promotion sat four screens down.

   So the order is a record now, `home:layout`, written in Control panel ->
   Home page. This module is the single definition of what a band IS, and it
   is read by three things that must never disagree:

     - src/templates/home.mjs   draws the page in this order
     - src/build.mjs            seeds the list into the control panel
     - src/admin/lazy/95-home.js  offers exactly these and no others

   The panel cannot offer a band the site cannot draw, because it is handed
   this list rather than holding its own copy.

   ABSENT MEANS THE STANDARD ORDER. No record, an empty record, a record full
   of names this file has never heard of: all three produce the page exactly as
   it shipped, band for band. Nothing already saved needs migrating and
   deleting the record puts the original back.
   ========================================================================== */
import { hasReport } from './prose.mjs';
import { preseasonFor, seasonAhead } from './preseason.mjs';
import { clubRecords, milestones } from './stats.mjs';
import { SPONSORS, CLUB } from './club.mjs';

/* The default order, which is also the order these were written in. `name` is
   what the band calls itself ON THE PAGE, so the panel and the website use one
   vocabulary: somebody who has just read "Ask the Angels" on the home page can
   find it in the list without translating. */
export const HOME_BANDS = [
  /* PRE-SEASON LEADS, and it is first HERE rather than in a saved record
     because the club has never saved one: with no record the page takes this
     order, so this list is the club's front page until somebody rearranges it
     in the panel, at which point their record wins outright.

     It is safe to lead with because it takes itself off. `homeBandFilled`
     reports it empty the moment a competitive match is played, so the day
     League Eight starts the front page goes back to leading with the news
     without anybody remembering to change it. A hard-coded lead that could
     not do that would be a promise to go stale. */
  {
    key: 'preseason',
    name: 'Pre-season',
    what: 'The friendly programme, the record across it, who has scored and who has '
      + 'made a first appearance. Takes itself off the page once the league starts.',
  },
  /* Beside pre-season, because they are one thought: the friendlies being
     played and the division they are preparation for. It retires on the same
     kind of evidence, when the division has started. */
  {
    key: 'ahead',
    name: 'The season ahead',
    what: 'The clubs in the new division and what the archive already holds on each of them.',
  },
  {
    key: 'report',
    name: 'A match report',
    what: 'A match report: the headline, the score and the opening, with a link to the whole thing.',
    pick: 'match',
    auto: 'The most recent report',
  },
  {
    key: 'news',
    name: 'Club news',
    what: 'The six most recent articles, newest first.',
  },
  {
    key: 'who',
    name: 'More than a result',
    what: 'Who the club is and why it plays, with the link to the cause.',
  },
  {
    key: 'awards',
    name: 'Award winners',
    what: 'Season awards, Player of the Month and the club records.',
  },
  {
    key: 'campaign',
    name: 'The campaign',
    what: 'The season so far: played, won, goals, clean sheets, the form strip.',
  },
  {
    key: 'results',
    name: 'Recent results',
    what: 'The last seven matches played, with scores and opponents.',
  },
  {
    key: 'table',
    name: 'The table',
    what: 'The league table as it stands, with the club marked.',
  },
  {
    key: 'faq',
    name: 'Ask the Angels',
    what: 'The questions new players, parents and sponsors actually ask.',
  },
  {
    key: 'cta',
    name: 'Pull on the shirt',
    what: 'Trials, volunteering, media and sponsorship. The way in.',
  },

  /* ---- The three the club can add ------------------------------------------
     Off until somebody turns them on, which is what keeps "no record" meaning
     the page exactly as it shipped. Each one publishes something the club
     already makes and the front page has never shown: seven match reports
     between 341 and 757 words, 606 photographs across seven albums, and
     thirty-seven players.

     Each also takes a PICK. The default is derived (the newest report, the
     newest album, the season's leading scorer) so the band keeps itself
     current with nobody maintaining it; choosing one is an editorial override
     and the panel says how old it has gone. That is the honest split: the
     site decides what is most recent, the club decides when to overrule it. */
  {
    key: 'photos',
    name: 'Photographs',
    what: 'A row of pictures from one album, with a link to the album.',
    off: true,
    pick: 'album',
    auto: 'The newest album',
  },
  {
    key: 'spotlight',
    name: 'A player',
    what: 'One player: photograph, position and what he has done for the club.',
    off: true,
    pick: 'player',
    auto: 'The club’s leading scorer',
  },
  {
    key: 'sponsors',
    name: 'Who backs the club',
    what: 'The club’s partners, their marks on a white tile so the colours stay true.',
    off: true,
  },
  {
    key: 'staff',
    name: 'The people running it',
    what: 'The manager and the coaching staff, with what each of them does.',
    off: true,
  },
  {
    key: 'records',
    name: 'Club records',
    what: 'Biggest win, longest unbeaten run, most goals, most appearances. All derived.',
  },
  {
    key: 'milestones',
    name: 'Milestones in sight',
    what: 'Who is within a few of a round number. Works itself out and empties when nobody is close.',
  },
  {
    key: 'ground',
    name: 'Where the club plays',
    what: 'The home ground, how to reach it and when. For opponents, trialists and anybody '
      + 'turning up for the first time.',
    off: true,
  },
];

const KEYS = HOME_BANDS.map((b) => b.key);
const KNOWN = new Set(KEYS);

/* WHICH BANDS CAN BE EMPTY, and the only two that can.

   A band with nothing in it is not published whatever the club has chosen, and
   it must not take a number in the reference strip either. Both callers ask
   this same question rather than each deciding for itself, so the panel can
   never show a switch beside a band the page is going to drop anyway.

   Everything else draws from club facts that always exist: the club always has
   a story, a record, a set of questions and a way in. */
export function homeBandFilled(key, d) {
  if (key === 'news') return ((d && d.articles) || []).length > 0;
  if (key === 'table') return ((d && d.table) || []).length > 0;
  if (key === 'report') return reportsIn(d).length > 0;
  if (key === 'photos') return albumsIn(d).length > 0;
  if (key === 'spotlight') return playersIn(d).length > 0;
  /* PRE-SEASON EMPTIES ITSELF. The band is only true while the club is in
     pre-season, so it is treated as empty once a competitive match has been
     played and the page drops it without anybody switching it off. A band
     still calling September's league football "pre-season" in October is the
     failure this prevents. */
  if (key === 'preseason') {
    const ps = preseasonFor(d);
    return !ps.isOver && (ps.played.length > 0 || ps.toCome.length > 0);
  }
  /* And the season ahead stops being ahead once it is under way. */
  if (key === 'ahead') {
    const a = seasonAhead(d);
    return a.clubs.length > 0 && !a.started;
  }
  if (key === 'sponsors') return (SPONSORS || []).length > 0;
  if (key === 'staff') return ((d && d.coaches) || []).length > 0;
  if (key === 'records') return clubRecords((d && d.competitive) || [], (d && d.players) || []).length > 0;
  /* Milestones empty themselves. Nobody is always within three of a round
     number, and a heading over an empty list is worse than no heading. */
  if (key === 'milestones') return milestones((d && d.players) || []).length > 0;
  if (key === 'ground') return !!(CLUB.ground && CLUB.ground.name);
  return KNOWN.has(key);
}

/* ---- What each pick can choose from ---------------------------------------
   One definition, used by the page to resolve a pick and by the build to seed
   the panel's dropdown. The panel therefore cannot offer a match with no
   report, or an album that was deleted, because it is handed the same list the
   page reads. Ordered newest first: the first entry IS the derived default. */

/* `hasReport` rather than a second length test. What counts as a report is
   already decided once in prose.mjs ("long enough to be a report rather than a
   caption": three matches carry a scoreline in a sentence and do not qualify),
   and a band that disagreed with it would put a heading promising the full
   report over a note. */
export function reportsIn(d) {
  return ((d && d.played) || [])
    .filter(hasReport)
    .slice()
    .sort((a, b) => String(b.iso || '').localeCompare(String(a.iso || '')));
}

export function albumsIn(d) {
  return ((d && d.galleries) || []).slice()
    .sort((a, b) => String(b.matchIso || b.date || '').localeCompare(String(a.matchIso || a.date || '')));
}

/* Leading scorer first, so an untouched spotlight names whoever is having the
   season. Goals, then assists, then appearances, so it is never a coin toss
   that changes on rebuild. */
export function playersIn(d) {
  return ((d && d.players) || []).slice().sort((a, b) =>
    (b.goals || 0) - (a.goals || 0)
    || (b.assists || 0) - (a.assists || 0)
    || (b.starts || 0) - (a.starts || 0)
    || String(a.name || '').localeCompare(String(b.name || '')));
}

const CHOICES = { report: reportsIn, photos: albumsIn, spotlight: playersIn };
const IDENT = {
  report: (m) => String(m.id || m.slug || ''),
  photos: (g) => String(g.key || g.slug || ''),
  spotlight: (p) => String(p.num),
};

/* THE ITEM A BAND PUBLISHES: the club's pick when it still resolves, and the
   derived default otherwise.

   "Otherwise" is doing real work. A pick is a pointer into content the club
   edits elsewhere, so it can be aimed at a match whose report was cleared, an
   album that was deleted or a player who left. Falling back to the newest
   keeps the band publishing something true rather than leaving a heading over
   a hole, and the panel says when a pick has stopped resolving. */
export function featuredFor(key, rec, d) {
  const list = (CHOICES[key] || (() => []))(d);
  if (!list.length) return null;
  const want = rec && rec.pick && rec.pick[key];
  if (want == null || want === '') return list[0];
  const ident = IDENT[key];
  return list.find((x) => ident(x) === String(want)) || list[0];
}

/* Whether the club's pick is the one being published, for the panel to say so
   plainly rather than showing a chosen name beside a different picture. */
export function pickResolves(key, rec, d) {
  const want = rec && rec.pick && rec.pick[key];
  if (want == null || want === '') return true;
  const list = (CHOICES[key] || (() => []))(d);
  const ident = IDENT[key];
  return list.some((x) => ident(x) === String(want));
}

/* Turn the stored record into an order and a hidden set.

   Three properties, each of them the fix for a way this could rot:

   1. A name this file has never heard of is DROPPED. A band removed from the
      site leaves its name behind in a record nobody edits again, and reading
      it back would put an undefined into the page.

   2. A band the record does not name is INSERTED WHERE IT BELONGS, not
      appended. Adding a ninth band next season would otherwise land it at the
      bottom of the page for every club that has ever touched this screen, and
      look like a bug in the new band rather than in this function. It goes
      after the nearest band above it that the stored order does hold, so a
      new band arrives among its own neighbours.

   3. Hiding is a SEPARATE list from the order. Turning a band off and on again
      puts it back where it was rather than at the end, which is what makes
      this safe to experiment with. */
export function resolveHomeLayout(rec) {
  const raw = (rec && Array.isArray(rec.order)) ? rec.order : [];
  const seen = new Set();
  const order = [];
  for (const k of raw) {
    if (!KNOWN.has(k) || seen.has(k)) continue;
    seen.add(k);
    order.push(k);
  }

  HOME_BANDS.forEach((b, i) => {
    if (seen.has(b.key)) return;
    let at = 0;
    for (let j = i - 1; j >= 0; j -= 1) {
      const p = order.indexOf(HOME_BANDS[j].key);
      if (p >= 0) { at = p + 1; break; }
    }
    order.splice(at, 0, b.key);
    seen.add(b.key);
  });

  /* OFF UNTIL ASKED FOR, and asked for means NAMED IN THE ORDER.

     A band added to the site after a club has already arranged its home page
     must not switch itself on for them. Reading `hidden` alone would do
     exactly that: an existing record says `hidden: []`, which is authoritative
     and does not mention a band that did not exist when it was written, so
     every new band would arrive already published on every site that had ever
     touched this screen.

     The order is the tell. The panel always writes every band it knows into
     `order`, so a band missing from a stored order is one the record predates,
     and a default-off band that nobody has opted into stays off. */
  const named = new Set(raw.filter((k) => KNOWN.has(k)));
  const hidden = new Set(
    ((rec && Array.isArray(rec.hidden)) ? rec.hidden : []).filter((k) => KNOWN.has(k)),
  );
  for (const b of HOME_BANDS) {
    if (b.off && !named.has(b.key)) hidden.add(b.key);
  }

  const defaultHidden = HOME_BANDS.filter((b) => b.off).map((b) => b.key).join(',');
  return {
    order,
    hidden,
    /* True when this is the page as it ships, which is what lets the panel say
       "the standard order" rather than describing a change nobody made. */
    isDefault: order.join(',') === KEYS.join(',')
      && [...hidden].sort().join(',') === defaultHidden.split(',').sort().join(','),
  };
}

/* The bands actually published, in order, for a given dataset: chosen, not
   hidden, and not empty. This is the list the page draws AND the list the
   reference strip numbers 01, 02, 03 from, so a hidden band cannot leave a
   gap in the numbering. */
export function publishedBands(rec, d) {
  const { order, hidden } = resolveHomeLayout(rec);
  return order.filter((k) => !hidden.has(k) && homeBandFilled(k, d));
}

export const HOME_BAND_KEYS = KEYS;
