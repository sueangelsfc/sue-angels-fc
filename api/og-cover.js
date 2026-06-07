// api/og-cover.js - generates the branded match scorecard as a 1200×630 image,
// so a shared match report unfurls with the "auto-generated cover" (badges +
// scoreline) instead of the generic club card.
//
// Edge function using @vercel/og (Satori + resvg-wasm). The element tree is
// built as plain Satori-shaped objects (no JSX, no React dependency). On ANY
// failure it redirects to the static club card, so the preview never breaks.
//
// Query params: home, away, hs, as, comp, date, result(w|d|l), left, right
// (left/right are absolute badge image URLs, resolved by api/share.js).

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const BG = '#04121B', VOLT = '#D6F23A', INK = '#EAF2F1', INK2 = '#9FB0B8';
const FALLBACK = 'https://www.suesangelsfc.co.uk/assets/og-cover.jpg';

function el(type, style, children) { return { type, props: { style, children } }; }

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const origin = url.origin;
    const g = (k) => url.searchParams.get(k) || '';
    const home = g('home'), away = g('away');
    const hs = g('hs'), as = g('as');
    const comp = g('comp') || 'League Ten';
    const date = g('date');
    const result = g('result');
    const left = g('left'), right = g('right');
    const resLabel = result === 'w' ? 'WIN' : result === 'd' ? 'DRAW' : result === 'l' ? 'LOSS' : '';
    const resColor = result === 'w' ? VOLT : result === 'l' ? '#FF6B6B' : INK2;

    const [font700, font600] = await Promise.all([
      fetch(origin + '/assets/fonts/hanken-700.woff').then(r => r.arrayBuffer()),
      fetch(origin + '/assets/fonts/hanken-600.woff').then(r => r.arrayBuffer())
    ]);

    const badge = (src) => src
      ? { type: 'img', props: { src, width: 188, height: 188, style: { objectFit: 'contain' } } }
      : el('div', { display: 'flex', width: 188, height: 188 }, []);

    const tree = el('div', {
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: BG, color: INK, padding: '66px 76px', justifyContent: 'space-between',
      fontFamily: 'Hanken'
    }, [
      el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 30, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }, [
        el('div', { display: 'flex', color: VOLT }, comp),
        el('div', { display: 'flex', color: INK2 }, 'Full time')
      ]),
      el('div', { display: 'flex', alignItems: 'center', justifyContent: 'center' }, [
        badge(left),
        el('div', { display: 'flex', alignItems: 'center', padding: '0 40px', fontSize: 132, fontWeight: 700, color: VOLT }, [
          el('div', { display: 'flex' }, hs || '0'),
          el('div', { display: 'flex', color: INK2, fontSize: 96, padding: '0 18px' }, '-'),
          el('div', { display: 'flex' }, as || '0')
        ]),
        badge(right)
      ]),
      el('div', { display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 38, fontWeight: 700 }, [
        el('div', { display: 'flex', maxWidth: 430, overflow: 'hidden' }, (home || '').replace(/\s*FC$/, '')),
        el('div', { display: 'flex', color: INK2, fontSize: 26, padding: '0 16px' }, 'v'),
        el('div', { display: 'flex', maxWidth: 430, overflow: 'hidden' }, (away || '').replace(/\s*FC$/, ''))
      ]),
      el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, [
        resLabel
          ? el('div', { display: 'flex', background: resColor, color: BG, fontSize: 26, fontWeight: 700, padding: '8px 24px', borderRadius: 999, letterSpacing: 1 }, resLabel)
          : el('div', { display: 'flex' }, ''),
        el('div', { display: 'flex', alignItems: 'center', fontSize: 26, color: INK2 }, [
          date ? el('div', { display: 'flex', padding: '0 16px 0 0' }, date) : el('div', { display: 'flex' }, ''),
          el('div', { display: 'flex', color: INK, fontWeight: 700 }, "Sue's Angels FC")
        ])
      ])
    ]);

    return new ImageResponse(tree, {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Hanken', data: font700, weight: 700, style: 'normal' },
        { name: 'Hanken', data: font600, weight: 600, style: 'normal' }
      ]
    });
  } catch (e) {
    return Response.redirect(FALLBACK, 302);
  }
}
