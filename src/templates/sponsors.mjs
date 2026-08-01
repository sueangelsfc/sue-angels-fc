/* ==========================================================================
   SPONSORS  (/sponsors.html, "Sponsors" under The Club)

   A sales page, so it is built in the order a prospect thinks in: who already
   backs us, why it is worth backing us, what you actually get, and how to
   start. Proof leads, because a page that opens with its own sales pitch is
   asking to be believed before it has earned it.

   Each band takes a deliberately different form. An earlier pass had four
   consecutive grids of bordered boxes, which made a page of real content read
   as a template: partner tiles, then a ruled list, then connected steps, then
   glass. Same system, different rhythm.

   Every partner opens. The summary carries the name and the role, and the
   disclosure carries what they do, what their money buys and how long they
   have been here. It is a native <details>, so it works with the script
   blocked and a screen reader announces the state without any help from us.

   The one number that does the persuading, "played 18, won 18", is derived
   from the match records rather than typed into the sales copy where it would
   quietly go stale.

   Partner marks are the partners' own: white tile, never recoloured, never
   restyled, sized rather than cropped.
   ========================================================================== */
import { esc, attr } from '../lib/html.mjs';
import { CLUB, PARTNERS, SPONSOR_PACK } from '../lib/club.mjs';
import { teamSummary } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, auraFor } from './home.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';
const STRIPE_LINK = 'https://buy.stripe.com/aFacN69GRd3b9dG1DKak000';

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

/* Where a partner's name actually appears. The three numbered entries are the
   shirt positions drawn in the diagram beside them; the rest are everywhere
   else the club can carry a name. Shown rather than listed, because a page
   selling visibility that never shows the product is asking to be taken on
   trust. */
const PLACES = [
  { n: '1', k: 'Front of shirt', v: 'Central chest. The most visible spot at the club, worn every weekend.' },
  { n: '2', k: 'Sleeve', v: 'One available on each arm, sold separately.' },
  { n: '3', k: 'Back of shirt', v: 'Across the shoulders, above the number.' },
  { k: 'Warm-up and training', v: 'Worn before every match and at every session through the week.' },
  { k: 'Pitch-side board', v: `A weatherproof banner at ${CLUB.venue.shortName}, in front of players, families and visiting clubs.` },
  { k: 'Website and social', v: 'Your mark on this page and the home page, and features across Instagram and TikTok.' },
  { k: 'Matchday and reports', v: 'Named on result graphics and in the written match reports we publish all season.' },
];

const STEPS = [
  { k: 'Get in touch', v: 'Tell us a little about your business and what you would like from a partnership.' },
  { k: 'We build your package', v: 'We tailor the exposure around you, across kit, website, social, matchday and content.' },
  { k: 'Your brand goes live', v: 'You join the badge and reach our community every week, on and off the pitch.' },
];

