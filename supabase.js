// supabase.js — Supabase client setup + auth hook.
//
// CONFIGURATION
// ─────────────
// The site reads its Supabase config from `window.SUPABASE_CONFIG`. Set this
// in `supabase-config.js` (sibling file) — that file is the ONE place you
// edit when wiring up a new Supabase project:
//
//   window.SUPABASE_CONFIG = {
//     url:        'https://xxxxxxxxxxxx.supabase.co',
//     anonKey:    'eyJ...',                  // safe to ship in browser
//     adminEmail: 'manager@sueangels.fc',    // your auth user; admin mode auto-on when signed in as this
//   };
//
// If the config is missing or empty, the site falls back to localStorage-only
// mode — exactly how it behaves in the Claude design preview today. No errors.
//
// LOAD ORDER
// ──────────
// Loaded after PageShell.jsx but BEFORE FixtureEntry/MatchEntry/PlayerPhotos
// so window.SupabaseStore exists when those try to read/write.

(function () {
  const cfg = (typeof window !== 'undefined' && window.SUPABASE_CONFIG) || null;

  // Detect mode: 'cloud' if URL + anon key are present, otherwise 'local'.
  const mode = (cfg && cfg.url && cfg.anonKey) ? 'cloud' : 'local';
  window.SA_DATA_MODE = mode;

  if (mode === 'local') {
    // No-op store. The dataStore abstraction will see SA_DATA_MODE === 'local'
    // and route every call to localStorage instead.
    console.info('[Supabase] Not configured — site runs in local (browser-only) mode.');
    window.SupabaseStore = null;
    window.useSupabaseAuth = () => ({ user: null, loading: false });
    return;
  }

  // Cloud mode: lazy-load the @supabase/supabase-js client from CDN.
  // (Pinned version for safety.)
  const SUPABASE_SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

  let client = null;
  let clientReady = null;
  function getClient() {
    if (client) return Promise.resolve(client);
    if (clientReady) return clientReady;
    clientReady = import(SUPABASE_SDK).then((mod) => {
      client = mod.createClient(cfg.url, cfg.anonKey, {
        auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true },
      });
      return client;
    });
    return clientReady;
  }
  // Eagerly load the SDK so the first action doesn't pay an import latency.
  getClient().catch((e) => console.error('[Supabase] SDK load failed', e));

  // Public API surface used by dataStore.js + admin-mode integration.
  window.SupabaseStore = {
    mode: 'cloud',
    config: cfg,
    client: () => getClient(),
  };

  // ─── Auth hook ──────────────────────────────────────────────────────────
  // Returns { user, loading, isAdmin, signIn, signOut }. Components that need
  // to know who's signed in (admin gating, login form) consume this.
  window.useSupabaseAuth = function () {
    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      let mounted = true;
      let unsub = null;
      (async () => {
        const c = await getClient();
        const { data } = await c.auth.getSession();
        if (!mounted) return;
        setUser(data && data.session ? data.session.user : null);
        setLoading(false);
        const sub = c.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return;
          setUser(session ? session.user : null);
        });
        unsub = sub.data ? sub.data.subscription : null;
      })();
      return () => { mounted = false; if (unsub) unsub.unsubscribe(); };
    }, []);

    const isAdmin = !!(user && cfg.adminEmail && user.email && user.email.toLowerCase() === cfg.adminEmail.toLowerCase());

    return {
      user, loading, isAdmin,
      signIn: async (email, password) => {
        const c = await getClient();
        const { data, error } = await c.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
      },
      signOut: async () => {
        const c = await getClient();
        await c.auth.signOut();
      },
    };
  };
})();
