# Deployment, environments and recovery

## The one thing that will catch you

**The live domain is served by the Vercel project `sue-angels-fc-b469`, not `sue-angels-fc`.**

Both projects exist, both are named after this repo, and both report `www.suesangelsfc.co.uk` as their latest production URL in `vercel project ls`. Only one actually has the domain attached:

| Project | Domain attached | GitHub `repoId` | Status |
|---|---|---|---|
| `sue-angels-fc-b469` | **yes** — `suesangelsfc.co.uk`, `www.suesangelsfc.co.uk` | `1260075992` (current) | **live** |
| `sue-angels-fc` | no | `1254418900` (no longer exists) | stale |

The repo's `.vercel/project.json` pointed at the stale one. `vercel deploy --prod` against it succeeds and reaches nothing. Verify before deploying:

```bash
vercel project ls
curl -sI https://www.suesangelsfc.co.uk/ | grep -i x-vercel-id
```

## Environments

| | Branch | URL | Purpose |
|---|---|---|---|
| Development | any local branch | `npm run serve` → `localhost:4321` | build and test locally |
| Staging | any pushed branch | Vercel preview URL | review before production |
| Production | `main` | www.suesangelsfc.co.uk | live |

Preview URLs are protected by team-level Vercel SSO, so they need a signed-in Vercel session.

## Deploying

```bash
npm run build     # regenerate output (required after any src/ change)
npm run verify    # derived stats vs the published league table
npm test          # 1,546 checks against the generated output
```

All three must pass. Then:

```bash
git add -A
git commit -m "…"
git push origin <branch>       # preview
```

Merging to `main` triggers the production deploy automatically. After it lands, hard-refresh or use a private window — HTML is served `must-revalidate` but the browser may still hold the old page.

### Why there is no build step on Vercel
`vercel.json` sets `"buildCommand": null` and `"outputDirectory": "."`. The generator runs **locally** and its output is committed. A deploy therefore cannot fail on a build error, and the site cannot be broken by a dependency change.

The tradeoff: **you must run `npm run build` and commit the output.** If you edit `src/` and do not rebuild, nothing changes on the site.

## Environment variables

Names only. Set these in Vercel → project → Settings → Environment Variables. Never commit a value.

| Name | Needed by | Effect if unset |
|---|---|---|
| `RESEND_API_KEY` | `api/notify-enquiry.js` | email alerts silently skipped; enquiries still recorded in Supabase, so no lead is lost |
| `MAILERLITE_API_KEY` | `api/subscribe.js` | newsletter signups still recorded in `supporters`, not pushed to MailerLite |
| `ANTHROPIC_API_KEY` | `api/claude.js` | nothing: no page or panel screen calls this endpoint. The match report is built in the browser from the facts already recorded. The endpoint is administrator-gated and kept for the day drafting help is wanted. |
| `SA_GA_ID` | analytics | analytics inactive |

**Never set a Supabase service-role key as an environment variable that reaches browser code.** The anon/publishable key in `src/data/runtime.json` is designed to be public; all protection comes from row-level security. `npm test` fails the build if `service_role` appears in shipped output.

## Database migrations

Run in order, in the Supabase SQL Editor, inside a transaction so you can inspect before committing.

| File | What it does | Run? |
|---|---|---|
| `001_enquiry_status.sql` | optional `status` + `notes` on `enquiries` for lead tracking | not run; the Inbox feature-detects and works without it |
| `002_admin_role_and_rls.sql` | `admin_users` registry, `is_club_admin()`, per-verb write policies, `audit_log` | **not run — required for the control panel to write** |
| `003_rollback_admin_role.sql` | reverses 002 without destroying the roster or audit history | rollback only |

**002 is inert until an administrator row is inserted.** See the instructions at the foot of that file. Until then the control panel is read-only for everyone, which is fail-closed and safe.

## Backup

**Content:** Control panel → Settings → **Download full backup**. Writes every content table to one JSON file. Do this before any bulk change.

**Database:** Supabase takes automatic daily backups on paid plans. Verify the retention window in the dashboard.

**Code:** the git history is the backup. Checkpoint tags:

| Tag | State |
|---|---|
| `pre-platform-rebuild-20260730` | production immediately before this rebuild |
| `pre-rebuild-checkpoint` | before the orange/black promotion |
| `pre-control-panel-rebuild` | before the earlier panel work |

The recovery package at `/Users/Stewart/Documents/Sue's Angels FC/recovery` holds the previous production site verbatim: 23 HTML pages, its CSS and JS, a dated Supabase export, and 1,418 gallery files.

## Restore procedures

### Roll back the website
Vercel → **sue-angels-fc-b469** → Deployments → last good production build → **Promote to Production**. Instant, and it does not touch the database.

### Roll back the database security model
Run `migrations/003_rollback_admin_role.sql`. Content tables keep public read; write policies are removed, so writes fall back to being blocked rather than being silently opened up.

### Restore content
Open the relevant module in the control panel and paste the record's `data` from a backup file. For a full restore the backup JSON maps one-to-one onto the tables.

### Verify a restore
```bash
npm run verify    # derived figures still reconcile with the published table
npm test          # generated output is still sound
```

Then check the live site: the home page ribbon, `/league.html` and `/stats.html` should all agree, because they are all derived from the same records.

## Health checks after any deploy

```bash
curl -sI https://www.suesangelsfc.co.uk/ | grep -iE 'x-vercel-id|content-security-policy'
curl -s https://www.suesangelsfc.co.uk/sitemap.xml | grep -c '<loc>'      # expect 98
curl -s -o /dev/null -w '%{http_code}\n' https://www.suesangelsfc.co.uk/control.html
```

Confirm anonymous visitors still cannot read leads:

```bash
curl -s "https://hvbquuvxcswylyguplfb.supabase.co/rest/v1/enquiries?select=*" \
  -H "apikey: <anon key>"
# expect []
```

## Maintenance recommendations

- **After every content change in the control panel**, nothing else is needed: the public site hydrates from Supabase for live regions, and derived statistics recompute on the next build.
- **After every `src/` change**: `npm run build && npm run verify && npm test`, then commit the output.
- **Monthly:** download a content backup; check Vercel and Supabase for failed function invocations.
- **Each season:** add the new fixtures, and confirm the season roll-over in `src/lib/club.mjs` (`division`, `nextDivision`) and `SEASON_INFO`.
- **Before any bulk delete:** take a backup. Deletion is permanent and only an administrator can do it.
