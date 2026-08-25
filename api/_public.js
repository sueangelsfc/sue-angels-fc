// Shared guards for the two endpoints anybody on the internet can call.
//
// /api/notify-enquiry and /api/subscribe are reached by the forms on the
// public site, so they are anonymous by necessity. That makes them the only
// two places on this project where a stranger's text reaches a third party
// the club pays for, and both had a hole.
//
// ESCAPING. notify-enquiry built the notification email by interpolating the
// caller's `type` and `source` straight into HTML. Only `email` was
// validated, so `type` could carry a tag, a link or an onerror handler into
// a message the club opens in its own inbox. Length is not validation.
//
// THROTTLING. Neither had any. Once RESEND_API_KEY is set, a loop against
// notify-enquiry is a mail flood aimed at suesangelsfc@gmail.com and a bill
// at Resend, sent by a machine that never touched the website.
//
// WHAT THE THROTTLE IS AND IS NOT. These run on Vercel's serverless
// functions, so this counter lives in one warm instance and a cold start
// begins again from nothing. It is a brake on a naive loop from one address,
// not a rate limiter, and saying so here is better than a comment implying a
// guarantee this cannot make. A real one needs shared state; if it is ever
// needed, the club already has Supabase.

const WINDOW_MS = 60 * 1000;
const MAX_IN_WINDOW = 5;
const hits = new Map();

export function tooMany(req) {
  /* Vercel sets x-forwarded-for; the first entry is the client. Everything
     unidentifiable shares one bucket, which is the safe way round: it
     throttles a caller hiding its address rather than exempting it. */
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const who = fwd || req.headers['x-real-ip'] || 'unknown';
  const now = Date.now();
  const seen = (hits.get(who) || []).filter((t) => now - t < WINDOW_MS);
  seen.push(now);
  hits.set(who, seen);
  /* The map is per-instance and short-lived, but a long-warm instance under
     a spray of addresses should not grow without limit. */
  if (hits.size > 2000) {
    for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > WINDOW_MS) hits.delete(k);
  }
  return seen.length > MAX_IN_WINDOW;
}

/* For text that reaches an HTML email. Ampersand first, or the escapes
   escape each other. */
export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
