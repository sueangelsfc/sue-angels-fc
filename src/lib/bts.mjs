/* ==========================================================================
   BEHIND THE SCENES

   The clips that are not football: the dressing room, the coach, the warm-up,
   whatever somebody filmed on the way to a pitch. Match footage and goals are
   a different thing and stay on /videos.html against the match they belong to.

   TWO KINDS OF CLIP, AND THE RECORD SAYS WHICH BY WHAT IT CARRIES.

   - `src` is a file the club uploaded, and it PLAYS ON THE SITE. Supabase
     storage, or /assets/video for anything short enough to be worth
     committing. Nowhere else: a third-party address would be a request to
     somebody else on every page view, and `media-src` would block it anyway
     and leave a dead player.
   - `instagram` alone is a post we LINK TO. The card is a poster and a
     caption, pressing it opens Instagram, and nothing is embedded - an
     Instagram embed needs their script, which is a third party, a policy
     entry and the cookie banner, for a clip the club already has the file of.
   - Both is allowed and is the usual case: it plays here and says where it
     was posted.

   A CLIP WITH NEITHER IS NOT PUBLISHED. There is nothing to show and nothing
   to press, and a card that does nothing reads as a bug.
   ========================================================================== */
import { readFileSync } from 'node:fs';

const RUNTIME = JSON.parse(readFileSync(new URL('../data/runtime.json', import.meta.url), 'utf8'));
const STORAGE = `${RUNTIME.supabase.url}/storage/v1/object/public/`;

/* Our own, by the same rule the article markers use. */
const ourFile = (u, exts) => {
  const s = String(u || '').replace(/#.*$/, '');
  if (!s) return '';
  if (s.startsWith(STORAGE)) return /^[\w\-./%]+$/.test(s.slice(STORAGE.length)) ? s : '';
  return new RegExp(`^/assets/[\\w\\-./]+\\.(?:${exts})$`, 'i').test(s) ? s : '';
};

const INSTAGRAM = /^https:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\/[\w-]+\/?$/;

/* Seconds as a reader says them. 95 is "1:35", not "95 seconds". */
export const clipLength = (n) => (Number.isFinite(n) && n > 0
  ? `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, '0')}` : '');

export function behindTheScenes(file) {
  const rows = (file && file.clips) || [];
  return rows.map((c) => {
    const src = ourFile(c.src, 'mp4|webm');
    const poster = ourFile(c.poster, 'jpe?g|png|webp');
    const insta = INSTAGRAM.test(String(c.instagram || '')) ? c.instagram : '';
    if (!src && !insta) return null;
    return {
      id: c.id || '',
      title: String(c.title || '').trim(),
      note: String(c.note || '').trim(),
      date: c.date || '',
      src,
      poster,
      insta,
      /* The space the card holds while it loads. A clip filmed on a phone is
         almost always upright, so that is the default rather than 16:9 - a
         wrong guess here is a page that jumps once every clip has loaded. */
      w: Number(c.w) > 0 ? Number(c.w) : 1080,
      h: Number(c.h) > 0 ? Number(c.h) : 1920,
      length: clipLength(Number(c.seconds)),
    };
  }).filter(Boolean)
    /* Newest first, and a clip with no date sorts last rather than to 1970. */
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}
