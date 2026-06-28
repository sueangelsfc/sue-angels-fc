// middleware.js, Vercel Edge Middleware (no dependencies, no build step).
//
// Vercel's vercel.json `rewrites` run AFTER the static filesystem, so a request
// to an existing file (teams.html / media.html) is served statically and a
// rewrite never fires. Edge Middleware runs BEFORE the filesystem, so it can
// intercept those requests when they carry a deep-link query param and route
// them to api/share.js, which returns the same page with rich Open Graph tags
// for the specific player / report / post / coach.
//
// Everything else, including these two pages loaded WITHOUT a deep-link param -
// passes straight through to the static file untouched.

export const config = { matcher: ['/teams.html', '/media.html'] };

export default function middleware(request) {
  const url = new URL(request.url);
  const p = url.pathname;
  const sp = url.searchParams;
  const deep =
    (p === '/teams.html' && (sp.has('player') || sp.has('coach'))) ||
    (p === '/media.html' && (sp.has('report') || sp.has('article')));
  if (!deep) return; // continue to the static page
  const dest = url.origin + '/api/share' + url.search;
  return new Response(null, { headers: { 'x-middleware-rewrite': dest } });
}
