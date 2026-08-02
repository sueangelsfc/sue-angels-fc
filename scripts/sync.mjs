#!/usr/bin/env node
/* ==========================================================================
   PULL THE DATABASE INTO THE BUILD

     npm run sync

   THE MISSING LINK. The control panel writes to Supabase. The generator
   reads src/data/recovered-live.json, which is a snapshot of exactly those
   seven tables. Nothing connected the two, so every save made in the panel
   went into the database and never reached the website: the fixtures, the
   match videos, the photo tags, the lot. The panel appeared to work and the
   site never moved.

   This is that connection. It reads the seven content tables and rewrites
   the snapshot, so the pipeline is:

     control panel -> Supabase -> npm run sync -> npm run build -> deploy

   Reads only, and only the tables that are public anyway, so it needs no
   secret: the anon key in src/data/runtime.json is enough. Nothing here can
   write to the database.

   `player_photos` is two tables sharing one name: base64 photographs, whose
   size is all the generator needs, and small structured records the control
   panel writes and the website reads. The photographs are reduced to
   {key, kind, bytes}; everything else is kept whole. See the block below.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SNAP = path.join(ROOT, 'src', 'data', 'recovered-live.json');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'runtime.json'), 'utf8')).supabase;

const TABLES = ['matches', 'fixtures', 'team_badges', 'articles', 'gallery', 'recognition'];

async function table(name, select) {
  const url = `${cfg.url}/rest/v1/${name}?select=${select}&order=key.asc`;
  const res = await fetch(url, { headers: { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}` } });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

const before = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
const next = { ...before };

let changed = 0;
for (const t of TABLES) {
  const rows = await table(t, 'key,data,updated_at');
  const was = (before[t] || []).length;
  next[t] = rows;
  const delta = rows.length - was;
  /* Row count alone misses an edit to an existing row, so compare content. */
  const same = JSON.stringify(before[t] || []) === JSON.stringify(rows);
  if (!same) changed++;
  console.log(`  ${t.padEnd(14)}${String(rows.length).padStart(4)} rows`
    + `${delta ? ` (${delta > 0 ? '+' : ''}${delta})` : ''}`
    + `${same ? '' : '   CHANGED'}`);
}

/* `player_photos` is two different tables sharing one name. Most of it is
   base64 photographs, megabytes of payload the generator needs only the SIZE
   of. The rest is small structured records the control panel writes and the
   website reads: roster:status (who is active, retained, retired, departed or
   now coaching), roster:s2627 (players added since the recovery), roster:coaches,
   coach:*, sponsor:* and donate:config.

   Skipping the whole table to avoid the photographs is what kept those records
   out of the build: the panel could change a player's status all it liked and
   the website went on showing the code baseline. So the photographs are
   reduced to their size, as before, and everything else is kept whole. */
{
  const rows = await table('player_photos', 'key,data,updated_at');
  const isPhoto = (r) => typeof r.data === 'string' && r.data.indexOf('data:image') === 0;
  const photos = rows.filter(isPhoto);
  const records = rows.filter((r) => !isPhoto(r));
  next.player_photos = [
    ...photos.map((r) => ({
      key: r.key,
      kind: typeof r.data === 'string' ? 'string' : (r.data && r.data.dataUrl ? 'dataUrl' : 'object'),
      bytes: JSON.stringify(r.data ?? '').length,
    })),
    ...records.map((r) => ({ key: r.key, data: r.data, updated_at: r.updated_at })),
  ].sort((a, b) => String(a.key).localeCompare(String(b.key)));
  const same = JSON.stringify(before.player_photos || []) === JSON.stringify(next.player_photos);
  if (!same) changed++;
  console.log(`  player_photos ${String(rows.length).padStart(4)} rows`
    + `   ${photos.length} photographs (size only), ${records.length} records`
    + `${same ? '' : '   CHANGED'}`);
}

if (!changed) {
  console.log('\nNothing changed. The site already reflects the database.');
  process.exit(0);
}

/* Two spaces, trailing newline: the file is committed, so a formatting change
   would show as a diff on every row and bury the real one. */
fs.writeFileSync(SNAP, `${JSON.stringify(next, null, 2)}\n`);
console.log(`\n${changed} table(s) changed. Snapshot rewritten.`);
console.log('Now run: npm run build && npm run verify && npm test');
