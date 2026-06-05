// RedesignShell.jsx, shared chrome + primitives for the v2 design language.
// Loaded on EVERY redesigned page before its page-specific script. Everything
// is exported to window so page scripts reference window.RDHeader etc. (avoids
// duplicate top-level declarations across Babel scripts).

const RD_LINKS = [
  { l: 'Home', href: 'index.html' },
  { l: 'About', href: 'about.html' },
  { l: 'Champions', href: 'champions.html' },
  { l: 'Team', href: 'teams.html' },
  { l: 'Schedule', href: 'schedule.html' },
  { l: 'Media', href: 'media.html' },
  { l: 'Sponsors', href: 'sponsors.html' },
  { l: 'Contact', href: 'contact.html' },
];

// League totals derived live from results (league only).
function rdLeagueTotals() {
  const results = (window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || []))
    .filter((r) => (r.competition || '').toLowerCase().includes('league'));
  let pl = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0;
  for (const r of results) {
    pl++;
    if (r.kind === 'walkover') { w++; continue; }
    const usHome = r.home.includes('Angels');
    const us = usHome ? r.hs : r.as, them = usHome ? r.as : r.hs;
    gf += us || 0; ga += them || 0;
    if (r.kind === 'penalty' && r.pens) {
      const uP = usHome ? r.pens.hs : r.pens.as, tP = usHome ? r.pens.as : r.pens.hs;
      if (uP > tP) w++; else l++;
    } else if (us > them) w++; else if (us === them) d++; else l++;
  }
  return { pl, w, d, l, gf, ga, gd: gf - ga, pts: w * 3 + d, winPct: pl ? Math.round((w / pl) * 100) : 0 };
}

// Scroll-reveal wrapper.
function Reveal({ as = 'div', className = '', children, ...rest }) {
  const Tag = as;
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { el.classList.add('is-in'); io.disconnect(); } });
    }, { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`rd-reveal ${className}`} {...rest}>{children}</Tag>;
}

const RDArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 5 7 7-7 7" /></svg>
);

// ── THEME TOGGLE ────────────────────────────────────────────────────────────
function RDThemeToggle() {
  const [theme, setTheme] = React.useState(() => {
    try { return document.documentElement.getAttribute('data-theme') || localStorage.getItem('sa-theme') || 'dark'; } catch (e) { return 'dark'; }
  });
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('sa-theme', theme); } catch (e) {}
  }, [theme]);
  const light = theme === 'light';
  return (
    <button type="button" className={`rd-theme ${light ? 'is-light' : ''}`} role="switch" aria-checked={light} aria-label="Switch between light and dark mode" title="Light / dark mode" onClick={() => setTheme(light ? 'dark' : 'light')}>
      <span className="rd-theme__ic rd-theme__ic--sun" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></span>
      <span className="rd-theme__track" aria-hidden="true"><span className="rd-theme__knob" /></span>
      <span className="rd-theme__ic rd-theme__ic--moon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg></span>
    </button>
  );
}

