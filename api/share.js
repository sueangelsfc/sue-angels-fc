// api/share.js - server-rendered Open Graph / Twitter meta for shared deep links.
//
// Social scrapers (WhatsApp, iMessage, Facebook, X, Slack, LinkedIn…) do NOT run
// JavaScript, so a shared link like /teams.html?player=9 would otherwise unfurl
// with the generic page card. This function returns the SAME working page, but
// with the <title>, description and OG/Twitter tags rewritten to describe the
// specific player, match report, news post or coach - so the link previews well.
//
// It is invoked ONLY for deep-link URLs, via the conditional `rewrites` in
// vercel.json (matching ?player / ?coach on teams.html and ?report / ?article on
// media.html). Normal page loads stay fully static and untouched.
//
// Design notes:
//   • Zero new dependencies, no build step - same plain serverless style as
//     api/claude.js.
//   • Static squad + season results are read straight from PageShell.js (the
//     client's own source of truth), so there is no data to keep in sync here.
//   • Cloud data (articles, admin fixtures, custom players, coaches) is read from
//     Supabase over its public REST endpoint (public SELECT is allowed by RLS).
//   • The preview IMAGE is left as the existing branded 1200×630 club card.
//   • On ANY error or unresolved id, the unmodified static page is returned, so
//     previews are never worse than before - only better when resolution works.

const SUPA_URL = 'https://hvbquuvxcswylyguplfb.supabase.co';
const SUPA_KEY = 'sb_publishable_2VEdxWZCLW98qItINt6TPQ_r7y_Tcly';
const SITE = 'https://www.suesangelsfc.co.uk';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function shortName(s) { return String(s || '').replace(/\s*FC$/i, '').trim(); }

