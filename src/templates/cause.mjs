/* ==========================================================================
   OUR CAUSE  (/sepsis.html, "Our cause" under The Club)

   The most careful page on the site. Two rules shape it:

   1. It is awareness information, never medical advice. The signs come from
      the UK Sepsis Trust and the NHS, both are named and linked in the body
      rather than buried in a footnote, and the disclaimer sits with the signs
      instead of at the bottom where nobody reads it.

   2. It is about a person before it is about a condition. The page opens on
      Sue and closes on Sue; the clinical material sits in the middle, where
      someone who came looking for it can find it quickly.

   The published club copy is reused verbatim where it exists. It is the
   family's wording about their own loss and it is not ours to rephrase.
   ========================================================================== */
import { esc, attr, NAV } from '../lib/html.mjs';
import { CLUB, SEPSIS } from '../lib/club.mjs';
import { siteFooter, sitePreMain, siteHeader, auraFor } from './home.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

/* The club's own Stripe payment link. A Payment Link takes the amount on
   Stripe's own page, so this page must not show amount chips it cannot
   actually apply: offering "£10" here and landing the reader on a page asking
   them to choose again would be a small lie in a place that cannot afford
   one.

   The club sets this in Control panel -> Donations, which writes the
   `donate:config` record. That record existed and was read by nothing, so the
   only way to change where the club's own donate button pointed was to edit
   this file. The constant below is the fallback, and stays as the link that
   is live today. */
const STRIPE_FALLBACK = 'https://buy.stripe.com/aFacN69GRd3b9dG1DKak000';
const donateLink = (d) => {
  const cfg = (d.donate) || {};
  const link = String(cfg.stripeLink || cfg.link || '').trim();
  return /^https:\/\//.test(link) ? link : STRIPE_FALLBACK;
};

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

const HELP = [
  {
    title: 'Know and share the signs',
    body: 'The six signs above take a minute to learn and they can save a life. Learn them, then send them to the people you love.',
    cta: 'Share the signs', href: '#signs', share: true, external: false,
  },
  {
    title: `Support the ${CLUB.charity.name}`,
    body: 'The Trust supports families, funds research and raises awareness across the country. They are the reason good information about sepsis is easy to find.',
    cta: 'Visit sepsistrust.org', href: CLUB.charity.url, external: true,
  },
  {
    title: 'Stand with the club',
    body: `Back ${CLUB.short} as a sponsor, a partner or a volunteer, and help us carry her message a little further each season.`,
    cta: 'Get involved', href: '/join.html', external: false,
  },
];

