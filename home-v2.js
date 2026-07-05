// home-v2.js — Sue's Angels FC homepage, redesigned. Direction: "THE SHEET".
//
// Light, photo-led, premium-minimal (reference: framed sheet + photo hero +
// bento cards + big clean numbers). Structure:
//   Nav · Photo hero · About strip · Bento trio · Numbers · Season (next
//   chapter + live results rail) · Get involved · Footer
//
// House style: hand-written React.createElement, h alias, v- class prefix.
// Data comes from the untouched dataStore/PageShell globals (Supabase-backed).
// Motion: GSAP + ScrollTrigger (CDN, pinned), disabled under
// prefers-reduced-motion or if the CDN fails (.no-motion fallback).

(function () {
  'use strict';
  const h = React.createElement;
  const REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- helpers ------------------------------------------------------ */
  const ArrowNE = ({ size = 14 }) => h('svg', {
    width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true, className: 'v-btn__arrow'
  }, h('path', { d: 'M4 12 12 4M5.5 4H12v6.5', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }));

  const ArrowR = ({ size = 14 }) => h('svg', {
    width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true
  }, h('path', { d: 'M2 8h11M9 3.5 13.5 8 9 12.5', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }));

  const Badge = ({ team, size }) =>
    (typeof window.TeamBadge === 'function') ? h(window.TeamBadge, { team, size }) : null;

  function splitResult(r) {
    const usHome = /angels/i.test(r.home || '');
    const gu = usHome ? r.hs : r.as, gt = usHome ? r.as : r.hs;
    return { usHome, gu: +gu || 0, gt: +gt || 0 };
  }
  const verdictOf = r => { const s = splitResult(r); return s.gu > s.gt ? 'w' : s.gu < s.gt ? 'l' : 'd'; };

  function useLiveTick() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const bump = () => setTick(t => t + 1);
      const evs = ['sa-roster-changed', 'sa-articles-changed', 'sa-media-changed'];
      evs.forEach(e => document.addEventListener(e, bump));
      const t1 = setTimeout(bump, 900), t2 = setTimeout(bump, 2600);
      return () => { evs.forEach(e => document.removeEventListener(e, bump)); clearTimeout(t1); clearTimeout(t2); };
    }, []);
  }

  const results = () => (typeof window.getDerivedResults === 'function' ? window.getDerivedResults() : []) || [];
  const season2526 = () => results().filter(r => (typeof window.seasonOf === 'function' ? window.seasonOf(r) : '25/26') === '25/26');
  function seasonTotals() {
    const rs = season2526();
    let W = 0, D = 0, L = 0, GF = 0, GA = 0, CS = 0;
    rs.forEach(r => {
      const s = splitResult(r);
      GF += s.gu; GA += s.gt; if (s.gt === 0) CS++;
      if (s.gu > s.gt) W++; else if (s.gu < s.gt) L++; else D++;
    });
    return { P: rs.length, W, D, L, GF, GA, CS };
  }
  function nextFixture() {
    const list = (typeof window.getMergedUpcoming === 'function' ? window.getMergedUpcoming() : window.UPCOMING_FIXTURES) || [];
    const now = Date.now();
    const withKick = list
      .map(fx => ({ fx, kick: typeof window.getFixtureKickoff === 'function' ? window.getFixtureKickoff(fx) : null }))
      .filter(x => x.kick && x.kick.getTime() > now)
      .sort((a, b) => a.kick - b.kick);
    return withKick[0] || null;
  }

  const Chip = ({ children }) => h('span', { className: 'v-chip' }, h('span', { className: 'dot' }), children);

  /* ---------- nav ----------------------------------------------------------- */
  const NAV_LINKS = [
    ['Home', 'index.html', true], ['About', 'about.html'], ['Team', 'teams.html'],
    ['Season', 'schedule.html'], ['Media', 'media.html'], ['Sponsors', 'sponsors.html'],
  ];

  function ThemeToggle() {
    const [theme, setTheme] = React.useState(document.documentElement.getAttribute('data-theme') || 'light');
    const flip = () => {
      const next = theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('sa-theme', next); } catch (e) {}
      setTheme(next);
    };
    return h('button', { className: 'v-theme', onClick: flip, 'aria-label': 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' theme' },
      theme === 'dark'
        ? h('svg', { viewBox: '0 0 24 24', 'aria-hidden': true }, h('circle', { cx: 12, cy: 12, r: 5 }), h('path', { d: 'M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2' }))
        : h('svg', { viewBox: '0 0 24 24', 'aria-hidden': true }, h('path', { d: 'M20 13A8 8 0 1 1 11 4a7 7 0 0 0 9 9Z' }))
    );
  }

  function Nav() {
    const [open, setOpen] = React.useState(false);
    React.useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; }, [open]);
    return h(React.Fragment, null,
      h('a', { className: 'v-skip', href: '#main' }, 'Skip to content'),
      h('header', { className: 'v-nav' },
        h('a', { className: 'v-nav__brand', href: 'index.html', 'aria-label': "Sue's Angels FC home" },
          h('img', { src: 'assets/badge/sue-angels-badge-cutout.webp', alt: '', width: 32, height: 36 }),
          h('span', null, "Sue's Angels FC")
        ),
        h('nav', { 'aria-label': 'Primary' },
          h('ul', { className: 'v-nav__links' },
            NAV_LINKS.map(([label, href, active]) => h('li', { key: href },
              h('a', { className: 'v-nav__link' + (active ? ' is-active' : ''), href, 'aria-current': active ? 'page' : undefined }, label)))
          )
        ),
        h('div', { className: 'v-nav__right' },
          h(ThemeToggle),
          h('a', { className: 'v-btn v-nav__join', href: 'join.html', style: { padding: '11px 20px', fontSize: 13.5 } }, 'Join now', h(ArrowNE, { size: 13 })),
          h('button', {
            className: 'v-nav__burger' + (open ? ' is-open' : ''),
            'aria-label': open ? 'Close menu' : 'Open menu', 'aria-expanded': open,
            onClick: () => setOpen(!open)
          }, h('span'), h('span'), h('span'))
        )
      ),
      h('div', { className: 'v-menu' + (open ? ' is-open' : ''), 'aria-hidden': !open },
        NAV_LINKS.concat([['Join the club', 'join.html'], ['Contact', 'contact.html']]).map(([label, href], i) =>
          h('a', { key: href, className: 'v-menu__link', href, style: { transitionDelay: (open ? .06 + i * .045 : 0) + 's' }, tabIndex: open ? 0 : -1 }, label)),
        h('div', { className: 'v-menu__meta' }, 'Est. 2025 · In memory of Susan Anne Martin')
      )
    );
  }

  /* ---------- hero ------------------------------------------------------------ */
  function Hero() {
    return h('section', { className: 'v-hero', 'aria-label': "Sue's Angels FC" },
      h('img', { className: 'v-hero__img', src: 'assets/hero-team.webp', alt: "The Sue's Angels FC squad together on the pitch", fetchpriority: 'high' }),
      h('div', { className: 'v-hero__scrim', 'aria-hidden': true }),
      h('div', { className: 'v-hero__content' },
        h('span', { className: 'v-hero__kicker', 'data-hero': true },
          h('span', { className: 'dot' }), 'Est. 2025 · Hanworth, London'),
        h('h1', { className: 'v-hero__title', 'data-hero': true },
          'Built in memory.', h('br'), 'Driven by ', h('span', { className: 'volt' }, 'purpose.')),
        h('p', { className: 'v-hero__sub', 'data-hero': true },
          'Sunday league football with a reason why. League Ten champions at the first attempt, playing every match in memory of Susan Anne Martin.'),
        h('div', { className: 'v-hero__ctas', 'data-hero': true },
          h('a', { className: 'v-btn v-btn--volt', href: 'join.html' }, 'Join the club', h(ArrowNE)),
          h('a', { className: 'v-btn v-btn--ghost', href: 'about.html' }, 'Our story')
        )
      ),
      h('div', { className: 'v-hero__proof', 'data-hero': true },
        h('img', { src: 'assets/badge/sue-angels-badge-cutout.webp', alt: '', width: 35, height: 40 }),
        h('span', null, 'League Ten ', h('b', null, 'Champions 25/26'))
      ),
      h('div', { className: 'v-hero__social', 'data-hero': true },
        h('a', { href: 'https://instagram.com/suesangelsfc', target: '_blank', rel: 'noopener' }, 'Instagram', h(ArrowNE, { size: 11 })),
        h('a', { href: 'https://tiktok.com/@suesangelsfc', target: '_blank', rel: 'noopener' }, 'TikTok', h(ArrowNE, { size: 11 }))
      )
    );
  }

  /* ---------- about strip ------------------------------------------------------ */
  function About() {
    return h('div', { className: 'v-pad v-about', id: 'main' },
      h('div', { 'data-reveal': true }, h(Chip, null, 'About the Angels')),
      h('p', { className: 'v-about__line', 'data-reveal': true },
        "At Sue's Angels we don't just play Sunday football. We play ",
        h('span', { className: 'volt-ink' }, 'in her name'),
        h('span', { className: 'dim' }, ', raising awareness of sepsis with every match, every win and every season.')
      )
    );
  }

  /* ---------- bento trio --------------------------------------------------------- */
  function DotRow({ label, value, max, kind }) {
    const DOTS = 12;
    const on = Math.max(value > 0 ? 1 : 0, Math.round((value / Math.max(max, 1)) * DOTS));
    return h('div', { className: 'v-row is-' + kind },
      h('span', { className: 'lbl' }, label),
      h('span', { className: 'dots', 'aria-hidden': true },
        Array.from({ length: DOTS }, (_, i) => h('i', { key: i, className: i < on ? 'on' : '' }))),
      h('span', { className: 'n' }, value)
    );
  }

  function Bento() {
    useLiveTick();
    const t = seasonTotals();
    const max = Math.max(t.W, t.D, t.L, 1);
    return h('section', { className: 'v-pad v-section' },
      h('div', { className: 'v-bento' },
        h('article', { className: 'v-card v-card--navy', 'data-reveal': true },
          h('span', { className: 'icon' }, h('img', { src: 'assets/badge/sue-angels-badge-cutout.webp', alt: '' })),
          h('h3', null, 'A club with ', h('b', null, 'a cause'), ' at its heart.'),
          h('p', null, 'Founded in 2025 in memory of Susan Anne Martin, taken by sepsis. Every shirt, every matchday and every season carries her legacy forward.'),
          h('div', { className: 'foot' },
            h('a', { href: 'sepsis.html' }, 'Our cause', h(ArrowR, { size: 13 })))
        ),
        h('a', { className: 'v-card v-card--photo', href: 'gallery.html', 'data-reveal': true, 'aria-label': 'Matchday gallery' },
          h('img', { src: 'assets/hero/banner-03.webp', alt: 'Matchday at The Reeves', loading: 'lazy' }),
          h('span', { className: 'scrim', 'aria-hidden': true }),
          h('span', { className: 'chip' }, 'Matchdays at The Reeves')
        ),
        h('article', { className: 'v-card v-card--stat', 'data-reveal': true },
          h('div', { className: 'big' }, h('span', { 'data-count': t.P }, REDUCE ? String(t.P) : '0'), h('span', { className: 'plus' }, ' matches')),
          h('h3', null, 'The title-winning first season'),
          h('p', null, 'Champions of League Ten, unbeaten in the league and promoted at the first attempt.'),
          h('div', { className: 'v-rows' },
            h(DotRow, { label: 'Won', value: t.W, max, kind: 'w' }),
            h(DotRow, { label: 'Drawn', value: t.D, max, kind: 'd' }),
            h(DotRow, { label: 'Lost', value: t.L, max, kind: 'l' })
          )
        )
      )
    );
  }

  /* ---------- numbers strip -------------------------------------------------------- */
  function Numbers() {
    useLiveTick();
    const t = seasonTotals();
    const winRate = t.P ? Math.round((t.W / t.P) * 100) : 0;
    const cells = [
      [t.P, '', 'Matches played'],
      [winRate, '%', 'Win rate'],
      [t.GF, '', 'Goals scored'],
      [t.CS, '', 'Clean sheets'],
    ];
    return h('section', { className: 'v-pad v-section v-numbers' },
      h('h2', { 'data-reveal': true }, 'A few facts from the first season, in numbers'),
      h('div', { className: 'v-numbers__grid' },
        cells.map(([n, suffix, label]) => h('div', { key: label, 'data-reveal': true },
          h('div', { className: 'v-num__n' },
            h('span', { 'data-count': n }, REDUCE ? String(n) : '0'),
            suffix ? h('span', { className: 'suffix' }, suffix) : null),
          h('div', { className: 'v-num__l' }, label))))
    );
  }

  /* ---------- season: next chapter + results rail ------------------------------------ */
  function Countdown({ kick }) {
    const calc = () => Math.max(0, kick.getTime() - Date.now());
    const [ms, setMs] = React.useState(calc);
    React.useEffect(() => { const id = setInterval(() => setMs(calc()), 1000); return () => clearInterval(id); }, [kick]);
    const d = Math.floor(ms / 864e5), hr = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    return h('div', { className: 'v-count', role: 'timer', 'aria-label': 'Countdown to kick-off' },
      [[d, 'Days'], [hr, 'Hours'], [m, 'Mins']].map(([n, l]) => h('div', { className: 'v-count__cell', key: l },
        h('div', { className: 'v-count__n' }, String(n).padStart(2, '0')),
        h('div', { className: 'v-count__l' }, l))));
  }

  function NextCard() {
    const nx = nextFixture();
    if (!nx) {
      return h('article', { className: 'v-next', 'data-reveal': true },
        h('span', { className: 'tag' }, 'Next chapter'),
        h('h3', null, 'League ', h('span', { className: 'volt' }, 'Eight'), ' awaits.'),
        h('p', null, 'Promotion won at the first attempt. The 26/27 campaign is coming, new league, same purpose.'),
        h('div', { className: 'foot' },
          h('a', { href: 'fixtures.html' }, 'See the 26/27 line-up', h(ArrowR, { size: 13 })))
      );
    }
    const { fx, kick } = nx;
    return h('article', { className: 'v-next', 'data-reveal': true },
      h('span', { className: 'tag' }, 'Next match · ' + (fx.comp || 'League')),
      h('div', { className: 'v-next__teams' },
        h('div', { className: 'v-next__team' }, h(Badge, { team: fx.home, size: 56 }), h('span', { className: 'v-next__name' }, fx.home)),
        h('span', { className: 'v-next__vs' }, 'VS'),
        h('div', { className: 'v-next__team' }, h(Badge, { team: fx.away, size: 56 }), h('span', { className: 'v-next__name' }, fx.away))
      ),
      h(Countdown, { kick }),
      h('p', { style: { marginTop: 10 } },
        kick.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
        ' · KO ', fx.kick || '', fx.ven ? ' · ' + fx.ven : ''),
      h('div', { className: 'foot' },
        h('a', { href: 'fixtures.html' }, 'All fixtures', h(ArrowR, { size: 13 })))
    );
  }

  function ResultCard({ r }) {
    const v = verdictOf(r);
    return h('a', {
      className: 'v-result ' + v, href: 'results.html',
      'aria-label': r.home + ' ' + r.hs + ', ' + r.away + ' ' + r.as
    },
      h('span', { className: 'v-result__verdict', 'aria-hidden': true }, v.toUpperCase()),
      h('div', { className: 'v-result__top' },
        h('span', null, r.date || ''), h('span', null, (r.competition || 'League').replace(/League Ten.*/i, 'League Ten'))),
      h('div', { className: 'v-result__line' },
        h(Badge, { team: r.home, size: 22 }),
        h('span', { className: 'name' }, r.home),
        h('span', { className: 'score' }, r.hs)),
      h('div', { className: 'v-result__line' },
        h(Badge, { team: r.away, size: 22 }),
        h('span', { className: 'name' }, r.away),
        h('span', { className: 'score' }, r.as))
    );
  }

  function Season() {
    useLiveTick();
    const rs = results().slice(0, 10);
    return h('section', { className: 'v-pad v-section' },
      h('div', { className: 'v-season__head' },
        h('div', { 'data-reveal': true }, h(Chip, null, 'The season')),
        h('p', { 'data-reveal': true }, 'Every result below comes straight from the club’s live records, kept up to date by the club itself.'),
        h('a', { className: 'v-btn v-btn--line', href: 'table.html', 'data-reveal': true, style: { padding: '12px 22px', fontSize: 14 } }, 'League table', h(ArrowR, { size: 13 }))
      ),
      h('div', { className: 'v-season__grid' },
        h(NextCard),
        rs.length ? h('div', { className: 'v-rail', 'data-reveal': true }, rs.map(r => h(ResultCard, { r, key: r.id || (r.date + r.away) }))) : null
      )
    );
  }

  /* ---------- get involved ------------------------------------------------------------ */
  function Join() {
    return h('section', { className: 'v-pad v-section' },
      h('div', { className: 'v-join' },
        h('div', { className: 'v-join__copy' },
          h('div', { 'data-reveal': true }, h(Chip, null, 'Get involved')),
          h('h2', { 'data-reveal': true }, 'Be part of what she started.'),
          h('p', { 'data-reveal': true }, 'From your first trial session to matchday sponsorship, there is a place for you at The Reeves. Come and add to her story.'),
          h('a', { className: 'v-btn', href: 'contact.html', 'data-reveal': true }, 'Contact the club', h(ArrowNE))
        ),
        h('div', { className: 'v-join__cards' },
          h('a', { className: 'v-action', href: 'join.html', 'data-reveal': true },
            h('img', { src: 'assets/hero/banner-07.webp', alt: 'Players in a Sue’s Angels training session', loading: 'lazy' }),
            h('span', { className: 'scrim', 'aria-hidden': true }),
            h('span', { className: 'chip' }, 'Play'),
            h('div', { className: 'meta' },
              h('p', null, 'Trials and training for the 26/27 squad.'),
              h('span', { className: 'v-round', 'aria-hidden': true }, h(ArrowNE, { size: 15 })))
          ),
          h('a', { className: 'v-action', href: 'sponsors.html', 'data-reveal': true },
            h('img', { src: 'assets/hero/banner-10.webp', alt: 'The squad celebrating together', loading: 'lazy' }),
            h('span', { className: 'scrim', 'aria-hidden': true }),
            h('span', { className: 'chip' }, 'Sponsor'),
            h('div', { className: 'meta' },
              h('p', null, 'Put your business behind the badge.'),
              h('span', { className: 'v-round', 'aria-hidden': true }, h(ArrowNE, { size: 15 })))
          )
        )
      )
    );
  }

  /* ---------- footer -------------------------------------------------------------------- */
  const FOOT = [
    ['Club', [['About', 'about.html'], ['Champions', 'champions.html'], ['Team', 'teams.html'], ['Awards', 'awards.html'], ['Records', 'records.html']]],
    ['Season', [['Fixtures', 'fixtures.html'], ['Results', 'results.html'], ['League table', 'table.html'], ['Stats', 'stats.html']]],
    ['Get involved', [['Join the club', 'join.html'], ['Sponsors', 'sponsors.html'], ['Our cause', 'sepsis.html'], ['Contact', 'contact.html']]],
  ];

  function Footer() {
    return h('footer', { className: 'v-footer' },
      h('div', { className: 'v-footer__grid' },
        h('div', { className: 'v-footer__brand' },
          h('img', { src: 'assets/badge/sue-angels-badge-cutout.webp', alt: "Sue's Angels FC crest", width: 50, height: 58 }),
          h('p', null, 'Founded 2025, in memory of Susan Anne Martin. A Sunday league club from Hanworth, London, playing to raise awareness of sepsis.')
        ),
        FOOT.map(([title, links]) => h('div', { key: title },
          h('h4', null, title),
          h('ul', null, links.map(([label, href]) => h('li', { key: href },
            h('a', { className: 'v-footer__link', href }, label))))
        ))
      ),
      h('div', { className: 'v-footer__legal' },
        h('span', null, '© 2026 Sue’s Angels FC · ', h('span', { className: 'volt' }, 'League Ten Champions 25/26')),
        h('span', null,
          h('a', { className: 'v-footer__link', href: 'https://instagram.com/suesangelsfc', target: '_blank', rel: 'noopener' }, 'Instagram'),
          '  ·  ',
          h('a', { className: 'v-footer__link', href: 'https://tiktok.com/@suesangelsfc', target: '_blank', rel: 'noopener' }, 'TikTok'))
      )
    );
  }

  /* ---------- app + motion ------------------------------------------------------------------ */
  function App() {
    return h('div', { className: 'v-sheet' },
      h(Nav), h(Hero), h(About), h(Bento), h(Numbers), h(Season), h(Join), h(Footer));
  }

  function initMotion() {
    const g = window.gsap;
    if (REDUCE || !g || !window.ScrollTrigger) {
      document.documentElement.classList.add('no-motion');
      document.querySelectorAll('[data-count]').forEach(el => {
        el.textContent = el.getAttribute('data-count') || '0';
      });
      const img = document.querySelector('.v-hero__img');
      if (img) img.style.transform = 'none';
      return;
    }
    g.registerPlugin(window.ScrollTrigger);

    // Load: hero photo settles, content rises.
    g.to('.v-hero__img', { scale: 1, duration: 2.2, ease: 'power2.out' });
    g.to('.v-hero [data-hero]', { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .09, delay: .2 });

    // Scroll: gentle reveals + counters.
    document.querySelectorAll('[data-reveal]').forEach(el => {
      g.to(el, { opacity: 1, y: 0, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseInt(el.getAttribute('data-count'), 10) || 0;
      const state = { n: 0 };
      g.to(state, {
        n: target, duration: 1.5, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 90%' },
        onUpdate: () => { el.textContent = String(Math.round(state.n)); },
      });
    });
  }

  function mount() {
    const root = document.getElementById('rd-root');
    if (!root || !window.ReactDOM) return;
    ReactDOM.createRoot(root).render(h(App));
    requestAnimationFrame(() => requestAnimationFrame(initMotion));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
