// AdminMode.jsx, site-wide admin gate.
//
// SECURITY MODEL
// ──────────────
// • CLOUD mode (live site, Supabase configured): admin mode is ONLY on when a
//   visitor is signed in via Supabase Auth AND their email matches
//   SUPABASE_CONFIG.adminEmail. There is NO ?admin=1 / hotkey backdoor in cloud
//   mode, the public cannot turn admin on. The footer "Admin" link opens a
//   login form. Even if someone forced the flag, Supabase RLS rejects every
//   write from a non-authenticated session, so live data stays safe.
// • LOCAL mode (design preview, no Supabase): falls back to the simple
//   ?admin=1 / Ctrl+Shift+A toggle so the build can be tested without a backend.
//
// This script loads on every page, so the gate + login modal work everywhere
// with no per-page wiring.

(function () {
  if (typeof window === 'undefined') return;

  const cfg = window.SUPABASE_CONFIG || null;
  const CLOUD = !!(cfg && cfg.url && cfg.anonKey);
  const ADMIN_EMAIL = ((cfg && cfg.adminEmail) || '').toLowerCase();

  window.__sa_admin = false;
  window.isAdmin = function () { return !!window.__sa_admin; };

  function emit() { window.dispatchEvent(new CustomEvent('sa-admin-changed')); renderPill(); }

  // ───────────────────────────────────────────────────────────── PILL ──────
  // Small floating control, admin-only. Shows "ADMIN ON · LOG OUT".
  function renderPill() {
    const existing = document.getElementById('sa-admin-pill');
    if (existing) existing.remove();
    if (!window.__sa_admin) return;
    if (!document.body) return;
    return; // floating "ADMIN ON · LOG OUT" pill removed, admins use the control panel Sign out
    const el = document.createElement('button');
    el.id = 'sa-admin-pill';
    el.textContent = CLOUD ? 'ADMIN ON · LOG OUT' : 'ADMIN ON · ⌘⇧A';
    el.title = CLOUD ? 'Click to log out' : 'Click to exit admin mode';
    el.addEventListener('click', () => {
      if (CLOUD) { signOut(); } else { window.setAdmin(false); }
    });
    Object.assign(el.style, {
      position: 'fixed', right: '14px', bottom: '14px', zIndex: 9999,
      background: '#D6F23A', color: '#0A1426', border: '0', borderRadius: '9999px',
      padding: '8px 14px',
      font: '900 11px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(214,242,58,0.4)',
    });
    document.body.appendChild(el);
  }

  // ─────────────────────────────────────────────────── LOCAL (no backend) ──
  if (!CLOUD) {
    let on = false;
    try {
      on = localStorage.getItem('sa-admin') === '1';
      const url = new URL(window.location.href);
      if (url.searchParams.get('admin') === '1') { on = true; localStorage.setItem('sa-admin', '1'); }
      if (url.searchParams.get('admin') === '0') { on = false; localStorage.removeItem('sa-admin'); }
    } catch (e) {}
    window.__sa_admin = on;
    window.setAdmin = function (next) {
      window.__sa_admin = !!next;
      try { localStorage.setItem('sa-admin', next ? '1' : '0'); } catch (e) {}
      emit();
    };
    // Footer link calls window.openAdmin(), in local mode just toggle.
    window.openAdmin = function () { window.setAdmin(!window.__sa_admin); };
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault(); window.setAdmin(!window.__sa_admin);
      }
    });
    if (document.readyState !== 'loading') renderPill();
    else window.addEventListener('DOMContentLoaded', renderPill);
  } else {
    // ───────────────────────────────────────────────── CLOUD (Supabase) ──
    // setAdmin is internal-only here; never grants admin without a session.
    window.setAdmin = function (next) {
      // In cloud mode admin can only be turned OFF programmatically (e.g. on
      // sign-out). Turning ON requires a verified admin session via syncAuth().
      if (next) return;
      window.__sa_admin = false;
      emit();
    };

    let authClient = null;
    async function client() {
      if (authClient) return authClient;
      const store = window.SupabaseStore;
      if (!store) return null;
      authClient = await store.client();
      return authClient;
    }

    // Reconcile admin flag with the current Supabase session.
    async function syncAuth() {
      try {
        const c = await client();
        if (!c) return;
        const { data } = await c.auth.getSession();
        const email = data && data.session && data.session.user && data.session.user.email;
        const isAdmin = !!(email && ADMIN_EMAIL && email.toLowerCase() === ADMIN_EMAIL);
        if (isAdmin !== window.__sa_admin) { window.__sa_admin = isAdmin; emit(); }
        // Subscribe once to auth changes.
        if (!window.__sa_auth_sub) {
          const sub = c.auth.onAuthStateChange((_e, session) => {
            const em = session && session.user && session.user.email;
            const adm = !!(em && ADMIN_EMAIL && em.toLowerCase() === ADMIN_EMAIL);
            if (adm !== window.__sa_admin) { window.__sa_admin = adm; emit(); }
          });
          window.__sa_auth_sub = sub && sub.data ? sub.data.subscription : true;
        }
      } catch (e) { /* offline / SDK blocked → stay public */ }
    }

    async function signOut() {
      try { const c = await client(); if (c) await c.auth.signOut(); } catch (e) {}
      window.__sa_admin = false; emit();
    }
    window.saSignOut = signOut;

    // ── Login modal (vanilla, works on every page) ──────────────────────────
    window.openAdmin = function () {
      if (window.__sa_admin) { signOut(); return; }
      if (document.getElementById('sa-login')) return;

      const overlay = document.createElement('div');
      overlay.id = 'sa-login';
      Object.assign(overlay.style, {
        position: 'fixed', inset: '0', zIndex: 10000,
        background: 'rgba(2,6,12,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      });
      overlay.innerHTML = `
        <form id="sa-login-form" style="
          width:100%;max-width:360px;background:#0B1622;border:1px solid rgba(214,242,58,0.35);
          border-radius:14px;padding:26px;box-shadow:0 24px 60px rgba(0,0,0,0.6);
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="font:900 10px/1 sans-serif;letter-spacing:0.22em;color:#D6F23A;text-transform:uppercase;margin-bottom:6px;">CLUB ADMIN</div>
          <div style="font:800 22px/1.05 sans-serif;color:#fff;letter-spacing:-0.01em;margin-bottom:18px;">Sign in to manage</div>
          <input id="sa-email" type="email" placeholder="Email" autocomplete="username" style="
            width:100%;box-sizing:border-box;margin-bottom:10px;padding:12px 14px;border-radius:9px;
            border:1px solid rgba(255,255,255,0.14);background:#03121C;color:#fff;font-size:15px;" />
          <div style="position:relative;margin-bottom:14px;">
            <input id="sa-pass" type="password" placeholder="Password" autocomplete="current-password" style="
              width:100%;box-sizing:border-box;padding:12px 44px 12px 14px;border-radius:9px;
              border:1px solid rgba(255,255,255,0.14);background:#03121C;color:#fff;font-size:15px;" />
            <button type="button" id="sa-pass-eye" aria-label="Show password" style="
              position:absolute;right:6px;top:50%;transform:translateY(-50%);
              background:transparent;border:0;cursor:pointer;padding:8px;font-size:16px;line-height:1;color:#9FB0C0;">👁</button>
          </div>
          <div id="sa-login-err" style="display:none;color:#FB7185;font:600 12px/1.4 sans-serif;margin-bottom:12px;"></div>
          <div style="display:flex;gap:8px;">
            <button type="submit" id="sa-login-go" style="
              flex:1;padding:12px;border:0;border-radius:9px;background:#D6F23A;color:#071D29;
              font:900 12px/1 sans-serif;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;">Sign in</button>
            <button type="button" id="sa-login-x" style="
              padding:12px 16px;border:1px solid rgba(255,255,255,0.16);border-radius:9px;background:transparent;
              color:#9FB0C0;font:800 12px/1 sans-serif;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;">Cancel</button>
          </div>
        </form>`;
      document.body.appendChild(overlay);

      const close = () => overlay.remove();
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      overlay.querySelector('#sa-login-x').addEventListener('click', close);
      const eyeBtn = overlay.querySelector('#sa-pass-eye');
      if (eyeBtn) eyeBtn.addEventListener('click', () => {
        const p = overlay.querySelector('#sa-pass');
        if (p.type === 'password') { p.type = 'text'; eyeBtn.textContent = '🙈'; }
        else { p.type = 'password'; eyeBtn.textContent = '👁'; }
        p.focus();
      });
      document.addEventListener('keydown', function esc(e){ if(e.key==='Escape'){close();document.removeEventListener('keydown',esc);} });
      setTimeout(() => { const f = overlay.querySelector('#sa-email'); if (f) f.focus(); }, 50);

      overlay.querySelector('#sa-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = overlay.querySelector('#sa-email').value.trim();
        const pass  = overlay.querySelector('#sa-pass').value;
        const errEl = overlay.querySelector('#sa-login-err');
        const goBtn = overlay.querySelector('#sa-login-go');
        errEl.style.display = 'none';
        goBtn.textContent = 'Signing in…'; goBtn.disabled = true;
        try {
          const c = await client();
          if (!c) throw new Error('Backend unavailable');
          const { data, error } = await c.auth.signInWithPassword({ email, password: pass });
          if (error) throw error;
          const em = data && data.user && data.user.email;
          if (!em || em.toLowerCase() !== ADMIN_EMAIL) {
            await c.auth.signOut();
            throw new Error('That account is not an admin for this site.');
          }
          window.__sa_admin = true; emit();
          close();
        } catch (err) {
          errEl.textContent = (err && err.message) || 'Sign in failed.';
          errEl.style.display = 'block';
          goBtn.textContent = 'Sign in'; goBtn.disabled = false;
        }
      });
    };

    // Kick off session check on load.
    if (document.readyState !== 'loading') syncAuth();
    else window.addEventListener('DOMContentLoaded', syncAuth);

    // Hidden admin entrance (cloud mode): Ctrl/Cmd+Shift+A opens the login
    // modal, and ?login=1 on any URL does the same. No visible link anywhere.
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault(); window.openAdmin();
      }
    });
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.get('login') === '1') {
        if (document.readyState !== 'loading') window.openAdmin();
        else window.addEventListener('DOMContentLoaded', () => window.openAdmin());
      }
    } catch (e) {}
  }

  // ───────────────────────────────────────────────────────── React hook ────
  window.useAdmin = function () {
    const [on, setOn] = React.useState(() => !!window.__sa_admin);
    React.useEffect(() => {
      const h = () => setOn(!!window.__sa_admin);
      window.addEventListener('sa-admin-changed', h);
      return () => window.removeEventListener('sa-admin-changed', h);
    }, []);
    return on;
  };

  // AdminSlot, wraps any admin-only edit UI. Hidden for visitors.
  window.AdminSlot = function ({ title, children }) {
    const on = window.useAdmin();
    if (!on) return null;
    return (
      <div className="admin-slot">
        <div className="admin-slot__head">
          <span className="admin-slot__chip">ADMIN</span>
          <span className="admin-slot__title">{title}</span>
        </div>
        <div className="admin-slot__body">{children}</div>
      </div>
    );
  };

  window.AdminBanner = function () { return null; };

  // ─── Desktop vertical scroll control (≥1024px) ─────────────────────────
  // A small fixed up/down pair, bottom-right. Up scrolls to top, down to
  // bottom; each disables when you're already at that extreme. Desktop-only
  // via CSS (.scroll-nav is display:none below 1024px).
  function mountScrollNav() {
    if (document.getElementById('sa-scroll-nav')) return;
    if (!document.body) return;
    const wrap = document.createElement('div');
    wrap.className = 'scroll-nav';
    wrap.id = 'sa-scroll-nav';
    const up = document.createElement('button');
    up.className = 'scroll-nav__btn'; up.type = 'button';
    up.setAttribute('aria-label', 'Scroll to top'); up.innerHTML = '&uarr;';
    const down = document.createElement('button');
    down.className = 'scroll-nav__btn'; down.type = 'button';
    down.setAttribute('aria-label', 'Scroll to bottom'); down.innerHTML = '&darr;';
    up.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    down.addEventListener('click', () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }));
    wrap.appendChild(up); wrap.appendChild(down);
    document.body.appendChild(wrap);
    const sync = () => {
      const y = window.scrollY || window.pageYOffset;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      up.disabled = y <= 4;
      down.disabled = y >= max - 4;
    };
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }
  if (document.readyState !== 'loading') mountScrollNav();
  else window.addEventListener('DOMContentLoaded', mountScrollNav);
})();
