/* ==========================================================================
   CONTACT  (/contact.html)

   NOT a second enquiry form. The page this replaces was the same four routes
   and the same form as /join.html, which meant two lead-capture surfaces
   writing the same enquiries table, and two pages to keep in step. That is
   the drift this rebuild exists to stop.

   So this page answers the OTHER question. Join answers "I want to send a
   message"; this answers "I need a fact about this club": where the ground
   is, who to ask about what, and what the club actually is. Every route that
   needs a form points at Join rather than growing its own.

   The direct line lists email and Instagram. It does NOT list the YouTube
   channel: youtube.com/@suesangelsfc returns 404, and a page whose whole job
   is working routes to the club is the last place to print a dead one. The
   footer still carries it site-wide, which is a separate thing to fix once
   the club confirms the real handle.
   ========================================================================== */
import { esc, attr, icon } from '../lib/html.mjs';
import { CLUB, FAQS } from '../lib/club.mjs';
import { siteFooter, sitePreMain, siteHeader, auraFor } from './home.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

/* A maps search rather than an embed: an embed is a third-party iframe on
   every load, and this is one link that opens in whatever map app the reader
   already uses. */
const MAP = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CLUB.venue.mapQuery)}`;

const IG = CLUB.socials.find((s) => s.icon === 'instagram');
const FB = CLUB.socials.find((s) => s.icon === 'facebook');
const igHandle = IG ? `@${IG.href.replace(/\/$/, '').split('/').pop()}` : '';

/* Where each kind of question actually goes. The point of the page: nobody
   should have to guess which of eight pages answers them. */
const ROUTING = [
  {
    ico: 'shield',
    what: 'You want to play, help out or shoot',
    body: 'Trials, volunteering and the media team all go through one form, and it reaches the same inbox as everything else.',
    href: '/join.html', cta: 'Join the club',
  },
  {
    ico: 'star',
    what: 'Your business wants to back the club',
    body: 'The packages, the partners already on board, and the sponsorship pack to download.',
    href: '/sponsors.html', cta: 'Sponsorship',
  },
  {
    ico: 'camera',
    what: 'You are press, or you want to use our photographs',
    body: 'Crest, squad photographs and matchday images. Email the club and say what you need them for. We will usually say yes.',
    href: `mailto:${CLUB.email}?subject=${encodeURIComponent(`Media request - ${CLUB.name}`)}`, cta: 'Email the club',
  },
  {
    ico: 'calendar',
    what: 'You want to watch us play',
    body: `Home matches are Sunday mornings at ${CLUB.venue.shortName}. Nothing to pay, everyone welcome on the touchline, and every fixture goes up here as soon as it is confirmed.`,
    href: '/fixtures.html', cta: 'Fixtures',
  },
  {
    ico: 'heart',
    what: 'You want to know about the cause',
    body: `Why the club exists, what sepsis is, and how to support ${CLUB.charity.name}.`,
    href: '/sepsis.html', cta: 'Our cause',
  },
  {
    ico: 'mail',
    what: 'Something else entirely',
    body: 'One address, read by a person. If it does not fit any of the above, this is the one.',
    href: `mailto:${CLUB.email}`, cta: CLUB.email,
  },
];

export function contact(d) {
  const facts = [
    { k: 'Founded', v: String(CLUB.founded) },
    { k: 'Club type', v: CLUB.type },
    { k: 'League', v: CLUB.league },
    { k: 'League', v: `${d.divisionOf(d.nextSeason)}, promoted as ${d.titleDivision} champions` },
    { k: 'Home ground', v: `${CLUB.venue.name}, ${CLUB.venue.district}` },
    { k: 'Plays for', v: `${CLUB.charity.name}, in memory of ${CLUB.memorial.name}` },
    { k: 'Squad', v: `${d.squad.length} players` },
    { k: 'Coaching staff', v: `${d.coaches.length} on the staff` },
  ];

  /* ================= HERO ================= */
  const hero = `<section class="ct-hero" aria-labelledby="ct-h">
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Club information</p>
        <h1 class="ct-hero__title" id="ct-h">Contact<span class="volt">.</span></h1>
        <p class="ct-hero__lede">The direct line, the ground, and the details people ask us for.
          Anything that needs a form is on the Join page, so there is only ever one of those to
          keep up to date.</p>
      </div>
    </section>`;

  /* ================= 01 THE DIRECT LINE ================= */
  const line = (ic, k, label, href, sub, external) => `<li class="ct-line">
            <a class="ct-line__link" href="${attr(href)}"${external ? ' rel="noopener" target="_blank"' : ''}>
              <span class="ct-line__ico">${icon(ic, 'ico')}</span>
              <span class="ct-line__body">
                <span class="ct-line__k">${esc(k)}</span>
                <b class="ct-line__t">${esc(label)}</b>
                <span class="ct-line__b">${esc(sub)}</span>
              </span>
              <span class="ct-line__go" aria-hidden="true">→</span>
            </a>
          </li>`;

  const directBand = `<section class="sec ct-direct" aria-labelledby="ct-d-h">
      <div class="wrap">
        ${rail(1, 'Direct line', 'Read by a person')}
        <h2 class="h2 rv" id="ct-d-h">Straight to the <span class="volt">club.</span></h2>
        <ul class="ct-lines rv">
          ${line('mail', 'Email', CLUB.email, `mailto:${CLUB.email}`,
    'The club inbox. Everything lands here, including the forms.', false)}
          ${IG ? line('instagram', 'Instagram', igHandle, IG.href,
    'Matchday photographs, team news and the quickest reply.', true) : ''}
          ${FB ? line('facebook', 'Facebook', CLUB.name, FB.href,
    'The club page, for anyone who would rather find us there.', true) : ''}
        </ul>
      </div>
    </section>`;

  /* ================= 02 THE GROUND ================= */
  const groundBand = `<section class="sec ct-ground" aria-labelledby="ct-g-h">
      <div class="wrap">
        ${rail(2, 'The ground', esc(CLUB.venue.district))}
        <h2 class="h2 rv" id="ct-g-h">Where we <span class="volt">play.</span></h2>
        <div class="ct-ground__box rv">
          <div class="ct-ground__main">
            <p class="ct-ground__k">${icon('pin', 'ico')} Home ground</p>
            <p class="ct-ground__t">${esc(CLUB.venue.name)}</p>
            <address class="ct-ground__addr">${esc(CLUB.venue.street)}<br />${esc(CLUB.venue.district)}<br />${esc(CLUB.venue.locality)}</address>
            <p class="ct-ground__b">Shared with Staines Rugby, who publish it as their own address.
              Home matches are Sunday mornings. Everyone is welcome on the touchline and there is
              nothing to pay to watch.</p>
            <p class="ct-ground__btns">
              <a class="btn btn--volt" href="${attr(MAP)}" rel="noopener" target="_blank">
                Open in maps ${ARROW}</a>
              <a class="btn btn--ghost" href="/fixtures.html">See the fixtures</a>
            </p>
          </div>
          <div class="ct-ground__side">
            <img class="ct-ground__crest" src="${STAR}" alt="" width="120" height="148" loading="lazy" decoding="async" />
            <p class="ct-ground__note">No postcode is published here because nobody has published
              one the club can stand behind, and a wrong one sends a visiting team to the other side
              of Hanworth. The map link goes to the ground by name.</p>
          </div>
        </div>
      </div>
    </section>`;

  /* ================= 03 WHO TO ASK ================= */
  const routeBand = `<section class="sec ct-route" aria-labelledby="ct-r-h">
      <div class="wrap">
        ${rail(3, 'Who to ask', `${ROUTING.length} routes`)}
        <h2 class="h2 rv" id="ct-r-h">What are you <span class="volt">after?</span></h2>
        <ul class="ct-routes rv">
          ${ROUTING.map((r) => {
    const external = r.href.startsWith('mailto:');
    return `<li class="ct-route__item">
            <span class="ct-route__ico">${icon(r.ico, 'ico')}</span>
            <div class="ct-route__body">
              <b class="ct-route__t">${esc(r.what)}</b>
              <p class="ct-route__b">${esc(r.body)}</p>
            </div>
            <a class="ct-route__go" href="${attr(r.href)}"${external ? '' : ''}>${esc(r.cta)} ${ARROW}</a>
          </li>`;
  }).join('\n          ')}
        </ul>
      </div>
    </section>`;

  /* ================= 04 THE CLUB, FORMALLY ================= */
  const factBand = `<section class="sec ct-facts" aria-labelledby="ct-f-h">
      <div class="wrap">
        ${rail(4, 'The club', 'On the record')}
        <h2 class="h2 rv" id="ct-f-h">The details, on the <span class="volt">record.</span></h2>
        <dl class="ct-facts__list rv">
          ${facts.map((f) => `<div class="ct-fact">
            <dt>${esc(f.k)}</dt>
            <dd>${esc(f.v)}</dd>
          </div>`).join('\n          ')}
        </dl>
      </div>
    </section>`;

  /* ================= 05 COMMON QUESTIONS ================= */
  const faqBand = `<section class="sec ct-faq" aria-labelledby="ct-q-h">
      <div class="wrap">
        ${rail(5, 'Asked a lot', `${FAQS.length} answers`)}
        <h2 class="h2 rv" id="ct-q-h">The ones we get <span class="volt">most.</span></h2>
        <div class="faq rv">
          ${FAQS.map((f) => `<details class="faq__item">
            <summary class="faq__q">${esc(f.q)}<span class="faq__ico" aria-hidden="true">+</span></summary>
            <div class="faq__a"><p>${f.aHtml || esc(f.a)}</p></div>
          </details>`).join('\n          ')}
        </div>
      </div>
    </section>`;

  /* ================= CTA ================= */
  const ctaBand = `<section class="sec sec--cta ct-cta" aria-labelledby="ct-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">${esc(d.divisionOf(d.nextSeason))} · ${esc(d.nextSeason)}</p>
            <h2 class="h2" id="ct-cta-h">Still not the answer you <span class="volt">wanted?</span></h2>
            <p class="cta2__sub">Email the club and a person will read it. If it is about playing,
              helping or sponsoring, the form gets you a faster reply.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="mailto:${attr(CLUB.email)}">Email the club ${ARROW}</a>
              <a class="btn btn--ghost" href="/join.html">Join the club</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  return {
    css: 'home.css',
    shell: 'home',
    bodyClass: 'is-home is-sub is-contact',
    preMain: sitePreMain(auraFor('contact.html')),
    footerHtml: siteFooter(),
    body: siteHeader('/contact.html') + hero + directBand + groundBand + routeBand + factBand
      + faqBand + ctaBand,
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: `Contact · ${CLUB.name}`,
      description: `How to reach ${CLUB.name}, where the club plays, and the details people ask for.`,
      url: `${CLUB.site}/contact.html`,
    }],
    faqSchema: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  };
}
