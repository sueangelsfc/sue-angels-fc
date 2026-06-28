// Footer.jsx — dark footer with badge, columns, utility row.
// NOTE: there is NO visible admin entry point. Admins open the login modal via
// a hidden route only they know (Ctrl/Cmd+Shift+A, or appending ?login=1 to any
// URL). The public never sees an admin link.
function Footer() {
  const cols = [
    { h: 'Club',     l: [{l:'About',href:'about.html'},{l:'Teams',href:'teams.html'},{l:'News',href:'news.html'},{l:'Gallery',href:'gallery.html'}] },
    { h: 'Matches',  l: [{l:'Fixtures',href:'fixtures.html'},{l:'Results',href:'results.html'},{l:'Table',href:'table.html'}] },
    { h: 'Get involved', l: [{l:'Player trials',href:'join.html'},{l:'Volunteer',href:'join.html'},{l:'Sponsors',href:'sponsors.html'},{l:'Media Team',href:'join.html'}] },
    { h: 'Follow',   l: [{l:'Instagram',href:'#'},{l:'TikTok',href:'#'},{l:'YouTube',href:'#'},{l:'Contact',href:'contact.html'}] },
  ];
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <img src="assets/badge/sue-angels-shield.png" alt="" style={{ width: 'auto', height: 76 }} />
            <div>
              <div className="t-h3" style={{ color: '#fff' }}>SUE&rsquo;S ANGELS FC</div>
              <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>WHAT WE DO IN LIFE ECHOES IN ETERNITY</div>
            </div>
          </div>
          <div className="footer__cols">
            {cols.map((c) => (
              <div key={c.h} className="footer__col">
                <div className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>{c.h}</div>
                <ul>{c.l.map((it) => <li key={it.l}><a href={it.href}>{it.l}</a></li>)}</ul>
              </div>
            ))}
          </div>
        </div>

        <div className="footer__rule" />

        <div className="footer__util">
          <span className="t-meta" style={{ color: 'var(--fg-3)' }}>© 2026 Sue&rsquo;s Angels FC. All rights reserved.</span>
          <span className="t-meta" style={{ color: 'var(--fg-3)' }}>EST. 2025 · LONDON</span>
          <span className="footer__util-links">
            <a href="#">Privacy</a><a href="#">Terms</a><a href="#">Cookies</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

window.Footer = Footer;
