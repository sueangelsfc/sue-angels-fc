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

/* The default order, which is also the order these were written in. `name` is
   what the band calls itself ON THE PAGE, so the panel and the website use one
   vocabulary: somebody who has just read "Ask the Angels" on the home page can
   find it in the list without translating. */
export const HOME_BANDS = [
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
  return KNOWN.has(key);
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

  const hidden = new Set(
    ((rec && Array.isArray(rec.hidden)) ? rec.hidden : []).filter((k) => KNOWN.has(k)),
  );

  return {
    order,
    hidden,
    /* True when this is the page as it ships, which is what lets the panel say
       "the standard order" rather than describing a change nobody made. */
    isDefault: hidden.size === 0 && order.join(',') === KEYS.join(','),
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
