// FixtureEntry.jsx, admin-only "+ ADD FIXTURE" launcher.
//
// User-facing flow:
//   1. Visitor sees nothing, entire component returns null without admin mode.
//   2. Admin (window.useAdmin === true) sees a volt "+ ADD FIXTURE" pill at the
//      top of the Fixtures page (and on the Schedule page's Upcoming tab).
//   3. Clicking opens a slim form: Opponent, Date, Kick-off, Venue, Location,
//      Competition + (if cup) Round.
//   4. Saving writes the new fixture to localStorage under 'sa-fixtures-admin'
//      and dispatches `sa-fixtures-changed` so all live components re-render.
//   5. Admin-added fixtures merge with window.UPCOMING_FIXTURES via the
//      `getMergedUpcoming()` helper exposed here (PageShell's getActiveUpcoming
//      reads from it when defined).
//
// Storage shape (sa-fixtures-admin):
//   [ { id, date, day, mon, kick, home, away, ven, comp, loc, round?, year? }, ... ]
//
// Notes:
// - id is auto-derived: `f<YYYYMMDD>-<opp-slug>`.
// - We always store one of home/away as "Sue's Angels FC" so the join code
//   in Hero/FixturesPage works without special-casing.
// - "loc" is the human label ("Home" / "Away"), used by the location filter.

// ────────────────────────────────────────────────────────────────────────────
// Team badge upload helpers, store admin-uploaded opponent badges keyed by
// the slug of their full club name. Sue's Angels FC always uses the existing
// asset, never the admin store. resolveBadge is patched to prefer admin
// entries when present.
// ────────────────────────────────────────────────────────────────────────────
const TEAM_BADGE_KEY = 'sa-team-badges';

function loadTeamBadges() {
  try {
    const raw = localStorage.getItem(TEAM_BADGE_KEY);
    return raw ? (JSON.parse(raw) || {}) : {};
  } catch (e) { return {}; }
}
function saveTeamBadges(obj) {
  try {
    localStorage.setItem(TEAM_BADGE_KEY, JSON.stringify(obj || {}));
    window.dispatchEvent(new CustomEvent('sa-team-badges-changed'));
  } catch (e) {}
}
window.getTeamBadges = loadTeamBadges;

// One-time cleanup: some opponent badges were uploaded from source images that
// had a baked-in (white/black) background, so they render boxy. For clubs that
// now have a clean transparent crest in /assets/badge, repoint the stored entry
// at that file so it shows with no background everywhere. Runs once per browser.
(function fixBoxedOpponentBadges() {
  try {
    if (localStorage.getItem('sa-badgefix-1')) return;
    var CLEAN = [
      { key: 'brentford', src: 'assets/badge/brentford-town-badge.webp', alt: 'Brentford Town' },
      { key: 'galactico', src: 'assets/badge/galacticos-elect-badge.webp', alt: 'Galacticos Elect' }
    ];
    var stored = loadTeamBadges();
    var changed = false;
    Object.keys(stored).forEach(function (name) {
      var s = name.toLowerCase();
      var hit = CLEAN.find(function (c) { return s.indexOf(c.key) >= 0; });
      if (hit) { stored[name] = { src: hit.src, alt: hit.alt, aspect: 'circle' }; changed = true; }
    });
    if (changed) saveTeamBadges(stored);
    localStorage.setItem('sa-badgefix-1', '1');
  } catch (e) {}
})();

// Patch resolveBadge so it checks the admin store BEFORE the hardcoded
// registry. Match by simple slug substring so a small naming variation
// still resolves.
(function patchResolveBadge() {
  const original = window.resolveBadge;
  if (!original) return;
  window.resolveBadge = function (team) {
    if (!team) return original(team);
    const stored = loadTeamBadges();
    const t = team.toLowerCase().trim();
    // Sue's Angels is always the hardcoded shield (don't let admin override us).
    if (t.includes('angels')) return original(team);
    // Try admin store: exact name match → slug substring match.
    if (stored[team]) return stored[team];
    for (const [name, entry] of Object.entries(stored)) {
      const a = name.toLowerCase();
      if (t.includes(a) || a.includes(t)) return entry;
    }
    return original(team);
  };
})();

