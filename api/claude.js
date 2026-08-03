// Vercel serverless function, proxies a single Claude request to Anthropic.
//
// ADMINISTRATORS ONLY: /api/claude
// Method: POST, with a signed-in administrator's bearer token
// Body: { prompt: "..." }     // OR { messages: [...] } for advanced use
// Returns: { completion: "..." }
//
// THE CONTROL PANEL CALLS IT. Build the report in the match dialog sends the
// facts the club has recorded plus the coach's notes, and what comes back
// lands in a textarea somebody reads before saving. See
// src/admin/lazy/15-report.js.
//
// It falls back rather than fails. No session, no key, too much to send, no
// network, a 500: every one of those ends at compose(), which writes the
// article in the browser from the facts alone and needs none of them. The
// panel says which one wrote what you are reading, because a report that
// quietly changed character depending on this file would be worse than
// either. ANTHROPIC_API_KEY was set on sue-angels-fc-b469 on 3 August 2026.
//
// Security model:
//   • The Anthropic API key lives ONLY in Vercel's environment variables
//     (Settings → Environment Variables → ANTHROPIC_API_KEY).
//   • It never reaches the browser; the browser only sees the polished text.
//   • The database is asked whether the caller is a club administrator,
//     exactly as /api/publish does. The origin check below is kept as a
//     first filter but is NOT the lock: it allows a request with no Origin
//     header, which is every script and every server.
//
// Cost guard, and what the caps actually mean for a match report:
//   • Input cap 16,000 chars. Measured: the brief plus a full team sheet plus
//     thirty timed moments comes to about 7,300, so this is roughly seventy
//     moments of headroom. It was 8,000, which a long game would have hit.
//   • Output cap 3,000 tokens, about 2,200 words. The club asks for 700 to
//     900 plus a MATCH DETAILS block, which is around 1,250 tokens, and the
//     old 1,500 left almost nothing spare. A cap does not cost anything until
//     it is used: the model writes what the brief asks for.
//   • SONNET FIRST, haiku second. This writes something the club publishes
//     under its own name, and the difference between the two on 900 words of
//     prose is the difference between a report and a summary. A report costs
//     a fraction of a penny either way.

import runtime from '../src/data/runtime.json' with { type: 'json' };

// Ordered preference if we can't list models, cheapest-first guesses.
const MODEL_FALLBACKS = [
  'claude-sonnet-4-5-20250929',
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-haiku-4-5-20251001',
  'claude-3-5-haiku-20241022',
];
const MAX_INPUT_CHARS = 16000;
const MAX_OUTPUT_TOKENS = 3000;

// Discover a model the account can actually use by listing models from the
// Anthropic API. Prefers haiku (cheapest) → sonnet → anything available.
// Cached across warm invocations so we only list once.
let CACHED_MODEL = null;
async function resolveModel(apiKey, requested) {
  if (requested) return requested;
  if (CACHED_MODEL) return CACHED_MODEL;
  try {
    const r = await fetch('https://api.anthropic.com/v1/models?limit=100', {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    });
    if (r.ok) {
      const j = await r.json();
      const ids = (j.data || []).map((m) => m.id);
      /* Best writer the account can reach, not the cheapest. Newest sonnet
         first: model ids sort chronologically because they carry the date. */
      const pick = ids.filter((id) => /sonnet/i.test(id)).sort().reverse()[0]
                || ids.filter((id) => /haiku/i.test(id)).sort().reverse()[0]
                || ids[0];
      if (pick) { CACHED_MODEL = pick; return pick; }
    }
  } catch (e) { /* fall through to fallbacks */ }
  return MODEL_FALLBACKS[0];
}

