/* ==========================================================================
   SEASON VIEWS

   Four pages now offer the same choice - every season the club has played,
   plus all of them together - and the first three grew their own tab bar,
   their own id scheme and their own show-the-right-panel script. That is
   three chances for them to disagree about what "26/27" means and three
   places to fix when a fourth season starts.

   This is the one answer. A page asks for `views(d)`, renders one panel per
   view, and wraps them in the markup `seasonBar` and `seasonViews` emit. The
   generic switcher in src/scripts/10-home.js does the rest, so a page adding
   a season filter writes no JavaScript at all.

   WHY EVERY PANEL SHIPS IN THE HTML rather than being fetched: with the
   script blocked the page still shows the season it opens on, which is a
   correct page rather than an empty one. The panels are small - a handful of
   cards or a list - and the whole point of this site is that it reads without
   JavaScript.
   ========================================================================== */

/* Every season the club has played, oldest first, then all of them. The id is
   what the markup and the script agree on; the label is what a reader sees. */
export function seasonViews(d) {
  const seasons = (d.seasons || []).map((s) => s.name);
  const played = d.played || [];
  /* TWO LISTS PER VIEW, and the difference matters.

     `matches` is every completed match in the season, which is what a results
     list shows: a pre-season friendly was played, has a report and a page,
     and belongs on the page. `competitive` is the same list without the
     friendlies, and it is what every FIGURE beside that list is counted from,
     because a friendly counts towards nothing. See isFriendly() in stats.mjs.

     Handing one list to both is how a played-won-drawn-lost quietly picks up
     a pre-season result. */
  const view = (name, list) => ({
    key: name === 'all' ? 'all' : name,
    id: name === 'all' ? 'all' : (name.replace(/\D/g, '') || name.replace(/\W/g, '')),
    label: name === 'all' ? 'All seasons' : name,
    matches: list,
    competitive: list.filter((m) => !m.friendly),
    friendlies: list.filter((m) => m.friendly),
  });
  const out = seasons.map((name) => view(name, played.filter((m) => m.season === name)));
  out.push(view('all', played.slice()));
  return out;
}

/* Which one a page opens on: the most recent season that has actually been
   played. Landing on a season nobody has kicked a ball in shows a screen of
   noughts and reads as broken, and landing on "all seasons" buries the thing
   most people came for. */
export function defaultView(views) {
  /* The most recent season with a COMPETITIVE match in it. Counting every
     match opened the results page on 26/27 the moment a pre-season friendly
     was played, under a record reading Played 0, Won 0, Scored 0, because a
     friendly counts towards none of them. A season is worth opening on when
     there is something to show. */
  let i = 0;
  views.forEach((v, n) => { if (v.key !== 'all' && (v.competitive || v.matches).length) i = n; });
  return i;
}

/* The bar. `note(v)` supplies the small line under each label; returning an
   empty string leaves the label on its own. */
export function seasonBar(views, active, note, { esc, attr, label = 'Season' } = {}) {
  if (views.length < 2) return '';
  return `<div class="sn-tabs" data-season-switch role="group" aria-label="${attr(label)}">
        ${views.map((v, i) => {
    const sub = note ? note(v) : '';
    /* data-season carries the season's own name, not the id, because that is
       what a match card is stamped with and what any other filter on the page
       compares against. "all" means no filter rather than a season. */
    return `<button class="sn-tab${i === active ? ' is-on' : ''}" type="button"
          data-view="${attr(v.id)}" data-season="${attr(v.key === 'all' ? 'all' : v.key)}"
          aria-pressed="${i === active ? 'true' : 'false'}">
          <b>${esc(v.label)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}
        </button>`;
  }).join('\n        ')}
      </div>`;
}

/* The panels. `render(v)` returns the body for one view. */
export function seasonPanels(views, active, render, { attr } = {}) {
  return `<div data-season-views>
        ${views.map((v, i) => `<div class="sn-view" data-season-view="${attr(v.id)}"${i === active ? '' : ' hidden'}>
          ${render(v)}
        </div>`).join('\n        ')}
      </div>`;
}

/* How many matches a view covers, in the words the tabs use. Said out loud
   because "26/27" with nothing under it looks like a page that failed rather
   than a season that has not started. */
export function matchNote(v) {
  const n = v.matches.length;
  if (!n) return 'Not started';
  /* NAMES BOTH KINDS WHEN THERE ARE BOTH. Every page using this bar counts
     its figures from `competitive`, so a chip reading "34 matches" above a
     record built from 33 was over-promising by exactly one pre-season
     friendly, and 26/27 read "1 match" above a screen of noughts. Saying
     "33 matches · 1 friendly" is true wherever the bar appears: on results,
     which lists both, and on records and awards, which count one. */
  const c = (v.competitive || v.matches).length;
  const f = (v.friendlies || []).length;
  const matches = (k) => `${k} match${k === 1 ? '' : 'es'}`;
  const friendlies = `${f} friendl${f === 1 ? 'y' : 'ies'}`;
  if (!f) return matches(c);
  return c ? `${matches(c)} · ${friendlies}` : friendlies;
}
