// MatchEntry.jsx — coach match-data entry form.
//
// Data shape (persisted via window.saveMatchEntry/loadMatchEntry — which
// routes through window.dataStore to either Supabase or localStorage):
// {
//   starters: [{ num, positions: ['CM','CDM'], subbedOff: false }],   // up to 11 rows, up to 2 positions each
//   bench:    [{ num, positions: ['CB'] }],                            // empty positions = unused
//   goals:    [{ num, minute, penalty }],
//   assists:  [{ num, minute }],
//   yellowCards: [{ num, minute }],
//   redCards:    [{ num, minute }],
//   opponentRedCards: [{ name, minute }],         // opposition reds (free-text name)
//   penaltiesConceded: 0,                       // team-level count
//   penaltiesSaved:    [{ num, minute }],       // GK only
//   penaltiesMissed:   [{ num, minute }],       // outfield — fired the pen, didn't score
//   motm: num | null,
//   commentary: '',
//   savedAt: ISO,
// }

// Match persistence — routes through window.dataStore. In cloud mode (Supabase
// configured) saves sync to the matches table and reach every device. In local
// mode (no config) the data lives only in this browser's localStorage. The
// helpers below preserve the original synchronous API used throughout the rest
// of MatchEntry — loadMatch returns immediately from cache, saveMatch fires
// the cloud write in the background but updates the cache optimistically so
// re-renders see the new data right away.
function loadMatch(id) {
  return (window.loadMatchEntry ? window.loadMatchEntry(id) : null);
}
function saveMatch(id, data) {
  if (window.saveMatchEntry) {
    // Fire-and-forget; the dataStore optimistically updates the cache before
    // the cloud round-trip resolves so the UI feels synchronous.
    window.saveMatchEntry(id, data).catch((e) => {
      console.error('[MatchEntry] save failed', e);
    });
  }
}
function clearMatch(id) {
  if (window.clearMatchEntry) window.clearMatchEntry(id);
}

// Default for an empty match.
function emptyMatch() {
  return {
    starters: [], bench: [],
    goals: [], assists: [],
    opponentGoals: [],
    yellowCards: [], redCards: [],
    opponentRedCards: [],
    penaltiesConceded: 0, penaltiesSaved: [], penaltiesMissed: [],
    cleanSheets: [], cleanSheetContributors: [],
    motm: null,
    captain: null,
    commentary: '',
  };
}

// Migrate legacy data shape into the current shape.
function migrate(raw) {
  if (!raw) return emptyMatch();
  const m = { ...emptyMatch(), ...raw };
  m.starters = (raw.starters || []).map((e) => typeof e === 'number' ? { num: e, positions: [], subbedOff: false } : { num: e.num, positions: e.positions || [], subbedOff: !!e.subbedOff });
  m.bench    = (raw.bench    || []).map((e) => typeof e === 'number' ? { num: e, positions: [] } : { num: e.num, positions: e.positions || [] });
  // Old scorers field -> goals
  if (raw.scorers && !raw.goals) m.goals = raw.scorers.map((s) => ({ ...s, type: 'open' }));
  m.goals = (m.goals || []).map((g) => ({ ...g, type: g.type || (g.penalty ? 'pen' : 'open') }));
  m.opponentGoals = (m.opponentGoals || []).map((g) => ({ ...g, type: g.type || (g.penalty ? 'pen' : 'open') }));
  m.assists = m.assists || [];
  m.yellowCards = m.yellowCards || [];
  m.redCards = m.redCards || [];
  m.opponentRedCards = m.opponentRedCards || [];
  m.penaltiesSaved = m.penaltiesSaved || [];
  m.penaltiesMissed = m.penaltiesMissed || [];
  m.penaltiesConceded = m.penaltiesConceded || 0;
  return m;
}

function PlayerPicker({ value, exclude = [], onChange, placeholder = 'Select player…' }) {
  // Alphabetical sort by last name (then first) so players are easy to find.
  const sorted = [...window.SQUAD].sort((a, b) => {
    const ln = a.last.localeCompare(b.last);
    return ln !== 0 ? ln : a.first.localeCompare(b.first);
  });
  return (
    <select className="me__picker" value={value || ''} onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : null)}>
      <option value="">{placeholder}</option>
      {sorted.filter((p) => !exclude.includes(p.num) || p.num === value).map((p) => (
        <option key={p.num} value={p.num}>{p.last}, {p.first} (#{p.num})</option>
      ))}
    </select>
  );
}

