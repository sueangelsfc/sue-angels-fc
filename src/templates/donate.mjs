/* ==========================================================================
   DONATE  (/donate.html, "Donate" under Get Involved)

   The club's own page for giving. Donating used to live only at the foot of
   the cause page, below the signs of sepsis, so somebody who wanted to put
   money into the football had to scroll past a medical page to find the
   button, and the menu had nowhere to send them.

   Two rules carried over from the cause page, because they matter more here:

   1. The button goes to the link the club sets in Control panel -> Donations
      (`donateLink`, shared with the cause page so the two cannot disagree).
      A Stripe Payment Link takes the amount on Stripe's own page, so this
      page offers no amount chips it cannot apply.

   2. Money for the club and money in Sue's memory are two different things
      and are said to be. The club's costs are the football; a gift in her
      memory goes to the UK Sepsis Trust, on the Trust's own site. The cause
      is never used here as a reason to give to the club.

   Its styling is the cause page's band (28-cause.css): the give cards, the
   help grid and the hero plate are the same components.
   ========================================================================== */
import { esc, attr } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { siteFooter, sitePreMain, siteHeader } from './home.mjs';
import { sourceNote } from '../lib/blocks.mjs';
import { donateLink } from './cause.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

/* The four costs the club already names on its home page band ("pitch hire,
   match fees, kit and referees"), in the club's words and no further. No
   figure is put against any of them: the club has not published one, and a
   made-up price on a donations page is the one place a guess does real harm. */
const USES = [
  { k: 'Pitch hire', v: 'A pitch and changing rooms for every home match, booked and paid for by the club.' },
  { k: 'Match fees', v: 'The fees that come with playing in the league and the county cup, every season.' },
  { k: 'Referees', v: 'A referee for every match, so the football is played properly and safely.' },
  { k: 'Kit', v: 'Shirts, balls, bibs and first aid, and replacing them when a season wears them out.' },
];

const STEPS = [
  { k: 'Press Donate securely', v: 'Stripe’s own payment page opens in a new tab.' },
  { k: 'Choose the amount', v: 'Any amount is a help. You type it on Stripe’s page and pay by card.' },
  { k: 'It reaches the club', v: 'Stripe pays it into the club’s account. Your card details stay with Stripe and never touch this website.' },
];

const OTHER = [
  {
    title: 'Sponsor a player’s season',
    body: 'Put your name, or your business, behind one of the registered squad for the whole season.',
    cta: 'See the players', href: '/sponsors.html#player-sponsorship',
  },
  {
    title: 'Partner with the club',
    body: 'Shirt, matchday and media placements for local businesses, with a pack that says what each one carries.',
    cta: 'Sponsorship', href: '/sponsors.html',
  },
  {
    title: 'Give your time',
    body: 'Help on a matchday, take photographs, film the goals or lend a hand behind the scenes.',
    cta: 'Get involved', href: '/join.html',
  },
];

