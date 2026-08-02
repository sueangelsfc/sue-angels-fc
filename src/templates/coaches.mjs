/* ==========================================================================
   COACHES  (/coaches.html, "Coaches" under On the Pitch)

   Three people, each opening to a full profile, and one record band for the
   season they ran together.

   That last part is a deliberate change from the design this replaces, which
   gave every coach their own "Manager stats" panel showing the same 88% win
   rate, the same 33 played, the same honours. They were identical because
   they are the club's record, not any individual's, and printing them under a
   coach's name says he managed those matches. He did not: one man is the
   manager and two are coaches. The record appears once, attributed to the
   staff as a whole, with the manager named.

   Everything in it is derived: the record, the honours, who was picked most,
   who performed best, and the formation the manager actually went with, which
   is read off the team sheets rather than asserted.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, attr } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { teamSummary } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, auraFor } from './home.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const exists = (rel) => {
  try { return !!rel && fs.existsSync(path.join(ROOT, rel.replace(/^\//, ''))); }
  catch { return false; }
};
const shotFor = (c) => {
  /* An uploaded one wins: it is the most recent thing anybody chose, and it
     lives in the club's storage rather than in the repo. `photo` is a path to
     a file that ships with the site, so it is checked for existence; a URL
     obviously cannot be. */
  if (c.photoUrl && /^https?:\/\//.test(c.photoUrl)) return c.photoUrl;
  if (exists(c.photo)) return `/${c.photo.replace(/^\//, '')}`;
  return '';
};

/* Squad photography is filed by shirt number. */
const playerShot = (num) => (exists(`assets/players/${num}.webp`)
  ? `/assets/players/${num}.webp` : '');

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

/* The club writes these in caps in the data; sentence case reads better in a
   paragraph and the CSS puts the caps back where they belong. */
const roleOf = (c) => c.short || (c.role ? c.role.charAt(0) + c.role.slice(1).toLowerCase() : 'Coach');

