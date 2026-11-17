/* ==========================================================================
   FINDING ANYTHING ON 198 PAGES

   The site publishes 198 pages - 47 players, 48 matches, 34 opponents, 22
   articles, 12 grounds - and there has never been a way to find one. A
   reader who wants Charlie Dunkley's profile has to guess that Squad is the
   way in; a reader who wants the 8-1 against Haydons Park has to know it was
   September. The nav is eight items and the sitemap is for crawlers.

   THE WHOLE INDEX IS IN THE HTML, and that is the decision everything else
   follows from.

   - `sa.js` has 92 bytes left of its 24KB ceiling, so a search cannot go in
     the bundle every visitor downloads. This page carries its own script
     (`search.js`), linked by this page alone, the way control.css is linked
     by control.html alone.
   - And because the index ships as markup, the script has nothing to fetch
     and nothing to parse: it filters a list that is already on the screen.
     Which means the no-JavaScript fallback is not a fallback at all - it is
     a complete, browsable index of the website, grouped and linked. This
     project's rule is that a page revealed by script is a page a script
     failure blanks; here a script failure leaves every one of the 198 links
     exactly where it was.

   THE LIST COMES FROM THE BUILD'S OWN CATALOGUE, the same one the panel's
   website-stats screen reads as stats-pages.json. One statement of what this
   site publishes, two readers. A second list derived from `d` would be the
   fault this repository keeps having - and it would drift the first time
   somebody added a route family, which is exactly what just happened twice.

   It is therefore THE LAST PAGE WRITTEN, after every other route, because it
   is a page about the pages.
   ========================================================================== */

import { esc, attr } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { siteFooter, sitePreMain, siteHeader } from './home.mjs';
import { fmtDate } from '../lib/stats.mjs';

/* The groups, in the order a reader is most likely to want them, with the
   plural the heading needs. `panel` is deliberately absent: the control panel
   is noindex and reached by typing a word, and listing it here would publish
   the doorway on the one page built for finding things. */
const GROUPS = [
  ['player', 'Players', 'player', 'players'],
  ['match', 'Matches', 'match', 'matches'],
  ['club', 'Opponents', 'opponent', 'opponents'],
  ['news', 'News and reports', 'article', 'articles'],
  ['ground', 'Grounds', 'ground', 'grounds'],
  ['gallery', 'Photo albums', 'album', 'albums'],
  ['coach', 'Staff', 'member of staff', 'staff'],
  ['main', 'Pages', 'page', 'pages'],
  ['home', 'Pages', 'page', 'pages'],
];

/* The singular and the plural ride on the element, because the script
   rewrites this caption as the list narrows and "1 matches" is the kind of
   thing a reader notices immediately. */
const rail = (n, count, one, many) => `<div class="xrail" aria-hidden="true">
    <span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span>
    <span class="xrail__l" data-one="${attr(one)}" data-many="${attr(many)}">${esc(`${count} ${count === 1 ? one : many}`)}</span>
  </div>`;

/* What a row is matched against. The club's own `alternateNames` exist
   because people search without the apostrophe and without the FC, and the
   same is true of a surname: somebody looking for Ade Owolana may well type
   "owolana" and somebody looking for the Peps tie may type "peps all stars".
   So the haystack is the title with its punctuation flattened, plus the
   singular name of what the row IS - "player", "ground" - so that typing the
   kind lists the kind.

   AN APOSTROPHE VANISHES, IT DOES NOT BECOME A SPACE. Every other separator
   collapses to a space and the first version did the same to this one, which
   turns "Sue's Angels" into "sue s angels" - and "sues angels" does not match
   that, so THE ONE SEARCH THIS CLUB'S OWN NAME INVITES RETURNED NOTHING AT
   ALL. The version that shipped it carried a comment claiming to handle
   exactly that case; it was found by typing it into the page in a browser,
   which is the only thing that could have found it. "O'Connor" and "oconnor"
   are the same question for the same reason.

   THERE ARE TWO COPIES OF THIS RULE, one here and one in search.js, because
   one runs in Node and one in the browser. The suite runs both over the same
   strings and fails if they ever part company - the device this project
   already uses for the home page's ordering rule, and the reason this
   function is exported. */
