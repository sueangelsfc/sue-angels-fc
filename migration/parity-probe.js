/* Parity probe — paste-run in the preview console (or via preview_eval) on any page.
   Returns a normalized signature used to verify the build migration changes NOTHING
   about rendered behaviour. Capture a baseline on `main`, then re-run on the migration
   branch and diff the JSON per page. Text + structure diffs catch real regressions;
   visual screenshots supplement for pixel checks.

   Usage (preview_eval): return JSON.stringify(window.__parityProbe()); then save to
   migration/baseline/<page>.json. Re-run later into migration/candidate/<page>.json. */
window.__parityProbe = function () {
  var root = document.querySelector('#rd-root');
  var norm = function (s) { return (s || '').replace(/\s+/g, ' ').trim(); };
  var count = function (sel) { return document.querySelectorAll(sel).length; };
  // rendered main content text (the primary behavioural oracle)
  var main = document.querySelector('#rd-root main') || root;
  return {
    path: location.pathname,
    saTab: window.SA_TAB || null,
    title: document.title,
    metaDesc: (document.querySelector('meta[name=description]') || {}).content || null,
    jsonLdBlocks: count('script[type="application/ld+json"]'),
    // structural fingerprint — component counts across the design system
    counts: {
      sections: count('#rd-root section'),
      headerNav: count('#rd-root header a, #rd-root header button'),
      cineHero: count('.cine'),
      pillars: count('.mh-pillar'),
      awardCards: count('.mh-awcard'),
      ledgerTiles: count('.mh-ltile'),
      resultCards: count('.mh-res'),
      fullTable: count('.mh-table--full'),
      ltable: count('.mp-ltable'),
      tableRows: count('.mh-table--full tr, .mp-ltable tr'),
      newsCards: count('.mp-news'),
      playerCards: count('.mp-player'),
      galleryCells: count('.gfx__cell, .ma-album'),
      footerLinks: count('.mh-footer a'),
      forms: count('form'),
      images: count('#rd-root img'),
      dataTilt: count('[data-tilt]')
    },
    // first 4000 chars of normalized rendered text — diff this for content parity
    text: norm(main.innerText).slice(0, 4000),
    textLen: norm(main.innerText).length,
    // sanity: critical globals present
    globals: {
      react: typeof window.React !== 'undefined',
      dataStore: typeof window.getDerivedResults !== 'undefined',
      pageShell: typeof window.resolveBadge !== 'undefined',
      teamBadge: typeof window.TeamBadge !== 'undefined'
    },
    noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1
  };
};
window.__parityProbe();
