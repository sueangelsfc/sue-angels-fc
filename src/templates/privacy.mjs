/* ==========================================================================
   PRIVACY AND YOUR CHOICES  (/privacy.html, linked from every footer)

   The "clear and comprehensive information" the law requires before the
   website counts anything, and the place a visitor changes their mind.

   WRITTEN TO THE LAW AS IT STOOD IN SEPTEMBER 2026: PECR regulation 6 as
   amended by the Data (Use and Access) Act 2025 (in force 5 February 2026),
   the ICO's final guidance on storage and access technologies (29 April
   2026), and the UK GDPR for the one thing here that touches personal data,
   the connection a town is worked out from.

   EVERY CLAIM ON THIS PAGE IS A CLAIM ABOUT CODE, and each names the file
   that makes it true: src/scripts/20-consent.js (the choices),
   src/scripts/30-stats.js (what is counted), api/view.js (the town), and
   migrations/007-012 (what the database can hold). Change one of those and
   this page has to change with it. The forms section is the UK GDPR notice
   for what a visitor SENDS: src/scripts/00-core.js (what each form posts),
   api/notify-enquiry.js (Resend) and api/subscribe.js (MailerLite). Every form
   links to #forms beside it, and the suite holds each one to that.

   Plain words, no legal boilerplate: the point of the requirement is that a
   supporter understands what happens, and a wall of clauses defeats it.
   ========================================================================== */
import { esc, attr } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { siteFooter, sitePreMain, siteHeader } from './home.mjs';
import { sourceNote } from '../lib/blocks.mjs';

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

const cards = (list) => `<ul class="cz-help__grid rv">
          ${list.map((c, i) => `<li class="cz-helpcard glassbox" style="--i:${i}">
            <h3>${esc(c[0])}</h3>
            <p>${esc(c[1])}</p>
          </li>`).join('\n          ')}
        </ul>`;

const UPDATED = '13 September 2026';

/* What happens to what a visitor sends. Each line is something
   src/scripts/00-core.js posts, and where it goes. */
const FORMS = [
  ['Enquiries and joining', 'The contact and join forms send the club your name, your email, what it is about, your message and, if you give one, a phone number, with the page you sent it from. It is kept in the club’s own inbox, held by Supabase, and a short email saying an enquiry has arrived, with your email address, is sent to the club’s email account through Resend. It is used only to reply to you.'],
  ['The monthly email', 'The newsletter forms send your email address and the page you signed up on. It is kept on the club’s supporter list, held by Supabase, and passed to MailerLite, which sends the newsletter. It is used only to send you the club’s newsletter.'],
  ['Why the club may use it', 'For an enquiry, the club’s legitimate interest in answering a question you chose to ask it, and the tick box confirms you are happy to be contacted about it. For the newsletter, your consent, given by signing up and yours to take back at any time.'],
  ['How long it is kept', 'An enquiry is deleted automatically two years after the club last heard from that email address, or sooner if you ask. A newsletter address is kept until you leave the list: use the link at the foot of any email, or email the club, and it is taken off MailerLite and the club’s own list.'],
  ['What never happens to it', 'It is never sold, never passed to sponsors, never added to the newsletter unless you sign up to that, and never used for advertising.'],
  ['Videos from YouTube', 'A video on a match report shows a still picture until you press play, and nothing is loaded from YouTube before then. Pressing play loads it from YouTube’s privacy-enhanced service, and YouTube, part of Google, then receives your internet address and may store information on your device under Google’s own privacy policy.'],
  ['Donations', 'The donate button takes you to Stripe, which takes the payment. The club never sees your card details.'],
];

/* What the anonymous statistics count. Each line is something
   src/scripts/30-stats.js or api/view.js actually sends. */
