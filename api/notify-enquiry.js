// api/notify-enquiry.js, emails the club inbox when a business downloads the
// sponsorship pack (or sends an enquiry), so leads land in the inbox instead of
// sitting silently in the database.
//
// ACTIVATION (one-time, by the club, no keys ever go in the repo):
//   1. Sign up free at resend.com USING THE CLUB EMAIL (suesangelsfc@gmail.com).
//   2. Create an API key, then in Vercel → Project → Settings → Environment
//      Variables add:  RESEND_API_KEY = <the key>   (and redeploy).
//   3. Optional: NOTIFY_TO = where to send notices (default suesangelsfc@gmail.com;
//      comma-separate for several). NOTIFY_FROM to override the sender.
//
// Until the key is set this is a harmless no-op (returns ok:false) and never
// blocks the visitor's download.

const ALLOWED_ORIGINS = ['https://www.suesangelsfc.co.uk', 'https://suesangelsfc.co.uk'];

export default async function handler(req, res) {
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
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (!originAllowed) { res.status(403).json({ ok: false, error: 'forbidden' }); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method' }); return; }

  const KEY = process.env.RESEND_API_KEY;
  const TO = (process.env.NOTIFY_TO || 'suesangelsfc@gmail.com').split(',').map((s) => s.trim()).filter(Boolean);
  const FROM = process.env.NOTIFY_FROM || "Sue's Angels FC <onboarding@resend.dev>";
  if (!KEY) { res.status(200).json({ ok: true, skipped: 'not_configured' }); return; } // not activated yet: succeed gracefully (matches subscribe.js) so the form never shows a false error. Set RESEND_API_KEY to actually deliver.

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const email = String(body.email || '').slice(0, 200).trim();
  const type = String(body.type || 'Website enquiry').slice(0, 120);
  const source = String(body.source || '').slice(0, 80);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { res.status(400).json({ ok: false, error: 'bad-email' }); return; }

  const isPack = /pack/i.test(type) || source === 'sponsor-pack';
  const subject = isPack ? 'New sponsorship pack download' : 'New website enquiry';
  const line = isPack
    ? `<b>${email}</b> just downloaded the sponsorship pack on suesangelsfc.co.uk.`
    : `<b>${email}</b> just sent an enquiry on suesangelsfc.co.uk.`;
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#111">
    <p style="font:700 12px sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#C24E12;margin:0 0 6px">Sue's Angels FC</p>
    <h2 style="margin:0 0 10px;font-size:20px">${subject}</h2>
    <p style="margin:0 0 10px">${line}</p>
    <p style="margin:0 0 14px;color:#555;font-size:13px">Type: ${type}${source ? ' · Source: ' + source : ''}</p>
    <p style="margin:0"><a href="mailto:${email}" style="background:#FF6A2A;color:#171A1E;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700">Reply to ${email}</a></p>
  </div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: TO, reply_to: email, subject, html }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { res.status(200).json({ ok: false, error: (data && data.message) || 'send-failed' }); return; }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(200).json({ ok: false, error: String((e && e.message) || e) });
  }
}