export function coaches(d) {
  const staff = d.coaches || [];
  const played = (d.played || []).filter((m) => m.played);
  const all = teamSummary(played);
  const league = teamSummary(played.filter((m) => m.competition === CLUB.division));
  const manager = staff.find((c) => /manager/i.test(c.role || '')) || staff[0];

  /* ---- Who was picked, and who delivered ---- */
  const byNum = new Map((d.squad || []).map((p) => [p.num, p]));
  const used = (d.players || [])
    .filter((p) => (p.starts || 0) > 0)
    .sort((a, b) => b.starts - a.starts)
    .slice(0, 5)
    .map((p) => ({ ...p, code: (byNum.get(p.num) || {}).positionCode || '', slug: p.slug }));
  const maxStarts = Math.max(1, ...used.map((p) => p.starts));

  /* "Best keeper" has to be drawn from the goalkeepers. The engine credits a
     clean sheet to defenders too, so an unfiltered best-of put a right wing
     back under that heading. */
  const keepers = (d.players || []).filter((p) => (byNum.get(p.num) || {}).gk);
  const bestOf = (key, pool) => (pool || d.players || []).slice()
    .sort((a, b) => (b[key] || 0) - (a[key] || 0))[0];
  const performers = [
    { k: 'Top scorer', p: bestOf('goals'), unit: 'goals', v: (p) => p.goals },
    { k: 'Top creator', p: bestOf('assists'), unit: 'assists', v: (p) => p.assists },
    { k: 'Most Man of the Match', p: bestOf('motm'), unit: 'awards', v: (p) => p.motm },
    { k: 'Best keeper', p: bestOf('cleanSheets', keepers), unit: 'clean sheets', v: (p) => p.cleanSheets },
  ].filter((x) => x.p && x.v(x.p) > 0);

  /* ---- Formation, read off the team sheets ---- */
  const formTally = new Map();
  for (const m of played) {
    const f = m.detail?.formation;
    if (!f) continue;
    formTally.set(f, (formTally.get(f) || 0) + 1);
  }
  const forms = [...formTally.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
  const formTotal = forms.reduce((n, f) => n + f.n, 0);
  const topForm = forms[0];

  /* ---- Honours ---- */
  const trophies = (d.recognition || []).filter((r) => r.type === 'trophy');
  const honours = [
    ...trophies.map((t) => ({ k: t.title, v: t.season || d.currentSeason })),
    league.lost === 0 && league.played
      ? { k: 'Unbeaten league season', v: `${league.played} games · ${league.won}W ${league.drawn}D` } : null,
  ].filter(Boolean);

  /* ================= HERO ================= */
  const hero = `<section class="co-hero" aria-labelledby="co-h">
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> The dugout · ${esc(d.currentSeason)}</p>
        <h1 class="co-hero__title" id="co-h">The coaches<span class="volt">.</span></h1>
        <p class="co-hero__lede">The people guiding ${esc(CLUB.name)}. ${esc(staff.length)} on the
          staff, and the record they built together in the club's first season.</p>
      </div>
    </section>`;

  /* ================= 01 THE STAFF =================
     A section each, open by default. Nothing here is worth hiding behind a
     click: three people is a page, not a directory. */
  const staffBand = `<section class="sec co-staff" id="staff" aria-labelledby="co-staff-h">
      <div class="wrap">
        ${rail(1, 'The dugout', `${staff.length} on the staff`)}
        <h2 class="h2 rv" id="co-staff-h">Who runs the <span class="volt">team.</span></h2>
        <ul class="co-list rv">
          ${staff.map((c, i) => {
    const shot = shotFor(c);
    return `<li class="co-card" style="--i:${i}" id="coach-${attr(c.slug)}">
            <div class="co-card__shot">
              ${shot
    ? `<img src="${attr(shot)}" alt="${attr(c.name)}" width="360" height="480" loading="lazy" decoding="async" />`
    : `<img class="co-card__crest" src="${STAR}" alt="" width="180" height="223" loading="lazy" decoding="async" />`}
            </div>
            <div class="co-card__body">
              <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> ${esc(roleOf(c))}${c.since ? ` · since ${esc(c.since)}` : ''}</p>
              <h3 class="co-card__name">${esc(c.name)}</h3>
              ${(c.bio || []).map((para) => `<p>${esc(para)}</p>`).join('\n              ')}

              ${(c.playedFor || []).length ? `<p class="co-card__k">Played for</p>
              <ul class="co-chips">
                ${c.playedFor.map((x) => `<li>${esc(x)}</li>`).join('\n                ')}
              </ul>` : ''}

              ${(c.managed || []).length ? `<p class="co-card__k">Managed</p>
              <ul class="co-chips">
                ${c.managed.map((x) => `<li>${esc(x)}</li>`).join('\n                ')}
              </ul>` : ''}

              <!-- Club names already end in "F.C.", so a full stop of our own
                   produced "Fulham F.C..". -->
              ${c.supports ? `<p class="co-card__note">Supports ${esc(c.supports)}${/[.!?]$/.test(c.supports) ? '' : '.'}</p>` : ''}
            </div>
          </li>`;
  }).join('\n          ')}
        </ul>
      </div>
    </section>`;

  /* ================= 02 THE RECORD ================= */
  const wdlTotal = Math.max(1, all.won + all.drawn + all.lost);
  const recordBand = `<section class="sec co-record" aria-labelledby="co-rec-h">
      <div class="wrap">
        ${rail(2, 'In charge', `${d.currentSeason} · every competition`)}
        <h2 class="h2 rv" id="co-rec-h">The season they <span class="volt">ran.</span></h2>
        <p class="co-lede rv">Every competition ${esc(CLUB.name)} entered in ${esc(d.currentSeason)},
          under ${esc(manager ? manager.name : 'the management')}${staff.length > 1 ? ` and the coaching staff` : ''}.
          These are the club's figures, not any one person's.</p>

        <div class="co-rec__grid rv">
          <div class="co-rec__head">
            <span class="co-rec__ring">
              <svg viewBox="0 0 76 76" width="76" height="76" aria-hidden="true">
                <circle cx="38" cy="38" r="32" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="5" />
                <circle class="co-rec__arc" cx="38" cy="38" r="32" fill="none" stroke="var(--volt)" stroke-width="5"
                  stroke-linecap="round"
                  stroke-dasharray="${((all.winPct / 100) * 2 * Math.PI * 32).toFixed(1)} ${(2 * Math.PI * 32).toFixed(1)}"
                  style="--on:${((all.winPct / 100) * 2 * Math.PI * 32).toFixed(1)}"
                  transform="rotate(-90 38 38)" />
              </svg>
              <b>${esc(all.winPct)}%</b>
              <i>Win rate<span>${esc(all.won)}W ${esc(all.drawn)}D ${esc(all.lost)}L</span></i>
            </span>
            <ul class="co-rec__tiles">
              <li><b>${esc(all.played)}</b><span>Played</span></li>
              <li><b>${esc(all.won)}</b><span>Won</span></li>
              <li><b>${esc(all.goalsFor)}</b><span>Goals</span></li>
              <li><b>${esc(all.goalsAgainst)}</b><span>Conceded</span></li>
            </ul>
          </div>
          <ol class="co-wdl" aria-label="Results under this staff">
            <li class="co-wdl__w" style="--w:${((all.won / wdlTotal) * 100).toFixed(1)}%"><span class="sr-only">Won ${esc(all.won)}</span></li>
            ${all.drawn ? `<li class="co-wdl__d" style="--w:${((all.drawn / wdlTotal) * 100).toFixed(1)}%"><span class="sr-only">Drawn ${esc(all.drawn)}</span></li>` : ''}
            ${all.lost ? `<li class="co-wdl__l" style="--w:${((all.lost / wdlTotal) * 100).toFixed(1)}%"><span class="sr-only">Lost ${esc(all.lost)}</span></li>` : ''}
          </ol>
          <p class="co-wdl__key">
            <span><i class="co-sw co-sw--w"></i>Won ${esc(all.won)}</span>
            <span><i class="co-sw co-sw--d"></i>Drawn ${esc(all.drawn)}</span>
            <span><i class="co-sw co-sw--l"></i>Lost ${esc(all.lost)}</span>
          </p>
        </div>
      </div>
    </section>`;

  /* ================= 03 HONOURS, PICKS AND SHAPE ================= */
  const detailBand = `<section class="sec co-detail" aria-labelledby="co-det-h">
      <div class="wrap">
        ${rail(3, 'What it produced', `${forms.length} formations used`)}
        <h2 class="h2 rv" id="co-det-h">How they set up, and who <span class="volt">delivered.</span></h2>

        ${honours.length ? `<ul class="co-honours rv">
          ${honours.map((h) => `<li>
            <span class="co-honours__mark" aria-hidden="true">
              <img src="${STAR}" alt="" width="26" height="32" loading="lazy" decoding="async" />
            </span>
            <b>${esc(h.k)}</b>
            <i>${esc(h.v)}</i>
          </li>`).join('\n          ')}
        </ul>` : ''}

        <div class="co-detail__grid rv">
          <section class="co-panel" aria-labelledby="co-used-h">
            <h3 id="co-used-h">Picked most</h3>
            <ol class="co-used">
              ${used.map((p) => `<li>
                <a href="/players/${attr(p.slug)}.html">
                  <span class="co-used__face">${playerShot(p.num)
    ? `<img src="${attr(playerShot(p.num))}" alt="" width="30" height="30" loading="lazy" decoding="async" />`
    : `<img class="co-used__crest" src="${STAR}" alt="" width="16" height="20" loading="lazy" decoding="async" />`}</span>
                  <span class="co-used__n">${esc(p.name)}</span>
                  ${p.code ? `<span class="co-used__pos">${esc(p.code)}</span>` : ''}
                  <span class="co-used__v">${esc(p.starts)}</span>
                  <span class="co-used__bar" aria-hidden="true"><i style="--w:${Math.round((p.starts / maxStarts) * 100)}%"></i></span>
                </a>
              </li>`).join('\n              ')}
            </ol>
            <p class="co-panel__note">Starts, from the eleven named on each team sheet.</p>
          </section>

          <section class="co-panel" aria-labelledby="co-form-h">
            <h3 id="co-form-h">Favourite shape</h3>
            ${topForm ? `<p class="co-form__hero">
              <b>${esc(topForm.name)}</b>
              <span>${esc(topForm.n)} of ${esc(formTotal)} games</span>
            </p>
            <ol class="co-form">
              ${forms.slice(0, 5).map((f) => `<li>
                <span class="co-form__k">${esc(f.name)}</span>
                <span class="co-form__bar" aria-hidden="true"><i style="--w:${Math.round((f.n / topForm.n) * 100)}%"></i></span>
                <span class="co-form__v">${esc(f.n)}</span>
              </li>`).join('\n              ')}
            </ol>
            <p class="co-panel__note">Read off the team sheets. ${esc(formTotal)} of
              ${esc(played.length)} matches record a shape.</p>` : ''}
          </section>
        </div>

        ${performers.length ? `<ul class="co-best rv">
          ${performers.map((x) => `<li>
            <span class="co-best__face">${playerShot(x.p.num)
    ? `<img src="${attr(playerShot(x.p.num))}" alt="" width="52" height="52" loading="lazy" decoding="async" />`
    : `<img class="co-best__crest" src="${STAR}" alt="" width="26" height="32" loading="lazy" decoding="async" />`}</span>
            <span class="co-best__k">${esc(x.k)}</span>
            <a class="co-best__n" href="/players/${attr(x.p.slug)}.html">${esc(x.p.name)}</a>
            <span class="co-best__v">${esc(x.v(x.p))} ${esc(x.unit)}</span>
          </li>`).join('\n          ')}
        </ul>` : ''}
      </div>
    </section>`;

  /* ================= CTA ================= */
  const ctaBand = `<section class="sec sec--cta co-cta" aria-labelledby="co-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">${esc(CLUB.nextDivision)} · Next season</p>
            <h2 class="h2" id="co-cta-h">Play under this <span class="volt">staff.</span></h2>
            <p class="cta2__sub">Trials are open for ${esc(d.nextSeason)}. Register your interest and we will be in
              touch with dates.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="/join.html">Apply for a trial ${ARROW}</a>
              <a class="btn btn--ghost" href="/squad.html">Meet the squad</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  return {
    body: siteHeader('/coaches.html') + hero + staffBand + recordBand + detailBand + ctaBand,
    bodyClass: 'is-home is-sub is-coaches',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(auraFor('coaches.html')),
    footerHtml: siteFooter(),
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Coaches · ${CLUB.name}`,
      breadcrumb: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${CLUB.site}/` },
          { '@type': 'ListItem', position: 2, name: 'Coaches', item: `${CLUB.site}/coaches.html` },
        ],
      },
    }],
  };
}
