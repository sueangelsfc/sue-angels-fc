// api/view.js, where in the world a page view came from, to the town.
//
// Vercel's edge works out an approximate location for every request from the
// connection and hands it to this function as headers. The browser never
// knows it and the page view beacon cannot send it, so the beacon calls this
// once per view and this calls record_page_place with the anonymous key the
// website already ships. See migrations/011_page_places_trails.sql.
//
// WHAT IS NEVER STORED: the address the request came from, the page, the
// time, or anything the caller sent - the body is not even read. A row is
// (day, country, region, town, rounded position, views) and nothing else.
//
// It answers 204 whatever happens. A counter is never worth an error on a
// supporter's phone, and until 011 has been run the database call fails
// quietly and the website carries on exactly as it did.

import runtime from '../src/data/runtime.json' with { type: 'json' };
import { tooMany } from './_public.js';

const ALLOWED_ORIGINS = ['https://www.suesangelsfc.co.uk', 'https://suesangelsfc.co.uk'];

/* Vercel URI-encodes the town, because a header cannot carry "Göttingen". */
const header = (req, name) => {
  const v = String(req.headers[name] || '').slice(0, 120);
  try { return decodeURIComponent(v); } catch (e) { return v; }
};
const coord = (v, limit) => {
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= limit ? Math.round(n * 10) / 10 : null;
};

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (origin && !ALLOWED_ORIGINS.includes(origin)) { res.status(403).json({ ok: false, error: 'forbidden' }); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method' }); return; }
  /* Anonymous by necessity, so a brake on a loop - wider than the forms'
     five a minute, in a bucket of its own, because somebody reading through
     the squad page by page makes a call for every page. See _public.js for
     what this is and is not. */
  if (tooMany(req, 90, 'view')) { res.status(429).json({ ok: false, error: 'too-many' }); return; }

  const place = {
    p_country: header(req, 'x-vercel-ip-country').toUpperCase().slice(0, 2),
    p_region: header(req, 'x-vercel-ip-country-region').slice(0, 12),
    p_city: header(req, 'x-vercel-ip-city').slice(0, 60),
    p_lat: coord(req.headers['x-vercel-ip-latitude'], 90),
    p_lon: coord(req.headers['x-vercel-ip-longitude'], 180),
  };
  if (!/^[A-Z]{2}$/.test(place.p_country)) { res.status(204).end(); return; }

  const post = (url) => fetch(url, {
    method: 'POST',
    headers: {
      apikey: runtime.supabase.anonKey,
      Authorization: 'Bearer ' + runtime.supabase.anonKey,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(place),
  });
  /* The town goes into the figures for sponsors only when the beacon asks,
     and the beacon asks only after the visitor has saved a yes to that
     purpose (window.saPrivacy.allows('sponsor')). Sharing with sponsors is
     outside the statistics exception, so it is consent or nothing. */
  const audience = String((req.query && req.query.audience) || '') === '1';
  try {
    await Promise.all([
      post(`${runtime.supabase.url}/rest/v1/rpc/record_page_place`),
      ...(audience ? [post(`${runtime.supabase.url}/rest/v1/rpc/record_audience_place`)] : []),
    ]);
  } catch (e) { /* never an error in exchange for a counter */ }
  res.status(204).end();
}
