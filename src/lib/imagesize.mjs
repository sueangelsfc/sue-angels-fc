/* ==========================================================================
   INTRINSIC IMAGE DIMENSIONS, READ FROM THE FILE

   Why this exists rather than numbers typed into a template:

   The four sponsor logos were rendered with a hard-coded width="118"
   height="36" for all of them, and their real shapes are 447x187, 155x37,
   133x148 and 165x191. A declared aspect ratio that is WRONG is worse than
   none at all: the browser reserves a box of the wrong shape, and the layout
   shifts anyway when the real image arrives. Meanwhile a second render of the
   same four logos carried no dimensions at all.

   The generator already has the files on disk, so it can just look. That
   cannot drift from the asset the way a typed number does, and a logo swapped
   for one with a different shape is correct on the next build with no edit.

   Header parsing only: a few dozen bytes per file, no image decode and no
   dependency. Returns null for anything it does not recognise, and callers
   fall back to emitting no dimensions, which is the status quo rather than a
   regression.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';

const cache = new Map();

function png(b) {
  /* IHDR is always the first chunk: 8-byte signature, 4-byte length, 4-byte
     type, then width and height as big-endian uint32. */
  if (b.length < 24) return null;
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

function webp(b) {
  if (b.length < 30) return null;
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    /* Canvas size is stored minus one, as two 24-bit little-endian values. */
    return { w: (b.readUIntLE(24, 3) + 1), h: (b.readUIntLE(27, 3) + 1) };
  }
  if (chunk === 'VP8 ') {
    /* Lossy: a 3-byte start code, then 14-bit width and height. */
    return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    /* Lossless: 14 bits of width-1 then 14 bits of height-1, bit-packed
       little-endian after the one-byte signature. */
    const bits = b.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

function jpeg(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1];
    /* SOF0-SOF15, excluding the four that are not frame headers. */
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

function svg(text) {
  const vb = text.match(/viewBox\s*=\s*"[\s\d.+-]*?([\d.]+)[\s,]+([\d.]+)\s*"/i);
  if (vb) return { w: Math.round(Number(vb[1])), h: Math.round(Number(vb[2])) };
  const w = text.match(/\bwidth\s*=\s*"([\d.]+)/i);
  const h = text.match(/\bheight\s*=\s*"([\d.]+)/i);
  if (w && h) return { w: Math.round(Number(w[1])), h: Math.round(Number(h[1])) };
  return null;
}

/* `src` is a site-absolute path as it appears in the markup ("/assets/..."). */
export function imageSize(src, root = process.cwd()) {
  const key = String(src || '');
  if (cache.has(key)) return cache.get(key);
  let out = null;
  try {
    const file = path.join(root, key.replace(/^\//, '').split('?')[0]);
    if (/\.svg$/i.test(file)) {
      out = svg(fs.readFileSync(file, 'utf8'));
    } else {
      const fd = fs.openSync(file, 'r');
      const b = Buffer.alloc(65536);
      const read = fs.readSync(fd, b, 0, 65536, 0);
      fs.closeSync(fd);
      const head = b.subarray(0, read);
      out = png(head) || webp(head) || jpeg(head);
    }
  } catch { out = null; }
  if (out && (!out.w || !out.h || out.w > 30000 || out.h > 30000)) out = null;
  cache.set(key, out);
  return out;
}

/* ` width="447" height="187"` ready to drop into a tag, or '' when unknown so
   the markup is exactly what it was before rather than carrying a guess. */
export function sizeAttrs(src, root = process.cwd()) {
  const s = imageSize(src, root);
  return s ? ` width="${s.w}" height="${s.h}"` : '';
}