export default async function handler(req, res) {
  // CORS, only the club's own site + its Vercel preview deploys may call this,
  // so the Anthropic key can't be spent from an arbitrary third-party page.
  const ALLOWED_ORIGINS = [
    'https://www.suesangelsfc.co.uk',
    'https://suesangelsfc.co.uk',
  ];
  const origin = req.headers.origin || '';
  const originAllowed = !origin /* same-origin / server-to-server: no Origin header */
    || ALLOWED_ORIGINS.includes(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  if (origin && originAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!originAllowed)          return res.status(403).json({ error: 'Origin not allowed' });

  /* A HEALTH CHECK, because the club could not tell me why it was falling back.
     The panel says which of five reasons it composed instead of writing, but
     that sentence is on a screen only the club can see, and diagnosing it by
     asking somebody to read a line back took days.
     
     GET answers one boolean: is a key configured. It spends nothing, calls
     nothing, does no work, and reveals no value - only whether an environment
     variable exists, which is the single fact needed to tell "the key never
     reached this project" apart from "the key is here and Anthropic refused
     it". Those two have completely different fixes and look identical from
     the outside.
     
     Deliberately not behind the administrator gate: a caller who cannot sign
     in still gets nothing but a boolean, and putting it behind the gate would
     make it useless for the one situation it exists for. */
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      configured: !!process.env.ANTHROPIC_API_KEY,
      maxInputChars: MAX_INPUT_CHARS,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });
  }
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });

  // AN ORIGIN CHECK IS NOT A LOCK.
  //
  // The comment above says only the club's own site may call this, and that
  // is not what the code above does: `!origin` is treated as allowed, because
  // a same-origin request need not send the header. Every script, every curl,
  // every server also sends no Origin. So the gate is open to anything that
  // is not a browser, which is everything that would want to abuse it.
  //
  // It has not mattered so far only because ANTHROPIC_API_KEY has never been
  // set, so the endpoint answers 500 to everyone. That is one environment
  // variable away from being an open proxy to a paid API, and setting it is a
  // perfectly natural thing for somebody to do.
  //
  // Nothing on this site calls this endpoint. The panel's report builder
  // composes an article in the browser from the facts already recorded, and
  // invents nothing, which is the point of it. So the gate here is the same
  // one /api/publish uses: the database is asked whether the caller is a club
  // administrator. A signed-in administrator can still use it; nobody else
  // can spend the key.
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'sign in first' });

  const SB_URL = process.env.SUPABASE_URL || runtime.supabase.url;
  const SB_ANON = process.env.SUPABASE_ANON_KEY || runtime.supabase.anonKey;
  try {
    const check = await fetch(`${SB_URL}/rest/v1/rpc/is_club_admin`, {
      method: 'POST',
      headers: {
        apikey: SB_ANON,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    const said = (await check.text()).trim();
    if (!check.ok) {
      const expired = check.status === 401 && /PGRST301|JWT|expired/i.test(said);
      return res.status(expired ? 401 : 502)
        .json({ error: expired ? 'sign in again' : 'could not check permissions' });
    }
    if (said !== 'true') return res.status(403).json({ error: 'not an administrator' });
  } catch (e) {
    return res.status(502).json({ error: 'could not check permissions' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
  }

  let body = req.body;
  // Vercel sometimes leaves body as raw string, parse defensively.
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: 'Invalid JSON body' }); }
  }

  const prompt = (body && body.prompt) || '';
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
    return res.status(400).json({ error: 'Body must include a non-trivial `prompt` string.' });
  }
  if (prompt.length > MAX_INPUT_CHARS) {
    return res.status(413).json({
      error: `Prompt too long (${prompt.length} chars). Max is ${MAX_INPUT_CHARS}.`,
    });
  }

  const model = await resolveModel(apiKey, body && body.model);

  // Try the resolved model, then fall back through the list on 404 not_found.
  const tryModels = [model, ...MODEL_FALLBACKS.filter((m) => m !== model)];
  let lastErr = 'unknown';
  for (const m of tryModels) {
    try {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: m,
          max_tokens: MAX_OUTPUT_TOKENS,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (anthropicRes.ok) {
        const json = await anthropicRes.json();
        const completion = ((json.content || []).find((b) => b.type === 'text') || {}).text || '';
        CACHED_MODEL = m; // remember the one that worked
        return res.status(200).json({ completion, model: m });
      }
      lastErr = await anthropicRes.text().catch(() => 'unknown');
      // Only keep trying on "model not found"; otherwise stop and report.
      if (!/not_found|model/i.test(lastErr)) {
        return res.status(anthropicRes.status).json({ error: 'Anthropic API error', detail: lastErr });
      }
    } catch (e) { lastErr = String(e); }
  }
  return res.status(404).json({ error: 'No usable Claude model found for this account', detail: lastErr });
}