// Process a picked image → compressed data URL (≤ 360px, jpeg q=0.86).
function processBadgeFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) return reject(new Error('Not an image'));
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 480;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        try { resolve(canvas.toDataURL('image/png')); } catch (e) { reject(e); }
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ADMIN_FX_KEY = 'sa-fixtures-admin';

function loadAdminFixtures() {
  try {
    const raw = localStorage.getItem(ADMIN_FX_KEY);
    return raw ? (JSON.parse(raw) || []) : [];
  } catch (e) { return []; }
}
function saveAdminFixtures(list) {
  try {
    localStorage.setItem(ADMIN_FX_KEY, JSON.stringify(list || []));
    window.dispatchEvent(new CustomEvent('sa-fixtures-changed'));
  } catch (e) {}
}

window.getAdminFixtures = loadAdminFixtures;

// Merge admin-added fixtures with the hardcoded UPCOMING_FIXTURES array,
// deduped by id. Admin entries win when there's a conflict.
window.getMergedUpcoming = function () {
  const hardcoded = (window.UPCOMING_FIXTURES || []);
  const admin = loadAdminFixtures();
  const byId = {};
  for (const f of hardcoded) byId[f.id] = f;
  for (const f of admin) byId[f.id] = f;
  // Sort chronologically by parsed date when available.
  return Object.values(byId).sort((a, b) => {
    const da = window.getFixtureDate ? window.getFixtureDate(a) : null;
    const db = window.getFixtureDate ? window.getFixtureDate(b) : null;
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });
};

// Patch getActiveUpcoming to merge admin fixtures. Runs once on script load.
(function patchActiveUpcoming() {
  const original = window.getActiveUpcoming;
  if (!original) return;
  window.getActiveUpcoming = function (now = new Date()) {
    return window.getMergedUpcoming().filter((fx) => {
      // Stay in fixtures until the kickoff date AND time have passed.
      const kickoff = window.getFixtureKickoff ? window.getFixtureKickoff(fx) : null;
      return !kickoff || now.getTime() < kickoff.getTime();
    });
  };
})();

// Re-render any subscribed component (e.g. FixturesPage, Hero) when fixtures change.
window.useAdminFixtures = function () {
  const [v, setV] = React.useState(loadAdminFixtures());
  React.useEffect(() => {
    const h = () => setV(loadAdminFixtures());
    window.addEventListener('sa-fixtures-changed', h);
    return () => window.removeEventListener('sa-fixtures-changed', h);
  }, []);
  return v;
};

