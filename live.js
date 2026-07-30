/*
 * live.js — hydrates the redesign's baked HTML from real club data.
 *
 * HOW THE DATA ACTUALLY WORKS (worth knowing before editing this)
 * There are two sources and they are merged, not alternatives:
 *
 *   1. PageShell.js  — the CODE baseline. Holds RAW_TABLE (the 10-club league
 *      table), LEAGUE_RESULTS (90 division results), LEAGUE_STATS (the 25-player
 *      scorer chart), SQUAD, COACHES, SEASON_RESULTS, UPCOMING_FIXTURES.
 *   2. Supabase via data.js — the OVERRIDES and CMS additions: custom players
 *      and coaches, player photos, retired/departed status, sponsors, articles,
 *      gallery albums, videos, league corrections, hero images.
 *
 * PageShell.js calls applyLeagueOverrides() and applyCustomRoster() at load, so
 * by the time this file runs the globals already reflect both sources. That is
 * why the script order in every page is: supabase-config, data.js, PageShell.js,
 * match-context.js, live.js.
 *
 * PROGRESSIVE BY DESIGN
 * Nothing here is required for the page to be readable. Each renderer targets a
 * [data-live="name"] container and only replaces its contents once it has real
 * data to show. If a renderer finds nothing, or throws, the baked HTML stays
 * exactly as authored — which keeps the pages working with JS off, keeps them
 * crawlable, and means a Supabase outage degrades to yesterday's markup rather
 * than a blank page.
 *
 * Renders twice on purpose: once immediately from the code baseline (available
 * synchronously) and again when the cloud stores finish their first sync, so the
 * page is never blank while waiting on the network.
 */
