# Sue's Angels FC — operating guide

Everything a club administrator needs. No code required.

---

## 1. Getting access

The control panel is at **www.suesangelsfc.co.uk/control.html**.

Signing in is two separate things, and both are needed:

1. **An account** in Supabase → Authentication → Users.
2. **A row in `admin_users`**, which is what actually grants permission to change anything.

Step 2 matters: the panel deliberately does not decide who is an administrator. The database does. If you sign in with an account that has no `admin_users` row, you can read the club's data but every save is refused, and the sidebar shows **"Read-only, not registered"**.

### First-time setup (once, by whoever owns the Supabase project)

1. Supabase dashboard → SQL Editor.
2. Paste and run `migrations/002_admin_role_and_rls.sql`.
3. Run the insert at the bottom of that file, with the right email:

```sql
insert into public.admin_users (user_id, email, role, note)
select id, email, 'admin', 'Club owner'
from auth.users
where email = 'you@example.com'
on conflict (user_id) do update set role = 'admin';
```

4. Check it worked: `select * from public.admin_users;` should return your row.

Roles: `admin` can do everything including managing other administrators. `editor` can change content but not the administrator list. `viewer` is read-only.

---

## 2. The dashboard

Opens on a count of everything the club holds, then **Needs attention** — the things worth doing. It flags missing fixtures, matches with no written report, and whether your account can actually write.

---

## 3. Adding a fixture

**Fixtures → Add fixture.**

The editor is a JSON form. That is deliberate: these records hold varied fields and a simplified form would quietly drop the ones the website reads. It refuses to save invalid JSON, so you cannot break it by typing.

A new fixture looks like this:

```json
{
  "date": "14 Sep 26",
  "kick": "11:00",
  "home": "Sue's Angels FC",
  "away": "Opponent FC",
  "competition": "League Eight",
  "venue": "The Reeves Sports Club",
  "kind": "fixture"
}
```

- **Key**: something unique and readable, e.g. `f20260914-opponent`.
- **date**: `D MMM YY`, e.g. `14 Sep 26`.
- **kind**: `fixture` until it has been played.

Save, and it appears immediately on the fixtures page and in the home page next-match card, countdown included.

---

## 4. Entering a result

**Results and reports → Add match** (or Edit an existing one).

Turn a fixture into a result by setting `kind` and the score:

```json
{
  "kind": "score",
  "hs": 3,
  "as": 1,
  "starters": [{ "num": 28, "positions": ["GK"] }, { "num": 2, "positions": ["LB"] }],
  "bench": [{ "num": 7, "positions": ["ST"] }],
  "goals": [{ "num": 9, "type": "open", "minute": "23", "penalty": false }],
  "assists": [{ "num": 11, "minute": "23", "source": "open" }],
  "yellowCards": [],
  "redCards": [],
  "motm": 9,
  "captain": 25,
  "formation": "4-3-3",
  "commentary": "How the game went, in plain paragraphs."
}
```

- `hs`/`as` are **home** and **away** score, in that order, whichever side we are.
- `num` is always the player's squad number.
- `motm` and `captain` are squad numbers.
- Leave `minute` as `""` if you did not record it. The site will list the event without inventing a time.

### Three kinds of result

| Situation | Set `kind` to | What happens |
|---|---|---|
| Normal game | `score` | counts as played, goals count |
| Opposition could not field a side | `walkover` | counts as played and won, 3 points, **no goals added** — this is how the official league table treats it |
| Cup tie settled on penalties | `penalty` | `hs`/`as` is the normal-time score; the site says "decided on penalties" and does not claim a winner unless you record one |

Every statistic across the whole website — appearances, goals, assists, clean sheets, records, the campaign gauges — recomputes from what you enter here. You never update a number in two places.

---

## 5. Writing an article

**News → New article.**

```json
{
  "id": "art-2026-09-14",
  "title": "Angels open League Eight with a win",
  "cat": "News",
  "date": "14 Sep 2026",
  "lede": "One or two sentences that appear on the news card.",
  "body": "Full article.\n\nBlank line between paragraphs.",
  "cover": ""
}
```

- `cat` is one of `News`, `Club`, `Match report`.
- `body`: separate paragraphs with a blank line.
- `cover`: a full image URL, or leave empty for the crest placeholder.

Articles get their own page at `/news/<title-slug>.html` with correct social share tags.

---

## 6. Photographs

**Gallery and video → New album.**

```json
{
  "title": "Sue's Angels 3-1 Opponent · League Eight · 14 September 2026",
  "category": "Matchday",
  "photos": ["https://…/photo-1.jpg", "https://…/photo-2.jpg"],
  "cover": "https://…/photo-1.jpg",
  "tags": ["Player Name", "Another Player"],
  "photographer": "Name"
}
```

Photographs live in the Supabase `gallery` storage bucket. Upload there, then paste the public URLs. Each album gets its own page with a keyboard-navigable lightbox, and matchday albums are linked automatically from the matching match page.

---

## 7. Reading enquiries

**Inbox.** Two tabs: enquiries from the contact, join and sponsorship forms, and newsletter subscribers.

- Search filters as you type.
- **Export CSV** for either list.
- **Delete** removes a record permanently — use it to honour an erasure request.

Nobody without an `admin_users` row can read this, including anonymous visitors. If the tab says to sign in as an administrator, that is the privacy policy working.

---

## 8. Backups

**Settings → Download full backup** saves every content table as one JSON file. Do this before any bulk change.

To restore, paste a record's `data` back into the matching editor. For a full restore, the JSON maps one-to-one onto the tables.

---

## 9. What is not editable here, and why

Some things are in the code rather than the database, on purpose:

- **Club name, contact address, venue, social links** — they change once every few years, and shipping them as static HTML keeps pages fast and indexable.
- **Partner logos** — a sponsor mark is a contractual asset, and it ships as an optimised static file so it loads instantly.
- **Sepsis awareness copy** — medical guidance should not be casually editable. Changing it should be a considered change with a record of who changed it.
- **The sponsorship packages** — no prices are published anywhere, deliberately.

Any of these is a small code change plus `npm run build`.

---

## 10. If something looks wrong

| Symptom | Cause | Fix |
|---|---|---|
| Saves are refused | Your account has no `admin_users` row | Section 1 |
| A change is not on the website | Browser cache | Hard refresh, or open a private window |
| Home page says "to be confirmed" | No rows in `fixtures` | Section 3 |
| Inbox says sign in as an administrator | Working as designed | Section 1 |
| A statistic looks wrong | It is derived from match records | Fix the match record; every page follows |
| A page is blank | A script error | The site is built to work without JavaScript, so report it |

---

## 11. Emergency rollback

If a deploy causes a problem:

1. Vercel dashboard → project **sue-angels-fc-b469** → Deployments.
2. Find the last good production deployment.
3. **Promote to Production**.

That reverts the website instantly. It does not touch the database, so content entered in the control panel is unaffected.

To roll back the database security migration: run `migrations/003_rollback_admin_role.sql`. It leaves the administrator roster and the audit history intact.
