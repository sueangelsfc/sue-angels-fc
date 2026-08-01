/* ==========================================================================
   JOIN THE CLUB  (/join.html)

   The only page on the site whose job is to collect something rather than to
   tell you something. Everything here is arranged around one form.

   THE ONE STRUCTURAL DECISION WORTH KNOWING
   The page it replaces was four routes that swapped a form in and out with
   JavaScript, and only the selected route existed in the document. That is
   the failure mode CLAUDE.md warns about: if the script does not run, the
   page has no form at all, and a form is the entire point of this URL.

   So there is ONE form, and the route is a real <select> inside it. With no
   JavaScript the four route cards are ordinary anchors to the form and the
   visitor picks their route from the menu, which is a complete, working
   page. With JavaScript, clicking a card sets the menu and moves focus, so
   it behaves the way the tabbed version did. Nothing is ever hidden.

   The form writes to Supabase AND posts the email endpoint; it succeeds if
   either lands. See CLAUDE.md - a form that only emailed is what once left
   the enquiries table empty.
   ========================================================================== */
import { esc, attr, icon } from '../lib/html.mjs';
import { CLUB, JOIN_PATHS, JOIN_FAQS, ENQUIRY_TYPES, NEXT_FIXTURE } from '../lib/club.mjs';
import { fmtDate, teamSummary } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, auraFor } from './home.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

/* The reference line each card carries under its title. Short, factual, and
   the thing somebody actually wants to know before they commit to typing. */
const ROUTE_META = {
  trial: { ico: 'shield', note: 'Every position', reply: 'Reply inside 48 hours' },
  media: { ico: 'camera', note: 'No experience needed', reply: 'Portfolio work every week' },
  volunteer: { ico: 'users', note: 'However much time you have', reply: 'Matchday access' },
  sponsorship: { ico: 'star', note: 'Packages built to fit', reply: 'On the shirt for 26/27' },
};

/* ==========================================================================
   THE FORM
   Markup carries the hooks src/scripts/00-core.js binds to: data-enquiry,
   the per-field data-error-for targets, the error summary and the status
   region. Change a name here and the handler stops finding it.
   ========================================================================== */
function joinForm() {
  const opt = (t, i) => `<option value="${attr(t.key)}"${i === 0 ? ' selected' : ''}>${esc(t.label)}</option>`;
  return `<form class="jn-form" id="enquire" data-enquiry data-enquiry-type="trial"
      data-enquiry-requires-message
      data-enquiry-ok="Thank you. Your details are with the club and we will come back to you, usually inside 48 hours."
      novalidate>
      <div class="jn-form__head">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Register your interest</p>
        <h2 class="h2" id="jn-form-h">Put your name <span class="volt">in.</span></h2>
        <p class="jn-form__sub">One form for all four routes. It goes straight to the club inbox and
          a person reads it.</p>
      </div>

      <div class="jn-form__err" data-error-summary role="alert" tabindex="-1" hidden>
        <p class="jn-form__errh">Please check the form</p>
        <ul data-error-list></ul>
      </div>

      <div class="jn-grid">
        <p class="jn-field">
          <label class="jn-label" for="jn-route">What is it about?</label>
          <span class="jn-selwrap">
            <select class="jn-input jn-select" id="jn-route" name="enquiryType" data-join-select>
              ${ENQUIRY_TYPES.map(opt).join('\n              ')}
            </select>
            ${icon('down', 'jn-selico')}
          </span>
        </p>
        <p class="jn-field">
          <label class="jn-label" for="jn-sub">Position or role <span class="jn-opt">optional</span></label>
          <input class="jn-input" id="jn-sub" name="subject" type="text"
            placeholder="Centre back, photographer, anything" />
        </p>
        <p class="jn-field">
          <label class="jn-label" for="jn-name">Your name <b class="jn-req" aria-hidden="true">*</b></label>
          <input class="jn-input" id="jn-name" name="name" type="text" autocomplete="name" required />
          <span class="jn-err" data-error-for="name" hidden></span>
        </p>
        <p class="jn-field">
          <label class="jn-label" for="jn-email">Email <b class="jn-req" aria-hidden="true">*</b></label>
          <input class="jn-input" id="jn-email" name="email" type="email" inputmode="email"
            autocomplete="email" required />
          <span class="jn-err" data-error-for="email" hidden></span>
        </p>
        <p class="jn-field jn-field--full">
          <label class="jn-label" for="jn-phone">Phone <span class="jn-opt">optional</span></label>
          <input class="jn-input" id="jn-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" />
        </p>
        <p class="jn-field jn-field--full">
          <label class="jn-label" for="jn-msg">Tell us about yourself <b class="jn-req" aria-hidden="true">*</b></label>
          <textarea class="jn-input jn-textarea" id="jn-msg" name="message" rows="5" required
            placeholder="Where you have played, what you do, or how much time you can give. A couple of lines is plenty."></textarea>
          <span class="jn-err" data-error-for="message" hidden></span>
        </p>
        <p class="jn-field jn-field--full jn-consent">
          <label class="jn-check" for="jn-consent">
            <input id="jn-consent" name="consent" type="checkbox" required />
            <span class="jn-check__box" aria-hidden="true"></span>
            <span class="jn-check__t">I am happy for ${esc(CLUB.short)} FC to contact me about this.</span>
          </label>
          <span class="jn-err" data-error-for="consent" hidden></span>
        </p>
      </div>

      <div class="jn-form__foot">
        <button class="btn btn--volt" type="submit">Send it ${ARROW}</button>
        <p class="jn-status" data-enquiry-status role="status" aria-live="polite"></p>
      </div>
      <p class="jn-form__alt">Would rather just email? <a href="mailto:${attr(CLUB.email)}">${esc(CLUB.email)}</a></p>
    </form>`;
}

