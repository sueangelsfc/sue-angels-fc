/* ==========================================================================
   INDEXNOW: TELLING SEARCH ENGINES WHAT CHANGED

   A new result, a new article or a player's figures moving is a change to a
   page nobody's crawler knows about until it next happens to call. IndexNow
   is the open protocol Bing, Yandex, Seznam and Naver share (Bing's index also
   feeds DuckDuckGo and ChatGPT search): the site posts the addresses that
   changed and they come and fetch them. Google does not take part, and reads
   the sitemap as it always has.

   THE KEY IS PUBLIC BY DESIGN. It proves the site owns the host, by being
   served as a text file at the root, and it grants nothing else. It is not a
   secret and does not belong in runtime.json's company.

   WHAT CHANGED is read off the sitemap, not guessed: every URL whose lastmod
   differs from the sitemap the live site is serving, or that the live site
   does not list at all. Pure, and dependency-free, so the suite can hand it
   crafted sitemaps.
   ========================================================================== */

export const INDEXNOW_KEY = '9f4c2a7e1b8d4e6fa3c5d0b7e2f19a64';
export const INDEXNOW_FILE = `${INDEXNOW_KEY}.txt`;
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/* loc -> lastmod, for every <url> in a sitemap. Anything that is not a
   sitemap reads as an empty one. */
export function parseSitemap(xml) {
  const out = new Map();
  const re = /<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]*)<\/lastmod>)?/g;
  for (const m of String(xml || '').matchAll(re)) out.set(m[1].trim(), (m[2] || '').trim());
  return out;
}

/* The addresses in `nextXml` that are new or whose lastmod moved since
   `prevXml`, on `host` only. A URL on another host is never submitted: the
   key only proves ownership of this one. */
export function changedUrls(prevXml, nextXml, host) {
  const prev = parseSitemap(prevXml);
  return [...parseSitemap(nextXml)]
    .filter(([loc, mod]) => {
      try { if (host && new URL(loc).host !== host) return false; } catch { return false; }
      return !prev.has(loc) || prev.get(loc) !== mod;
    })
    .map(([loc]) => loc);
}

/* The body IndexNow asks for. The protocol caps a request at 10,000 URLs. */
export function indexNowBody(site, urls) {
  const { host } = new URL(site);
  return {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${site.replace(/\/$/, '')}/${INDEXNOW_FILE}`,
    urlList: urls.slice(0, 10000),
  };
}
