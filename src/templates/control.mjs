/* ==========================================================================
   CONTROL PANEL SHELL
   Server-rendered shell: auth gate, sidebar, and an empty region per module.
   control.js mounts the modules and does all Supabase work.

   Deliberately NOT the old architecture: the previous panel shipped Babel
   standalone to the browser and transpiled eleven .jsx files on every load.
   This is plain JS with the Supabase SDK for auth only.
   ========================================================================== */
import { esc, attr, icon, crest } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';

export const MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: 'chart' },
  { key: 'fixtures', label: 'Fixtures', icon: 'calendar' },
  { key: 'results', label: 'Results and reports', icon: 'shield' },
  { key: 'squad', label: 'Squad and staff', icon: 'users' },
  { key: 'news', label: 'News', icon: 'news' },
  { key: 'media', label: 'Gallery albums', icon: 'camera' },
  { key: 'phototag', label: 'Tag players in photos', icon: 'users' },
  { key: 'videos', label: 'Match video', icon: 'play' },
  { key: 'recognition', label: 'Recognition', icon: 'trophy' },
  { key: 'league', label: 'League table', icon: 'chart' },
  { key: 'sponsors', label: 'Sponsors', icon: 'heart' },
  { key: 'inbox', label: 'Inbox', icon: 'mail' },
  { key: 'settings', label: 'Settings', icon: 'shield' },
];

export function control() {
  const nav = MODULES.map((m) => `<li>
    <button class="cp-nav__item" type="button" data-module="${attr(m.key)}">
      ${icon(m.icon)}<span>${esc(m.label)}</span>
      <span class="cp-nav__count" data-count-for="${attr(m.key)}" hidden></span>
    </button>
  </li>`).join('');

  const panels = MODULES.map((m) => `<section class="cp-panel" id="panel-${attr(m.key)}"
      role="tabpanel" aria-label="${attr(m.label)}" hidden>
    <div class="cp-panel__loading" data-panel-loading>
      <div class="skeleton skeleton--title"></div>
      <div class="skeleton skeleton--text"></div>
      <div class="skeleton skeleton--text"></div>
    </div>
    <div data-panel-body></div>
  </section>`).join('');

  return `
  <!-- ============ AUTH GATE ============ -->
  <div class="cp-gate" id="cp-gate">
    <div class="cp-gate__card glass glass--lg">
      <span class="cp-gate__crest">${crest('', `${CLUB.name} crest`)}</span>
      <h1 class="cp-gate__title">Control panel</h1>
      <p class="cp-gate__sub">${esc(CLUB.name)}</p>

      <!-- The club word. Asked for BEFORE the email and password, and checked
           in the browser: it is a doorway, not a security control, and it is
           not pretending otherwise. Real authorisation is Supabase Auth plus
           the admin_users registry, and neither of those can be talked past
           from here. What this does buy is that a stranger who finds
           /control.html sees a question they cannot answer instead of a login
           form to point a password list at. -->
      <form class="cp-gate__form" id="cp-word" novalidate>
        <div class="field">
          <label class="field__label" for="cp-club-word">Club word</label>
          <!-- type="text", NOT password. It is not a secret, it ships in a file
               anyone can read, and masking it caused two real problems: Chrome
               offered to autofill a saved password over the top, and you could
               not see what you had typed when it did not work. -->
          <input class="input" id="cp-club-word" name="clubword" type="text"
                 autocomplete="off" autocapitalize="none" autocorrect="off"
                 spellcheck="false" required placeholder="Ask the club">
        </div>
        <p class="field__error" id="cp-word-error" role="alert" hidden></p>
        <button class="btn btn--primary btn--block" type="submit">Continue</button>
      </form>

      <form class="cp-gate__form" id="cp-login" novalidate hidden>
        <div class="field">
          <label class="field__label" for="cp-email">Email</label>
          <input class="input" id="cp-email" name="email" type="email" autocomplete="username"
                 inputmode="email" required>
        </div>
        <div class="field">
          <label class="field__label" for="cp-pass">Password</label>
          <input class="input" id="cp-pass" name="password" type="password"
                 autocomplete="current-password" required>
        </div>
        <p class="field__error" id="cp-login-error" role="alert" hidden></p>
        <button class="btn btn--primary btn--block" type="submit" id="cp-login-btn">Sign in</button>
      </form>

      <p class="cp-gate__note">
        Access is granted by the club administrator registry in the database, not by
        this page. Signing in with an account that is not registered will read the
        club data but will not be able to change anything.
      </p>
      <a class="btn btn--quiet btn--sm" href="/">Back to the website</a>
    </div>
  </div>

  <!-- ============ APP ============ -->
  <div class="cp" id="cp-app" hidden>
    <aside class="cp-side" id="cp-sections">
      <a class="cp-side__brand" href="/">
        <span class="cp-side__crest">${crest()}</span>
        <span>
          <b>Sue’s Angels</b>
          <small>Control panel</small>
        </span>
      </a>
      <nav aria-label="Control panel sections">
        <ul class="cp-nav" role="list">${nav}</ul>
      </nav>
      <div class="cp-side__foot">
        <div class="cp-who">
          <span class="cp-who__dot" data-role-dot></span>
          <span>
            <b data-who-email>—</b>
            <small data-who-role>checking access</small>
          </span>
        </div>
        <button class="btn btn--ghost btn--sm btn--block" type="button" id="cp-signout">Sign out</button>
      </div>
    </aside>

    <main class="cp-main">
      <header class="cp-top">
        <!-- A labelled hamburger. This was a chevron rotated 180 degrees, which
             reads as a back arrow, so on any window under 900px the sidebar was
             off-screen and the one control that opened it looked like it went
             somewhere else. The panel appeared to be a dashboard with no
             navigation at all. -->
        <button class="cp-menubtn" type="button" id="cp-menu" aria-label="Show sections"
                aria-expanded="false" aria-controls="cp-sections">
          ${icon('menu')}<span>Sections</span>
        </button>
        <h1 class="cp-top__title" data-cp-title>Dashboard</h1>
        <div class="cp-top__actions">
          <span class="badge badge--neutral" data-conn>Connecting</span>
          <!-- Saving writes to the database; the website is generated from it.
               This is the step that joins the two, and without it every edit
               made here sits in Supabase and the site never changes. -->
          <button class="btn btn--primary btn--sm" type="button" id="cp-publish">Publish to site</button>
          <a class="btn btn--ghost btn--sm" href="/" target="_blank" rel="noopener">View site ${icon('external')}</a>
        </div>
      </header>
      <div class="cp-body">${panels}</div>
    </main>
  </div>

  <div class="toasts" data-toasts role="region" aria-label="Notifications" aria-live="polite"></div>`;
}
