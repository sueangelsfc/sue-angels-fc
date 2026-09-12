/* ==========================================================================
   npm run indexnow  (the last step of the deploy's buildCommand)

   Posts the pages that changed in this build to IndexNow. See
   src/lib/indexnow.mjs for why and for how "changed" is decided.

   IT NEVER FAILS A DEPLOY. It runs after `guard`, so it only ever speaks for a
   build that is about to publish, and every way it can go wrong (no network,
   a slow endpoint, a refusal) is logged and ends with exit 0. Search engines
   finding a result an hour late is not a reason to stop the club publishing
   it.

   PRODUCTION ONLY. Vercel sets VERCEL_ENV; a preview build is not the site,
   and a laptop build is somebody working. `--force` sends from anywhere, for
   a deliberate resubmission.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLUB } from '../src/lib/club.mjs';
import { changedUrls, indexNowBody, INDEXNOW_ENDPOINT, INDEXNOW_FILE } from '../src/lib/indexnow.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const say = (s) => console.log(`[indexnow] ${s}`);
const force = process.argv.includes('--force');

const withTimeout = (ms) => {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms).unref();
  return c.signal;
};

async function main() {
  if (process.env.VERCEL_ENV !== 'production' && !force) {
    say(`skipped: not a production build (VERCEL_ENV=${process.env.VERCEL_ENV || 'unset'})`);
    return;
  }
  const next = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  if (!fs.existsSync(path.join(ROOT, INDEXNOW_FILE))) {
    say(`skipped: ${INDEXNOW_FILE} was not generated`);
    return;
  }

  /* The sitemap the live site is serving is the one this build replaces. If
     it cannot be read, everything in the new one is sent: an over-long list
     once is better than a change nobody is told about. */
  let prev = '';
  try {
    const r = await fetch(`${CLUB.site}/sitemap.xml`, { signal: withTimeout(8000) });
    if (r.ok) prev = await r.text();
    else say(`live sitemap answered ${r.status}; sending every URL`);
  } catch (e) {
    say(`live sitemap unreachable (${e.name}); sending every URL`);
  }

  const urls = changedUrls(prev, next, new URL(CLUB.site).host);
  if (!urls.length) {
    say('nothing changed since the live sitemap; nothing sent');
    return;
  }

  const r = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(indexNowBody(CLUB.site, urls)),
    signal: withTimeout(10000),
  });
  /* 200 and 202 are both acceptance; 202 means the key is checked later,
     which is normal on the first submission after the key file goes live. */
  say(`${urls.length} URL${urls.length === 1 ? '' : 's'} sent: ${r.status} ${r.statusText}`);
}

main().catch((e) => say(`not sent (${e.name}: ${e.message}); the deploy carries on`)).finally(() => process.exit(0));
