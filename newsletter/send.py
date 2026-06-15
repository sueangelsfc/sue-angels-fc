# newsletter/send.py
# Emails the month's newsletter to the supporters who signed up, via MailerLite.
# It does NOT attach the PDF (bad for deliverability); it sends a clean branded
# email with a button linking to the published PDF on the website.
#
# Requires these environment variables (set as GitHub repo Secrets):
#   MAILERLITE_API_KEY   - your MailerLite API token (required; without it this
#                          script no-ops so nothing is ever sent by accident)
#   MAILERLITE_GROUP_ID  - the group/segment of supporters to send to (optional;
#                          if omitted, MailerLite sends to your whole list)
#   MAILERLITE_FROM      - a verified sender address in MailerLite (e.g.
#                          news@suesangelsfc.co.uk). Defaults below.
#   SEND_MODE            - "send" (default) to send immediately, or "draft" to
#                          only create a draft campaign for you to review + send.

import os, json, datetime, urllib.request, urllib.error

KEY     = os.environ.get("MAILERLITE_API_KEY")
GROUP   = os.environ.get("MAILERLITE_GROUP_ID")
FROM    = os.environ.get("MAILERLITE_FROM", "news@suesangelsfc.co.uk")
MODE    = os.environ.get("SEND_MODE", "send").lower()
PDF_URL = "https://www.suesangelsfc.co.uk/newsletter/sue-angels-newsletter-latest.pdf"

if not KEY:
    print("MAILERLITE_API_KEY not set - skipping send (nothing emailed).")
    raise SystemExit(0)

month   = datetime.datetime.utcnow().strftime("%B %Y")
subject = "Sue's Angels FC - The Newsletter - %s" % month

html = """<!doctype html><html><body style="margin:0;background:#0A0F1C;font-family:Arial,Helvetica,sans-serif;color:#D9E0EE">
<div style="max-width:560px;margin:0 auto;padding:34px 28px">
  <div style="font:700 12px Arial,sans-serif;letter-spacing:2.5px;color:#D6F23A">SUE'S ANGELS FC &middot; THE NEWSLETTER</div>
  <h1 style="font-size:30px;line-height:1.15;color:#ffffff;margin:14px 0 6px">This month's issue is here.</h1>
  <p style="font-size:15px;line-height:1.65;color:#C9D2E2;margin:0 0 6px">The latest from the Angels: club news, the season in numbers, what comes next, the cause behind the badge, and a few minutes of fun for the supporters.</p>
  <p style="font-size:15px;line-height:1.65;color:#C9D2E2;margin:0">In her name.</p>
  <a href="%s" style="display:inline-block;margin:22px 0;background:#D6F23A;color:#0A0F1C;text-decoration:none;font:700 15px Arial,sans-serif;padding:14px 24px;border-radius:26px">Read the newsletter &rsaquo;</a>
  <hr style="border:0;border-top:1px solid #222E45;margin:24px 0 14px">
  <p style="font-size:12px;line-height:1.6;color:#6E7A92;margin:0">Sue's Angels FC &middot; in memory of Susan Anne Martin<br>What we do in life echoes in eternity &middot; suesangelsfc.co.uk</p>
</div></body></html>""" % PDF_URL

def api(method, path, body=None):
    req = urllib.request.Request(
        "https://connect.mailerlite.com/api" + path, method=method,
        headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json", "Accept": "application/json"},
        data=json.dumps(body).encode() if body is not None else None)
    try:
        return json.load(urllib.request.urlopen(req, timeout=40))
    except urllib.error.HTTPError as e:
        print("MailerLite error", e.code, e.read().decode()[:400]); raise

campaign = {
    "name": subject,
    "type": "regular",
    "emails": [{"subject": subject, "from_name": "Sue's Angels FC", "from": FROM, "content": html}],
}
if GROUP:
    campaign["groups"] = [GROUP]

res = api("POST", "/campaigns", campaign)
cid = (res.get("data") or {}).get("id")
print("Campaign created:", cid)

if MODE == "draft":
    print("SEND_MODE=draft - campaign left as a draft for review in MailerLite.")
else:
    out = api("POST", "/campaigns/%s/schedule" % cid, {"delivery": "instant"})
    print("Sent to subscribers:", json.dumps(out)[:300])
