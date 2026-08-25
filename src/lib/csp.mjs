/* ==========================================================================
   THE CONTENT SECURITY POLICY, WRITTEN DOWN RATHER THAN TYPED IN

   A CSP is a list of hosts the browser will fetch from, and it goes wrong in
   two directions, quietly, in opposite ways.

   IT GOES STALE. `unpkg.com`, `cdn.jsdelivr.net` and `'unsafe-eval'` were in
   this policy for the Babel-in-the-browser admin, which was retired in the
   July rebuild. Nothing on the site had loaded from either host for months,
   and no page would have looked any different with them gone: a permission
   nobody uses looks exactly like a permission somebody needs.

   IT GOES SHORT. Worse, and harder to see. `sa.js` loads Google Analytics and
   the Meta pixel once a visitor consents, and neither host was in `script-src`
   - so the day the club set `SA_GA_ID`, analytics would have failed silently
   in the console of a page that looked perfectly fine. The panel's video
   screen shows YouTube thumbnails from `i.ytimg.com`, which `img-src` did not
   allow either, so those were broken on the live panel while this file was
   being written.

   So the policy is DATA, and every host carries the file that needs it. The
   suite greps that file: a host whose reason has gone away fails the build,
   and a host referenced by shipped output that no directive permits fails it
   too. Neither failure is a judgement call.

   It is asserted against `vercel.json` rather than written into it, because
   Vercel reads that file BEFORE the build runs. A generator that wrote it
   would always be one deploy behind, which is a worse bug than the drift.
   ========================================================================== */

/* Where the club's data lives. Named once so the three directives that need
   it cannot fall out of step. */
const SUPABASE = 'https://hvbquuvxcswylyguplfb.supabase.co';

/* Each entry: the host, and the shipped file that proves it is still needed.
   `why` is for whoever reads the failure; `provenBy` is what the suite greps.
   A bare string is a keyword the browser defines, not a host, so it has
   nothing to prove and carries its reasoning in a comment instead. */
export const CSP = {
  'default-src': [`'self'`],

  'script-src': [
    `'self'`,
    /* The theme is applied by an inline head script before first paint, and
       every page carries JSON-LD, which script-src also governs. Hashing
       these would mean a distinct header for each of 108 routes. */
    `'unsafe-inline'`,
    { host: 'https://www.googletagmanager.com', why: 'Google Analytics, loaded only after consent', provenBy: 'src/scripts/20-consent.js' },
    { host: 'https://connect.facebook.net', why: 'Meta pixel, loaded only after consent', provenBy: 'src/scripts/20-consent.js' },
  ],

  'style-src': [`'self'`, `'unsafe-inline'`],

  'font-src': [`'self'`],

  'img-src': [
    `'self'`,
    /* Drawn covers, resized photographs and canvas output before upload. */
    'data:',
    'blob:',
    { host: SUPABASE, why: 'player photographs, badges and uploaded covers', provenBy: 'src/data/runtime.json' },
    { host: 'https://i.ytimg.com', why: 'YouTube thumbnails in the panel’s video screen', provenBy: 'src/admin/lazy/80-video.js' },
    { host: 'https://www.google-analytics.com', why: 'GA4 sends some hits as an image beacon', requiredBy: 'https://www.googletagmanager.com' },
    { host: 'https://www.facebook.com', why: 'the Meta pixel is an image beacon', requiredBy: 'https://connect.facebook.net' },
  ],

  'media-src': [`'self'`],

  'connect-src': [
    `'self'`,
    { host: SUPABASE, why: 'every read and write the panel and the forms make', provenBy: 'src/data/runtime.json' },
    { host: `wss://hvbquuvxcswylyguplfb.supabase.co`, why: 'Supabase realtime, same origin over a socket', provenBy: 'src/data/runtime.json' },
    { host: 'https://www.google-analytics.com', why: 'where GA4 posts its events', requiredBy: 'https://www.googletagmanager.com' },
    { host: 'https://www.googletagmanager.com', why: 'gtag fetches its own configuration', provenBy: 'src/scripts/20-consent.js' },
  ],

  /* ONE YOUTUBE HOST, NOT TWO. `https://www.youtube.com` sat here as
     "embedded match footage" and nothing has ever been embedded from it: the
     only <iframe> on the site is the nocookie one below, and every other
     mention of YouTube is a plain link, which is navigation and not something
     a CSP governs at all. */
  'frame-src': [
    `'self'`,
    { host: 'https://www.youtube-nocookie.com', why: 'the one embedded player, on a match report', provenBy: 'src/templates/report.mjs' },
  ],

  'object-src': [`'none'`],
  'base-uri': [`'self'`],
  'form-action': [`'self'`],
  'frame-ancestors': [`'self'`],
  'upgrade-insecure-requests': [],
};

/* Which directive governs a given kind of fetch. The suite uses this to ask
   whether a host the output actually references is permitted, falling back
   through `default-src` the way a browser does. */
export const GOVERNS = {
  script: 'script-src',
  img: 'img-src',
  frame: 'frame-src',
  connect: 'connect-src',
  style: 'style-src',
  font: 'font-src',
  media: 'media-src',
};

export function hostsOf(directive) {
  return (CSP[directive] || []).filter((v) => typeof v === 'object').map((v) => v.host);
}

/* Every host in the policy, with the file that has to still mention it. */
export function claims() {
  const out = [];
  for (const [directive, values] of Object.entries(CSP)) {
    for (const v of values) if (typeof v === 'object') out.push({ directive, ...v });
  }
  return out;
}

/* Is `host` allowed to be fetched as `kind`? Falls back to default-src, as a
   browser does for any directive that is absent. */
export function permits(kind, host) {
  const directive = GOVERNS[kind];
  const list = CSP[directive] || CSP['default-src'] || [];
  return list.some((v) => {
    const s = typeof v === 'object' ? v.host : v;
    if (s === `'self'`) return host === 'www.suesangelsfc.co.uk' || host === 'suesangelsfc.co.uk';
    return s.replace(/^(https?|wss):\/\//, '') === host;
  });
}

/* The header value, in the order the directives are written above. */
export function renderCSP() {
  return Object.entries(CSP)
    .map(([directive, values]) => {
      const parts = values.map((v) => (typeof v === 'object' ? v.host : v));
      return parts.length ? directive + ' ' + parts.join(' ') : directive;
    })
    .join('; ');
}