export function donate(d) {
  const link = donateLink(d);
  const note = String((d.donate && d.donate.note) || '').trim();
  const heart = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9A5.4 5.4 0 0 1 12 6.5 5.4 5.4 0 0 1 21.6 12c-2.1 4.4-9.6 9-9.6 9z"/></svg>';
  const ext = 'rel="noopener" target="_blank"';

  /* ================= HERO ================= */
  const hero = `<section class="cz-hero" aria-labelledby="dn-h">
      <div class="wrap cz-hero__grid">
        <div>
          <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Donate</p>
          <h1 class="cz-hero__title" id="dn-h">Keep the Angels <span class="volt">playing.</span></h1>
          <p class="cz-hero__lede">${esc(CLUB.name)} is run by volunteers and paid for by the people
            around it. A donation goes into the football: the pitch, the referee, the kit and the fees
            that put a team out on a Sunday morning.</p>
          <div class="cz-hero__btns">
            <a class="btn btn--volt" href="${attr(link)}" ${ext}>Donate securely ${ARROW}<span class="sr-only"> (opens Stripe in a new tab)</span></a>
            <a class="btn btn--ghost" href="#give">Two ways to give</a>
          </div>
        </div>
        <!-- A named region rather than a complementary landmark, as on the
             cause page: it belongs to the section it is in. -->
        <section class="cz-plate glassbox" aria-label="Paying securely">
          <img class="cz-plate__crest" src="${STAR}" alt="${attr(CLUB.name)} crest"
               width="150" height="186" decoding="async" />
          <p class="cz-plate__name">Secure payment by Stripe</p>
          <p class="cz-plate__motto">You choose the amount. Any amount is a help.</p>
        </section>
      </div>
    </section>`;

  /* ================= 01 WHERE IT GOES ================= */
  const usesBand = `<section class="sec cz-help" aria-labelledby="dn-uses-h">
      <div class="wrap">
        ${rail(1, 'Where it goes', 'The football')}
        <h2 class="h2 rv" id="dn-uses-h">Where the money <span class="volt">goes.</span></h2>
        <ul class="cz-help__grid dn-uses rv">
          ${USES.map((u, i) => `<li class="cz-helpcard glassbox" style="--i:${i}">
            <h3>${esc(u.k)}</h3>
            <p>${esc(u.v)}</p>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>`;

  /* ================= 02 TWO WAYS TO GIVE ================= */
  const giveBand = `<section class="sec cz-donate" id="give" aria-labelledby="dn-give-h">
      <div class="wrap">
        ${rail(2, 'Two ways to give', 'Secure payment')}
        <div class="cz-donate__head rv">
          <h2 class="h2" id="dn-give-h">Give<span class="volt">.</span></h2>
          <p class="cz-donate__sub">Support ${esc(CLUB.short)} directly, or give to the
            ${esc(CLUB.charity.name)} in memory of ${esc(CLUB.memorial.name)}. They are separate, and
            both are a help.</p>
        </div>
        <ul class="cz-donate__grid rv">
          <li class="cz-give cz-give--club glassbox">
            <span class="cz-give__ico" aria-hidden="true">${heart}</span>
            <h3>Support the club</h3>
            <p>${note ? esc(note) : `Pitch hire, match fees, referees and kit. It all goes into running ${esc(CLUB.short)}.`}</p>
            <a class="btn btn--volt" href="${attr(link)}" ${ext}>Donate securely ${ARROW}<span class="sr-only"> (opens Stripe in a new tab)</span></a>
            <p class="cz-give__small">Card payment handled by Stripe. You choose the amount on Stripe’s
              own page, and we never see your card details.</p>
          </li>
          <li class="cz-give glassbox" id="memory">
            <span class="cz-give__ico" aria-hidden="true">${heart}</span>
            <h3>Give in Sue’s memory</h3>
            <p>${esc(CLUB.name)} was founded in memory of ${esc(CLUB.memorial.name)}, who died of sepsis.
              A gift to the ${esc(CLUB.charity.name)} supports families and funds the work that gets
              people diagnosed sooner.</p>
            <a class="btn btn--ghost" href="${attr(CLUB.charity.url)}" ${ext}>Donate to the Trust ${ARROW}<span class="sr-only"> (opens sepsistrust.org in a new tab)</span></a>
            <p class="cz-give__small">You will be taken to sepsistrust.org, where the donation is handled
              by the Trust.</p>
          </li>
        </ul>
      </div>
    </section>`;

  /* ================= 03 HOW IT WORKS ================= */
  const stepsBand = `<section class="sec cz-help" aria-labelledby="dn-how-h">
      <div class="wrap">
        ${rail(3, 'How it works', 'Stripe')}
        <h2 class="h2 rv" id="dn-how-h">How giving <span class="volt">works.</span></h2>
        <ol class="cz-help__grid dn-steps rv">
          ${STEPS.map((s, i) => `<li class="cz-helpcard glassbox" style="--i:${i}">
            <span class="dn-steps__n" aria-hidden="true">${i + 1}</span>
            <h3>${esc(s.k)}</h3>
            <p>${esc(s.v)}</p>
          </li>`).join('\n          ')}
        </ol>
      </div>
    </section>`;

  /* ================= 04 OTHER WAYS TO HELP ================= */
  const otherBand = `<section class="sec cz-help" aria-labelledby="dn-other-h">
      <div class="wrap">
        ${rail(4, 'Not only money', 'Three more ways')}
        <h2 class="h2 rv" id="dn-other-h">Other ways to <span class="volt">help.</span></h2>
        <ul class="cz-help__grid rv">
          ${OTHER.map((h, i) => `<li class="cz-helpcard glassbox" style="--i:${i}">
            <h3>${esc(h.title)}</h3>
            <p>${esc(h.body)}</p>
            <a class="btn btn--ghost btn--sm" href="${attr(h.href)}">${esc(h.cta)} ${ARROW}</a>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>`;

  return {
    body: siteHeader('/donate.html') + hero + usesBand + giveBand + stepsBand + otherBand
      + sourceNote(['sepsisTrust'], { lead: 'For what sepsis is and how the charity helps families, read' }),
    bodyClass: 'is-home is-sub is-cause is-donate',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Donate · ${CLUB.name}`,
      breadcrumb: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${CLUB.site}/` },
          { '@type': 'ListItem', position: 2, name: 'Donate', item: `${CLUB.site}/donate.html` },
        ],
      },
    }],
  };
}
