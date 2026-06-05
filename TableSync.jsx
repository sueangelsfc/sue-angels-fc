// TableSync.jsx — hourly auto-fetch of the FA Fulltime league table.
//
// IMPORTANT — CORS LIMITATION:
// FA Fulltime (https://fulltime.thefa.com) does NOT serve a public JSON API
// and does NOT set CORS headers, so a browser cannot fetch their page
// directly from this domain. We work around it with a public read-only CORS
// proxy (allorigins.win) as a best-effort. The proxy occasionally rate-limits
// or goes down — when it does, we fall back to the hardcoded RAW_TABLE.
//
// FOR PRODUCTION (Wix Studio): replace `PROXIED_URL` with a Wix backend
// function (corvid web module) that performs the fetch server-side. That
// removes the proxy dependency and lets you parse the HTML on your own
// infrastructure on a one-hour Wix scheduled job.

// IMPORTANT — TWO MODES:
//
// (1) PRODUCTION (Wix Studio):
//   - Deploy wix-backend/ to your Wix site (see wix-backend/README.md).
//   - Then set FULLTIME_URL below to: '/_functions/leagueTable'
//   - The site reads from your Wix backend, which fetches FA Fulltime server-side every hour.
//   - No CORS issues, no third-party proxy.
//
// (2) PREVIEW (this design environment):
//   - We use a public read-only CORS proxy (allorigins.win) as a best-effort.
//   - Can rate-limit; falls back to cached or hardcoded data when unavailable.
//
// Flip the comment block below to switch modes.

const FULLTIME_URL =
  'https://fulltime.thefa.com/table.html?league=3545957&selectedSeason=965423047&selectedDivision=756552473&selectedCompetition=0&selectedFixtureGroupKey=1_636836036';
const USE_WIX_BACKEND = false;  // <-- flip to true after deploying wix-backend/
const PROXIED_URL = USE_WIX_BACKEND
  ? '/_functions/leagueTable'
  : 'https://api.allorigins.win/get?url=' + encodeURIComponent(FULLTIME_URL);
const CACHE_KEY = 'sa-table-cache';
const REFRESH_MS = 60 * 60 * 1000;  // 1 hour
const STALE_MS   = 24 * 60 * 60 * 1000; // 1 day max before falling back

// Parse the HTML returned by FA Fulltime. The table on that page has a
// standard `<table class="leagueTable">` with one row per club. We pull
// position/name/played/won/drawn/lost/goalsFor/goalsAgainst/diff/points.
function parseFulltimeHtml(html) {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // FA Fulltime markup uses several possible class names — try a few.
    const table = doc.querySelector('table.standings, table.leagueTable, table.fixturesAndResults, table[summary*="standings" i]')
              || Array.from(doc.querySelectorAll('table')).find((t) => /pos|points/i.test(t.textContent || ''));
    if (!table) return null;
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    if (!rows.length) return null;
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('td')).map((td) => (td.textContent || '').trim());
      if (cells.length < 8) continue;
      // Typical column order: pos, team, played, won, drawn, lost, gf, ga, gd, pts
      // Some skins drop the GD column. Detect via header length.
      const pos = parseInt(cells[0], 10);
      const club = cells[1];
      const pl = parseInt(cells[2], 10);
      const w = parseInt(cells[3], 10);
      const d = parseInt(cells[4], 10);
      const l = parseInt(cells[5], 10);
      const gf = parseInt(cells[6], 10);
      const ga = parseInt(cells[7], 10);
      let gd, pts;
      if (cells.length >= 10) { gd = cells[8]; pts = parseInt(cells[9], 10); }
      else { gd = String(gf - ga); pts = parseInt(cells[8], 10); }
      if (Number.isNaN(pos) || !club || Number.isNaN(pts)) continue;
      out.push({
        p: pos, c: club, pl, w, d, l, gf, ga,
        gd: typeof gd === 'string' ? (gd.startsWith('-') ? gd : (gf >= ga ? '+' + (gf - ga) : String(gf - ga))) : gd,
        pts,
        us: /sue.?s angels/i.test(club),
      });
    }
    return out.length ? out : null;
  } catch (e) { return null; }
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { return null; }
}
function writeCache(rows) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ rows, at: Date.now() })); } catch (e) {}
}

async function fetchOnce() {
  try {
    const res = await fetch(PROXIED_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    if (USE_WIX_BACKEND) {
      // Wix backend returns { rows, syncedAt } directly.
      const json = await res.json();
      if (json && Array.isArray(json.rows) && json.rows.length) {
        writeCache(json.rows);
        return json.rows;
      }
      return null;
    }
    // CORS proxy returns { contents: '<raw html>' }
    const json = await res.json();
    const html = (json && json.contents) || '';
    const rows = parseFulltimeHtml(html);
    if (rows) { writeCache(rows); return rows; }
    return null;
  } catch (e) {
    return null;
  }
}

// Boot: install a refresh loop. On first call, immediately try the network;
// thereafter run once an hour. Cache always primes window.RAW_TABLE so the
// fallback table shows even before the first response.
window.startTableSync = function () {
  if (window.__sa_tableSyncStarted) return;
  window.__sa_tableSyncStarted = true;

  const cache = readCache();
  if (cache && cache.rows && (Date.now() - cache.at) < STALE_MS) {
    window.RAW_TABLE = cache.rows;
    window.dispatchEvent(new CustomEvent('sa-table-updated'));
  }
  const run = async () => {
    const fresh = await fetchOnce();
    if (fresh) {
      window.RAW_TABLE = fresh;
      window.dispatchEvent(new CustomEvent('sa-table-updated'));
    }
  };
  run();
  setInterval(run, REFRESH_MS);
};

// React hook — returns the current RAW_TABLE and re-renders on sa-table-updated.
window.useLeagueTable = function () {
  const [table, setTable] = React.useState(window.RAW_TABLE);
  React.useEffect(() => {
    const onUpdate = () => setTable(window.RAW_TABLE);
    window.addEventListener('sa-table-updated', onUpdate);
    if (window.startTableSync) window.startTableSync();
    return () => window.removeEventListener('sa-table-updated', onUpdate);
  }, []);
  return table;
};

// Boot on load.
if (typeof window !== 'undefined') {
  setTimeout(() => window.startTableSync && window.startTableSync(), 800);
}