// Unwrap one or more layers of JSON-string quoting (matches the client helper).
function cleanDataUrl(v) {
  if (typeof v !== 'string') return null;
  let s = v;
  while (s.length > 1 && s[0] === '"' && s[s.length - 1] === '"') {
    try { s = JSON.parse(s); } catch (e) { s = s.slice(1, -1); }
  }
  return s || null;
}

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
// evaluate just that literal (plain objects/strings/numbers/bools - no calls).
// String-aware bracket matching so a "]" inside a value can't close it early.
function extractArray(src, name) {
  let start = src.indexOf('window.' + name + ' = [');
  if (start < 0) start = src.indexOf('const ' + name + ' = [');
  if (start < 0) start = src.indexOf(name + ' = [');
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
    const raw = String(q.player);
    let squad = extractArray(pageSrc, 'SQUAD') || [];
    const custom = await supaGet('player_photos', 'roster:players');
    if (Array.isArray(custom)) squad = squad.concat(custom);
    const nameOf = x => ((x.first ? x.first + ' ' : '') + (x.last || '')).trim();
    const slugOf = x => nameOf(x).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const p = /^\d+$/.test(raw)
      ? squad.find(x => x && Number(x.num) === parseInt(raw, 10))
      : squad.find(x => x && slugOf(x) === raw.toLowerCase());
    if (!p) return null;
    const num = p.num;
    const name = nameOf(p) || ('Number ' + num);
    const role = p.gk ? 'Goalkeeper' : (p.pos || p.position || '');
    const photo = cleanDataUrl(await supaGet('player_photos', String(num)));
    return {
      title: name + ' - #' + num + " · Sue's Angels FC",
      desc: (role ? role + '. ' : '') + "First-team squad member at Sue's Angels FC - League Ten champions, unbeaten in our inaugural season.",
      image: photo ? (SITE + '/api/og-image?player=' + num) : null,
      imageAlt: photo ? name : null
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
    // Angels' result (w/d/l) from their perspective.
    let result = '';
    if (r.hs != null && r.as != null) {
      const usHome = String(r.home).includes('Angels');
      const us = usHome ? r.hs : r.as, them = usHome ? r.as : r.hs;
      result = us > them ? 'w' : us < them ? 'l' : 'd';
    }
    // Prefer an uploaded match cover photo; otherwise generate the scorecard.
    const uploaded = cleanDataUrl(await supaGet('player_photos', 'cover:' + id));
    let image;
    if (uploaded) {
      image = SITE + '/api/og-image?article=' + encodeURIComponent(id); // og-image also serves cover:<id>
    } else {
      const reg = extractArray(pageSrc, 'BADGE_REGISTRY') || [];
      const badgeUrl = nm => {
        const s = String(nm || '').toLowerCase();
        const hit = reg.find(b => b.match && s.indexOf(b.match) > -1);
        return hit && hit.src ? (SITE + '/' + hit.src) : '';
      };
      const params = new URLSearchParams({
        home: r.home || '', away: r.away || '',
        hs: r.hs != null ? String(r.hs) : '', as: r.as != null ? String(r.as) : '',
        comp: r.competition || 'League Ten', date: r.date || '', result: result,
        left: badgeUrl(r.home), right: badgeUrl(r.away)
      });
      image = SITE + '/api/og-cover?' + params.toString();
    }
    return {
      title: line + " - Match report · Sue's Angels FC",
      desc: (meta ? meta + '. ' : '') + "Read the full match report from Sue's Angels FC.",
      image: image,
      imageAlt: line
    };
  }
  // ---- News article ----
  if (q.article != null) {
    const id = String(q.article);
    const data = await supaGet('articles', id);
    if (!data || !data.title) return null;
    const body = clip(data.body || data.lede || data.excerpt || '', 200);
    const override = cleanDataUrl(await supaGet('player_photos', 'cover:' + id));
    const cover = override || cleanDataUrl(data.cover);
    return {
      title: data.title + " · Sue's Angels FC",
      desc: body || [data.cat, data.date].filter(Boolean).join(' · ') || "Club news from Sue's Angels FC.",
      image: cover ? (SITE + '/api/og-image?article=' + encodeURIComponent(id)) : null,
      imageAlt: cover ? data.title : null
    };
  }
  // ---- Coach ----
  if (q.coach != null) {
    const id = String(q.coach);
    let list = extractArray(pageSrc, 'COACHES') || [];
    const custom = await supaGet('player_photos', 'roster:coaches');
    if (Array.isArray(custom)) list = list.concat(custom);
    const c = list.find(x => x && String(x.id || x.name) === id) || null;
    const data = await supaGet('player_photos', 'coach:' + id); // { photo, bio }
    const photo = cleanDataUrl(data && data.photo);
    const bio = (data && data.bio) || (c && c.bio) || '';
    if (c || photo || bio) {
      const nm = (c && c.name) || 'Our coach';
      const role = (c && c.role) || '';
      return {
        title: nm + (role ? ' - ' + role : '') + " · Sue's Angels FC",
        desc: clip(bio || (role ? role + " at Sue's Angels FC." : "Part of the Sue's Angels FC coaching team."), 200),
        image: photo ? (SITE + '/api/og-image?coach=' + encodeURIComponent(id)) : null,
        imageAlt: photo ? nm : null
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
  if (meta.image) {
    const img = esc(meta.image);
    html = html.replace(/(<meta\s+property="og:image"\s+content=")[\s\S]*?("\s*\/?>)/i, '$1' + img + '$2');
    html = html.replace(/(<meta\s+name="twitter:image"\s+content=")[\s\S]*?("\s*\/?>)/i, '$1' + img + '$2');
    // Drop the fixed 1200×630 dimensions + type of the club card so platforms
    // measure the actual player photo / cover instead of cropping to wrong ratio.
    html = html.replace(/\s*<meta\s+property="og:image:width"[\s\S]*?\/?>/i, '');
    html = html.replace(/\s*<meta\s+property="og:image:height"[\s\S]*?\/?>/i, '');
    html = html.replace(/\s*<meta\s+property="og:image:type"[\s\S]*?\/?>/i, '');
    if (meta.imageAlt) {
      const a = esc(meta.imageAlt);
      html = html.replace(/(<meta\s+property="og:image:alt"\s+content=")[\s\S]*?("\s*\/?>)/i, '$1' + a + '$2');
      html = html.replace(/(<meta\s+name="twitter:image:alt"\s+content=")[\s\S]*?("\s*\/?>)/i, '$1' + a + '$2');
    }
  }
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
    if (q.player != null || q.report != null || q.coach != null) {
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
