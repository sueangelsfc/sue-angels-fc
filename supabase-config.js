// supabase-config.js — single source of truth for Supabase credentials.
//
// ┌─ HOW TO USE ────────────────────────────────────────────────────────────┐
// │ 1. Set window.SUPABASE_CONFIG.url to your Project URL                  │
// │    (Settings → API in the Supabase dashboard)                          │
// │ 2. Set window.SUPABASE_CONFIG.anonKey to your `anon` `public` key      │
// │    (NEVER use the `service_role` key here — it's a security risk)      │
// │ 3. Set window.SUPABASE_CONFIG.adminEmail to the email you registered   │
// │    in Authentication → Users                                           │
// │ 4. Save the file and deploy.                                           │
// │                                                                        │
// │ Leave all three as empty strings to keep the site in localStorage-only │
// │ (preview / dev) mode. That's what the placeholders ship with.          │
// └────────────────────────────────────────────────────────────────────────┘

window.SUPABASE_CONFIG = {
  url:        'https://hvbquuvxcswylyguplfb.supabase.co',
  anonKey:    'sb_publishable_2VEdxWZCLW98qItINt6TPQ_r7y_Tcly',
  adminEmail: 'stewartluwawa20@gmail.com',
};


// Analytics + donation links (set these to go live).
window.SA_GA_ID = 'G-4KPG5PZK0Z'; // GA4 Measurement ID (Sue's Angels FC property)
window.SA_DONATE_CLUB_URL = '';  // e.g. Stripe / JustGiving link for club support
window.SA_DONATE_CAUSE_URL = ''; // e.g. link for sepsis-awareness support

// Stripe donations (no server needed — uses Stripe's hosted Buy Button).
// 1) Create products + a Buy Button in the Stripe dashboard. 2) Paste the IDs here.
window.SA_STRIPE_PK = '';            // your Stripe publishable key (pk_live_... — safe in the browser)
window.SA_STRIPE_BUYBTN_CLUB = '';   // Buy Button ID for 'Support the club'
window.SA_STRIPE_BUYBTN_CAUSE = '';  // Buy Button ID for 'Support sepsis awareness'