const COUNTED = [
  ['Which pages are read', 'The page, how long it stayed open (capped at an hour) and how far down it was scrolled.'],
  ['Roughly where from', 'The town, region and country, worked out by our website host from the connection. The connection’s internet address is never stored by the club, and the town is kept only as a count.'],
  ['What sent the visit', 'The name of the website a link was followed from, such as google.com, never the full address. Or the short tag on a link the club posted, such as insta-story.'],
  ['How people move around', 'The page before this one, and the order of pages read in one browser tab, counted as a pattern shared by everyone who took that route.'],
  ['What gets used', 'That a programme was downloaded, the donate button was pressed, a link to another website or a video was played, or a form was sent. Never what was typed into a form.'],
  ['The device, coarsely', 'Phone, tablet or computer, from the width of the screen; the time zone the device is set to; and the hour of the day on the reader’s own clock.'],
  ['Where on a page people click', 'The position of a click as a share of the page’s width and height and which part of the page it was in, including clicks on something that does nothing and quick repeated clicks. That is how the club finds a button nobody can find.'],
  ['How far down, and for how long', 'How far down each page views reach, and how long each part of a page was on the screen.'],
  ['Videos and photos', 'That a video was started and how far through it was watched, and that a photo was opened.'],
  ['Speed, and what breaks', 'How long pages take to load, in bands, and errors on the page with every number and address taken out of the message.'],
  ['Browser and settings', 'The browser, operating system, language, screen width, light or dark mode, reduced motion, whether the page opened inside an app such as Instagram, and the connection speed. Each is counted on its own and never joined to the others, so together they cannot single out a device.'],
  ['Steps towards joining or getting involved', 'How many visits reach each step of joining, sponsoring, donating, contacting the club and subscribing, and which form field people stop at: the field’s name, never what was typed.'],
];

/* What needs a yes first. Each of these is a purpose outside the statistics
   exception, so it is off until a visitor saves a choice to turn it on. */
const PERMISSION = [
  ['Figures for sponsors', 'If you say yes, your visit is also counted in the audience figures the club may show its sponsors: pages read, roughly which town, what kind of device, how you arrived and links followed. Still anonymous. The club only ever shows sponsors figures from visitors who said yes.'],
  ['Returning visits', 'If you say yes, this device keeps a note of how many days you have visited and when you last did, as sa-visits, so the club can count repeat visits. Only a band such as “2 to 3 visits” is sent. Turning it off deletes the note.'],
  ['Google Analytics and the Meta pixel', 'Not switched on. If the club ever adds them they stay off unless you turn them on, and the settings will say exactly what each one receives.'],
  ['Changing your mind', 'Withdrawing a yes is as quick as giving it: open Privacy settings, switch it off and save. Anything that purpose kept on your device is deleted at the same moment. The club counts how many people choose each option each day, without recording who.'],
];

const NEVER = [
  ['Nothing that identifies you', 'No name, no email, no account, no internet address and no identifier of any kind is kept. Every figure is a running count for a day, so one visit cannot be picked out of it, by the club or by anybody with the database open.'],
  ['No profile of you', 'Nothing follows you from one visit to the next, from one site to another, or across devices.'],
  ['No advertising', 'No advertising cookies, no pixels and no selling or sharing of anything for adverts. If the club ever adds a tool like that, it stays off unless you turn it on.'],
  ['No recordings', 'No recording of what you do on a page, no fingerprinting of your device, and no reading of anything you type before you send it.'],
];

/* What is stored on the visitor's device, each with the reason the law
   allows it. Keys match the code exactly. */
const STORED = [
  ['Your privacy choices', 'Kept in your browser as sa-privacy until you change them, so the question is not asked on every page. This records a choice you made, which the law treats as strictly necessary.'],
  ['The pages read in this tab', 'Kept as sa-trail in the tab’s own storage, which the browser deletes when the tab closes. Only while anonymous statistics are on; turning them off deletes it.'],
  ['A switched-off counter', 'A single yes or no, sa-bandviews-off, that stops the home page counter asking the database again once it is switched off. Only while anonymous statistics are on.'],
  ['Steps counted in this tab', 'Kept as sa-funnel in the tab’s own storage, so a step towards joining or donating is counted once per visit rather than on every page. Deleted when the tab closes, or when you turn statistics off.'],
  ['Your visit count, only with your yes', 'Kept as sa-visits: how many days you have visited and the last one. Only if you say yes to returning visits; turning that off deletes it.'],
  ['The control panel word', 'If you type the word that opens the club’s control panel, sa-cp-word is kept in the tab’s own storage so the panel opens. It is deleted when the tab closes and does nothing else.'],
  ['Pages for offline use', 'The browser keeps copies of pages you have opened so the site loads quickly and works on a poor signal. It holds nothing about you.'],
];

