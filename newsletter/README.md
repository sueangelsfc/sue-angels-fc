# The Newsletter — automated monthly

This folder builds **Sue's Angels FC · The Newsletter** as a PDF and emails it to
your supporters, automatically, on the **15th of every month**.

## What runs, and when
`.github/workflows/newsletter.yml` runs at **08:00 UTC on the 15th** (and can be
run by hand from the repo's **Actions** tab). Each run:

1. **Builds the PDF** (`newsletter/build.py`) — converts the brand fonts, grades
   the photos, and pulls the **latest club news straight from your Supabase**, so
   the Club News page fills itself each month. Output: `sue-angels-newsletter-latest.pdf`.
2. **Publishes it** — commits the PDF, which Vercel serves at
   `https://www.suesangelsfc.co.uk/newsletter/sue-angels-newsletter-latest.pdf`.
3. **Emails your supporters** (`newsletter/send.py`) — sends a clean branded email
   via **MailerLite** with a "Read the newsletter" button linking to that PDF.

## To switch it on (one time)
1. **MailerLite** — have an account with a **verified sender** (e.g.
   `news@suesangelsfc.co.uk`) and your supporters in a group.
2. In GitHub → repo **Settings → Secrets and variables → Actions → Secrets**, add:
   - `MAILERLITE_API_KEY` — your MailerLite API token (**required**).
   - `MAILERLITE_GROUP_ID` — the supporters group to send to (optional; omit to send to everyone).
   - `MAILERLITE_FROM` — your verified sender address.
3. (Optional) Under **Variables**, add `NEWSLETTER_SEND_MODE` = `draft` if you'd
   rather it create a draft for you to review instead of sending automatically.
   Leave it unset to send.

That's it. Until `MAILERLITE_API_KEY` is set, the build + publish still run, but
nothing is emailed — so it's safe to leave on.

## To preview locally
```
pip install reportlab pillow fonttools brotli
python newsletter/build.py     # writes newsletter/sue-angels-newsletter-latest.pdf
```

## What updates by itself vs what's a template
- **Updates automatically:** the issue date, the Club News page (latest articles),
  and the link supporters receive.
- **Template (edit when you want):** the season feature, the stat figures and top
  scorers, and the fixtures/key dates live in `newsletter/build.py`. Update the
  season's numbers once and every issue uses them. (These can be wired to compute
  live from results later.)