function PositionChips({ value, onChange, max = 2, suggestion = null }) {
  // value: ['CM','CDM']
  const list = window.POSITIONS;
  const toggle = (p) => {
    if (value.includes(p)) onChange(value.filter((x) => x !== p));
    else if (value.length < max) onChange([...value, p]);
  };
  return (
    <div className="me__poschips">
      {list.map((p) => (
        <button
          key={p}
          type="button"
          className={`me__poschip ${value.includes(p) ? 'is-on' : ''} ${suggestion === p ? 'is-suggest' : ''}`}
          onClick={() => toggle(p)}
          disabled={!value.includes(p) && value.length >= max}
          title={suggestion === p ? `Often plays here` : ''}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// Pitch coordinates (portrait, our team attacking upward) for the mini formation map.
const ME_PITCH_XY = {
  GK: [50, 92], SW: [50, 84], CB: [50, 80], LCB: [35, 81], RCB: [65, 81],
  LB: [15, 75], RB: [85, 75], LWB: [13, 64], RWB: [87, 64],
  CDM: [50, 66], DM: [50, 66], LDM: [36, 67], RDM: [64, 67],
  CM: [50, 51], LCM: [33, 52], RCM: [67, 52], LM: [15, 49], RM: [85, 49],
  CAM: [50, 37], AM: [50, 37], LAM: [33, 38], RAM: [67, 38],
  LW: [17, 27], RW: [83, 27], SS: [50, 28], CF: [50, 21], ST: [50, 14],
};
const ME_POS_INDEX = (window.POSITIONS || []).reduce(function (m, p, i) { m[p] = i; return m; }, {});
function meStarterSortKey(entry) {
  const pos = entry.positions && entry.positions[0];
  if (!pos) return 999;
  return ME_POS_INDEX[pos] != null ? ME_POS_INDEX[pos] : 998;
}

// Visual mini-pitch of the starting XI, each player placed by their primary position.
function MiniPitch({ starters }) {
  const nameOf = (num) => { const pl = window.SQUAD.find((s) => s.num === num); return pl ? pl.last : '#' + num; };
  const placed = [], unplaced = [];
  starters.forEach((s) => {
    const pos = s.positions && s.positions[0];
    const xy = pos && ME_PITCH_XY[pos];
    if (xy) placed.push({ num: s.num, pos, x: xy[0], y: xy[1], subbedOff: s.subbedOff });
    else unplaced.push(s);
  });
  // Spread players sharing one position so markers don't overlap.
  const byKey = {};
  placed.forEach((p) => { (byKey[p.pos] = byKey[p.pos] || []).push(p); });
  Object.keys(byKey).forEach((k) => {
    const g = byKey[k];
    if (g.length > 1) g.forEach((p, i) => { p.x = Math.max(9, Math.min(91, p.x + (i - (g.length - 1) / 2) * 15)); });
  });
  return (
    <div className="me__pitchwrap">
      <div className="me__pitch">
        <div className="me__pitch-grass" aria-hidden="true" />
        {placed.length === 0 && <div className="me__pitch-empty">Assign positions below to see the formation take shape</div>}
        {placed.map((p) => (
          <div key={p.num} className={`me__pnode ${p.subbedOff ? 'is-off' : ''}`} style={{ left: p.x + '%', top: p.y + '%' }} title={`${nameOf(p.num)} · ${p.pos}`}>
            <span className="me__pnode-dot">{p.num}</span>
            <span className="me__pnode-name">{nameOf(p.num)}</span>
          </div>
        ))}
      </div>
      {unplaced.length > 0 && (
        <div className="me__pitch-bench">
          <span className="me__pitch-bench-lbl">No position yet</span>
          {unplaced.map((s) => <span key={s.num} className="me__pitch-chip">{s.num} {nameOf(s.num)}</span>)}
        </div>
      )}
    </div>
  );
}

// Row inside Starters list. Player + positions + subbed-off checkbox.
function StarterRow({ entry, onChange, onRemove }) {
  const p = window.SQUAD.find((s) => s.num === entry.num);
  if (!p) return null;
  // Suggest the player's most-played position from saved history (excluding this match).
  const stats = window.derivedPlayerStats ? window.derivedPlayerStats(entry.num) : null;
  const suggestion = stats && stats.mostPlayedPosition;

  return (
    <div className="me__starter">
      <div className="me__starter-head">
        <span className="me__chip-name">{p.first} {p.last}</span>
        <label className="me__subof">
          <input type="checkbox" checked={entry.subbedOff} onChange={(e) => onChange({ ...entry, subbedOff: e.target.checked })} />
          <span>Subbed off</span>
        </label>
        <button type="button" className="me__chip-x" onClick={onRemove} aria-label="Remove">×</button>
      </div>
      <PositionChips
        value={entry.positions}
        onChange={(positions) => onChange({ ...entry, positions })}
        max={2}
        suggestion={suggestion}
      />
      <div className="me__starter-meta">
        {entry.positions.length === 0 ? 'No position assigned' : `Playing as: ${entry.positions.join(' + ')}`}
        {suggestion && !entry.positions.includes(suggestion) && (
          <span className="me__suggest"> · usually plays {suggestion}</span>
        )}
      </div>
    </div>
  );
}

// Row inside Bench list. Player + (optional) positions when they came on.
function BenchRow({ entry, onChange, onRemove }) {
  const p = window.SQUAD.find((s) => s.num === entry.num);
  if (!p) return null;
  return (
    <div className="me__bench">
      <div className="me__starter-head">
        <span className="me__chip-name">{p.first} {p.last}</span>
        <span className="me__benchtag">{entry.positions.length ? 'CAME ON' : 'UNUSED'}</span>
        <button type="button" className="me__chip-x" onClick={onRemove} aria-label="Remove">×</button>
      </div>
      <PositionChips
        value={entry.positions}
        onChange={(positions) => onChange({ ...entry, positions })}
        max={2}
      />
      <div className="me__starter-meta">
        {entry.positions.length === 0 ? 'Tap a position if they came on' : `Came on as: ${entry.positions.join(' + ')}`}
      </div>
    </div>
  );
}

// Corner / free-kick sub-source. Used two ways:
//  - set-piece GOALS: corner | freekick (no "open" — only shown when type==='set')
//  - ASSISTS: open | corner | freekick (includeOpen) so every assist records its source
function SetPieceSource({ value, onChange, includeOpen = false }) {
  const opts = includeOpen
    ? [['open', 'OPEN PLAY'], ['corner', 'CORNER'], ['freekick', 'FREE KICK'], ['throwin', 'THROW IN']]
    : [['corner', 'CORNER'], ['freekick', 'FREE KICK'], ['throwin', 'THROW IN']];
  const active = value || (includeOpen ? 'open' : null);
  return (
    <div className="me__setsrc" role="radiogroup" aria-label="Set-piece source">
      {opts.map(([k, lbl]) => (
        <button
          key={k}
          type="button"
          className={`me__setsrc-btn me__setsrc-btn--${k} ${active === k ? 'is-on' : ''}`}
          onClick={() => onChange(includeOpen ? k : (value === k ? null : k))}
        >{lbl}</button>
      ))}
    </div>
  );
}

function EventList({ title, items, onAdd, onRemove, onUpdate, goalMode = false, assistMode = false, withMinute = true }) {
  return (
    <section className={`me__events ${goalMode || assistMode ? 'me__col--full' : ''}`}>
      <label className="me__lbl">{title} <span className="me__count">{items.length}</span></label>
      {items.map((item, i) => (
        <div key={i} className="me__event">
          <div className="me__row">
            <PlayerPicker value={item.num} onChange={(num) => onUpdate(i, { ...item, num })} />
            {withMinute && (
              <input type="text" inputMode="numeric" className="me__min" placeholder="min" value={item.minute || ''} onChange={(e) => onUpdate(i, { ...item, minute: e.target.value })} />
            )}
            {goalMode && (
              <div className="me__goaltype" role="radiogroup" aria-label="Goal type">
                {[['open','OPEN PLAY'], ['set','SET PIECE'], ['pen','PENALTY']].map(([k, lbl]) => (
                  <button
                    key={k}
                    type="button"
                    className={`me__goaltype-btn me__goaltype-btn--${k} ${(item.type || 'open') === k ? 'is-on' : ''}`}
                    onClick={() => onUpdate(i, { ...item, type: k, penalty: k === 'pen', setType: k === 'set' ? (item.setType || null) : null })}
                  >{lbl}</button>
                ))}
              </div>
            )}
            {assistMode && (
              <div className="me__setsrc-wrap me__setsrc-wrap--inline">
                <span className="me__sublbl">From</span>
                <SetPieceSource includeOpen value={item.source || 'open'} onChange={(source) => onUpdate(i, { ...item, source })} />
              </div>
            )}
            <button className="me__rm" onClick={() => onRemove(i)} aria-label="Remove">×</button>
          </div>
          {goalMode && (item.type || 'open') === 'set' && (
            <div className="me__subrow">
              <span className="me__sublbl">Set piece from</span>
              <SetPieceSource value={item.setType} onChange={(setType) => onUpdate(i, { ...item, setType })} />
            </div>
          )}
        </div>
      ))}
      <PlayerPicker value={null} onChange={(num) => num && onAdd({ num, minute: '', ...(goalMode ? { type: 'open', penalty: false } : {}), ...(assistMode ? { source: 'open' } : {}) })} placeholder={`+ Add to ${title.toLowerCase()}…`} />
    </section>
  );
}

function MatchEntry({ matchId, matchLabel }) {
  // Hooks MUST run in the same order on every render — keep them at the top,
  // BEFORE any conditional return. Earlier this useAdmin call sat inside the
  // `if (!open) { ... }` branch which broke the hook ordering when the form
  // toggled open (Rendered fewer hooks than expected).
  const admin = window.useAdmin ? window.useAdmin() : false;
  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState(() => migrate(loadMatch(matchId)));
  const [savedAt, setSavedAt] = React.useState(() => {
    const m = loadMatch(matchId);
    return m && m.savedAt;
  });

  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  const addStarter = (num) => {
    if (!num || data.starters.find((s) => s.num === num)) return;
    if (data.starters.length >= 11) return;
    set({
      starters: [...data.starters, { num, positions: [], subbedOff: false }],
      bench: data.bench.filter((b) => b.num !== num),
    });
  };
  const updateStarter = (i, entry) => set({ starters: data.starters.map((s, j) => j === i ? entry : s) });
  const removeStarter = (i) => set({ starters: data.starters.filter((_, j) => j !== i) });

  const addBench = (num) => {
    if (!num || data.bench.find((b) => b.num === num) || data.starters.find((s) => s.num === num)) return;
    set({ bench: [...data.bench, { num, positions: [] }] });
  };
  const updateBench = (i, entry) => set({ bench: data.bench.map((b, j) => j === i ? entry : b) });
  const removeBench = (i) => set({ bench: data.bench.filter((_, j) => j !== i) });

  const eventOps = (key) => ({
    add:    (item)         => set({ [key]: [...(data[key] || []), item] }),
    update: (i, item)      => set({ [key]: data[key].map((x, j) => j === i ? item : x) }),
    remove: (i)            => set({ [key]: data[key].filter((_, j) => j !== i) }),
  });
  const goalOps = eventOps('goals');
  const assistOps = eventOps('assists');
  const ycOps = eventOps('yellowCards');
  const rcOps = eventOps('redCards');
  const psOps = eventOps('penaltiesSaved');
  const pmOps = eventOps('penaltiesMissed');

  const onSave = () => {
    // Finalize the formation from the starting XI positions using the advanced detector.
    let formation = data.formationOverride || null;
    if (!formation) {
      const positions = data.starters.map((s) => s.positions[0]).filter(Boolean);
      if (positions.length >= 7 && window.detectAdvancedFormation) {
        const det = window.detectAdvancedFormation(positions);
        formation = det ? det.formation : null;
      }
    }
    const dataToSave = { ...data, formation };
    setData(dataToSave);
    saveMatch(matchId, dataToSave);
    setSavedAt(new Date().toISOString());
  };
  const onClear = () => {
    if (!window.confirm('Clear all data for this match?')) return;
    clearMatch(matchId); setData(emptyMatch()); setSavedAt(null);
  };

  const hasData = data.starters.length || data.bench.length || data.goals.length || data.assists.length
                 || data.opponentGoals.length || data.yellowCards.length || data.redCards.length
                 || (data.opponentRedCards && data.opponentRedCards.length)
                 || data.motm || (data.commentary && data.commentary.trim().length);
  const lastSavedText = savedAt ? new Date(savedAt).toLocaleString() : 'not saved';

  // Live formation suggestion for current starters using the advanced detector.
  const livePositions = data.starters.map((s) => s.positions[0]).filter(Boolean);
  const detResult = livePositions.length >= 7 && window.detectAdvancedFormation
    ? window.detectAdvancedFormation(livePositions)
    : null;
  const detectedFormation = detResult ? detResult.formation : null;
  const formationToShow = data.formationOverride || detectedFormation || '—';

  // Goalkeepers in this lineup (for penalty-save warning)
  const lineupGKs = [...data.starters, ...data.bench]
    .filter((e) => e.positions.includes('GK'))
    .map((e) => e.num);

  // Everyone who actually featured: all starters + any sub who came on (has a
  // position assigned). Used for the per-player clean-sheet contribution ticks.
  const playedNums = [
    ...data.starters.map((s) => s.num),
    ...data.bench.filter((b) => b.positions.length > 0).map((b) => b.num),
  ];

  if (!open) {
    // Hide the EDIT MATCH DATA button from non-admin visitors entirely.
    // Coach-entered data still surfaces through the public surfaces (scorers,
    // MOTM, formation, etc.) — only the editor entrypoint is gated. The admin
    // check is hoisted to the top of MatchEntry above to keep hook order
    // stable across re-renders.
    if (!admin) return null;
    return (
      <button className="me__toggle" onClick={() => setOpen(true)}>
        <span className="me__toggle-dot" />
        {hasData ? `EDIT MATCH DATA · last saved ${lastSavedText}` : '+ ENTER MATCH DATA'}
      </button>
    );
  }

  return (
    <div className="me">
      <header className="me__head">
        <div>
          <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>COACH ENTRY</span>
          <h4 className="me__title">{matchLabel}</h4>
        </div>
        <div className="me__formation">
          <span>FORMATION</span>
          <strong>{formationToShow}</strong>
          {detectedFormation && data.formationOverride && (
            <span className="me__formation-note">overridden · detected as {detectedFormation}</span>
          )}
          {detectedFormation && !data.formationOverride && detResult.confidence === 'learned' && (
            <span className="me__formation-note">learned from previous correction</span>
          )}
          <FormationOverrideInput
            value={data.formationOverride || ''}
            detected={detectedFormation}
            onSet={(v) => {
              const next = (v || '').trim();
              set({ formationOverride: next || null });
              if (next && detectedFormation && next !== detectedFormation && livePositions.length >= 7) {
                window.rememberFormation && window.rememberFormation(livePositions, next);
              }
            }}
          />
        </div>
        <button className="me__close" onClick={() => setOpen(false)} aria-label="Close">×</button>
      </header>

      <div className="me__grid">
        <section className="me__col me__col--full">
          <label className="me__lbl">STARTING XI <span className="me__count">{data.starters.length}/11</span></label>
          {/* Quick-fill: tick the whole squad who played, no positions needed.
              Registers appearances fast across many fixtures. Positions can be
              added later for formation detection. */}
          <details className="me__quick">
            <summary>⚡ Quick fill — tick who played</summary>
            <div className="me__quick-grid">
              {window.SQUAD.map((p) => {
                const inXI = data.starters.find((s) => s.num === p.num);
                const onBench = data.bench.find((b) => b.num === p.num);
                const checked = !!inXI;
                return (
                  <label key={p.num} className={`me__quick-chip ${checked ? 'is-on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (data.starters.length >= 11) return;
                          set({
                            starters: [...data.starters, { num: p.num, positions: inXI ? inXI.positions : [], subbedOff: false }],
                            bench: data.bench.filter((b) => b.num !== p.num),
                          });
                        } else {
                          set({ starters: data.starters.filter((s) => s.num !== p.num) });
                        }
                      }}
                    />
                    <span className="me__quick-num">{p.num}</span>
                    <span className="me__quick-name">{p.last}</span>
                  </label>
                );
              })}
            </div>
            <p className="me__hint">Ticking adds the player to the XI with no position. Add positions below for formation detection — appearances count either way.</p>
          </details>
          <MiniPitch starters={data.starters} />
          {data.starters.map((s, i) => ({ s, i })).sort((a, b) => meStarterSortKey(a.s) - meStarterSortKey(b.s) || a.i - b.i).map(({ s, i }) => (
            <StarterRow key={s.num} entry={s} onChange={(e) => updateStarter(i, e)} onRemove={() => removeStarter(i)} />
          ))}
          {data.starters.length < 11 && (
            <PlayerPicker value={null} exclude={[...data.starters.map((s) => s.num), ...data.bench.map((b) => b.num)]} onChange={addStarter} placeholder="+ Add starter…" />
          )}
        </section>

        <section className="me__col me__col--full">
          <label className="me__lbl">BENCH <span className="me__count">{data.bench.length}</span></label>
          {data.bench.map((b, i) => (
            <BenchRow key={b.num} entry={b} onChange={(e) => updateBench(i, e)} onRemove={() => removeBench(i)} />
          ))}
          <PlayerPicker value={null} exclude={[...data.starters.map((s) => s.num), ...data.bench.map((b) => b.num)]} onChange={addBench} placeholder="+ Add sub…" />
        </section>

        <EventList title="GOALSCORERS" items={data.goals} onAdd={goalOps.add} onUpdate={goalOps.update} onRemove={goalOps.remove} goalMode />
        <EventList title="ASSISTS"     items={data.assists} onAdd={assistOps.add} onUpdate={assistOps.update} onRemove={assistOps.remove} assistMode />

        {/* Opposition goalscorers — free-text name + minute. No squad picker. */}
        <section className="me__col">
          <label className="me__lbl">OPPOSITION GOALS <span className="me__count">{data.opponentGoals.length}</span></label>
          {data.opponentGoals.map((og, i) => (
            <div key={i} className="me__row">
              <input
                type="text"
                className="me__picker"
                placeholder="Opponent player name"
                value={og.name || ''}
                onChange={(e) => set({ opponentGoals: data.opponentGoals.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })}
              />
              <input
                type="text"
                inputMode="numeric"
                className="me__min"
                placeholder="min"
                value={og.minute || ''}
                onChange={(e) => set({ opponentGoals: data.opponentGoals.map((x, j) => j === i ? { ...x, minute: e.target.value } : x) })}
              />
              <div className="me__goaltype" role="radiogroup" aria-label="Goal type">
                {[['open','OPEN PLAY'], ['set','SET PIECE'], ['pen','PENALTY']].map(([k, lbl]) => (
                  <button
                    key={k}
                    type="button"
                    className={`me__goaltype-btn me__goaltype-btn--${k} ${(og.type || (og.penalty ? 'pen' : 'open')) === k ? 'is-on' : ''}`}
                    onClick={() => set({ opponentGoals: data.opponentGoals.map((x, j) => j === i ? { ...x, type: k, penalty: k === 'pen' } : x) })}
                  >{lbl}</button>
                ))}
              </div>
              <button
                className="me__rm"
                onClick={() => set({ opponentGoals: data.opponentGoals.filter((_, j) => j !== i) })}
                aria-label="Remove"
              >×</button>
            </div>
          ))}
          <button
            type="button"
            className="me__add-opp"
            onClick={() => set({ opponentGoals: [...data.opponentGoals, { name: '', minute: '', penalty: false }] })}
          >+ Add opposition goal</button>
        </section>

        <EventList title="YELLOW CARDS" items={data.yellowCards} onAdd={ycOps.add} onUpdate={ycOps.update} onRemove={ycOps.remove} />
        <EventList title="RED CARDS"   items={data.redCards} onAdd={rcOps.add} onUpdate={rcOps.update} onRemove={rcOps.remove} />

        {/* Opposition red cards — free-text name + minute. No squad picker. */}
        <section className="me__col">
          <label className="me__lbl">OPPOSITION RED CARDS <span className="me__count">{(data.opponentRedCards || []).length}</span></label>
          {(data.opponentRedCards || []).map((orc, i) => (
            <div key={i} className="me__row">
              <input
                type="text"
                className="me__picker"
                placeholder="Opponent player name"
                value={orc.name || ''}
                onChange={(e) => set({ opponentRedCards: data.opponentRedCards.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })}
              />
              <input
                type="text"
                inputMode="numeric"
                className="me__min"
                placeholder="min"
                value={orc.minute || ''}
                onChange={(e) => set({ opponentRedCards: data.opponentRedCards.map((x, j) => j === i ? { ...x, minute: e.target.value } : x) })}
              />
              <button
                className="me__rm"
                onClick={() => set({ opponentRedCards: data.opponentRedCards.filter((_, j) => j !== i) })}
                aria-label="Remove"
              >×</button>
            </div>
          ))}
          <button
            type="button"
            className="me__add-opp"
            onClick={() => set({ opponentRedCards: [...(data.opponentRedCards || []), { name: '', minute: '' }] })}
          >+ Add opposition red card</button>
        </section>

        <section className="me__col">
          <label className="me__lbl">PENALTIES CONCEDED <span className="me__count">team-level</span></label>
          <div className="me__stepper">
            <button type="button" onClick={() => set({ penaltiesConceded: Math.max(0, (data.penaltiesConceded || 0) - 1) })}>−</button>
            <span>{data.penaltiesConceded || 0}</span>
            <button type="button" onClick={() => set({ penaltiesConceded: (data.penaltiesConceded || 0) + 1 })}>+</button>
          </div>
          <div className="me__starter-meta">How many penalties the team gave away.</div>
        </section>

        {/* Clean Sheets — one checkbox per player with a GK position in this lineup.
             Hidden entirely if no GK is assigned in starters/bench. Persisted as
             an explicit array so derivedPlayerStats trusts the coach's call. */}
        {lineupGKs.length > 0 && (
          <section className="me__col">
            <label className="me__lbl">CLEAN SHEETS <span className="me__count">{(data.cleanSheets || []).length}</span></label>
            <div className="me__cs-list">
              {lineupGKs.map((num) => {
                const p = (window.SQUAD || []).find((s) => s.num === num);
                if (!p) return null;
                const checked = (data.cleanSheets || []).includes(num);
                return (
                  <label key={num} className={`me__cs ${checked ? 'me__cs--on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const cur = data.cleanSheets || [];
                        const curContrib = data.cleanSheetContributors || [];
                        if (e.target.checked) {
                          // GK who kept the clean sheet is auto-selected as a contributor.
                          set({
                            cleanSheets: Array.from(new Set([...cur, num])),
                            cleanSheetContributors: Array.from(new Set([...curContrib, num])),
                          });
                        } else {
                          set({ cleanSheets: cur.filter((n) => n !== num) });
                        }
                      }}
                    />
                    <span className="me__cs-num">{num}</span>
                    <span className="me__cs-name">{p.first} {p.last}</span>
                    <span className="me__cs-tag">{checked ? 'CLEAN SHEET' : 'KEPT GOAL OPEN'}</span>
                  </label>
                );
              })}
            </div>
            <p className="me__hint">Tick the box only for the goalkeeper(s) who kept a clean sheet in this match.</p>
          </section>
        )}

        {/* Clean-sheet CONTRIBUTIONS — tick every player who helped keep the
             clean sheet (back line, keeper, anyone who kept it tight). Stored
             separately from the GK clean-sheet record so future defensive
             analytics can credit the whole unit. Persisted as data.cleanSheetContributors. */}
        {playedNums.length > 0 && (
          <section className="me__col me__col--full">
            <label className="me__lbl">CLEAN SHEET CONTRIBUTIONS <span className="me__count">{(data.cleanSheetContributors || []).length}</span></label>
            <div className="me__quick-grid">
              {playedNums.map((num) => {
                const p = (window.SQUAD || []).find((s) => s.num === num);
                if (!p) return null;
                // Only the goalkeeper who kept the clean sheet is auto-selected and locked;
                // every other contributor is set manually.
                const isKeeper = (data.cleanSheets || []).includes(num);
                const checked = isKeeper || (data.cleanSheetContributors || []).includes(num);
                return (
                  <label key={num} className={`me__quick-chip ${checked ? 'is-on' : ''} ${isKeeper ? 'is-locked' : ''}`} title={isKeeper ? 'Auto-selected — goalkeeper kept the clean sheet' : undefined}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isKeeper}
                      onChange={(e) => {
                        if (isKeeper) return;
                        const cur = data.cleanSheetContributors || [];
                        const next = e.target.checked
                          ? Array.from(new Set([...cur, num]))
                          : cur.filter((n) => n !== num);
                        set({ cleanSheetContributors: next });
                      }}
                    />
                    <span className="me__quick-num">{num}</span>
                    <span className="me__quick-name">{p.last}</span>
                  </label>
                );
              })}
            </div>
            <p className="me__hint">Tick every player who contributed to the clean sheet — captured for future defensive analytics. Leave all unticked if a goal was conceded.</p>
          </section>
        )}

        <EventList title="PENALTIES SAVED" items={data.penaltiesSaved} onAdd={psOps.add} onUpdate={psOps.update} onRemove={psOps.remove} />
        <EventList title="PENALTIES MISSED" items={data.penaltiesMissed} onAdd={pmOps.add} onUpdate={pmOps.update} onRemove={pmOps.remove} />

        <section className="me__col">
          <label className="me__lbl">CAPTAIN</label>
          <PlayerPicker value={data.captain} onChange={(v) => set({ captain: v })} placeholder="Select captain…" />
        </section>

        <section className="me__col">
          <label className="me__lbl">PLAYER OF THE MATCH</label>
          <select
            className="me__picker"
            value={data.motm == null ? '__none' : data.motm}
            onChange={(e) => {
              const v = e.target.value;
              set({ motm: v === '__none' ? null : parseInt(v, 10) });
            }}
          >
            <option value="__none">None / Not awarded</option>
            {[...window.SQUAD]
              .sort((a, b) => a.last.localeCompare(b.last) || a.first.localeCompare(b.first))
              .map((p) => (
                <option key={p.num} value={p.num}>{p.last}, {p.first}</option>
              ))}
          </select>
        </section>

        <section className="me__col me__col--full">
          <label className="me__lbl">VENUE</label>
          <input
            type="text"
            className="me__picker"
            placeholder="e.g. The Reeves Sports Club"
            value={data.venue || ''}
            onChange={(e) => set({ venue: e.target.value })}
          />
        </section>

        <section className="me__col me__col--full">
          <label className="me__lbl">KICK-OFF TIME</label>
          <input
            type="text"
            className="me__picker"
            placeholder="e.g. 11:00"
            value={data.kick || ''}
            onChange={(e) => set({ kick: e.target.value })}
          />
        </section>

        <section className="me__col me__col--full">
          <label className="me__lbl">MATCH PREVIEW <span className="me__count">{(data.preview || '').trim().split(/\s+/).filter(Boolean).length} words</span></label>
          <textarea
            className="me__textarea"
            placeholder="Coach&rsquo;s notes BEFORE the game. Tactics, talking points, opposition history, team news. Published as a Match Preview article on Media — stays published even after the fixture is played."
            rows="4"
            value={data.preview || ''}
            onChange={(e) => set({ preview: e.target.value })}
          />
        </section>

        <section className="me__col me__col--full">
          <label className="me__lbl">GAME COMMENTARY <span className="me__count">{(data.commentary || '').trim().split(/\s+/).filter(Boolean).length} words</span></label>
          <textarea
            className="me__textarea"
            placeholder="Coach&rsquo;s notes from the game. Tactics, key moments, talking points. Published as the Match Report on Media → News."
            rows="5"
            value={data.commentary || ''}
            onChange={(e) => set({ commentary: e.target.value })}
          />
        </section>
      </div>

      <footer className="me__foot">
        <span className="me__saved">{savedAt ? `Saved ${lastSavedText}` : 'Unsaved changes'}</span>
        <div className="me__actions">
          {hasData && <button className="btn btn--ghost btn--sm" onClick={onClear}>Clear</button>}
          <button className="btn btn--volt btn--sm" onClick={onSave}>Save match</button>
        </div>
      </footer>
    </div>
  );
}

window.MatchEntry = MatchEntry;

// PolishReportControl — admin tool that rewrites raw coach notes into a
// proper match-report article using window.claude.complete. Uses the full
// structured match data (lineups, scorers, cards, formation, opponent) plus
// the raw commentary as input so the LLM can write something coherent.
function PolishReportControl({ data, matchLabel, onApply, onClear }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  const canPolish = (data.commentary && data.commentary.trim().length > 5) && typeof window !== 'undefined' && window.claude && window.claude.complete;

  const summariseForPrompt = () => {
    const findP = (num) => (window.SQUAD || []).find((x) => x.num === num);
    const goalLines = (data.goals || []).map((g) => {
      const p = findP(g.num); if (!p) return null;
      const setDetail = g.setType === 'corner' ? ' (from a corner)' : g.setType === 'freekick' ? ' (from a free kick)' : g.setType === 'throwin' ? ' (from a throw-in)' : ' (set piece)';
      const t = g.type === 'pen' ? ' (penalty)' : g.type === 'set' ? setDetail : '';
      return `${p.first} ${p.last}${g.minute ? ' ' + g.minute + '’' : ''}${t}`;
    }).filter(Boolean);
    const assistLines = (data.assists || []).map((a) => {
      const p = findP(a.num); if (!p) return null;
      const src = a.source === 'corner' ? ' (corner)' : a.source === 'freekick' ? ' (free kick)' : a.source === 'throwin' ? ' (throw-in)' : '';
      return `${p.first} ${p.last}${a.minute ? ' ' + a.minute + '’' : ''}${src}`;
    }).filter(Boolean);
    const oppGoalLines = (data.opponentGoals || []).map((g) => {
      const t = g.type === 'pen' ? ' (penalty)' : '';
      return `${g.name || 'Unknown'}${g.minute ? ' ' + g.minute + '’' : ''}${t}`;
    }).filter(Boolean);
    const yc = (data.yellowCards || []).map((c) => { const p = findP(c.num); return p ? `${p.last}${c.minute ? ' ' + c.minute + '’' : ''}` : null; }).filter(Boolean);
    const rc = (data.redCards    || []).map((c) => { const p = findP(c.num); return p ? `${p.last}${c.minute ? ' ' + c.minute + '’' : ''}` : null; }).filter(Boolean);
    const oppRc = (data.opponentRedCards || []).map((c) => {
      const nm = (c.name || '').trim();
      return nm ? `${nm}${c.minute ? ' ' + c.minute + '’' : ''}` : null;
    }).filter(Boolean);
    const motm = data.motm && findP(data.motm);
    const captain = data.captain && findP(data.captain);
    const starters = (data.starters || []).map((s) => {
      const p = findP(s.num); if (!p) return null;
      const pos = s.positions && s.positions.length ? ` (${s.positions.join('/')})` : '';
      return `${p.first} ${p.last}${pos}${s.subbedOff ? ' [subbed off]' : ''}`;
    }).filter(Boolean);
    const bench = (data.bench || []).map((b) => {
      const p = findP(b.num); if (!p) return null;
      const came = b.positions && b.positions.length ? ` (came on as ${b.positions.join('/')})` : ' [unused]';
      return `${p.first} ${p.last}${came}`;
    }).filter(Boolean);
    return {
      goalLines, assistLines, oppGoalLines, yc, rc, oppRc,
      motm: motm ? `${motm.first} ${motm.last}` : null,
      captain: captain ? `${captain.first} ${captain.last}` : null,
      starters, bench, formation: data.formation, venue: data.venue, kick: data.kick,
    };
  };

  const polish = async () => {
    setBusy(true); setError(null);
    try {
      const facts = summariseForPrompt();
      const prompt = [
        'You are the in-house writer for Sue’s Angels FC — a London Sunday-league football club. Treat the role like a passionate club beat writer covering grassroots football for the people who actually play it. Authoritative and well-crafted, but grounded — this is Sunday League, not the Champions League.',
        'Take the coach’s raw notes plus the structured match facts below and write a 700-900 word match report.',
        '',
        '*** PRIMARY RULE *** The coach’s notes are the foundation of the report. Treat them as source-of-truth eyewitness testimony from inside the dressing room. Build the article AROUND those notes — every key moment, every observation, every talking point must come from what the coach wrote. You may rephrase and expand only enough to make the prose flow; do not invent moments, quotes, narratives, or storylines that the coach did not provide. If a moment or detail is not in the notes or the structured facts, do not include it.',
        '',
        'The structured facts (scorers, assists, cards, lineups, etc.) are factual references you may pull names and numbers from, but the *story* must be driven by the coach’s notes.',
        '',
        'Voice: speak from inside Sue’s Angels FC — "we", "the club", "the lads" — with the craft of a good club writer. Keep the scale honest. Avoid grandiose national-broadcast language ("cathedral", "operatic", "history of the game"). This is a Sunday-league title, not a continental trophy — the achievement is real and worth celebrating in real, human terms.',
        'Tone: easy to read, warm, witty when it earns it, football-culture native. Sentences should sing without straining. Mix short, hammered lines with longer flowing ones for rhythm. Plain words, real feelings. UK English. No corporate jargon, no emoji, no quote attributions.',
        'Structure: lead with the result and what it meant in the context of the season. Build the story chronologically through the key moments the coach mentioned. Pull in scorer call-outs with full names and minutes when known. **You must explicitly list the starting XI and the bench when both are provided** — either as a sentence ("The XI rolled out: … Off the bench: …") or two short paragraphs. Cover defining incidents (cards, set pieces, MOTM’s performance, captaincy). Reflect on what it means for the season. Close with what’s next or what it tells us. 4-7 paragraphs. Plain prose, no headings, no markdown.',
        '',
        'Word count requirement: between 700 and 900 words. Do not produce anything shorter than 700 words. Aim for 800.',
        '',
        'FIXTURE: ' + matchLabel,
        facts.venue || facts.kick ? `Venue/KO: ${[facts.venue, facts.kick && facts.kick + ' KO'].filter(Boolean).join(' · ')}` : '',
        facts.formation ? `Formation: ${facts.formation}` : '',
        facts.starters && facts.starters.length ? `Starting XI: ${facts.starters.join(', ')}` : '',
        facts.bench    && facts.bench.length    ? `Bench: ${facts.bench.join(', ')}` : '',
        facts.goalLines.length ? `Our goals: ${facts.goalLines.join(', ')}` : '',
        facts.assistLines.length ? `Our assists: ${facts.assistLines.join(', ')}` : '',
        facts.oppGoalLines.length ? `Opposition goals: ${facts.oppGoalLines.join(', ')}` : '',
        facts.yc.length ? `Yellow cards: ${facts.yc.join(', ')}` : '',
        facts.rc.length ? `Red cards: ${facts.rc.join(', ')}` : '',
        facts.oppRc && facts.oppRc.length ? `Opposition red cards: ${facts.oppRc.join(', ')}` : '',
        facts.motm ? `Man of the Match: ${facts.motm}` : '',
        facts.captain ? `Captain: ${facts.captain}` : '',
        '',
        'COACH NOTES:',
        data.commentary.trim(),
        '',
        'Write the match report now. Output the prose only — no preamble, no labels.',
      ].filter(Boolean).join('\n');

      const result = await window.claude.complete(prompt);
      if (!result || typeof result !== 'string' || !result.trim()) throw new Error('Empty response');
      onApply(result.trim());
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="me__polish">
      <button
        type="button"
        className="btn btn--volt btn--sm"
        disabled={!canPolish || busy}
        onClick={polish}
      >
        {busy ? 'Writing match report…' : (data.polishedReport ? 'Re-write match report' : 'Polish into match report')}
      </button>
      {data.polishedReport && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClear}>Revert to raw notes</button>
      )}
      {!canPolish && !busy && (
        <span className="t-meta" style={{ color: 'var(--fg-3)' }}>Add at least a few words of commentary above to unlock.</span>
      )}
      {error && <span className="t-meta" style={{ color: 'var(--loss)' }}>Couldn’t write the report: {error}</span>}
    </div>
  );
}

window.PolishReportControl = PolishReportControl;

// PolishPreviewControl — same flow as PolishReportControl but for the
// pre-match preview text. Persists as data.polishedPreview.
function PolishPreviewControl({ data, matchLabel, onApply, onClear }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  const canPolish = (data.preview && data.preview.trim().length > 5) && typeof window !== 'undefined' && window.claude && window.claude.complete;

  const polish = async () => {
    setBusy(true); setError(null);
    try {
      const prompt = [
        'You are the in-house writer for Sue’s Angels FC — a London Sunday-league football club. Treat the role like a passionate club beat writer covering grassroots football for the people who actually play it. Authoritative and well-crafted, but grounded — this is Sunday League, not the Champions League.',
        'Take the coach’s pre-match notes and the fixture facts below and write a 700-900 word match preview.',
        '',
        '*** PRIMARY RULE *** The coach’s pre-match notes are the foundation of the preview. Treat them as source-of-truth. Build the article AROUND those notes — every talking point, every angle, every line of thinking must come from what the coach wrote. You may rephrase and expand only enough to make the prose flow; do not invent storylines, narratives, or angles the coach did not provide. If a detail is not in the notes or the fixture facts, do not include it.',
        '',
        'Voice: speak from inside Sue’s Angels FC — "we", "the club", "the lads" — with the craft of a good club writer. Keep the scale honest. Avoid grandiose national-broadcast language. This is Sunday League — real stakes, real Sunday mornings, real lads earning Sunday afternoons.',
        'Tone: easy to read, anticipatory, warm, witty when it earns it, football-culture native. Sentences should sing without straining. Mix short, hammered lines with longer flowing ones for rhythm. Plain words, real feelings. UK English. No corporate jargon, no emoji, no quote attributions.',
        'Structure: lead with what this fixture means — the context, the opponent, the stakes. Build through the coach’s talking points. Reflect on form and the journey to here. Close with the call to arms or what we’re looking for. 4-7 paragraphs. Plain prose. No headings, no markdown.',
        '',
        'Word count requirement: between 700 and 900 words. Do not produce anything shorter than 700 words. Aim for 800.',
        '',
        'FIXTURE: ' + matchLabel,
        data.venue ? `Venue: ${data.venue}` : '',
        data.kick  ? `Kick-off: ${data.kick}` : '',
        '',
        'COACH NOTES (PRE-MATCH):',
        data.preview.trim(),
        '',
        'Write the match preview now. Output the prose only — no preamble, no labels.',
      ].filter(Boolean).join('\n');

      const result = await window.claude.complete(prompt);
      if (!result || typeof result !== 'string' || !result.trim()) throw new Error('Empty response');
      onApply(result.trim());
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="me__polish">
      <button
        type="button"
        className="btn btn--volt btn--sm"
        disabled={!canPolish || busy}
        onClick={polish}
      >
        {busy ? 'Writing match preview…' : (data.polishedPreview ? 'Re-write match preview' : 'Polish into match preview')}
      </button>
      {data.polishedPreview && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClear}>Revert to raw notes</button>
      )}
      {!canPolish && !busy && (
        <span className="t-meta" style={{ color: 'var(--fg-3)' }}>Add at least a few words of preview notes above to unlock.</span>
      )}
      {error && <span className="t-meta" style={{ color: 'var(--loss)' }}>Couldn’t write the preview: {error}</span>}
    </div>
  );
}
window.PolishPreviewControl = PolishPreviewControl;

