// api/share.js — server-rendered Open Graph / Twitter meta for shared deep links.
//
// Social scrapers (WhatsApp, iMessage, Facebook, X, Slack, LinkedIn…) do NOT run
// JavaScript, so a shared link like /teams.html?player=9 would otherwise unfurl
// with the generic page card. This function returns the SAME working page, but
// with the <title>, description and OG/Twitter tags rewritten to describe the
// specific player, match report, news post or coach — so the link previews well.
//
// It is invoked ONLY for deep-link URLs, via the conditional `rewrites` in
// vercel.json (matching ?player / ?coach on teams.html and ?report / ?article on
// media.html). Normal page loads stay fully static and untouched.
//
// Design notes:
//   • Zero new dependencies, no build step — same plain serverless style as
//     api/claude.js.
//   • Static squad + season results are read straight from PageShell.js (the
//     client's own source of truth), so there is no data to keep in sync here.
//   • Cloud data (articles, admin fixtures, custom players, coaches) is read from
//     Supabase over its public REST endpoint (public SELECT is allowed by RLS).
//   • The preview IMAGE is left as the existing branded 1200×630 club card.
//   • On ANY error or unresolved id, the unmodified static page is returned, so
//     previews are never worse than before — only better when resolution works.

const SUPA_URL = 'https://hvbquuvxcswylyguplfb.supabase.co';
const SUPA_KEY = 'sb_publishable_2VEdxWZCLW98qItINt6TPQ_r7y_Tcly';
const SITE = 'https://www.suesangelsfc.co.uk';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function shortName(s) { return String(s || '').replace(/\s*FC$/i, '').trim(); }

function clip(s, n) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1).trim() + '…' : s;
}

function getQuery(req) {
  if (req.query && Object.keys(req.query).length) return req.query;
  try {
    const u = new URL(req.url, 'http://x');
    const o = {};
    u.searchParams.forEach((v, k) => { o[k] = v; });
    return o;
  } catch (e) { return {}; }
}

// Pull a top-level `window.NAME = [ ... ];` array literal out of PageShell.js and
// evaluate just that literal (plain objects/strings/numbers/bools — no calls).
// String-aware bracket matching so a "]" inside a value can't close it early.
function extractArray(src, name) {
  const marker = 'window.' + name + ' = [';
  const start = src.indexOf(marker);
  if (start < 0) return null;
  const open = src.indexOf('[', start);
  let depth = 0, i = open, q = null;
  for (; i < src.length; i++) {
    const c = src[i], prev = src[i - 1];
    if (q) { if (c === q && prev !== '\\') q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { i++; break; } }
  }
  try { return Function('"use strict";return (' + src.slice(open, i) + ')')(); }
  catch (e) { return null; }
}

async function supaGet(table, key) {
  try {
    const url = SUPA_URL + '/rest/v1/' + table + '?key=eq.' + encodeURIComponent(key) + '&select=key,data';
    const r = await fetch(url, { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY } });
    if (!r.ok) return null;
    const rows = await r.json();
    return rows && rows[0] ? rows[0].data : null;
  } catch (e) { return null; }
}