// Slugify an opponent name → "hillside-elite-blues".
function slugify(s) {
  return (s || '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// Pre-canned competition options the admin can pick from (matches the
// COMPETITIONS array on PageShell so saved fixtures auto-categorise).
const COMP_OPTIONS = [
  { label: 'League Ten (League)', value: 'League Ten' },
  { label: 'Dylan Rigobert Trophy', value: 'Dylan Rigobert Trophy' },
  { label: 'Chairman\u2019s Cup',   value: 'Chipotle UK Chairman\u2019s Cup' },
  { label: 'Marcus Lipton Cup',     value: 'Supreme Trophies Marcus Lipton Cup' },
  { label: 'Surrey FA Cup',         value: 'Surrey FA Sunday Lower Junior County Cup' },
  { label: 'Friendly',              value: 'Friendly' },
  { label: 'Other (type below)',    value: '__other' },
];

// Cup-round options (only used when a non-league comp is picked).
const ROUND_OPTIONS = [
  '', '1st Round', '2nd Round', 'Round of 32', 'Last 16',
  'Quarter Final', 'Semi Final', 'Final', 'Replay',
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Build day-of-week label ("Sun") from a YYYY-MM-DD string.
function dayOf(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return '';
  const date = new Date(y, m - 1, d);
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()];
}

// ────────────────────────────────────────────────────────────────────────────
// FixtureAddForm, collapsible form. Hidden until admin clicks "+ ADD FIXTURE".
// ────────────────────────────────────────────────────────────────────────────
function FixtureAddForm({ onClose, editing }) {
  // Initial blank state.
  const [opp, setOpp] = React.useState('');
  const [iso, setIso] = React.useState(''); // YYYY-MM-DD from <input type="date">
  const [kick, setKick] = React.useState('11:00');
  const [ven, setVen] = React.useState('');
  const [loc, setLoc] = React.useState('Home');
  const [compSel, setCompSel] = React.useState('League Ten');
  const [compOther, setCompOther] = React.useState('');
  const [round, setRound] = React.useState('');
  const [seasonSel, setSeasonSel] = React.useState((window.getSeasonState && window.getSeasonState().phase !== 'active' && window.SEASON_INFO) ? window.SEASON_INFO.next.name : (window.CURRENT_SEASON || '25/26'));
  const [dateTBC, setDateTBC] = React.useState(false);
  const [kickTBC, setKickTBC] = React.useState(false);
  const tbcBtn = (on) => ({ marginLeft: 8, fontSize: 10, padding: '2px 8px', borderRadius: 9999, border: '1px solid rgba(214,242,58,0.45)', background: on ? '#D6F23A' : 'transparent', color: on ? '#061A27' : 'inherit', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 });
  React.useEffect(() => {
    if (!editing) return;
    const oppName = (editing.home && editing.home.includes('Angels')) ? editing.away : editing.home;
    setOpp(oppName && oppName !== 'TBC' ? oppName : '');
    setLoc(editing.loc || 'Home');
    setVen(editing.ven && editing.ven !== 'TBC' ? editing.ven : '');
    setKickTBC(editing.kick === 'TBC');
    setKick(editing.kick && editing.kick !== 'TBC' ? editing.kick : '11:00');
    setSeasonSel(editing.season || window.CURRENT_SEASON || '25/26');
    setRound(editing.round || '');
    const known = COMP_OPTIONS.some((o) => o.value === editing.comp);
    if (editing.comp && !known) { setCompSel('__other'); setCompOther(editing.comp); }
    else if (editing.comp) { setCompSel(editing.comp); }
    if (editing.date === 'TBC' || !editing.year) { setDateTBC(true); }
    else { const mi = MONTHS.indexOf(editing.mon); if (mi >= 0) setIso(`${editing.year}-${String(mi + 1).padStart(2, '0')}-${String(parseInt(editing.date, 10)).padStart(2, '0')}`); }
  }, []);
  // Opposition badge (optional). Stored as a data URL when uploaded.
  const [badgeData, setBadgeData] = React.useState(null);
  const [badgeAspect, setBadgeAspect] = React.useState('circle');
  const [badgeBusy, setBadgeBusy] = React.useState(false);
  const badgeInputRef = React.useRef(null);

  const onBadgePick = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setBadgeBusy(true);
    try {
      const dataUrl = await processBadgeFile(f);
      setBadgeData(dataUrl);
    } catch (err) {
      window.alert('Could not load that image. Please try another.');
    } finally {
      setBadgeBusy(false);
      e.target.value = '';
    }
  };

  // Derived: full competition string + isLeague flag.
  const comp = compSel === '__other' ? compOther.trim() : compSel;
  const isLeague = compSel === 'League Ten';

  const canSave = !!comp; // opponent, date, kick-off, venue and location can all be left as TBC

  const save = () => {
    if (!canSave) return;
    const oppName = opp.trim() || 'TBC';
    const hasDate = !dateTBC && !!iso;
    let y = null, m = null, d = null;
    if (hasDate) { [y, m, d] = iso.split('-').map((n) => parseInt(n, 10)); }
    const id = hasDate ? `f${iso.replace(/-/g, '')}-${slugify(oppName)}` : `ftbc-${slugify(oppName)}-${Date.now().toString(36)}`;
    const home = loc === 'Away' ? oppName : "Sue's Angels FC";
    const away = loc === 'Away' ? "Sue's Angels FC" : oppName;
    const fx = {
      id,
      date: hasDate ? String(d).padStart(2, '0') : 'TBC',
      day: hasDate ? dayOf(iso) : 'TBC',
      mon: hasDate ? MONTHS[m - 1] : '',
      year: hasDate ? y : null,
      kick: kickTBC ? 'TBC' : (kick || 'TBC'),
      home, away,
      ven: ven.trim() || 'TBC',
      comp,
      loc,
      season: seasonSel,
    };
    if (!isLeague && round) fx.round = round;

    // Persist the opposition badge alongside, keyed by full opponent name.
    if (badgeData) {
      const badges = loadTeamBadges();
      badges[opp.trim()] = {
        src: badgeData,
        alt: opp.trim(),
        aspect: badgeAspect,
        match: opp.trim().toLowerCase(),
      };
      saveTeamBadges(badges);
    }

    const list = loadAdminFixtures();
    // Replace by id if it already exists, otherwise append.
    const next = list.filter((f) => f.id !== id && (!editing || f.id !== editing.id)).concat(fx);
    saveAdminFixtures(next);
    onClose();
  };

  return (
    <div className="fx-add">
      <div className="fx-add__head">
        <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>NEW FIXTURE</span>
        <button type="button" className="fx-add__close" onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className="fx-add__grid">
        <label className="fx-add__field fx-add__field--wide">
          <span>OPPONENT</span>
          <input
            type="text"
            placeholder="e.g. Hillside Elite FC Blues"
            value={opp}
            onChange={(e) => setOpp(e.target.value)}
            autoFocus
          />
        </label>

        <label className="fx-add__field">
          <span>DATE <button type="button" style={tbcBtn(dateTBC)} onClick={() => setDateTBC((v) => !v)}>TBC</button></span>
          <input type="date" value={dateTBC ? '' : iso} disabled={dateTBC} onChange={(e) => setIso(e.target.value)} style={dateTBC ? { opacity: 0.4 } : null} />
          {dateTBC ? <em className="fx-add__hint">Date to be confirmed</em> : (iso && <em className="fx-add__hint">{dayOf(iso)} {iso.split('-')[2]} {MONTHS[parseInt(iso.split('-')[1], 10) - 1]} {iso.split('-')[0]}</em>)}
        </label>

        <label className="fx-add__field">
          <span>KICK-OFF <button type="button" style={tbcBtn(kickTBC)} onClick={() => setKickTBC((v) => !v)}>TBC</button></span>
          <input type="time" value={kickTBC ? '' : kick} disabled={kickTBC} onChange={(e) => setKick(e.target.value)} style={kickTBC ? { opacity: 0.4 } : null} />
        </label>

        <label className="fx-add__field fx-add__field--wide">
          <span>VENUE</span>
          <input
            type="text"
            placeholder="e.g. The Reeves Sports Club"
            value={ven}
            onChange={(e) => setVen(e.target.value)}
          />
        </label>

        <div className="fx-add__field">
          <span>LOCATION</span>
          <div className="fx-add__seg">
            {['Home', 'Away', 'TBC'].map((l) => (
              <button
                key={l}
                type="button"
                className={`fx-add__seg-btn ${loc === l ? 'is-on' : ''}`}
                onClick={() => setLoc(l)}
              >{l}</button>
            ))}
          </div>
        </div>

        <label className="fx-add__field">
          <span>COMPETITION</span>
          <select value={compSel} onChange={(e) => setCompSel(e.target.value)}>
            {COMP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>

        <label className="fx-add__field">
          <span>SEASON</span>
          <select value={seasonSel} onChange={(e) => setSeasonSel(e.target.value)}>
            {(window.ALL_SEASONS || ['25/26']).map((sx) => <option key={sx} value={sx}>{sx}</option>)}
          </select>
        </label>

        {compSel === '__other' && (
          <label className="fx-add__field fx-add__field--wide">
            <span>COMPETITION NAME</span>
            <input
              type="text"
              placeholder="e.g. Surrey Invitational Cup"
              value={compOther}
              onChange={(e) => setCompOther(e.target.value)}
            />
          </label>
        )}

        {!isLeague && compSel && (
          <label className="fx-add__field">
            <span>ROUND</span>
            <select value={round} onChange={(e) => setRound(e.target.value)}>
              {ROUND_OPTIONS.map((r) => (
                <option key={r} value={r}>{r || '- optional -'}</option>
              ))}
            </select>
          </label>
        )}

        {/* Optional opposition badge upload. Sue's Angels always uses the
            site's existing shield, so admin only needs to set this for the
            opponent. Saved badge resolves on every page that calls TeamBadge. */}
        <div className="fx-add__field fx-add__field--wide">
          <span>OPPOSITION BADGE <em className="fx-add__hint">OPTIONAL</em></span>
          <div className="fx-add__badge">
            <div className="fx-add__badge-preview">
              {badgeData
                ? <img src={badgeData} alt="" className={`fx-add__badge-img fx-add__badge-img--${badgeAspect}`} />
                : <span className="fx-add__badge-empty">No badge yet</span>
              }
            </div>
            <div className="fx-add__badge-controls">
              <input
                ref={badgeInputRef}
                type="file"
                accept="image/*"
                onChange={onBadgePick}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => badgeInputRef.current && badgeInputRef.current.click()}
              >{badgeData ? 'Replace badge' : 'Upload badge'}</button>
              {badgeData && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setBadgeData(null)}>Remove</button>
              )}
              <div className="fx-add__seg fx-add__seg--small">
                {[
                  ['circle', 'Round'],
                  ['shield', 'Shield'],
                ].map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    className={`fx-add__seg-btn ${badgeAspect === k ? 'is-on' : ''}`}
                    onClick={() => setBadgeAspect(k)}
                  >{l}</button>
                ))}
              </div>
              {badgeBusy && <span className="fx-add__hint">Processing…</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="fx-add__actions">
        <button
          type="button"
          className="btn btn--volt btn--sm"
          disabled={!canSave}
          onClick={save}
        >Save fixture</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
        <span className="fx-add__note">
          {canSave ? 'Visible on every fixtures view immediately.' : 'Fill the required fields to save.'}
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// FixtureAdminPanel, wraps the launcher + the form. Admin-only.
// Also renders an "admin fixtures" mini list so the manager can review/remove
// fixtures they've added without touching code.
// ────────────────────────────────────────────────────────────────────────────
function FixtureAdminPanel() {
  const admin = window.useAdmin ? window.useAdmin() : false;
  const adminFx = window.useAdminFixtures ? window.useAdminFixtures() : [];
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  if (!admin) return null;

  const remove = (id) => {
    if (!window.confirm('Remove this fixture?')) return;
    const next = loadAdminFixtures().filter((f) => f.id !== id);
    saveAdminFixtures(next);
  };

  return (
    <div className="fx-admin">
      {!open && (
        <button type="button" className="fx-admin__add btn btn--volt btn--sm" onClick={() => { setEditing(null); setOpen(true); }}>
          + ADD FIXTURE
        </button>
      )}
      {open && <FixtureAddForm editing={editing} onClose={() => { setOpen(false); setEditing(null); }} />}

      {adminFx.length > 0 && (
        <div className="fx-admin__list">
          <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>
            ADMIN-ADDED FIXTURES · {adminFx.length}
          </span>
          <ul>
            {adminFx.map((f) => (
              <li key={f.id} className="fx-admin__row">
                <span className="fx-admin__row-date">{f.day} {f.date} {f.mon}{f.year ? ` ${String(f.year).slice(2)}` : ''}</span>
                <span className="fx-admin__row-fx">
                  {f.loc === 'Home' ? f.away : f.home} <em>({f.loc} · {f.kick})</em>
                </span>
                <span className="fx-admin__row-comp">{f.comp}{f.round ? ` · ${f.round}` : ''}</span>
                <button type="button" className="fx-admin__row-rm" onClick={() => { setEditing(f); setOpen(true); }}>Edit</button>
                <button type="button" className="fx-admin__row-rm" onClick={() => remove(f.id)}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

window.FixtureAdminPanel = FixtureAdminPanel;