// FormationOverrideInput — coach can correct the auto-detected formation.
// Correction is also saved to formation memory so the same lineup pattern
// returns the corrected label on future matches.
function FormationOverrideInput({ value, detected, onSet }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(value || detected || '');
  const COMMON = ['4-2-3-1','4-3-3','4-4-2','4-1-4-1','4-3-2-1','4-1-2-1-2 (diamond)','3-5-2','3-4-3','3-4-2-1','5-3-2','5-4-1','4-5-1','4-2-2-2','4-4-1-1'];
  React.useEffect(() => { setDraft(value || detected || ''); }, [value, detected]);
  if (!open) {
    return (
      <button type="button" className="me__formation-edit" onClick={() => setOpen(true)}>
        {value ? 'Edit override' : 'Override'}
      </button>
    );
  }
  return (
    <div className="me__formation-edit-row">
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="e.g. 4-2-3-1"
        list="me-formation-list"
        className="me__formation-input"
      />
      <datalist id="me-formation-list">
        {COMMON.map((f) => <option key={f} value={f} />)}
      </datalist>
      <button type="button" className="me__formation-btn me__formation-btn--save" onClick={() => { onSet(draft); setOpen(false); }}>Set</button>
      <button type="button" className="me__formation-btn" onClick={() => { onSet(''); setDraft(detected || ''); setOpen(false); }}>Auto</button>
    </div>
  );
}
window.FormationOverrideInput = FormationOverrideInput;