export function flat(v) {
  return String(v || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['\u2018\u2019\u02bc]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function search(d, catalogue) {
  const rows = (catalogue || []).filter((r) => r.k !== 'panel' && r.p && r.t);

  /* One section per group, in GROUPS order, with `main` and `home` folded
     together: the front page is a page like any other to somebody looking
     for it. A group the site does not publish draws nothing rather than an
     empty heading. */
  const seen = new Set();
  const groups = [];
  for (const [, heading, noun, plural] of GROUPS) {
    if (seen.has(heading)) continue;
    seen.add(heading);
    const kinds = GROUPS.filter((g) => g[1] === heading).map((g) => g[0]);
    const list = rows.filter((r) => kinds.includes(r.k));
    if (list.length) groups.push({ heading, noun, plural, list });
  }

  const total = rows.length;

  const row = (r, noun) => {
    const date = r.d ? fmtDate(r.d) : '';
    return `<li class="se-row" data-se="${attr(`${flat(r.t)} ${flat(noun)} ${flat(date)}`)}">
          <a class="se-row__a" href="${attr(r.p)}">
            <span class="se-row__t">${esc(r.t)}</span>
            <span class="se-row__m">${esc(noun)}${date ? ` · ${esc(date)}` : ''}</span>
          </a>
        </li>`;
  };

  const hero = `<section class="sec se-hero" aria-labelledby="se-h">
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> ${esc(String(total))} pages</p>
        <h1 class="se-hero__title" id="se-h">Find <span class="volt">anything.</span></h1>
        <p class="se-hero__lede">Every page on this website, in one list: every player, every match,
          every club played, every ground, every article and every album. Start typing to narrow it.</p>
        ${/* A real label, visible, because a magnifying glass is a picture and
             this is the one control on the page. `type="search"` is what gives
             a phone the right keyboard and a clear button. */''}
        <div class="se-box">
          <label class="se-box__l" for="se-q">Search this website</label>
          <input class="se-box__i" id="se-q" type="search" name="q" autocomplete="off"
            spellcheck="false" placeholder="A name, a club, a ground, a season" />
        </div>
        ${/* The count is announced, not only shown: a reader using a screen
             reader gets no information at all from a list quietly shortening.
             It opens saying what is there, so it is never empty furniture. */''}
        <p class="se-box__n" data-se-count role="status" aria-live="polite">${esc(String(total))} pages</p>
        <p class="se-box__none" data-se-none hidden>Nothing matches that. Try a surname, a club,
          a ground or a season - or clear the box to see all ${esc(String(total))} pages again.</p>
      </div>
    </section>`;

  const bands = groups.map((g, i) => `<section class="sec se-g" data-se-group aria-labelledby="se-g-${i}">
      <div class="wrap">
        ${/* The rail carries the COUNT, not the heading again. `.xrail__r` is
             display:none below 768 site-wide, so a count put there vanishes on
             exactly the screen where scrolling to the end of a group to count
             it is hardest - and a rail label reading PLAYERS directly above an
             h2 reading Players. is the same word twice in two typefaces. */''}
        ${rail(i + 1, g.list.length, g.noun, g.plural)}
        <h2 class="h2" id="se-g-${i}">${esc(g.heading)}<span class="volt">.</span></h2>
        <ul class="se-list" role="list">
          ${g.list.map((r) => row(r, g.noun)).join('\n          ')}
        </ul>
      </div>
    </section>`).join('\n');

  return {
    body: siteHeader('/search.html') + hero + bands,
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    shell: 'home',
    css: 'home.css',
    bodyClass: 'is-home is-sub is-search',
    schema: [{
      '@type': 'CollectionPage',
      name: `Find anything · ${CLUB.name}`,
    }],
  };
}