export function privacy() {
  const email = CLUB.email;

  /* ================= 01 THE SHORT VERSION ================= */
  const intro = `<section class="sec cz-help" aria-labelledby="pv-h">
      <div class="wrap">
        ${rail(1, 'Privacy and your choices', `Updated ${UPDATED}`)}
        <h1 class="h2 rv" id="pv-h">What this website counts, and <span class="volt">your choices.</span></h1>
        <div class="cz-helpcard glassbox rv">
          <p>${esc(CLUB.name)} counts visits to this website anonymously, to understand what supporters read and to make the site better. Nothing identifies you, nothing is used for advertising, and you can turn it off at any time.</p>
          <p>Anything that would need your permission, such as an analytics or advertising tool from another company, stays off unless you say yes.</p>
          <p>When you send the club a message or sign up for the newsletter, what you send is used only for that. <a href="#forms">What happens to it</a></p>
          <p><button class="btn btn--volt" type="button" data-privacy-open>Change my privacy settings</button></p>
          <noscript><p>Your browser is not running scripts, so this website is not counting your visit at all and there is nothing to switch off.</p></noscript>
        </div>
      </div>
    </section>`;

  /* ================= 02 WHAT IS COUNTED ================= */
  const counted = `<section class="sec cz-help" aria-labelledby="pv-count-h">
      <div class="wrap">
        ${rail(2, 'Anonymous statistics', 'On unless you turn it off')}
        <h2 class="h2 rv" id="pv-count-h">What is counted, <span class="volt">anonymously.</span></h2>
        <p class="rv">Only once the privacy notice has been shown to you, and never after you have turned statistics off.</p>
        ${cards(COUNTED)}
      </div>
    </section>`;

  /* ================= 03 THE LAW ================= */
  const law = `<section class="sec cz-help" aria-labelledby="pv-law-h">
      <div class="wrap">
        ${rail(3, 'Why no permission is asked for this', 'The law')}
        <h2 class="h2 rv" id="pv-law-h">The law this <span class="volt">works under.</span></h2>
        ${cards([
          ['Counting visits', 'UK law lets a website store or read information on your device without asking first when the only purpose is to produce statistics about how the website is used, in order to improve it. That is the Privacy and Electronic Communications Regulations as amended by the Data (Use and Access) Act 2025. The conditions are that you are told clearly, which this page and the notice do, and that you can object simply and for free, which the settings do. When you object, counting stops.'],
          ['Only to improve the site', 'These figures are used by the club to decide what to write, what to fix and how to arrange the website. They are not shared with sponsors or anybody else for any other purpose. Figures shown to sponsors come only from visitors who say yes to that, below.'],
          ['Your town', 'Working out a town from a connection briefly involves your internet address, which is personal data under the UK GDPR. Our website host does this as part of delivering the page, and the club receives only the town and a count. The club’s lawful basis is its legitimate interest in understanding, in general terms, where its supporters are, so that the website serves them well. The address itself is not stored by the club.'],
        ])}
      </div>
    </section>`;

  /* ================= 04 WHAT NEEDS YOUR PERMISSION ================= */
  const permission = `<section class="sec cz-help" aria-labelledby="pv-perm-h">
      <div class="wrap">
        ${rail(4, 'Only with your yes', 'Off unless you turn it on')}
        <h2 class="h2 rv" id="pv-perm-h">What needs <span class="volt">your permission.</span></h2>
        ${cards(PERMISSION)}
        <p class="rv"><button class="btn btn--ghost" type="button" data-privacy-open>Choose what to allow</button></p>
      </div>
    </section>`;

  /* ================= 05 WHAT IS NEVER DONE ================= */
  const never = `<section class="sec cz-help" aria-labelledby="pv-never-h">
      <div class="wrap">
        ${rail(5, 'What is never done', 'Not with or without permission')}
        <h2 class="h2 rv" id="pv-never-h">What this site <span class="volt">never does.</span></h2>
        ${cards(NEVER)}
      </div>
    </section>`;

  /* ================= 06 WHAT IS ON YOUR DEVICE ================= */
  const stored = `<section class="sec cz-help" aria-labelledby="pv-stored-h">
      <div class="wrap">
        ${rail(6, 'On your device', 'No cookies')}
        <h2 class="h2 rv" id="pv-stored-h">What is kept <span class="volt">on your device.</span></h2>
        <p class="rv">This website sets no cookies. It uses your browser’s own storage for these, and nothing else:</p>
        ${cards(STORED)}
      </div>
    </section>`;

  /* ================= 07 WHAT YOU SEND THE CLUB ================= */
  const forms = `<section class="sec cz-help" id="forms" aria-labelledby="pv-forms-h">
      <div class="wrap">
        ${rail(7, 'What you send the club', 'Forms, videos, donations')}
        <h2 class="h2 rv" id="pv-forms-h">What you send, and <span class="volt">what happens to it.</span></h2>
        <p class="rv">Unlike the counts above, a form sends the club information about you, so this is the part covered by the UK GDPR. ${esc(CLUB.name)} is responsible for it and can be reached at ${esc(email)}.</p>
        ${cards(FORMS)}
      </div>
    </section>`;

  /* ================= 08 WHO HELPS, HOW LONG, YOUR RIGHTS ================= */
  const rights = `<section class="sec cz-help" aria-labelledby="pv-rights-h">
      <div class="wrap">
        ${rail(8, 'Who helps, how long, your rights', 'Questions')}
        <h2 class="h2 rv" id="pv-rights-h">Who helps, and <span class="volt">your rights.</span></h2>
        ${cards([
          ['Who helps the club', 'Vercel hosts the website and works out the town from the connection. Supabase holds the counts, the inbox and the supporter list. Resend sends the club a notice of each enquiry, Google hosts the club’s email account, and MailerLite sends the newsletter. Some of them process information outside the UK, and where they do it is under the safeguards UK law requires.'],
          ['How long counts are kept', 'The counts are daily totals with nothing identifying in them. The club keeps them for up to three years so one season can be compared with the next, and then deletes them.'],
          ['Your rights over the counts', 'You can object to the counting at any time with the settings on this page or in the footer, and your browser’s Global Privacy Control or Do Not Track setting is treated as an objection too. Because nothing is kept that links a count to you, the club cannot find, send or delete figures about you in particular, because there are none.'],
          ['Your rights over what you send', 'For anything you have sent through a form you can ask the club for a copy, ask for it to be corrected or deleted, or object to how it is used. Email the club and it will answer within a month.'],
          ['Questions and complaints', `Email the club at ${email} with any question about this page. If you are unhappy with how the club handles information, you can complain to the Information Commissioner’s Office at ico.org.uk.`],
        ])}
        <p class="rv"><a class="btn btn--ghost" href="mailto:${attr(email)}">Email the club</a></p>
      </div>
    </section>`;

  return {
    body: siteHeader('/privacy.html') + intro + counted + law + permission + never + stored + forms + rights
      + sourceNote(['ico', 'pecr'], { lead: 'For the rules this page follows, read' }),
    bodyClass: 'is-home is-sub is-cause is-privacy',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Privacy and your choices · ${CLUB.name}`,
      dateModified: '2026-09-13',
      breadcrumb: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${CLUB.site}/` },
          { '@type': 'ListItem', position: 2, name: 'Privacy and your choices', item: `${CLUB.site}/privacy.html` },
        ],
      },
    }],
  };
}
