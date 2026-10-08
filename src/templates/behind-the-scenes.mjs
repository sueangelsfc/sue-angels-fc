/* ==========================================================================
   BEHIND THE SCENES  (/behind-the-scenes.html, under Media)

   The parts of a Sunday nobody films for the record: the dressing room, the
   travel, the warm-up, whatever was funny on the way home. Goals and match
   footage are a different thing and live on /videos.html against their match.

   THE FILES ARE NOT IN THIS REPOSITORY, and the reason is in `bts.mjs`: a
   clip is megabytes, git history is permanent, and one deleted a year later
   still weighs the same for everybody who clones. They sit in the club's own
   Supabase bucket, which is why `media-src` names that host.

   A CLIP PLAYS HERE OR IT LINKS TO INSTAGRAM, and the card says which rather
   than looking identical either way. Pressing a card that turns out to open
   another website is a small betrayal, and it is the sort of thing a reader
   stops trusting after once.
   ========================================================================== */
import { esc, attr } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { siteFooter, sitePreMain, siteHeader } from './home.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';
const IG = 'https://www.instagram.com/suesangelsfc/';

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

/* A clip we hold the file for. `preload="none"` because a wall of these would
   otherwise be tens of megabytes before anybody pressed anything, and
   `playsinline` because without it Safari on a phone throws the clip into its
   own fullscreen player and drops the reader off the page. */
const plays = (c) => `<video class="bts-card__v" controls playsinline preload="none"
          ${c.poster ? `poster="${attr(c.poster)}"` : ''}
          width="${attr(c.w)}" height="${attr(c.h)}" src="${attr(c.src)}"
          ${c.title ? `aria-label="${attr(c.title)}"` : ''}></video>`;

/* A clip we only have the post for. A link, never an embed: an Instagram
   embed loads their script, which is a third party on the page, an entry in
   the policy and a line in the cookie banner, to show a clip the club already
   has. The poster is ours or there is no picture, and the card says out loud
   where pressing it goes. */
const links = (c) => `<a class="bts-card__out" href="${attr(c.insta)}" rel="noopener" target="_blank">
          ${c.poster
    ? `<img class="bts-card__img" src="${attr(c.poster)}" alt="" width="${attr(c.w)}" height="${attr(c.h)}" loading="lazy" decoding="async" />`
    : `<span class="bts-card__noimg" aria-hidden="true"></span>`}
          <span class="bts-card__play" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></span>
          <span class="bts-card__go">Watch on Instagram ${ARROW}<span class="bts-card__note">Opens Instagram, which may store information on your device.</span></span>
        </a>`;

const card = (c) => `<li class="bts-card">
        <div class="bts-card__media">${c.src ? plays(c) : links(c)}</div>
        <div class="bts-card__body">
          ${c.title ? `<h3 class="bts-card__h">${esc(c.title)}</h3>` : ''}
          ${c.note ? `<p class="bts-card__p">${esc(c.note)}</p>` : ''}
          <p class="bts-card__meta">
            ${c.date ? `<span>${esc(new Date(`${c.date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }))}</span>` : ''}
            ${c.length ? `<span>${esc(c.length)}</span>` : ''}
            ${c.src && c.insta ? `<a href="${attr(c.insta)}" rel="noopener" target="_blank">On Instagram</a>` : ''}
          </p>
        </div>
      </li>`;

export function behindScenes(d) {
  const clips = d.btsClips || [];

  const hero = `<section class="lv-hero" aria-labelledby="bts-h">
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Behind the scenes</p>
        <h1 class="lv-hero__title" id="bts-h">Behind the<span class="volt"> scenes.</span></h1>
        <p class="lv-hero__lede">The dressing room, the travel and the warm-up. The parts of a
          Sunday that never make the match report.</p>
        <p class="lv-hero__btns">
          <a class="btn btn--volt" href="${attr(IG)}" rel="noopener" target="_blank">Follow on Instagram ${ARROW}</a>
          <a class="btn btn--ghost" href="/videos.html">Goals and highlights</a>
        </p>
      </div>
    </section>`;

  /* AN EMPTY STATE SAYS WHAT IS MISSING AND WHAT FILLS IT. "No clips
     available" tells a reader they have found something broken; this tells
     them there is nothing here yet and where the club is in the meantime. */
  const body = clips.length
    ? `<ul class="bts-grid">${clips.map(card).join('\n      ')}</ul>`
    : `<div class="bts-none">
          <p class="bts-none__h">Nothing filmed yet.</p>
          <p class="bts-none__p">This is where the clips will go once the club starts
            filming them. Until then everything the Angels post is on Instagram.</p>
          <p><a class="btn btn--volt" href="${attr(IG)}" rel="noopener" target="_blank">Follow on Instagram ${ARROW}</a></p>
        </div>`;

  const clipsBand = `<section class="sec bts" aria-labelledby="bts-c-h">
      <div class="wrap">
        ${rail(1, 'The clips', clips.length ? `${clips.length} ${clips.length === 1 ? 'clip' : 'clips'}` : 'Coming soon')}
        <h2 class="h2" id="bts-c-h">Away from the <span class="volt">football.</span></h2>
        ${body}
      </div>
    </section>`;

  const ctaBand = `<section class="sec cta2" aria-labelledby="bts-cta-h">
      <div class="wrap">
        <div class="cta2__in">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="Sue’s Angels FC star" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">Filmed by whoever is there</p>
            <h2 class="h2" id="bts-cta-h">Somebody has to <span class="volt">film it.</span></h2>
            <p class="cta2__sub">The club has never had anybody whose job is the camera. If
              that is you, a phone and a Sunday morning is the whole requirement.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="/join.html">Get involved ${ARROW}</a>
              <a class="btn btn--ghost" href="/gallery.html">Matchday photographs</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  return {
    css: 'home.css',
    shell: 'home',
    bodyClass: 'is-home is-sub is-bts',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    body: siteHeader('/behind-the-scenes.html') + hero + clipsBand + ctaBand,
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Behind the scenes · ${CLUB.name}`,
      description: `Dressing room, travel and warm-up clips from ${CLUB.name}.`,
      url: `${CLUB.site}/behind-the-scenes.html`,
    }],
  };
}