/* ==========================================================================
   THE PAGE
   ========================================================================== */
export function join(d) {
  /* The LEAGUE record, not the all-competitions one. Across every competition
     the season reads P33 W29 D1 L3, which is true and is the wrong fact for
     this page: it sits directly under "League Eight, where we play next" and
     invites the reader to compare two different things. The league record is
     the one that earned the promotion, and it is the one the published table
     agrees with. Derived by filtering, never typed in. */
  const s = teamSummary((d.played || []).filter((m) => m.competition === CLUB.division));

  /* A real upcoming fixture if one is stored, otherwise the code baseline.
     Same precedence the homepage uses, so the two cannot disagree. */
  const upcoming = (d.fixtures || [])
    .filter((m) => !m.played)
    .slice()
    .sort((a, b) => (a.iso || '').localeCompare(b.iso || ''));
  const next = upcoming[0] || null;
  const nextName = next ? (next.weAreHome === false ? next.home : next.away) : NEXT_FIXTURE.badgeName;
  const nextDate = next ? fmtDate(next.date, { weekday: true }) : NEXT_FIXTURE.dateLabel;
  const nextComp = next ? next.competition : NEXT_FIXTURE.competition;

  /* ================= HERO ================= */
  const hero = `<section class="jn-hero" aria-labelledby="jn-h">
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Get involved</p>
        <h1 class="jn-hero__title" id="jn-h">Join the club<span class="volt">.</span></h1>
        <p class="jn-hero__lede">Players, media, volunteers and sponsors. Four ways in, one form,
          and a person on the other end of it.</p>
        <ul class="jn-hero__facts">
          <li><b>${esc(CLUB.nextDivision)}</b><span>Where we play next</span></li>
          <li><b>P${esc(s.played)} W${esc(s.won)} D${esc(s.drawn)} L${esc(s.lost)}</b><span>${esc(CLUB.division)}${s.lost === 0 ? ', unbeaten' : ''}</span></li>
          <li><b>${esc(CLUB.venue.shortName)}, ${esc(CLUB.venue.district)}</b><span>Our home ground</span></li>
        </ul>
        <p class="jn-hero__btns">
          <a class="btn btn--volt" href="#enquire">Register your interest ${ARROW}</a>
          <a class="btn btn--ghost" href="#routes">See the four routes</a>
        </p>
      </div>
    </section>`;

  /* ================= 01 THE FOUR ROUTES =================
     Anchors, not buttons: with no script they carry you to the form, which
     already contains every route in its menu. */
  const routesBand = `<section class="sec jn-routes" id="routes" aria-labelledby="jn-r-h">
      <div class="wrap">
        ${rail(1, 'Ways in', 'Four routes')}
        <h2 class="h2 rv" id="jn-r-h">Pick your way <span class="volt">in.</span></h2>
        <ul class="jn-grid4 rv">
          ${JOIN_PATHS.map((p) => {
    const m = ROUTE_META[p.type] || {};
    return `<li class="jn-route">
            <a class="jn-route__link" href="#enquire" data-join-route="${attr(p.type)}">
              <span class="jn-route__top">
                <span class="jn-route__ico">${icon(m.ico || 'check', 'ico')}</span>
                <span class="jn-route__n">${esc(p.n)}</span>
              </span>
              <b class="jn-route__t">${esc(p.title)}</b>
              <span class="jn-route__b">${esc(p.body)}</span>
              <span class="jn-route__meta">${esc(m.note || '')}<i>${esc(m.reply || '')}</i></span>
              <span class="jn-route__go">${esc(p.cta.label)} ${ARROW}</span>
            </a>
          </li>`;
  }).join('\n          ')}
        </ul>
      </div>
    </section>`;

  /* ================= 02 THE FORM ================= */
  const formBand = `<section class="sec jn-formband" aria-labelledby="jn-form-h">
      <div class="wrap">
        ${rail(2, 'Register', 'One form')}
        <div class="rv">${joinForm()}</div>
      </div>
    </section>`;

  /* ================= 03 WHERE AND WHEN =================
     No training schedule. See the note on JOIN_FAQS: the site cannot keep a
     weekly session time true on its own, and a stale one sends somebody to a
     locked ground. Session details come back with the reply. */
  const trainBand = `<section class="sec jn-when" aria-labelledby="jn-w-h">
      <div class="wrap">
        ${rail(3, 'Where and when', esc(CLUB.venue.district))}
        <h2 class="h2 rv" id="jn-w-h">Where you would be <span class="volt">playing.</span></h2>
        <div class="jn-when__grid rv">
          <div class="jn-when__card">
            <p class="jn-when__k">${icon('pin', 'ico')} Home ground</p>
            <p class="jn-when__t">${esc(CLUB.venue.shortName)}, ${esc(CLUB.venue.district)}</p>
            <p class="jn-when__b">${esc(CLUB.venue.name)} is where the Angels play their home
              matches, shared with Staines Rugby.</p>
          </div>
          <div class="jn-when__card">
            <p class="jn-when__k">${icon('calendar', 'ico')} Next match</p>
            <p class="jn-when__t">${esc(nextName)}</p>
            <p class="jn-when__b">${esc(nextDate)} · ${esc(nextComp)}. Everyone is welcome on the
              touchline, and there is nothing to pay.</p>
          </div>
          <div class="jn-when__card">
            <p class="jn-when__k">${icon('users', 'ico')} Who plays</p>
            <p class="jn-when__t">${esc(CLUB.type)}</p>
            <p class="jn-when__b">Sunday mornings in the ${esc(CLUB.league)}, playing for
              ${esc(CLUB.memorial.cause)} in memory of ${esc(CLUB.memorial.name)}.</p>
          </div>
        </div>
      </div>
    </section>`;

  /* ================= 04 QUESTIONS ================= */
  const faqBand = `<section class="sec jn-faq" aria-labelledby="jn-q-h">
      <div class="wrap">
        ${rail(4, 'Good to know', `${JOIN_FAQS.length} answers`)}
        <h2 class="h2 rv" id="jn-q-h">Before you <span class="volt">send it.</span></h2>
        <div class="faq rv">
          ${JOIN_FAQS.map((f) => `<details class="faq__item">
            <summary class="faq__q">${esc(f.q)}<span class="faq__ico" aria-hidden="true">+</span></summary>
            <div class="faq__a"><p>${f.aHtml || esc(f.a)}</p></div>
          </details>`).join('\n          ')}
        </div>
      </div>
    </section>`;

  /* ================= CTA ================= */
  const ctaBand = `<section class="sec sec--cta jn-cta" aria-labelledby="jn-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">${esc(CLUB.nextDivision)} · 26/27</p>
            <h2 class="h2" id="jn-cta-h">There is a shirt with your <span class="volt">name on it.</span></h2>
            <p class="cta2__sub">Whether you play, shoot, organise or sponsor, the club is built out
              of people who put their hand up.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="#enquire">Register your interest ${ARROW}</a>
              <a class="btn btn--ghost" href="/sponsors.html">Partner with us</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  return {
    css: 'home.css',
    shell: 'home',
    bodyClass: 'is-home is-sub is-join',
    preMain: sitePreMain(auraFor('join.html')),
    footerHtml: siteFooter(),
    body: siteHeader('/join.html') + hero + routesBand + formBand + trainBand + faqBand + ctaBand,
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Join · ${CLUB.name}`,
      description: `Trials, volunteering, media and sponsorship at ${CLUB.name}.`,
      url: `${CLUB.site}/join.html`,
    }],
    faqSchema: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: JOIN_FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  };
}
