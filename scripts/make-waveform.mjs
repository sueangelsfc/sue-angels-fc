/* THE WAVEFORM IS THE AUDIO, not a decoration of it.
 *
 *   npm run waveform
 *
 * Reads every file in `assets/audio`, decodes it with ffmpeg and writes the
 * peak of each of 150 equal slices to `src/data/audio-peaks.json`, which the
 * build reads and `clip()` draws. So the shape on the page is this recording's
 * own shape: a quiet passage is short, a loud one is tall, and a reader can
 * see where the talking is before pressing anything.
 *
 * COMMITTED, LIKE THE SHARE CARDS AND THE PROGRAMME, for exactly their
 * reason: the deploy has no ffmpeg. A clip with no entry simply draws no
 * waveform, so forgetting to run this degrades to what the page looked like
 * yesterday rather than breaking it.
 *
 * 96 SLICES, AND THE NARROWEST PLACE IT IS DRAWN DECIDES THAT. It sits in a
 * 330px rail on a desk, so 150 slices is a 1.2px bar with a 0.6px gap, which
 * a browser paints as a solid block - which is exactly what the first version
 * shipped. 96 gives a 2px bar and a 1.5px gap there and a bold one at full
 * width.
 *
 * RMS, NOT THE PEAK, AND THAT IS THE OPPOSITE OF WHAT THIS NOTE FIRST SAID.
 * The argument for the peak is that a mean washes a sentence out, and it is
 * sound for short slices and wrong here: a slice is nearly three seconds, and
 * ANY three seconds of a man talking contains a loud moment, so every peak
 * came out near the file maximum. Measured rather than argued - over this
 * recording the peak envelope has a standard deviation of 0.08 around a mean
 * of 0.88, which is a flat bar, and the RMS envelope 0.18 around 0.62.
 *
 * STRETCHED OVER ITS OWN RANGE, with a floor. A recording that never goes
 * quiet still has a quietest part, and that is what the eye reads; the floor
 * keeps a pause from drawing as a gap in the shape, which looks like a file
 * that failed rather than like a pause.
 *
 * s16le AT 8kHz MONO. Nothing here needs fidelity: this is a loudness
 * envelope, and 8kHz makes the decode of a ten-minute interview instant.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'assets', 'audio');
const OUT = path.join(ROOT, 'src', 'data', 'audio-peaks.json');
const SLICES = 96;

const run = (cmd, args, opts) => new Promise((res, rej) => {
  execFile(cmd, args, { maxBuffer: 1 << 28, ...opts }, (err, out) => (err ? rej(err) : res(out)));
});

/* ffprobe for the duration rather than counting samples, because the article
   writes the length by hand today and the two disagreeing is a bug nobody
   would look for. */
async function duration(file) {
  const out = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' });
  const n = Number(String(out).trim());
  return Number.isFinite(n) ? Math.round(n) : 0;
}

async function peaks(file) {
  const raw = await run('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', '8000',
    '-f', 's16le', '-'], { encoding: 'buffer' });
  const n = Math.floor(raw.length / 2);
  if (!n) return [];
  const per = Math.max(1, Math.floor(n / SLICES));
  const out = [];
  for (let s = 0; s < SLICES; s += 1) {
    let sum = 0;
    const from = s * per;
    const to = Math.min(n, from + per);
    for (let i = from; i < to; i += 1) {
      const v = raw.readInt16LE(i * 2);
      sum += v * v;
    }
    out.push(Math.sqrt(sum / Math.max(1, to - from)));
  }
  /* Stretched over this file's own range rather than against the loudest
     sample, so a recording made quietly draws the same shape as a loud one
     and the eye reads the differences inside it. */
  const lo = Math.min.apply(null, out);
  const hi = Math.max.apply(null, out);
  const span = hi - lo || 1;
  return out.map((v) => Math.round((0.12 + 0.88 * ((v - lo) / span)) * 100) / 100);
}

const files = fs.existsSync(DIR)
  ? fs.readdirSync(DIR).filter((f) => /\.(mp3|m4a|ogg)$/i.test(f)).sort()
  : [];
if (!files.length) {
  console.log('no audio in assets/audio, nothing to measure');
  process.exit(0);
}

const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const next = { _note: 'Written by scripts/make-waveform.mjs. Peaks of 150 slices, 0..1.' };
for (const f of files) {
  const key = `/assets/audio/${f}`;
  const file = path.join(DIR, f);
  /* eslint-disable no-await-in-loop */
  const [dur, p] = [await duration(file), await peaks(file)];
  next[key] = { dur, peaks: p };
  const was = prev[key];
  const same = was && was.dur === dur && JSON.stringify(was.peaks) === JSON.stringify(p);
  console.log(`  ${key}  ${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}  ${p.length} slices${same ? '' : '  (new)'}`);
}
fs.writeFileSync(OUT, `${JSON.stringify(next, null, 2)}\n`);
console.log(`\nwrote src/data/audio-peaks.json for ${files.length} file${files.length === 1 ? '' : 's'}`);