async function resolve(q, pageSrc) {
  // ---- Player profile ----
  if (q.player != null) {
    const num = parseInt(q.player, 10);
    if (!Number.isFinite(num)) return null;
    let squad = extractArray(pageSrc, 'SQUAD') || [];
    const custom = await supaGet('player_photos', 'roster:players');
    if (Array.isArray(custom)) squad = squad.concat(custom);
    const p = squad.find(x => x && Number(x.num) === num);
    if (!p) return null;
    const name = ((p.first ? p.first + ' ' : '') + (p.last || '')).trim() || ('Number ' + num);
    const role = p.gk ? 'Goalkeeper' : (p.pos || p.position || '');
    return {
      title: name + ' — #' + num + " · Sue's Angels FC",
      desc: (role ? role + '. ' : '') + "First-team squad member at Sue's Angels FC — League Ten champions, unbeaten in our inaugural season."
    };
  }
  // ---- Match report ----
  if (q.report != null) {
    const id = String(q.report);
    let r = (extractArray(pageSrc, 'SEASON_RESULTS') || []).find(x => x && String(x.id) === id) || null;
    if (!r) {
      const fx = await supaGet('fixtures', id);
      if (fx && fx.home) {
        const entry = await supaGet('matches', id);
        const usHome = String(fx.home).includes('Angels');
        const gu = entry && entry.goals ? entry.goals.length : null;
        const gt = entry && entry.opponentGoals ? entry.opponentGoals.length : null;
        r = { home: fx.home, away: fx.away, competition: fx.comp, date: fx.date, hs: usHome ? gu : gt, as: usHome ? gt : gu };
      }
    }
    if (!r) return null;
    const score = (r.hs != null && r.as != null) ? (r.hs + '-' + r.as) : 'v';
    const line = shortName(r.home) + ' ' + score + ' ' + shortName(r.away);
    const meta = [r.competition, r.date].filter(Boolean).join(' · ');
    return {
      title: line + " — Match report · Sue's Angels FC",
      desc: (meta ? meta + '. ' : '') + "Read the full match report from Sue's Angels FC."
    };
  }
  // ---- News article ----
  if (q.article != null) {
    const data = await supaGet('articles', String(q.article));
    if (!data || !data.title) return null;
    const body = clip(data.body || data.excerpt || '', 200);
    return {
      title: data.title + " · Sue's Angels FC",
      desc: body || [data.cat, data.date].filter(Boolean).join(' · ') || "Club news from Sue's Angels FC."
    };
  }
  // ---- Coach ----
  if (q.coach != null) {
    const id = String(q.coach);
    const coaches = await supaGet('player_photos', 'roster:coaches');
    const c = Array.isArray(coaches) ? coaches.find(x => x && String(x.id || x.name) === id) : null;
    if (c) {
      return {
        title: (c.name || 'Our coach') + (c.role ? ' — ' + c.role : '') + " · Sue's Angels FC",
        desc: clip(c.bio || (c.role ? c.role + " at Sue's Angels FC." : "Part of the Sue's Angels FC coaching team."), 200)
      };
    }
    return { title: "Our coaches · Sue's Angels FC", desc: "Meet the people guiding Sue's Angels FC." };
  }
  return null;
}

function injectMeta(html, meta, canonical) {
  const t = esc(meta.title), d = esc(meta.desc), u = esc(canonical);
  const reps = [
    [/<title>[\s\S]*?<\/title>/i, '<title>' + t + '</title>'],
    [/(<meta\s+name="description"\s+content=")[\s\S]*?("\s*\/?>)/i, '$1' + d + '$2'],
    [/(<meta\s+property="og:title"\s+content=")[\s\S]*?("\s*\/?>)/i, '$1' + t + '$2'],
    [/(<meta\s+property="og:description"\s+content=")[\s\S]*?("\s*\/?>)/i, '$1' + d + '$2'],
    [/(<meta\s+name="twitter:title"\s+content=")[\s\S]*?("\s*\/?>)/i, '$1' + t + '$2'],
    [/(<meta\s+name="twitter:description"\s+content=")[\s\S]*?("\s*\/?>)/i, '$1' + d + '$2'],
    [/(<link\s+rel="canonical"\s+href=")[\s\S]*?("\s*\/?>)/i, '$1' + u + '$2'],
    [/(<meta\s+property="og:url"\s+content=")[\s\S]*?("\s*\/?>)/i, '$1' + u + '$2']
  ];
  for (const [re, sub] of reps) html = html.replace(re, sub);
  return html;
}

export default async function handler(req, res) {
  const q = getQuery(req);
  const page = (q.player != null || q.coach != null) ? 'teams.html' : 'media.html';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.suesangelsfc.co.uk';

  // Fetch the clean static page (no query → does not re-trigger this rewrite).
  let html = '';
  try {
    html = await (await fetch('https://' + host + '/' + page)).text();
  } catch (e) {
    res.setHeader('Location', '/' + page);
    return res.status(302).end();
  }

  try {
    let pageSrc = '';
    if (q.player != null || q.report != null) {
      try { pageSrc = await (await fetch('https://' + host + '/PageShell.js')).text(); } catch (e) {}
    }
    const meta = await resolve(q, pageSrc);
    if (meta) {
      const qs = Object.keys(q).map(k => k + '=' + encodeURIComponent(q[k])).join('&');
      html = injectMeta(html, meta, SITE + '/' + page + (qs ? '?' + qs : ''));
    }
  } catch (e) { /* fall through with the unmodified static page */ }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
  return res.status(200).send(html);
}
