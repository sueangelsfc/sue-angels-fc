// api/publish.js, the "Publish to site" button.
//
// WHY THIS EXISTS
// The control panel writes to Supabase. The website is generated from a
// snapshot of those tables. Until now the only thing that joined the two was
// a developer running `npm run sync` on a laptop, so the club could edit all
// it liked and the site never moved. This lets the club publish its own
// changes.
//
// WHAT IT DOES
// Verifies that the caller is a registered club administrator, then calls the
// Vercel deploy hook. Vercel's build command re-runs the sync, so the deploy
// that follows is built from the database as it is at that moment.
//
// WHY THE HOOK IS NOT IN THE BROWSER
// A deploy hook is a URL that anyone holding it can fire, repeatedly. In
// control.js it would ship to every visitor who views source. It lives in an
// environment variable that only this function can read.
//
// AUTHORISATION
// The caller's Supabase access token is checked against is_club_admin(), the
// same SECURITY DEFINER function that guards every write. There is no second
// definition of "who is an administrator" to drift out of step: if the
// database says no, this says no.
//
// ACTIVATION (one-time, by the club, no keys in the repo):
//   1. Vercel -> Project -> Settings -> Git -> Deploy Hooks -> Create Hook
//        name: publish   branch: main
//   2. Copy the URL it gives you.
//   3. Settings -> Environment Variables -> add
//        DEPLOY_HOOK_URL = <that URL>
//   4. Redeploy once so the function can see it.
//
// Until it is set this returns a clear "not configured" rather than pretending
// to have published something.

// The publishable key, from the file the website already ships it in. It is
// designed to be public and every protection comes from RLS, so there is no
// reason for this to be a second environment variable.
//
// It WAS one, and that was a bug: the activation note above lists exactly one
// variable to set, so SUPABASE_ANON_KEY was never set, `apikey` fell back to
// the caller's own login token, Supabase's gateway rejected the request, and
// the function reported "your account is not a club administrator" to an
// account that is one. A step nobody was told to perform is a step that does
// not happen.
import runtime from '../src/data/runtime.json' with { type: 'json' };

const ALLOWED_ORIGINS = [
  'https://www.suesangelsfc.co.uk',
  'https://suesangelsfc.co.uk',
];

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    res.status(403).json({ ok: false, error: 'forbidden' });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method' });
    return;
  }

  const HOOK = process.env.DEPLOY_HOOK_URL;
  const SB_URL = process.env.SUPABASE_URL || runtime.supabase.url;
  const SB_ANON = process.env.SUPABASE_ANON_KEY || runtime.supabase.anonKey;

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    res.status(401).json({ ok: false, error: 'sign in first' });
    return;
  }

  // Ask the database, not this file, whether the caller may publish.
  //
  // The two ways this can say no are NOT the same and must not read the same.
  // "The database says you are not an administrator" is a fact about the
  // caller. "The request never reached the database" is a fault in this
  // deployment. Collapsing both into one message is what made a broken API key
  // look like a permissions problem, and sent somebody to fix the wrong thing.
  try {
    const check = await fetch(`${SB_URL}/rest/v1/rpc/is_club_admin`, {
      method: 'POST',
      headers: {
        apikey: SB_ANON,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    const said = (await check.text()).trim();
    if (!check.ok) {
      /* THREE outcomes, not two. A rejected request is usually the deployment's
         fault, but not when the rejection is specifically "this JWT is no
         longer valid": that is a sign-in that has simply run out, which is the
         commonest thing of all if the panel has been left open, and telling
         somebody their website is broken when they need to sign in again is
         the same mistake as telling an administrator they are not one. */
      const expired = check.status === 401 && /PGRST301|JWT|expired/i.test(said);
      res.status(expired ? 401 : 502).json({
        ok: false,
        error: expired
          ? 'Your sign-in has expired, so nothing was published. Sign in again and press it once more.'
          : 'The club database would not answer the permission check, so nothing was published. '
            + 'This is a fault in the website, not with your account.',
        detail: expired ? undefined : `${check.status} ${said.slice(0, 200)}`,
      });
      return;
    }
    if (said !== 'true') {
      res.status(403).json({
        ok: false,
        error: 'The club database says this account is not an administrator, so it cannot publish.',
      });
      return;
    }
  } catch (e) {
    res.status(502).json({ ok: false, error: 'Could not reach the club database. Try again.' });
    return;
  }

  if (!HOOK) {
    res.status(200).json({
      ok: false,
      reason: 'not-configured',
      error: 'Publishing is not set up yet. Add DEPLOY_HOOK_URL in Vercel.',
    });
    return;
  }

  try {
    const fired = await fetch(HOOK, { method: 'POST' });
    if (!fired.ok) {
      res.status(502).json({ ok: false, error: `The deploy hook refused (${fired.status}).` });
      return;
    }
    res.status(200).json({
      ok: true,
      // Vercel builds and deploys in the background; nothing here waits for it.
      message: 'Publishing. The site updates in a couple of minutes.',
    });
  } catch (e) {
    res.status(502).json({ ok: false, error: 'Could not reach the deploy hook.' });
  }
}
