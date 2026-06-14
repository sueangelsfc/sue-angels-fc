// api/subscribe.js — adds a supporter to the club's MailerLite list, so the
// newsletter can be sent and automated from MailerLite.
//
// WHY A SERVER FUNCTION: the MailerLite API token is a SECRET and must never be
// shipped in the browser. This function holds it (Vercel env var) and the public
// sign-up form calls this endpoint. The email is ALSO saved to Supabase by the
// client (private backup) — this is the push to the sending platform.
//
// ── ONE-TIME SETUP ──────────────────────────────────────────────────────────
//   1. Create a free MailerLite account (mailerlite.com).
//   2. MailerLite → Integrations → Developer API → generate a token.
//   3. (Optional) Create a Group (e.g. "Website supporters") and copy its ID.
//   4. Vercel → Project → Settings → Environment Variables, add:
//        MAILERLITE_API_KEY   = <your MailerLite API token>
//        MAILERLITE_GROUP_ID  = <optional group id to add sign-ups to>
//   5. Redeploy. Until the key is set, this no-ops gracefully (the Supabase
//      capture still records every sign-up), so the form never breaks.
// ────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const ALLOWED_ORIGINS = [
    'https://www.suesangelsfc.co.uk',
    'https://suesangelsfc.co.uk',
  ];
  const origin = req.headers.origin || '';
  const originAllowed = !origin
    || ALLOWED_ORIGINS.includes(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  if (origin && originAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!originAllowed)          return res.status(403).json({ ok: false, error: 'origin' });
  if (req.method !== 'POST')   return res.status(405).json({ ok: false, error: 'post_only' });

  const KEY = process.env.MAILERLITE_API_KEY;
  // Not configured yet → succeed quietly (Supabase still has the email).
  if (!KEY) return res.status(200).json({ ok: true, skipped: 'not_configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const email = String(body.email || '').trim();
  const name = String(body.name || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ ok: false, error: 'invalid_email' });

  const payload = { email, fields: {} };
  if (name) payload.fields.name = name;
  const groupId = process.env.MAILERLITE_GROUP_ID;
  if (groupId) payload.groups = [String(groupId)];

  try {
    const r = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer ' + KEY,
      },
      body: JSON.stringify(payload),
    });
    if (r.ok) return res.status(200).json({ ok: true });
    if (r.status === 422) return res.status(200).json({ ok: true, duplicate: true }); // already subscribed / validation
    const detail = await r.text().catch(() => '');
    return res.status(502).json({ ok: false, error: 'mailerlite_' + r.status, detail: detail.slice(0, 200) });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'network' });
  }
}