export function cause(d) {
  const heart = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9A5.4 5.4 0 0 1 12 6.5 5.4 5.4 0 0 1 21.6 12c-2.1 4.4-9.6 9-9.6 9z"/></svg>';
  const phone = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.2 3.5h3l1.5 3.8-1.9 1.4a12 12 0 0 0 5.5 5.5l1.4-1.9 3.8 1.5v3a1.7 1.7 0 0 1-1.9 1.7A16.6 16.6 0 0 1 4.5 5.4 1.7 1.7 0 0 1 6.2 3.5z"/></svg>';

  /* ================= HERO ================= */
  const hero = `<section class="cz-hero" aria-labelledby="cz-h">
      <div class="wrap cz-hero__grid">
        <div>
          <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Our cause</p>
          <h1 class="cz-hero__title" id="cz-h">For <span class="volt">Sue.</span></h1>
          <p class="cz-hero__lede">${esc(CLUB.name)} was founded in memory of ${esc(CLUB.memorial.name)},
            who we lost to sepsis. We play in her name, and we share what we have learned so that other
            families can recognise the signs in time.</p>
          <div class="cz-hero__btns">
            <a class="btn btn--volt" href="#signs">Know the signs ${ARROW}</a>
            <a class="btn btn--ghost" href="#donate">Donate in her memory</a>
          </div>
        </div>
        <aside class="cz-plate glassbox" aria-label="In memory">
          <img class="cz-plate__crest" src="${STAR}" alt="${attr(CLUB.name)} crest"
               width="150" height="186" decoding="async" />
          <p class="cz-plate__name">${esc(CLUB.memorial.name)}</p>
          <p class="cz-plate__motto">“${esc(CLUB.memorial.motto)}”</p>
        </aside>
      </div>
    </section>`;

  /* ================= 01 THE NUMBERS =================
     Three headline figures, so a stat tile each. The middle one is the reason
     the page exists, and it is attributed on the tile rather than left to
     float as a bare number. */
  const facts = [
    { v: CLUB.founded, k: 'Founded in her memory' },
    { v: SEPSIS.livesLostUK, k: `Lives lost to sepsis in the UK each year`, src: SEPSIS.source },
    { v: SEPSIS.adultSigns.length, k: 'Signs that can help save one' },
  ];

  const factsBand = `<section class="sec cz-facts" aria-label="The cause in numbers">
      <div class="wrap">
        ${rail(1, 'Why this page exists', CLUB.charity.name)}
        <ul class="cz-figs rv">
          ${facts.map((f) => `<li class="cz-fig glassbox">
            <b>${esc(f.v)}</b>
            <span>${esc(f.k)}</span>
            ${f.src ? `<i>Source: ${esc(f.src)}</i>` : ''}
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>`;

  /* ================= 02 WHY WE EXIST =================
     The club's published wording, kept verbatim. */
  const storyBand = `<section class="sec cz-story" aria-labelledby="cz-story-h">
      <div class="wrap">
        ${rail(2, 'Why we exist', `Est. ${CLUB.founded}`)}
        <div class="cz-story__grid rv">
          <div class="cz-story__panel">
            <blockquote class="cz-story__quote" id="cz-story-h">“${esc(CLUB.memorial.motto)}”</blockquote>
            <p>Everything about this club begins with one person. ${esc(CLUB.name)} was founded in
              ${esc(CLUB.founded)} in memory of ${esc(CLUB.memorial.name)}, so that her name stays part of
              something good, week after week.</p>
            <p>We lost Sue to sepsis. It is a loss her family and friends carry every day, and it is the
              reason this club exists. We play for her, and we talk openly about sepsis so that fewer
              people have to go through the same thing.</p>
          </div>
          <figure class="cz-story__fig">
            <img src="/assets/hero/team.webp" alt="${attr(CLUB.name)} players celebrating together"
                 width="640" height="800" loading="lazy" decoding="async" />
            <figcaption>Every match carries her name a little further.</figcaption>
          </figure>
        </div>
      </div>
    </section>`;

  /* ================= 03 WHAT SEPSIS IS ================= */
  const whatBand = `<section class="sec cz-what" aria-labelledby="cz-what-h">
      <div class="wrap">
        ${rail(3, 'Understanding sepsis', 'NHS · UK Sepsis Trust')}
        <div class="cz-what__grid rv">
          <h2 class="h2" id="cz-what-h">What sepsis <span class="volt">is.</span></h2>
          <div class="cz-what__body">
            <p>${esc(SEPSIS.what)}</p>
            <p>The <a href="${attr(CLUB.charity.url)}" rel="noopener" target="_blank">${esc(CLUB.charity.name)}</a>
              estimates that sepsis takes around ${esc(SEPSIS.livesLostUK)} lives in the UK every year. Early
              treatment is what changes the outcome, and early treatment starts with somebody noticing.
              That is why we keep talking about it.</p>
          </div>
        </div>
      </div>
    </section>`;

  /* ================= 04 THE SIGNS =================
     The letters spell SEPSIS, which is how the Trust teaches it, so they are
     shown as the mnemonic rather than as decoration. */
  const signsBand = `<section class="sec cz-signs" id="signs" aria-labelledby="cz-signs-h">
      <div class="wrap">
        ${rail(4, 'Know the signs', 'Call 999 or NHS 111')}
        <div class="cz-signs__head rv">
          <h2 class="h2" id="cz-signs-h">Could it be <span class="volt">sepsis?</span></h2>
          <p class="cz-signs__sub">In an adult, trust your instinct and get help quickly. Ask that
            question if you notice any of these.</p>
          <!-- Real tel: links. Someone reading this on a phone, worried about
               a person in front of them, should be one tap from the call
               rather than reading a number back to themselves. -->
          <p class="cz-call">
            <a class="cz-call__btn" href="tel:999">
              <span class="cz-call__ico" aria-hidden="true">${phone}</span>
              <span class="cz-call__t"><b>999</b><i>Emergency</i></span>
            </a>
            <a class="cz-call__btn" href="tel:111">
              <span class="cz-call__ico" aria-hidden="true">${phone}</span>
              <span class="cz-call__t"><b>NHS 111</b><i>Urgent advice</i></span>
            </a>
          </p>
        </div>
        <ol class="cz-signs__grid rv">
          ${SEPSIS.adultSigns.map((s, i) => `<li class="cz-sign" style="--i:${i}">
            <span class="cz-sign__letter" aria-hidden="true">${esc(s.letter)}</span>
            <span class="cz-sign__text">
              <h3 class="cz-sign__title">${esc(s.title)}</h3>
              <p class="cz-sign__body">${esc(s.body)}</p>
            </span>
          </li>`).join('\n          ')}
        </ol>

        <div class="cz-child glassbox rv" role="group" aria-labelledby="cz-child-h">
          <p class="cz-child__eyebrow" id="cz-child-h">In a child or baby</p>
          <p class="cz-child__lead">Call <a href="tel:999">999</a> or go straight to A&amp;E if a child:</p>
          <ul class="cz-child__list">
            ${SEPSIS.childSigns.map((c) => `<li>${esc(c)}</li>`).join('\n            ')}
          </ul>
          <p class="cz-child__note">${esc(SEPSIS.babyNote)}</p>
        </div>

        <div class="cz-ask rv">
          <p class="cz-ask__k">If you are worried, say this</p>
          <p class="cz-ask__q">“Could it be sepsis?”</p>
          <p class="cz-ask__body">Asking out loud is the point. It prompts the checks that find sepsis
            early, and no doctor or paramedic will mind you asking.</p>
        </div>

        <aside class="cz-note rv" role="note">
          <p class="cz-note__lead">Trust your instinct. If someone is getting worse quickly, please do not
            wait. Ask the question: could it be sepsis?</p>
          <p class="cz-note__small">${esc(SEPSIS.disclaimer)}</p>
        </aside>
      </div>
    </section>`;

  /* ================= 05 THREE WAYS TO HELP ================= */
  const helpBand = `<section class="sec cz-help" aria-labelledby="cz-help-h">
      <div class="wrap">
        ${rail(5, 'Get involved', 'Three ways')}
        <h2 class="h2 rv" id="cz-help-h">Three ways to <span class="volt">help.</span></h2>
        <ul class="cz-help__grid rv">
          ${HELP.map((h, i) => `<li class="cz-helpcard glassbox" style="--i:${i}">
            <h3>${esc(h.title)}</h3>
            <p>${esc(h.body)}</p>
            <a class="btn btn--ghost btn--sm" href="${attr(h.href)}"${h.share ? ' data-share' : ''}${h.external ? ' rel="noopener" target="_blank"' : ''}>${esc(h.cta)} ${ARROW}</a>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>`;

  /* ================= 06 DONATE ================= */
  const donateBand = `<section class="sec cz-donate" id="donate" aria-labelledby="cz-donate-h">
      <div class="wrap">
        ${rail(6, 'Give in her memory', 'Secure payment')}
        <div class="cz-donate__head rv">
          <h2 class="h2" id="cz-donate-h">Donate<span class="volt">.</span></h2>
          <p class="cz-donate__sub">You can support ${esc(CLUB.short)} directly, or give to the
            ${esc(CLUB.charity.name)} in Sue's memory. Both keep her name doing something useful.</p>
        </div>
        <ul class="cz-donate__grid rv">
          <li class="cz-give cz-give--club glassbox">
            <span class="cz-give__ico" aria-hidden="true">${heart}</span>
            <h3>Support the club</h3>
            <p>Equipment, training, matchdays and media. Every pound goes back into ${esc(CLUB.short)}.</p>
            <a class="btn btn--volt" href="${attr(donateLink(d))}" rel="noopener" target="_blank">Donate securely ${ARROW}</a>
            <p class="cz-give__small">Card payment handled by Stripe. You choose the amount on Stripe's
              own page, and we never see your card details.</p>
          </li>
          <li class="cz-give glassbox">
            <span class="cz-give__ico" aria-hidden="true">${heart}</span>
            <h3>Support sepsis awareness</h3>
            <p>Give to the ${esc(CLUB.charity.name)} in memory of ${esc(CLUB.memorial.name)}, and help fund
              the research and the campaigns that get people diagnosed sooner.</p>
            <a class="btn btn--ghost" href="${attr(CLUB.charity.url)}" rel="noopener" target="_blank">Donate to the cause ${ARROW}</a>
            <p class="cz-give__small">You will be taken to sepsistrust.org, where the donation is handled
              by the Trust.</p>
          </li>
        </ul>
      </div>
    </section>`;

  /* ================= CTA ================= */
  const ctaBand = `<section class="sec sec--cta cz-cta" aria-labelledby="cz-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">In her name</p>
            <h2 class="h2" id="cz-cta-h">We play for something <span class="volt">bigger.</span></h2>
            <p class="cta2__sub">In memory of ${esc(CLUB.memorial.name)}. Every match, and every season,
              carries her name and her story a little further.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="/sponsors.html">Partner with the club ${ARROW}</a>
              <a class="btn btn--ghost" href="/contact.html">Get in touch</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  return {
    body: siteHeader('/sepsis.html') + hero + factsBand + storyBand + whatBand
      + signsBand + helpBand + donateBand + ctaBand,
    bodyClass: 'is-home is-sub is-cause',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(auraFor('sepsis.html')),
    footerHtml: siteFooter(),
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Our cause: sepsis awareness · ${CLUB.name}`,
      about: { '@type': 'MedicalCondition', name: 'Sepsis' },
      breadcrumb: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${CLUB.site}/` },
          { '@type': 'ListItem', position: 2, name: 'Our cause', item: `${CLUB.site}/sepsis.html` },
        ],
      },
    }],
  };
}
