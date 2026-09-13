// api/newsletter-left.js, somebody left the newsletter: take them off the
// club's own supporter list too.
//
// The newsletter is sent by MailerLite and so is its unsubscribe link, which
// means MailerLite is the only place that knows somebody has gone. The
// privacy page promises the address comes off the club's own list as well
// (supporters, in Supabase). MailerLite calls this as a webhook, and this
// removes the address.
//
// ANYBODY CAN POST HERE, SO NOTHING IS BELIEVED UNSIGNED. MailerLite signs
// every request: the Signature header is an HMAC-SHA256 of the raw JSON body
// with the webhook's secret. It is checked, in constant time, before the body
// is even parsed. Hence the raw body: re-serialising a parsed object would not
// reproduce the bytes that were signed.
//
// AND THE DELETE NEEDS A KEY ONLY THIS FUNCTION HOLDS. The anonymous key may
// not touch `supporters`. forget_supporter() (migrations/015) deletes one
// address, and only when handed SUPPORTERS_FORGET_KEY, whose hash the
// database keeps. No all-powerful Supabase key goes anywhere near Vercel.
//
// Environment (Vercel, sue-angels-fc-b469), both unset until MailerLite is:
//   MAILERLITE_WEBHOOK_SECRET  the secret MailerLite shows for the webhook
//   SUPPORTERS_FORGET_KEY      the key migration 015 prints once
// Without them this answers 200 and does nothing, like /api/subscribe.
//
// MailerLite retries anything that is not a 2XX, three times. A forged or
// broken request gets a 4XX because it should never succeed; a database that
// did not answer gets a 500, because a retry is exactly what it wants.

import crypto from 'node:crypto';
import runtime from '../src/data/runtime.json' with { type: 'json' };
import { tooMany } from './_public.js';

const LEAVING = new Set(['subscriber.unsubscribed', 'subscriber.spam_reported', 'subscriber.deleted']);
const MAX_BYTES = 1024 * 1024;

/* Read from the stream, never through req.body: touching that makes Vercel
   parse the body, and the signature is over the bytes as they arrived. */
async function rawBody(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BYTES) return null;
    chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/* One event, or a batch of them: "deleted" is only ever sent batched, and the
   other two put the email at the top level where batched ones nest it. */
function leavers(body) {
  const events = Array.isArray(body && body.events) ? body.events : [body];
  const emails = events
    .filter((e) => e && LEAVING.has(String(e.event || e.type || '')))
    .map((e) => String(e.email || (e.subscriber && e.subscriber.email) || '').trim().toLowerCase())
    .filter((e) => e.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  return [...new Set(emails)].slice(0, 500);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'post_only' }); return; }
  /* A batch is one request, so this only ever brakes a loop. See _public.js. */
  if (tooMany(req, 60, 'newsletter-left')) { res.status(429).json({ ok: false, error: 'too_many' }); return; }

  const SECRET = process.env.MAILERLITE_WEBHOOK_SECRET;
  const KEY = process.env.SUPPORTERS_FORGET_KEY;
  if (!SECRET || !KEY) { res.status(200).json({ ok: true, skipped: 'not_configured' }); return; }

  const raw = await rawBody(req);
  if (raw == null) { res.status(413).json({ ok: false, error: 'too_large' }); return; }

  const sent = Buffer.from(String(req.headers.signature || ''), 'utf8');
  const want = Buffer.from(crypto.createHmac('sha256', SECRET).update(raw, 'utf8').digest('hex'), 'utf8');
  if (sent.length !== want.length || !crypto.timingSafeEqual(sent, want)) {
    res.status(401).json({ ok: false, error: 'signature' });
    return;
  }

  let body;
  try { body = JSON.parse(raw); } catch (e) { res.status(400).json({ ok: false, error: 'json' }); return; }

  let removed = 0;
  let failed = 0;
  for (const email of leavers(body)) {
    try {
      const r = await fetch(`${runtime.supabase.url}/rest/v1/rpc/forget_supporter`, {
        method: 'POST',
        headers: {
          apikey: runtime.supabase.anonKey,
          Authorization: 'Bearer ' + runtime.supabase.anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_email: email, p_key: KEY }),
      });
      if (r.ok) removed += Number(await r.json()) || 0;
      else failed++;
    } catch (e) { failed++; }
  }
  res.status(failed ? 500 : 200).json({ ok: !failed, removed, failed });
}