// ── HEADER ────────────────────────────────────────────────────────────────────
function RDHeader() {
  const [open, setOpen] = React.useState(false);
  const [clear, setClear] = React.useState(() => { try { return window.scrollY < 30; } catch (e) { return true; } });
  React.useEffect(() => {
    const onScroll = () => setClear(window.scrollY < 30);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const current = (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : 'index.html') || 'index.html';
  const alias = (h) => {
    if (h === 'schedule.html' && ['fixtures.html', 'results.html', 'table.html'].includes(current)) return true;
    if (h === 'media.html' && ['news.html', 'gallery.html'].includes(current)) return true;
    return false;
  };
  const isActive = (h) => h === current || (current === '' && h === 'index.html') || alias(h);
  React.useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  // Delayed volt glow that trails the cursor across the header capsule.
  const barRef = React.useRef(null), glowRef = React.useRef(null);
  React.useEffect(() => {
    const bar = barRef.current, glow = glowRef.current; if (!bar || !glow) return;
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, started = false, raf;
    const move = (e) => { const r = bar.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; if (!started) { started = true; cx = tx; cy = ty; } glow.style.opacity = '1'; };
    const leave = () => { glow.style.opacity = '0'; };
    const loop = () => { cx += (tx - cx) * 0.1; cy += (ty - cy) * 0.1; glow.style.transform = `translate(${cx}px, ${cy}px)`; raf = requestAnimationFrame(loop); };
    bar.addEventListener('mousemove', move); bar.addEventListener('mouseleave', leave); raf = requestAnimationFrame(loop);
    return () => { bar.removeEventListener('mousemove', move); bar.removeEventListener('mouseleave', leave); cancelAnimationFrame(raf); };
  }, []);
  const admin = window.useAdmin ? window.useAdmin() : false;
  const adminLogout = async () => {
    try { if (window.saSignOut) await window.saSignOut(); } catch (e) {}
    try { if (window.setAdmin) window.setAdmin(false); } catch (e) {}
    try { localStorage.setItem('sa-admin', '0'); } catch (e) {}
    window.location.reload();
  };
  return (
    <React.Fragment>
    {admin ? (
      <div className="rd-adminbar">
        <span className="rd-adminbar__tag"><span className="rd-adminbar__dot" />Admin mode</span>
        <a href="admin.html" className="rd-btn rd-btn--volt rd-btn--sm">Control panel</a>
        <button className="rd-btn rd-btn--dark rd-btn--sm" onClick={adminLogout}>Sign out</button>
      </div>
    ) : null}
    <header className={`rd-header ${clear ? 'is-clear' : ''}`}>
      <div className="rd-header__bar" ref={barRef}>
        <span className="rd-header__glowwrap" aria-hidden="true"><span className="rd-header__glow" ref={glowRef} /></span>
        <a href="index.html" className="rd-brand" aria-label="Sue's Angels FC, home">
          <img src="assets/badge/sue-angels-shield.png" alt="Sue's Angels FC" />
        </a>
        <nav className="rd-nav">
          {RD_LINKS.map((it) => <a key={it.l} href={it.href} className={isActive(it.href) ? 'is-active' : ''}>{it.l}</a>)}
        </nav>
        <div className="rd-header__actions">
          <RDThemeToggle />
          {window.LangShifter ? <window.LangShifter /> : null}
          <a href="join.html" className="rd-btn rd-btn--volt rd-btn--sm rd-header__cta">Join the club <RDArrow /></a>
          <button className="rd-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><span /><span /><span /></button>
        </div>
      </div>
      <div className={`rd-drawer ${open ? 'is-open' : ''}`}>
        {RD_LINKS.map((it) => <a key={it.l} href={it.href} className={isActive(it.href) ? 'is-active' : ''} onClick={() => setOpen(false)}>{it.l}</a>)}
        <a href="join.html" className="rd-btn rd-btn--volt">Join the club <RDArrow /></a>
      </div>
    </header>
    </React.Fragment>
  );
}

// ── INTERIOR PAGE HERO ──────────────────────────────────────────────────────────
function RDPageHero({ eyebrow, title, sub, children, actions, image, imageLight }) {
  return (
    <section className={`rd-pagehero${image ? ' rd-pagehero--photo' : ''}`}>
      <div className="rd-pagehero__bg" aria-hidden="true">
        {image ? (
          <React.Fragment>
            <img className="rd-pagehero__photo rd-pagehero__photo--dark" src={image} alt="" />
            <img className="rd-pagehero__photo rd-pagehero__photo--light" src={imageLight || image} alt="" />
            <span className="rd-pagehero__veil" />
          </React.Fragment>
        ) : (
          <img src="assets/badge/sue-angels-shield.png" alt="" className="rd-pagehero__mark" />
        )}
      </div>
      <div className="rd-container">
        <div className="rd-pagehero__inner" data-rd-fade="true">
          {eyebrow ? <p className="rd-eyebrow">{eyebrow}</p> : null}
          <h1 className="rd-display rd-pagehero__title">{title}</h1>
          {sub ? <p className="rd-lead rd-pagehero__sub">{sub}</p> : null}
          {actions ? <div className="rd-pagehero__actions">{actions}</div> : null}
          {children}
        </div>
      </div>
    </section>
  );
}

// ── FOOTER ──────────────────────────────────────────────────────────────────────
function RDFooter() {
  return (
    <footer className="rd-footer">
      <div className="rd-container rd-footer__inner">
        <div className="rd-footer__wm" aria-hidden="true">SUE&rsquo;S ANGELS FC</div>
        <div className="rd-footer__grid">
          <div className="rd-footer__brand">
            <img src="assets/badge/sue-angels-shield.png" alt="Sue's Angels FC" />
            <p>London Sunday League. League Ten champions, unbeaten. Founded 2025 in memory of Susan Anne Martin.</p>
          </div>
          <div className="rd-footer__col">
            <h4>Club</h4>
            <a href="about.html">About</a><a href="teams.html">Team</a><a href="champions.html">Champions</a><a href="schedule.html">Schedule</a>
          </div>
          <div className="rd-footer__col">
            <h4>Follow</h4>
            <a href="media.html">News</a><a href="gallery.html">Gallery</a><a href="sponsors.html">Sponsors</a><a href="contact.html">Contact</a>
          </div>
          <div className="rd-footer__col">
            <h4>Get involved</h4>
            <a href="join.html">Player trials</a><a href="join.html">Volunteer</a><a href="join.html">Media team</a><a href="contact.html">Sponsor enquiry</a>
          </div>
        </div>
        <div className="rd-footer__legal">
          <span>© 2026 Sue&rsquo;s Angels FC. All rights reserved.</span>
          <span>Est. 2025 · London · Sunday League · <a href="admin.html" style={{ color: 'inherit' }}>Staff</a></span>
        </div>
      </div>
    </footer>
  );
}

// page wrapper
function RDPage({ children }) {
  React.useEffect(() => { document.body.classList.add('rd-body'); }, []);
  return (<React.Fragment><RDHeader />{children}<RDFooter /></React.Fragment>);
}

Object.assign(window, { RD_LINKS, rdLeagueTotals, Reveal, RDArrow, RDHeader, RDFooter, RDPageHero, RDPage });

// Scroll-driven hero fade, any [data-rd-fade] element fades + lifts away as the
// page scrolls past it, then stops catching clicks once invisible.
if (typeof window !== 'undefined' && !window.__rdFadeInit) {
  window.__rdFadeInit = true;
  const apply = () => {
    const y = window.scrollY || window.pageYOffset || 0;
    const nodes = document.querySelectorAll('[data-rd-fade]');
    for (const el of nodes) {
      const dist = parseInt(el.getAttribute('data-rd-fade-dist'), 10) || 340;
      const p = Math.min(1, Math.max(0, y / dist));
      el.style.opacity = String(1 - p);
      el.style.transform = p > 0 ? `translateY(${p * -36}px)` : '';
      el.style.pointerEvents = p > 0.85 ? 'none' : '';
    }
  };
  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { apply(); ticking = false; }); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  setTimeout(apply, 200);
  setTimeout(apply, 800);
}