export function sponsors(d) {
  const league = teamSummary((d.played || []).filter((m) => m.competition === CLUB.division));

  /* Every claim in this band is checkable, so each one carries the thing that
     backs it rather than an adjective. */
  const REASONS = [
    {
      k: 'Champions, with momentum',
      v: `Played ${league.played}, won ${league.won}, promoted to ${CLUB.nextDivision}. Your brand backs a `
        + 'winning, rising club, not a hopeful start-up.',
    },
    {
      k: 'A club with a cause',
      v: `Founded in memory of ${CLUB.memorial.name}, and supporting sepsis awareness. Backing us means `
        + 'standing behind something that matters.',
    },
    {
      k: 'Local roots, real reach',
      v: `Home at ${CLUB.venue.shortName} in ${CLUB.venue.district}, serving Kingston, Sunbury, Staines `
        + 'and south-west London, and growing across Instagram, TikTok and the web.',
    },
    {
      k: 'A package, not a slot',
      v: 'No fixed tiers. We build the partnership around your business, from kit and content to matchday and more.',
    },
  ];

  /* ================= HERO =================
     A logo wall used to sit on the right, repeating the partner list directly
     below it. In its place: the squad in the shirt, which is the thing being
     sold and the only proof on the page that a name goes on it. */
  const hero = `<section class="sp-hero" aria-labelledby="sp-h">
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Partners</p>
        <h1 class="sp-hero__title" id="sp-h">Behind the badge<span class="volt">.</span></h1>
        <p class="sp-hero__lede">The businesses and clubs that back ${esc(CLUB.short)}, including our
          ground-share partner. Here is who they are, and how to join them.</p>
        <div class="sp-hero__btns">
          <a class="btn btn--volt" href="#partner">Partner with us ${ARROW}</a>
          <a class="btn btn--ghost" href="${attr(SPONSOR_PACK)}" download>Download the pack</a>
        </div>
      </div>
      <div class="wrap">
        <figure class="sp-shot">
          <img src="/assets/hero/team.webp" alt="The ${attr(CLUB.name)} squad in the matchday kit, with the kit sponsor's name across the front of every shirt"
               width="1200" height="500" decoding="async" />
          <figcaption>The squad that won ${esc(CLUB.division)} unbeaten, in the shirt your name goes on.</figcaption>
        </figure>
      </div>
    </section>`;

  /* ================= 01 THE PARTNERS =================
     Proof first. Each row opens to the full relationship rather than sending
     the reader somewhere else for it. */
  const partnersBand = `<section class="sec sp-partners" id="partners" aria-labelledby="sp-p-h">
      <div class="wrap">
        ${rail(1, 'Proudly backed by', `${PARTNERS.length} partners`)}
        <h2 class="h2 rv" id="sp-p-h">Who backs the <span class="volt">badge.</span></h2>
        <p class="sp-lede rv">Four partners carry the club: two on the shirt, one on the training
          ground, and the club that gives us a home. Open any one for the full story.</p>

        <ul class="sp-plist rv">
          ${PARTNERS.map((p, i) => `<li class="sp-prow" style="--i:${i}">
            <details class="sp-det" name="partner">
              <summary class="sp-det__sum">
                <span class="sp-prow__mark">
                  <img src="${attr(p.logo)}" alt="${attr(p.name)}" width="150" height="90" loading="lazy" decoding="async" />
                </span>
                <span class="sp-prow__head">
                  <span class="sp-prow__role">${esc(p.role)}${p.since ? ` · since ${esc(p.since)}` : ''}</span>
                  <span class="sp-prow__name">${esc(p.name)}</span>
                  <span class="sp-prow__body">${esc(p.body)}</span>
                </span>
                <span class="sp-det__cue" aria-hidden="true">
                  <i></i><i></i>
                </span>
              </summary>
              <div class="sp-det__panel">
                ${p.trade ? `<p class="sp-det__trade">${esc(p.trade)}</p>` : ''}
                <p class="sp-det__text">${esc(p.detail)}</p>
                <p class="sp-det__k">What the partnership carries</p>
                <ul class="sp-det__list">
                  ${p.placements.map((x) => `<li>${esc(x)}</li>`).join('\n                  ')}
                </ul>
                ${(p.links || []).length ? `<p class="sp-det__k">Find them</p>
                <ul class="sp-det__links">
                  ${p.links.map((l) => `<li><a href="${attr(l.href)}" rel="noopener" target="_blank">
                    ${esc(l.label)}<span aria-hidden="true">↗</span>
                    <span class="sr-only">${esc(p.name)} on ${esc(l.label)}, opens in a new tab</span>
                  </a></li>`).join('\n                  ')}
                </ul>` : ''}
              </div>
            </details>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>`;

  /* ================= 02 WHY PARTNER =================
     Editorial rather than a grid: the argument on the left, the evidence as a
     ruled list on the right. */
  const whyBand = `<section class="sec sp-why" aria-labelledby="sp-why-h">
      <div class="wrap">
        ${rail(2, 'Why partner', `${league.won} from ${league.played}`)}
        <div class="sp-why__grid rv">
          <div class="sp-why__arg">
            <h2 class="h2" id="sp-why-h">More than a logo on a <span class="volt">shirt.</span></h2>
            <p class="sp-why__lede">${esc(CLUB.short)} is not a typical grassroots side. We are
              ${esc(CLUB.division)} champions, unbeaten in our first season, built around a cause that
              matters, with a growing audience that puts local businesses in front of the right people.</p>
            <p class="sp-why__stat">
              <b>${esc(league.won)}</b><i>from ${esc(league.played)}</i>
              <span>The league record your brand goes on.</span>
            </p>
          </div>
          <ol class="sp-ruled">
            ${REASONS.map((r, i) => `<li style="--i:${i}">
              <h3>${esc(r.k)}</h3>
              <p>${esc(r.v)}</p>
            </li>`).join('\n            ')}
          </ol>
        </div>
      </div>
    </section>`;

  /* ================= 03 WHERE YOUR BRAND GOES =================
     Drawn, not listed. This band used to be a second ruled list directly
     under the first one, which made two different arguments look like one
     component used twice. The shirt is the same diagram as page seven of the
     pack, so the page and the document a prospect downloads agree. */
  const shirt = (label, id, marks) => `<figure class="sp-kit__view">
          <figcaption>${esc(label)}</figcaption>
          <svg viewBox="0 0 188 176" width="188" height="176" fill="none" role="img"
               aria-labelledby="${attr(id)}" xmlns="http://www.w3.org/2000/svg">
            <title id="${attr(id)}">${esc(label)} of the matchday shirt, showing the sponsor positions</title>
            <path d="M62 12 L94 24 L126 12 L166 34 L152 62 L136 54 L136 164 L52 164 L52 54 L36 62 L22 34 Z"
                  fill="rgba(255,255,255,0.045)" stroke="var(--volt)" stroke-width="2.4" stroke-linejoin="round"/>
            <path d="M78 14 Q94 32 110 14" fill="none" stroke="var(--volt)" stroke-width="2.4"/>
            ${marks}
          </svg>
        </figure>`;

  const hotspot = (n, x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="none"
              stroke="var(--volt)" stroke-width="1.4" stroke-dasharray="5 4"/>
            <circle cx="${x + w / 2}" cy="${y + h / 2}" r="10" fill="var(--volt)"/>
            <text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle" font-family="Geist, sans-serif"
              font-size="12" font-weight="600" fill="var(--text-on-brand)">${n}</text>`;

  const placesBand = `<section class="sec sp-kit" aria-labelledby="sp-kit-h">
      <div class="wrap">
        ${rail(3, 'What a partnership carries', `${PLACES.length} placements`)}
        <h2 class="h2 rv" id="sp-kit-h">Where your brand <span class="volt">goes.</span></h2>
        <div class="sp-kit__grid rv">
          <div class="sp-kit__views">
            ${shirt('Front', 'sp-kit-front', hotspot(1, 64, 80, 60, 26) + hotspot(2, 30, 40, 18, 16) + hotspot(2, 140, 40, 18, 16))}
            ${shirt('Back', 'sp-kit-back', hotspot(3, 58, 44, 72, 22)
              + '<text x="94" y="132" text-anchor="middle" font-family="Geist, sans-serif" font-size="52" font-weight="600" fill="var(--volt)" opacity="0.2">9</text>')}
          </div>
          <ol class="sp-places">
            ${PLACES.map((p, i) => `<li style="--i:${i}">
              <span class="sp-places__n${p.n ? '' : ' is-off'}" aria-hidden="true">${p.n ? esc(p.n) : ''}</span>
              <h3>${esc(p.k)}</h3>
              <p>${esc(p.v)}</p>
            </li>`).join('\n            ')}
          </ol>
        </div>
        <p class="sp-kit__note">The full menu, priced item by item, is in the
          <a href="${attr(SPONSOR_PACK)}" download>sponsorship pack</a>.</p>
      </div>
    </section>`;

  /* ================= 04 HOW IT WORKS =================
     Three steps on one continuous line, because it is a sequence and a grid
     of three boxes does not say so. */
  const howBand = `<section class="sec sp-how" aria-labelledby="sp-how-h">
      <div class="wrap">
        ${rail(4, 'Getting involved', 'Three steps')}
        <h2 class="h2 rv" id="sp-how-h">How it <span class="volt">works.</span></h2>
        <div class="sp-steps__wrap rv">
          <span class="sp-steps__line" aria-hidden="true"></span>
          <ol class="sp-steps">
            ${STEPS.map((s, i) => `<li class="sp-step" style="--i:${i}">
              <span class="sp-step__dot" aria-hidden="true">${esc(i + 1)}</span>
              <h3>${esc(s.k)}</h3>
              <p>${esc(s.v)}</p>
            </li>`).join('\n            ')}
          </ol>
        </div>
      </div>
    </section>`;

  /* ================= 05 CTA ================= */
  const ctaBand = `<section class="sec sec--cta sp-cta" id="partner" aria-labelledby="sp-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">Become a partner</p>
            <h2 class="h2" id="sp-cta-h">Put your brand behind the <span class="volt">badge.</span></h2>
            <p class="cta2__sub">Sponsorship, kit, matchday or community partnerships. Let us build
              something that works for your business and the club.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="mailto:${attr(CLUB.email)}?subject=${attr(`Sponsorship enquiry - ${CLUB.name}`)}">Make an enquiry ${ARROW}</a>
              <a class="btn btn--ghost" href="${attr(SPONSOR_PACK)}" download>Download the pack</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  /* ================= 06 BACK THE BADGE =================
     Kept short. The full case for the cause, and the signs of sepsis, live on
     the cause page; repeating them here would bury the sponsorship ask. */
  const backBand = `<section class="sec sp-back" aria-labelledby="sp-back-h">
      <div class="wrap">
        ${rail(5, 'Support the club', 'Two ways')}
        <h2 class="h2 rv" id="sp-back-h">Back the <span class="volt">badge.</span></h2>
        <ul class="sp-back__grid rv">
          <li class="sp-give glassbox">
            <h3>Support the club</h3>
            <p>Equipment, training, matchdays and media. Every pound goes back into ${esc(CLUB.short)}.</p>
            <a class="btn btn--volt btn--sm" href="${attr(STRIPE_LINK)}" rel="noopener" target="_blank">Donate securely ${ARROW}</a>
            <p class="sp-give__small">Secure card payment via Stripe. You choose the amount on Stripe's page.</p>
          </li>
          <li class="sp-give glassbox">
            <h3>Support sepsis awareness</h3>
            <p>Give to ${esc(CLUB.charity.name)} in memory of ${esc(CLUB.memorial.name)} and help raise awareness.</p>
            <a class="btn btn--ghost btn--sm" href="${attr(CLUB.charity.url)}" rel="noopener" target="_blank">Donate to the cause ${ARROW}</a>
            <p class="sp-give__small">You will be taken to ${esc(CLUB.charity.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))},
              where the donation is handled by the charity.</p>
          </li>
        </ul>
      </div>
    </section>`;

  return {
    body: siteHeader('/sponsors.html') + hero + partnersBand + whyBand + placesBand
      + howBand + ctaBand + backBand,
    bodyClass: 'is-home is-sub is-sponsors',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(auraFor('sponsors.html')),
    footerHtml: siteFooter(),
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Sponsors · ${CLUB.name}`,
      breadcrumb: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${CLUB.site}/` },
          { '@type': 'ListItem', position: 2, name: 'Sponsors', item: `${CLUB.site}/sponsors.html` },
        ],
      },
    }],
  };
}