(function (root, doc) {
  'use strict';

  var REND = {};
  var booted = false;

  /* ---------- small helpers ---------------------------------------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* Bundled assets sit at the repo root but these pages live in /redesign/. */
  function asset(p) {
    if (!p) return '';
    if (root.saAsset) return root.saAsset(p);
    return /^(https?:|data:|\/)/.test(p) ? p : '../' + p;
  }
  /* Club name to crest. resolveBadge does the fuzzy matching the live site uses,
     so a name like "Sue's Angels FC" and "Sue's Angels" resolve alike. */
  function badge(club) {
    var b = null;
    try { b = root.resolveBadge ? root.resolveBadge(club) : null; } catch (e) {}
    var src = b && (b.src || b.img || b.webp);
    if (!src) return '';
    return '<img class="lv-badge" src="' + esc(asset(src)) + '" alt="" width="20" height="20" loading="lazy" />';
  }
  function shortClub(c) { return String(c || '').replace(/\s+FC$/, '').replace(/\s+F\.C\.$/, ''); }
  function num(v) { var n = parseInt(v, 10); return isNaN(n) ? null : n; }

  /* Replace a container's contents, but only if we produced something. */
  function fill(el, html) {
    if (html == null || html === '') return false;
    el.innerHTML = html;
    el.setAttribute('data-live-state', 'ready');
    return true;
  }

  function register(name, fn) { REND[name] = fn; }

  /* ---------- LEAGUE: standings ----------------------------------------- */
  /* Emits the page's OWN .tbl__row markup rather than a table of its own, so it
     inherits the existing six-column grid (54px 1fr 58px 58px 72px 74px) and
     looks identical to the hand-built version. The only change a visitor sees is
     that all ten clubs are present instead of the first six. */
  register('league-table', function (el) {
    var rows = root.RAW_TABLE || [];
    if (!rows.length) return null;
    var head = '<div class="tbl__row tbl__head-row">'
      + '<span class="tbl__pos">#</span><span class="tbl__club">Club</span>'
      + '<span>P</span><span>W</span><span>GD</span><span class="tbl__pts">Pts</span>'
      + '</div>';
    /* The homepage builds these rows as <a href="league.html"> so the whole row
       is tappable; the league page uses plain <div>. Honour whichever the page
       already used instead of silently dropping the links. */
    var href = el.getAttribute('data-link');
    var limit = num(el.getAttribute('data-limit')) || rows.length;
    var body = rows.slice(0, limit).map(function (r) {
      var cls = 'tbl__row';
      if (r.us) cls += ' tbl__row--us';
      else if (r.p === 2) cls += ' tbl__row--runner';
      var crest = r.us
        ? '<img src="assets/badge/sue-angels-badge-star.webp" alt="" loading="lazy" />'
        : (badge(r.c) ? badge(r.c).replace('class="lv-badge" ', '') : '');
      var open = href ? '<a class="' + cls + '" href="' + esc(href) + '">' : '<div class="' + cls + '">';
      var close = href ? '</a>' : '</div>';
      return open
        + '<span class="tbl__pos">' + esc(r.p) + '</span>'
        + '<span class="tbl__club">' + crest + esc(shortClub(r.c)) + '</span>'
        + '<span>' + esc(r.pl) + '</span>'
        + '<span>' + esc(r.w) + '</span>'
        + '<span>' + esc(r.gd) + '</span>'
        + '<b class="tbl__pts" data-pts="' + esc(r.pts) + '">' + esc(r.pts) + '</b>'
        + close;
    }).join('');
    return head + body;
  });

  /* ---------- LEAGUE: leading scorers ----------------------------------- */
  register('league-scorers', function (el) {
    var stats = root.LEAGUE_STATS || {};
    var scope = el.getAttribute('data-scope') === 'league' ? 'league' : 'all';
    var rows = stats[scope] || stats.all || [];
    if (!rows.length) return null;
    var limit = num(el.getAttribute('data-limit')) || rows.length;
    var body = rows.slice(0, limit).map(function (r) {
      return '<tr class="lv-tr' + (r.us ? ' is-us' : '') + '">'
        + '<td class="lv-pos">' + esc(r.pos) + '</td>'
        + '<td class="lv-name">' + esc(r.name) + '</td>'
        + '<td class="lv-club lv-hide-s">' + badge(r.club) + '<span>' + esc(shortClub(r.club)) + '</span></td>'
        + '<td class="lv-pts">' + esc(r.g) + '</td>'
        + '<td>' + esc(r.a) + '</td>'
        + '<td class="lv-hide-s">' + esc(r.ap) + '</td>'
        + '</tr>';
    }).join('');
    return '<div class="lv-scroll"><table class="lv-table">'
      + '<caption class="lv-cap">Leading scorers across the division, '
      + (scope === 'league' ? 'league games only' : 'all competitions') + '</caption>'
      + '<thead><tr><th>#</th><th>Player</th><th class="lv-hide-s">Club</th><th>G</th><th>A</th>'
      + '<th class="lv-hide-s">Apps</th></tr></thead><tbody>' + body + '</tbody></table></div>';
  });

  /* ---------- LEAGUE: every result across the division ------------------ */
  register('league-results', function (el) {
    var rows = root.LEAGUE_RESULTS || [];
    if (!rows.length) return null;
    var limit = num(el.getAttribute('data-limit')) || rows.length;
    var items = rows.slice(0, limit).map(function (r) {
      var involvesUs = /angels/i.test(r.home) || /angels/i.test(r.away);
      return '<li class="lv-res' + (involvesUs ? ' is-us' : '') + '">'
        + '<span class="lv-res__date">' + esc(r.date) + '</span>'
        + '<span class="lv-res__side lv-res__side--h">' + esc(shortClub(r.home)) + badge(r.home) + '</span>'
        + '<span class="lv-res__score">' + esc(r.hs) + '&ndash;' + esc(r.as) + '</span>'
        + '<span class="lv-res__side lv-res__side--a">' + badge(r.away) + esc(shortClub(r.away)) + '</span>'
        + '</li>';
    }).join('');
    return '<p class="lv-note">' + rows.length + ' League Ten results across the division in 25/26.</p>'
      + '<ul class="lv-reslist">' + items + '</ul>';
  });

  /* ---------- LEAGUE: next season's confirmed opponents ----------------- */
  register('league-next', function (el) {
    var clubs = [];
    try {
      var s = root.getSeason2627 ? root.getSeason2627() : null;
      if (s && s.clubs && s.clubs.length) clubs = s.clubs.slice();
    } catch (e) {}
    /* Not in the CMS yet, so fall back to the confirmed division published on
       the live site. Kept as data, not markup, so the CMS can take it over. */
    if (!clubs.length) {
      clubs = ['Barnes Stormers', 'Bristol City (London) Supporters', 'Brockwell Violets',
        'Haydons Park', 'Junction Elite 4th Team', 'Pure Football 1st Team', "Sue's Angels",
        'Three Little Birds', 'TSM Rovers', 'Tyne & Thames'];
    }
    var items = clubs.map(function (c) {
      var us = /angels/i.test(c);
      return '<li class="lv-club-chip' + (us ? ' is-us' : '') + '">' + badge(c)
        + '<span>' + esc(shortClub(c)) + '</span></li>';
    }).join('');
    return '<ul class="lv-clubs">' + items + '</ul>';
  });

  /* ---------- SQUAD ----------------------------------------------------- */
  register('squad', function (el) {
    var squad = [];
    try { squad = root.derivedSquad ? root.derivedSquad(null, 'all') : (root.SQUAD || []); } catch (e) { squad = root.SQUAD || []; }
    if (!squad.length) return null;
    var status = {};
    try { status = root.getPlayerStatus ? (root.getPlayerStatus() || {}) : {}; } catch (e) {}
    var active = squad.filter(function (p) {
      var st = status[p.num] || status[String(p.num)];
      return !st || st === 'active';
    });
    var list = active.length ? active : squad;
    var items = list.map(function (p) {
      var photo = '';
      try { photo = root.getPlayerPhoto ? (root.getPlayerPhoto(p.num) || '') : ''; } catch (e) {}
      var name = esc((p.first || '') + ' ' + (p.last || ''));
      var initials = esc(String(p.first || ' ')[0] + String(p.last || ' ')[0]);
      return '<li class="lv-p">'
        + '<a class="lv-p__a" href="squad.html?player=' + esc(p.num) + '">'
        + (photo
            ? '<img class="lv-p__img" src="' + esc(asset(photo)) + '" alt="' + name + '" loading="lazy" />'
            : '<span class="lv-p__img lv-p__img--none" aria-hidden="true">' + initials + '</span>')
        + '<span class="lv-p__name">' + name + '</span>'
        + '<span class="lv-p__meta">'
        + (p.apps ? p.apps + ' app' + (p.apps === 1 ? '' : 's') : 'Squad')
        + (p.goals ? ' &middot; ' + p.goals + ' goal' + (p.goals === 1 ? '' : 's') : '')
        + '</span></a></li>';
    }).join('');
    return '<p class="lv-note">' + list.length + ' players.</p><ul class="lv-players">' + items + '</ul>';
  });

  /* ---------- PLAYER STATS --------------------------------------------- */
  register('stats', function (el) {
    var squad = [];
    try { squad = root.derivedSquad ? root.derivedSquad(null, 'all') : []; } catch (e) {}
    squad = squad.filter(function (p) { return p.apps > 0; });
    if (!squad.length) return null;
    var key = el.getAttribute('data-sort') || 'goals';
    squad.sort(function (a, b) { return (b[key] || 0) - (a[key] || 0) || (b.apps || 0) - (a.apps || 0); });
    var limit = num(el.getAttribute('data-limit')) || squad.length;
    var body = squad.slice(0, limit).map(function (p, i) {
      return '<tr class="lv-tr">'
        + '<td class="lv-pos">' + (i + 1) + '</td>'
        + '<td class="lv-name">' + esc((p.first || '') + ' ' + (p.last || '')) + '</td>'
        + '<td>' + esc(p.apps || 0) + '</td>'
        + '<td class="lv-pts">' + esc(p.goals || 0) + '</td>'
        + '<td>' + esc(p.assists || 0) + '</td>'
        + '<td class="lv-hide-s">' + esc(p.motm || 0) + '</td>'
        + '<td class="lv-hide-s">' + esc(p.cleanSheets || 0) + '</td>'
        + '</tr>';
    }).join('');
    return '<div class="lv-scroll"><table class="lv-table">'
      + '<caption class="lv-cap">Every player with an appearance, all competitions.</caption>'
      + '<thead><tr><th>#</th><th>Player</th><th>Apps</th><th>G</th><th>A</th>'
      + '<th class="lv-hide-s">MOTM</th><th class="lv-hide-s">CS</th></tr></thead>'
      + '<tbody>' + body + '</tbody></table></div>';
  });

  /* ---------- RESULTS --------------------------------------------------- */
  register('results', function (el) {
    var res = [];
    try { res = root.getDerivedResults ? root.getDerivedResults() : (root.SEASON_RESULTS || []); } catch (e) { res = root.SEASON_RESULTS || []; }
    if (!res.length) return null;
    var limit = num(el.getAttribute('data-limit')) || res.length;
    var M = root.SA_MATCH;
    var items = res.slice(0, limit).map(function (r) {
      var ctx = M ? M.contextOf(r) : null;
      var s = ctx && ctx.score;
      var resLetter = ctx ? ctx.result : '';
      return '<li class="lv-m lv-m--' + esc(String(resLetter).toLowerCase()) + '">'
        + '<span class="lv-m__date">' + esc(r.date) + '</span>'
        + '<span class="lv-m__comp">' + esc(r.competition || '')
        + (ctx && ctx.badge ? ' <b class="lv-m__stage">' + esc(ctx.badge) + '</b>' : '') + '</span>'
        + '<span class="lv-m__teams">' + esc(shortClub(r.home)) + ' <b>'
        + (r.kind === 'walkover' ? 'W/O' : (s ? (r.hs + '&ndash;' + r.as) : ''))
        + '</b> ' + esc(shortClub(r.away)) + '</span>'
        + (ctx && ctx.decidedBy ? '<span class="lv-m__by">' + esc(ctx.decidedBy) + '</span>' : '')
        + '<span class="lv-m__r" aria-label="' + esc(resLetter) + '">' + esc(resLetter) + '</span>'
        + '</li>';
    }).join('');
    return '<ul class="lv-matches">' + items + '</ul>';
  });

  /* ---------- FIXTURES -------------------------------------------------- */
  register('fixtures', function (el) {
    var fx = [];
    try { fx = root.getActiveUpcoming ? root.getActiveUpcoming() : (root.UPCOMING_FIXTURES || []); } catch (e) { fx = root.UPCOMING_FIXTURES || []; }
    if (!fx.length) return '<p class="lv-empty">No fixtures confirmed yet. Check back soon.</p>';
    var items = fx.map(function (f) {
      var opp = /angels/i.test(f.home || '') ? f.away : f.home;
      var home = /angels/i.test(f.home || '');
      return '<li class="lv-fx">'
        + '<span class="lv-fx__date">' + esc([f.day, f.date, f.mon].filter(Boolean).join(' ')) + '</span>'
        + '<span class="lv-fx__opp">' + badge(opp) + esc(shortClub(opp))
        + ' <em>' + (home ? 'H' : 'A') + '</em></span>'
        + '<span class="lv-fx__meta">' + esc([f.comp || f.competition, f.kick].filter(function (v) { return v && v !== 'TBC'; }).join(' &middot; ') || 'Time TBC') + '</span>'
        + '</li>';
    }).join('');
    return '<ul class="lv-fixtures">' + items + '</ul>';
  });

  /* ---------- NEWS ------------------------------------------------------ */
  register('news', function (el) {
    var arts = [];
    try {
      var custom = root.getCustomArticles ? (root.getCustomArticles() || []) : [];
      var defs = root.SA_DEFAULT_ARTICLES || [];
      arts = custom.concat(defs);
    } catch (e) {}
    if (!arts.length) return null;
    arts.sort(function (a, b) {
      return String(b.sortISO || b.date || '').localeCompare(String(a.sortISO || a.date || ''));
    });
    var limit = num(el.getAttribute('data-limit')) || arts.length;
    var items = arts.slice(0, limit).map(function (a) {
      var cover = a.cover || '';
      try { if (!cover && root.getArticleCover) cover = root.getArticleCover(a.id) || ''; } catch (e) {}
      return '<li class="lv-art">'
        + '<a class="lv-art__a" href="news.html?article=' + esc(a.id) + '">'
        + (cover ? '<img class="lv-art__img" src="' + esc(asset(cover)) + '" alt="" loading="lazy" />' : '')
        + '<span class="lv-art__cat">' + esc(a.cat || 'News') + '</span>'
        + '<span class="lv-art__t">' + esc(a.title) + '</span>'
        + '<span class="lv-art__d">' + esc(a.date || '') + '</span>'
        + (a.lede ? '<span class="lv-art__l">' + esc(String(a.lede).slice(0, 150)) + '</span>' : '')
        + '</a></li>';
    }).join('');
    return '<ul class="lv-arts">' + items + '</ul>';
  });

  /* ---------- COACHES --------------------------------------------------- */
  register('coaches', function (el) {
    var list = (root.COACHES || []).slice();
    try {
      var custom = root.getCustomCoaches ? (root.getCustomCoaches() || []) : [];
      if (custom.length) list = list.concat(custom);
    } catch (e) {}
    if (!list.length) return null;
    var items = list.map(function (c) {
      var photo = c.photo || '';
      try {
        var d = root.getCoachData ? root.getCoachData(c.id) : null;
        if (d && d.photo) photo = d.photo;
      } catch (e) {}
      var bio = Array.isArray(c.bio) ? c.bio[0] : (c.bio || c.short || '');
      return '<li class="lv-coach">'
        + (photo ? '<img class="lv-coach__img" src="' + esc(asset(photo)) + '" alt="' + esc(c.name) + '" loading="lazy" />'
                 : '<span class="lv-coach__img lv-coach__img--none" aria-hidden="true"></span>')
        + '<span class="lv-coach__role">' + esc(c.role || 'Coach') + '</span>'
        + '<span class="lv-coach__name">' + esc(c.name) + '</span>'
        + (bio ? '<span class="lv-coach__bio">' + esc(String(bio).slice(0, 180)) + '</span>' : '')
        + '</li>';
    }).join('');
    return '<ul class="lv-coaches">' + items + '</ul>';
  });

  /* ---------- VIDEOS ---------------------------------------------------- */
  register('videos', function (el) {
    var vids = [];
    try { vids = root.getClubVideos ? (root.getClubVideos() || []) : []; } catch (e) {}
    if (!vids.length) return null;
    var items = vids.map(function (v) {
      var yt = String(v.url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
      var thumb = yt ? 'https://img.youtube.com/vi/' + yt[1] + '/hqdefault.jpg' : '';
      return '<li class="lv-vid"><a class="lv-vid__a" href="' + esc(v.url) + '" target="_blank" rel="noopener">'
        + (thumb ? '<img class="lv-vid__img" src="' + esc(thumb) + '" alt="" loading="lazy" />' : '')
        + '<span class="lv-vid__t">' + esc(v.title || 'Club video') + '</span>'
        + '<span class="lv-vid__c">' + esc(v.section || v.cat || 'Video') + '</span></a></li>';
    }).join('');
    return '<ul class="lv-vids">' + items + '</ul>';
  });

  /* ---------- GALLERY -------------------------------------------------- */
  register('gallery', function (el) {
    var albums = [];
    try {
      var G = root.GalleryStore;
      if (G) albums = (G.list ? G.list() : (G.all ? G.all() : [])) || [];
      if (!albums.length && root.getGalleryAlbums) albums = root.getGalleryAlbums() || [];
    } catch (e) {}
    if (!albums.length) return null;
    var items = albums.map(function (a) {
      var photos = a.photos || [];
      var cover = a.cover || photos[0] || '';
      return '<li class="lv-alb"><a class="lv-alb__a" href="gallery.html?album=' + esc(a.id || '') + '">'
        + (cover ? '<img class="lv-alb__img" src="' + esc(asset(cover)) + '" alt="" loading="lazy" />' : '')
        + '<span class="lv-alb__t">' + esc(a.title || 'Album') + '</span>'
        + '<span class="lv-alb__n">' + photos.length + ' photo' + (photos.length === 1 ? '' : 's')
        + (a.photographer ? ' &middot; ' + esc(a.photographer) : '') + '</span></a></li>';
    }).join('');
    return '<ul class="lv-albums">' + items + '</ul>';
  });

  /* ---------- RECORDS / HONOURS ---------------------------------------- */
  register('recognition', function (el) {
    var recs = [];
    try {
      var stored = root.getRecognitionStored ? (root.getRecognitionStored() || []) : [];
      recs = stored.concat(root.SA_DEFAULT_RECOGNITION || []);
    } catch (e) { recs = root.SA_DEFAULT_RECOGNITION || []; }
    if (!recs.length) return null;
    var want = el.getAttribute('data-type');
    if (want) recs = recs.filter(function (r) { return r.type === want; });
    if (!recs.length) return null;
    var items = recs.map(function (r) {
      return '<li class="lv-rec">'
        + '<span class="lv-rec__t">' + esc(r.title) + '</span>'
        + '<span class="lv-rec__v">' + esc(r.value || r.playerName || '') + '</span>'
        + (r.season ? '<span class="lv-rec__s">' + esc(r.season) + '</span>' : '')
        + (r.description ? '<span class="lv-rec__d">' + esc(String(r.description).slice(0, 200)) + '</span>' : '')
        + '</li>';
    }).join('');
    return '<ul class="lv-recs">' + items + '</ul>';
  });

  /* ---------- SEASON SUMMARY (small stat readouts) ---------------------- */
  register('season-summary', function (el) {
    var res = [];
    try { res = root.getDerivedResults ? root.getDerivedResults() : (root.SEASON_RESULTS || []); } catch (e) {}
    if (!res.length || !root.SA_MATCH) return null;
    var c = root.SA_MATCH.leagueCampaign(res, 'all');
    if (!c || !c.played) return null;
    var cells = [
      ['Played', c.played], ['Won', c.won], ['Drawn', c.drawn], ['Lost', c.lost],
      ['Scored', c.goalsFor], ['Conceded', c.goalsAgainst],
      ['Goal difference', (c.goalDifference > 0 ? '+' : '') + c.goalDifference],
      ['Points', c.points]
    ];
    return '<dl class="lv-summary">' + cells.map(function (x) {
      return '<div class="lv-summary__i"><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>';
    }).join('') + '</dl>';
  });

  /* ---------- boot ------------------------------------------------------ */
  function renderAll(reason) {
    var nodes = doc.querySelectorAll('[data-live]');
    var ok = 0, skipped = 0, failed = 0;
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var name = el.getAttribute('data-live');
      var fn = REND[name];
      if (!fn) { skipped++; continue; }
      try {
        var html = fn(el);
        if (fill(el, html)) ok++; else skipped++;
      } catch (e) {
        failed++;
        el.setAttribute('data-live-state', 'error');
        if (root.console && root.console.warn) root.console.warn('[live] ' + name + ' failed:', e);
      }
    }
    root.SA_LIVE_LAST = { reason: reason, total: nodes.length, rendered: ok, skipped: skipped, failed: failed };
    try { root.dispatchEvent(new CustomEvent('sa-live-rendered', { detail: root.SA_LIVE_LAST })); } catch (e) {}
    return root.SA_LIVE_LAST;
  }

  function boot() {
    if (booted) return;
    booted = true;
    /* Pass 1: the code baseline is already in memory, so paint immediately
       rather than leaving the page waiting on the network. */
    renderAll('baseline');
    /* Pass 2: once the cloud stores have synced, overrides and CMS additions
       are in place, so render again. */
    if (root.SA_DATA_READY && root.SA_DATA_READY.then) {
      root.SA_DATA_READY.then(function () { renderAll('cloud'); },
                              function () { /* offline: baseline stands */ });
    }
    /* Keep in step with CMS edits made in another tab. */
    ['sa-articles-changed', 'sa-media-changed', 'sa-roster-changed',
     'sa-match-changed', 'sa-fixtures-changed', 'sa-recognition-changed'
    ].forEach(function (ev) { root.addEventListener(ev, function () { renderAll(ev); }); });
  }

  root.SA_LIVE = { register: register, render: renderAll, renderers: REND };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
}(typeof window !== 'undefined' ? window : globalThis, document));
