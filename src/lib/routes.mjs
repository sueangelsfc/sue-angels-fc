/* ==========================================================================
   WHICH ROUTES ARE LIVE

   The site is being rebuilt one page at a time on top of the new homepage,
   so only the routes named here are generated. Everything else stays unbuilt
   rather than shipping the retired design alongside the new one.

   This lives in its own module because two things need the same answer: the
   generator, which decides what to write, and the test suite, which has to
   tell a genuinely broken link apart from a link to a page the rebuild has
   not reached yet. When those two disagreed, the suite reported fourteen
   failures that were really one deliberate decision.

   To bring a page back: move its filename from PENDING_ROUTES to
   LIVE_ROUTES. The build asserts the two lists still account for every route
   it knows about, so they cannot drift apart silently.
   ========================================================================== */

export const LIVE_ROUTES = new Set([
  'index.html',
  'about.html',
  'sepsis.html',
  'champions.html',
  'awards.html',
  'sponsors.html',
  'squad.html',
  'stats.html',
  'coaches.html',
  'fixtures.html',
  'results.html',
  'league.html',
  'records.html',
  'live.html',
  'news.html',
  'gallery.html',
  'videos.html',
  'join.html',
  'contact.html',
  '404.html',
]);

/* Detail families: 'players' | 'matches' | 'news' | 'gallery'. */
export const LIVE_GROUPS = new Set(['players', 'news', 'matches', 'gallery']);

/* Routes the rebuild has not reached. A link to one of these resolves on the
   live site and will resolve here again once the page is rebuilt, so the
   suite counts them rather than failing on them. */
export const PENDING_ROUTES = new Set([]);

export const PENDING_GROUPS = new Set([]);

export const isLive = (file) => LIVE_ROUTES.has(file);
export const groupLive = (name) => LIVE_GROUPS.has(name);

/* True for a link target that is simply awaiting its rebuild, false for one
   that is misspelt or points at a page the site will never have. */
export function isPending(target) {
  const clean = String(target || '').replace(/^\//, '');
  if (PENDING_ROUTES.has(clean)) return true;
  const group = clean.split('/')[0];
  return clean.includes('/') && PENDING_GROUPS.has(group) && !LIVE_GROUPS.has(group);
}
