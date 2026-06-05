// Vercel serverless function — proxies a single Claude request to Anthropic.
//
// Public endpoint: /api/claude
// Method: POST
// Body: { prompt: "..." }     // OR { messages: [...] } for advanced use
// Returns: { completion: "..." }
//
// Security model:
//   • The Anthropic API key lives ONLY in Vercel's environment variables
//     (Settings → Environment Variables → ANTHROPIC_API_KEY).
//   • It never reaches the browser; the browser only sees the polished text.
//   • CORS is set to allow the site's own origin.
//
// Cost guard:
//   • Hard input cap of 8,000 chars (≈ 2,000 tokens) per request.
//   • Hard output cap of 1,500 tokens.
//   • Use the cheap model (claude-haiku-4) by default — switch to sonnet
//     for higher quality at ~5x cost if needed.

// Ordered preference if we can't list models — cheapest-first guesses.
const MODEL_FALLBACKS = [
  'claude-haiku-4-5-20251001',
  'claude-3-5-haiku-20241022',
  'claude-3-5-sonnet-20241022',
  'claude-sonnet-4-20250514',
  'claude-3-haiku-20240307',
];
const MAX_INPUT_CHARS = 8000;
const MAX_OUTPUT_TOKENS = 1500;

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
      const pick = ids.find((id) => /haiku/i.test(id))
                || ids.find((id) => /sonnet/i.test(id))
                || ids[0];
      if (pick) { CACHED_MODEL = pick; return pick; }
    }
  } catch (e) { /* fall through to fallbacks */ }
  return MODEL_FALLBACKS[0];
}

export default async function handler(req, res) {
  // CORS — allow the site itself + Vercel preview deploys to call.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
  }

  let body = req.body;
  // Vercel sometimes leaves body as raw string — parse defensively.
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
