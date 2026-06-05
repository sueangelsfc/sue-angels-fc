// PlayerProfile.jsx — rich, interactive modal player detail panel.
// Tabs: Overview · Form & Trends · Achievements · Match History
// Includes auto-generated season narrative, animated SVG charts, achievement
// badges and a chronological performance timeline.

// ─── Match-log builder ────────────────────────────────────────────────────
// `compMatcher` is an optional function that returns true for competitions we
// want to keep (e.g. only League Ten matches). When omitted, every match is
// included.
function buildPlayerMatchLog(playerNum, compMatcher, seasonKey) {
  const log = [];
  const matches = window.getAllMatchEntries();
  const seasonById = {};
  for (const r of (window.SEASON_RESULTS || [])) seasonById[r.id] = r;

  for (const { id, data } of matches) {
    const r = seasonById[id];
    if (!r) continue;
    if (compMatcher && !compMatcher(r.competition)) continue;
    if (seasonKey && seasonKey !== 'all') {
      const s = window.seasonOf ? window.seasonOf(r) : null;
      if (s && s !== seasonKey) continue;
    }
    const startEntry = (data.starters || []).find((s) => s.num === playerNum);
    const subEntry   = !startEntry && (data.bench || []).find((s) => s.num === playerNum);
    const involved = startEntry || (subEntry && subEntry.positions && subEntry.positions.length > 0);
    if (!involved) continue;

    const usHome = r.home.includes('Angels');
    let result = 'D';
    if (r.kind === 'walkover') result = 'W';
    else if (r.kind === 'penalty' && r.pens) {
      const usP = usHome ? r.pens.hs : r.pens.as;
      const themP = usHome ? r.pens.as : r.pens.hs;
      result = usP > themP ? 'W' : 'L';
    } else {
      const us = usHome ? r.hs : r.as;
      const them = usHome ? r.as : r.hs;
      result = us > them ? 'W' : us === them ? 'D' : 'L';
    }

    const goals = (data.goals   || []).filter((g) => g.num === playerNum).length;
    const pens  = (data.goals   || []).filter((g) => g.num === playerNum && g.penalty).length;
    const pensMissed = (data.penaltiesMissed || []).filter((p) => p.num === playerNum).length;
    const asts  = (data.assists || []).filter((a) => a.num === playerNum).length;
    const yc    = (data.yellowCards || []).filter((c) => c.num === playerNum).length;
    const rc    = (data.redCards    || []).filter((c) => c.num === playerNum).length;
    const motm  = data.motm === playerNum;

    log.push({
      r, result,
      role: startEntry ? 'START' : 'SUB',
      positions: (startEntry || subEntry).positions || [],
      subbedOff: startEntry ? !!startEntry.subbedOff : false,
      formation: data.formation || null,
      goals, pens, pensMissed, asts, yc, rc, motm,
    });
  }
  const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  const parse = (s) => { const m = /^(\d{1,2})\s+(\w{3})\s+(\d{2})$/.exec((s||'').trim()); return m ? new Date(2000 + parseInt(m[3]), months[m[2]] || 0, parseInt(m[1])) : new Date(0); };
  log.sort((a, b) => parse(b.r.date) - parse(a.r.date));
  return log;
}

// ─── Auto-generated season narrative ─────────────────────────────────────
function generateNarrative(base, stats, matchLog, blanket) {
  if (matchLog.length === 0) {
    return `${base.first} ${base.last} hasn't featured in a logged match yet this season.`;
  }

  const fullName = `${base.first} ${base.last}`;
  const firstName = base.first;
  const role = blanket.toLowerCase();

  const last = matchLog[0];
  const lastUsHome = last.r.home.includes('Angels');
  const lastOpp = (lastUsHome ? last.r.away : last.r.home).replace(' FC', '');
  const lastUs   = lastUsHome ? last.r.hs : last.r.as;
  const lastThem = lastUsHome ? last.r.as : last.r.hs;
  const lastScore = last.r.kind === 'walkover' ? last.r.wo : `${lastUs}–${lastThem}`;
  const lastContribBits = [];
  if (last.goals > 0) lastContribBits.push(`${last.goals === 1 ? 'a goal' : last.goals + ' goals'}`);
  if (last.asts  > 0) lastContribBits.push(`${last.asts  === 1 ? 'an assist' : last.asts + ' assists'}`);
  if (last.motm)      lastContribBits.push('the Man of the Match award');

  const recent = matchLog.slice(0, 5);
  const recentForm = recent.map((m) => m.result).join(' ');
  const recentW = recent.filter((m) => m.result === 'W').length;
  const personalW = matchLog.filter((m) => m.result === 'W').length;
  const winPct = matchLog.length ? Math.round((personalW / matchLog.length) * 100) : 0;

  const pieces = [];

  // Cinematic opener by archetype.
  if (stats.goals >= 10)        pieces.push(`When Sue’s Angels FC have needed a moment this season, ${fullName} has answered.`);
  else if (stats.assists >= 5)  pieces.push(`Champions are built around players who make the others look better. ${fullName} has been that player.`);
  else if (stats.motm >= 2)     pieces.push(`Pick a winning night this season, and the ${role}’s name keeps coming up in the dressing room.`);
  else if (stats.apps >= 12)    pieces.push(`The team-sheet is a tell. The same ${role}’s name keeps appearing on it, week after week.`);
  else                          pieces.push(`Every title-winning side has names that don’t need to shout. ${fullName} is one of those names.`);

  let line = `${stats.apps} ${stats.apps === 1 ? 'appearance' : 'appearances'}, ${stats.started} of those from the start`;
  if (stats.goals > 0)   line += `, ${stats.goals} ${stats.goals === 1 ? 'goal' : 'goals'}`;
  if (stats.assists > 0) line += `, ${stats.assists} ${stats.assists === 1 ? 'assist' : 'assists'}`;
  line += '.';
  pieces.push(line);

  if (stats.mostPlayedPosition) {
    if (stats.positionBreakdown.length > 1) {
      pieces.push(`Most often at ${stats.mostPlayedPosition}, though the gaffer has trusted ${firstName} across ${stats.positionBreakdown.length} positions — the kind of versatility a title run needs.`);
    } else {
      pieces.push(`Locked into the ${stats.mostPlayedPosition} role and never let it go.`);
    }
  }

  // Live-update from last fixture.
  const recentRole = last.role === 'START' ? 'started' : 'came off the bench';
  const recentResult = last.result === 'W' ? 'win' : last.result === 'D' ? 'draw' : 'defeat';
  let recentLine = `${firstName} ${recentRole} most recently in the ${lastScore} ${recentResult} ${lastUsHome ? 'at home' : 'away'} to ${lastOpp} on ${last.r.date}`;
  if (lastContribBits.length) recentLine += `, finishing with ${lastContribBits.join(' and ')}`;
  recentLine += '.';
  pieces.push(recentLine);

  if (recent.length >= 3) {
    pieces.push(`Recent form across the last ${recent.length} ${firstName} has featured in: ${recentForm}. The team has gone ${recentW} ${recentW === 1 ? 'win' : 'wins'} from those ${recent.length}.`);
  }

  if (matchLog.length >= 5) {
    if (winPct === 100)    pieces.push(`Sue’s Angels FC are unbeaten with ${firstName} on the pitch this season — ${matchLog.length} games, ${matchLog.length} wins. Make of that what you will.`);
    else if (winPct >= 80) pieces.push(`A ${winPct}% win rate when ${firstName} features. The numbers speak.`);
  }

  if (stats.motm >= 3)      pieces.push(`${stats.motm} Man of the Match awards on the mantelpiece — the squad recognises what the numbers can’t fully capture.`);
  else if (stats.motm > 0)  pieces.push(`${stats.motm === 1 ? 'A Man of the Match award' : `${stats.motm} Man of the Match awards`} already this season.`);
  if (stats.captained > 0)  pieces.push(`Worn the armband ${stats.captained} ${stats.captained === 1 ? 'time' : 'times'} — trust earned, not given.`);
  if (stats.penaltiesScored > 0) pieces.push(`${stats.penaltiesScored} from the spot. Ice in the veins.`);
  if (stats.rc > 0)         pieces.push(`A red card to learn from this season — ${stats.rc === 1 ? 'one' : stats.rc} of them.`);
  else if (stats.yc + stats.rc === 0 && stats.apps >= 5) pieces.push(`And in ${stats.apps} appearances, not a single card. Disciplined, ruthless.`);

  return pieces.join(' ');
}

// ─── Achievement badges ──────────────────────────────────────────────────
function detectAchievements(stats, matchLog) {
  const badges = [];
  // Hat-trick
  const hatMatch = matchLog.find((m) => m.goals >= 3);
  if (hatMatch) badges.push({ icon: '⚽⚽⚽', label: 'HAT-TRICK HERO', sub: `${hatMatch.goals} goals vs ${(hatMatch.r.home.includes('Angels') ? hatMatch.r.away : hatMatch.r.home).replace(' FC', '')}` });
  // Brace
  const braceCount = matchLog.filter((m) => m.goals === 2).length;
  if (braceCount > 0) badges.push({ icon: '⚽⚽', label: 'BRACE COLLECTOR', sub: `${braceCount} ${braceCount === 1 ? 'brace' : 'braces'} this season` });
  // Iron man — appeared in 80%+ of played matches
  const totalPlayed = (window.SEASON_RESULTS || []).filter((r) => window.loadMatchEntry && window.loadMatchEntry(r.id)).length;
  if (totalPlayed >= 5 && stats.apps / totalPlayed >= 0.8) badges.push({ icon: '🦾', label: 'IRON MAN', sub: `${stats.apps} of ${totalPlayed} logged games` });
  // Playmaker
  if (stats.assists >= 5) badges.push({ icon: '🎯', label: 'PLAYMAKER', sub: `${stats.assists} assists` });
  // Goal machine
  if (stats.goals >= 10) badges.push({ icon: '🔥', label: 'GOAL MACHINE', sub: `${stats.goals} goals` });
  else if (stats.goals >= 5) badges.push({ icon: '🎯', label: 'SHARP SHOOTER', sub: `${stats.goals} goals` });
  // MOTM streak
  if (stats.motm >= 3) badges.push({ icon: '⭐', label: 'MOTM MAGNET', sub: `${stats.motm} awards` });
  else if (stats.motm > 0) badges.push({ icon: '⭐', label: 'PLAYER OF THE MATCH', sub: `${stats.motm}×` });
  // Unbeaten
  const wins = matchLog.filter((m) => m.result === 'W').length;
  if (matchLog.length >= 3 && wins === matchLog.length) badges.push({ icon: '👑', label: 'NEVER LOST', sub: `${matchLog.length} from ${matchLog.length}` });
  // Versatile
  if (stats.positionBreakdown.length >= 3) badges.push({ icon: '🔁', label: 'VERSATILE', sub: `${stats.positionBreakdown.length} positions` });
  // Penalty king
  if (stats.penaltiesScored >= 3) badges.push({ icon: '⚪', label: 'PENALTY KING', sub: `${stats.penaltiesScored} from the spot` });
  // GK saves
  if (stats.penaltiesSaved > 0) badges.push({ icon: '🧤', label: 'PENALTY STOPPER', sub: `${stats.penaltiesSaved} saved` });
  // Clean discipline
  if (matchLog.length >= 5 && stats.yc === 0 && stats.rc === 0) badges.push({ icon: '🕊️', label: 'CLEAN SLATE', sub: `0 cards in ${matchLog.length} games` });
  return badges;
}

// ─── Charts ──────────────────────────────────────────────────────────────
function StatBar({ value, total, color = 'var(--volt)', label }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="pp-bar">
      <div className="pp-bar__head">
        <span>{label}</span>
        <span><strong>{value}</strong> / {total}</span>
      </div>
      <div className="pp-bar__track">
        <div className="pp-bar__fill" style={{ width: pct + '%', background: color }} />
      </div>
    </div>
  );
}

function PositionDonut({ breakdown, total }) {
  const [hover, setHover] = React.useState(null);
  if (!breakdown.length) return <div className="pp-empty">No positions recorded yet.</div>;
  const colourFor = (pos) => {
    const g = window.formationGroupOf(pos);
    if (g === 'GK')  return '#22D3EE';
    if (g === 'DEF') return '#6EE7B7';
    if (g === 'MID') return '#D6F23A';
    if (g === 'ATT') return '#FF8A65';
    return '#94A3B8';
  };
  const size = 180, stroke = 28, r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = breakdown.map(([pos, n]) => {
    const pct = n / total;
    const dash = pct * circumference;
    const el = (
      <circle
        key={pos}
        cx={cx} cy={cy} r={r}
        stroke={colourFor(pos)}
        strokeWidth={hover === pos ? stroke + 4 : stroke}
        fill="none"
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={-offset}
        style={{ transition: 'stroke-width 0.2s var(--ease-out), stroke-dasharray 0.6s var(--ease-out)', cursor: 'pointer' }}
        onMouseEnter={() => setHover(pos)}
        onMouseLeave={() => setHover(null)}
      />
    );
    offset += dash;
    return el;
  });
  const centreText = hover
    ? { big: Math.round((breakdown.find(([p]) => p === hover)[1] / total) * 100) + '%', small: hover }
    : { big: total, small: 'POSITION' + (total === 1 ? '' : 'S') };
  return (
    <div className="pp-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
        <g transform={`rotate(-90 ${cx} ${cy})`}>{segments}</g>
        <text x={cx} y={cy - 4} textAnchor="middle" className="pp-donut__total">{centreText.big}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="pp-donut__label">{centreText.small}</text>
      </svg>
      <ul className="pp-donut__legend">
        {breakdown.map(([pos, n]) => {
          const pct = Math.round((n / total) * 100);
          return (
            <li key={pos}
                onMouseEnter={() => setHover(pos)}
                onMouseLeave={() => setHover(null)}
                className={hover === pos ? 'is-hover' : ''}>
              <span className="pp-donut__dot" style={{ background: colourFor(pos) }} />
              <span className="pp-donut__pos">{pos}</span>
              <span className="pp-donut__pct">{pct}%</span>
              <span className="pp-donut__n">{n}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WinGauge({ w, d, l }) {
  const total = w + d + l;
  const pct = total ? Math.round((w / total) * 100) : 0;
  const size = 140, stroke = 14, r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const wDash = (w / Math.max(total, 1)) * circumference;
  const dDash = (d / Math.max(total, 1)) * circumference;
  const lDash = (l / Math.max(total, 1)) * circumference;
  return (
    <div className="pp-gauge">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          <circle cx={cx} cy={cy} r={r} stroke="var(--win)"  strokeWidth={stroke} fill="none" strokeDasharray={`${wDash} ${circumference - wDash}`} strokeDashoffset={0} />
          <circle cx={cx} cy={cy} r={r} stroke="var(--draw)" strokeWidth={stroke} fill="none" strokeDasharray={`${dDash} ${circumference - dDash}`} strokeDashoffset={-wDash} />
          <circle cx={cx} cy={cy} r={r} stroke="var(--loss)" strokeWidth={stroke} fill="none" strokeDasharray={`${lDash} ${circumference - lDash}`} strokeDashoffset={-(wDash + dDash)} />
        </g>
        <text x={cx} y={cy - 2} textAnchor="middle" className="pp-gauge__pct">{pct}%</text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="pp-gauge__label">WIN %</text>
      </svg>
      <div className="pp-gauge__legend">
        <span><b style={{ color: 'var(--win)'  }}>{w}</b> W</span>
        <span><b style={{ color: 'var(--draw)' }}>{d}</b> D</span>
        <span><b style={{ color: 'var(--loss)' }}>{l}</b> L</span>
      </div>
    </div>
  );
}

// Form ribbon — chronological W/D/L pills (most recent right).
function FormRibbon({ matchLog }) {
  if (matchLog.length === 0) return <div className="pp-empty">No matches yet.</div>;
  const reverse = [...matchLog].reverse(); // oldest first
  return (
    <div className="pp-form">
      <div className="pp-form__legend">
        <span className="pp-form__legend-item"><span className="pp-form-pill pp-form-pill--w">W</span> Win</span>
        <span className="pp-form__legend-item"><span className="pp-form-pill pp-form-pill--d">D</span> Draw</span>
        <span className="pp-form__legend-item"><span className="pp-form-pill pp-form-pill--l">L</span> Loss</span>
        <span className="pp-form__legend-meta">Earliest → Latest</span>
      </div>
      <div className="pp-form__row">
        {reverse.map((m, i) => {
          const opp = (m.r.home.includes('Angels') ? m.r.away : m.r.home).replace(' FC', '');
          return (
            <div key={i} className={`pp-form-pill pp-form-pill--${m.result.toLowerCase()}`}
                 title={`${m.r.date} · ${opp} (${m.result})`}>
              {m.result}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Contribution timeline — vertical bars for goals + assists per match (chronological).
function ContributionTimeline({ matchLog }) {
  if (matchLog.length === 0) return <div className="pp-empty">No matches yet.</div>;
  const reverse = [...matchLog].reverse();
  const maxContrib = Math.max(3, ...reverse.map((m) => m.goals + m.asts));
  return (
    <div className="pp-timeline">
      <div className="pp-timeline__bars">
        {reverse.map((m, i) => {
          const opp = (m.r.home.includes('Angels') ? m.r.away : m.r.home).replace(' FC', '');
          const total = m.goals + m.asts;
          const goalPct = (m.goals / maxContrib) * 100;
          const astPct  = (m.asts  / maxContrib) * 100;
          return (
            <div key={i} className="pp-timeline__col"
                 title={`${m.r.date} · vs ${opp}\n${m.goals} goals, ${m.asts} assists`}>
              <div className="pp-timeline__stack">
                {m.asts > 0 && (
                  <div className="pp-timeline__bar pp-timeline__bar--a"
                       style={{ height: astPct + '%' }} />
                )}
                {m.goals > 0 && (
                  <div className="pp-timeline__bar pp-timeline__bar--g"
                       style={{ height: goalPct + '%' }} />
                )}
                {total === 0 && <div className="pp-timeline__bar pp-timeline__bar--empty" />}
              </div>
              <div className="pp-timeline__lbl">{m.r.date.split(' ')[0]}</div>
            </div>
          );
        })}
      </div>
      <div className="pp-timeline__key">
        <span><span className="pp-timeline__dot pp-timeline__dot--g" /> Goals</span>
        <span><span className="pp-timeline__dot pp-timeline__dot--a" /> Assists</span>
      </div>
    </div>
  );
}

function MatchLogRow({ entry, onSelect }) {
  const r = entry.r;
  const usHome = r.home.includes('Angels');
  const opp = usHome ? r.away : r.home;
  const venWord = usHome ? '(H)' : '(A)';
  const compShort = (r.competition || '').includes('League') ? 'LG' : (r.round || 'CUP');
  let scoreText;
  if (r.kind === 'walkover') scoreText = r.wo;
  else if (r.kind === 'penalty' && r.pens) scoreText = `${r.hs}–${r.as} (p ${r.pens.hs}–${r.pens.as})`;
  else scoreText = `${r.hs}–${r.as}`;

  return (
    <div className={`pp-log pp-log--${entry.result.toLowerCase()}`}>
      <span className={`pp-log__res pp-log__res--${entry.result.toLowerCase()}`}>{entry.result}</span>
      <div className="pp-log__main">
        <div className="pp-log__top">
          <span className="pp-log__date">{r.date}</span>
          <span className="pp-log__comp">{compShort}</span>
        </div>
        <div className="pp-log__match">
          {venWord} vs <TeamBadge team={opp} size={18} /> {opp.replace(' FC', '')} <strong>{scoreText}</strong>
        </div>
      </div>
      <div className="pp-log__role">
        <span className={`pp-log__role-tag pp-log__role-tag--${entry.role.toLowerCase()}`}>{entry.role}</span>
        {entry.positions.length > 0 && <span className="pp-log__pos">{entry.positions.join(' / ')}</span>}
        {entry.formation && <span className="pp-log__formation">{entry.formation}</span>}
        {entry.subbedOff && <span className="pp-log__suboff">SUB OFF</span>}
      </div>
      <div className="pp-log__contrib">
        {entry.goals > 0 && <span className="pp-log__chip pp-log__chip--g">⚽ {entry.goals}{entry.pens > 0 ? ` (${entry.pens}p)` : ''}</span>}
        {entry.asts  > 0 && <span className="pp-log__chip pp-log__chip--a">🅰 {entry.asts}</span>}
        {entry.motm       && <span className="pp-log__chip pp-log__chip--m">MOTM</span>}
        {entry.yc    > 0 && <span className="pp-log__chip pp-log__chip--yc">YC</span>}
        {entry.rc    > 0 && <span className="pp-log__chip pp-log__chip--rc">RC</span>}
      </div>
    </div>
  );
}

// ─── Main modal component ────────────────────────────────────────────────
function PlayerProfile({ playerNum, onClose }) {
  const [tab, setTab] = React.useState('overview');
  // Story toggle inside the BIO/SEASON STORY card — viewers can flip between
  // the auto-generated season narrative and a manually-written player bio.
  const [storyMode, setStoryMode] = React.useState('season');
  // Competition filter — applies to stats + match log + narrative + form bar.
  const [comp, setComp] = React.useState('all');
  // Season filter — defaults to the current season. 'all' aggregates lifetime.
  const [season, setSeason] = React.useState(window.CURRENT_SEASON || '25/26');
  if (!playerNum) return null;
  const base = window.SQUAD.find((p) => p.num === playerNum);
  if (!base) return null;

  const COMPETITIONS = window.COMPETITIONS || [{ key: 'all', label: 'All', match: () => true }];
  const ALL_SEASONS = window.ALL_SEASONS || ['25/26'];
  const matcher = (COMPETITIONS.find((c) => c.key === comp) || { match: () => true }).match;
  const stats = window.derivedPlayerStats(playerNum, matcher, season);
  const photo = window.usePlayerPhoto ? window.usePlayerPhoto(playerNum) : null;
  const blanket = window.blanketRole({ ...base, mostPlayedPosition: stats.mostPlayedPosition });
  const totalMatches = ((window.SEASON_RESULTS || [])
    .filter((r) => (!matcher || matcher(r.competition)))
    .filter((r) => (!season || season === 'all') ? true : (window.seasonOf ? window.seasonOf(r) === season : true))
    .filter((r) => window.loadMatchEntry && window.loadMatchEntry(r.id))).length;
  const matchLog = buildPlayerMatchLog(playerNum, matcher, season);
  const narrative = generateNarrative(base, stats, matchLog, blanket);
  const achievements = detectAchievements(stats, matchLog);

  const personalW = matchLog.filter((m) => m.result === 'W').length;
  const personalD = matchLog.filter((m) => m.result === 'D').length;
  const personalL = matchLog.filter((m) => m.result === 'L').length;
  const totalPositionsLogged = stats.positionBreakdown.reduce((s, [, n]) => s + n, 0);
  const openPlay = Math.max(0, stats.goals - stats.penaltiesScored);

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const tabs = [
    ['overview',     'Overview'],
    ['trends',       'Form & Trends'],
    ['achievements', 'Achievements'],
    ['history',      'Match History'],
  ];

  return (
    <div className="pp-overlay" onClick={onClose}>
      <div className="pp" onClick={(e) => e.stopPropagation()}>
        <button className="pp__close" onClick={onClose} aria-label="Close">×</button>

        {/* Header */}
        <header className="pp__head">
          <div className="pp__avatar">
            {photo
              ? <img src={photo} alt={`${base.first} ${base.last}`} className="pp__avatar-img" />
              : <div className="pp__avatar-num">{base.first[0]}{base.last[0]}</div>}
          </div>
          <div className="pp__hd-text">
            <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>{blanket.toUpperCase()}</span>
            <h2 className="pp__name">{base.first} {base.last}</h2>
            <p className="pp__sub">
              {stats.mostPlayedPosition
                ? <>Plays most as <strong style={{ color: 'var(--volt)' }}>{stats.mostPlayedPosition}</strong> &middot; {stats.apps} {stats.apps === 1 ? 'appearance' : 'appearances'} from {totalMatches} {totalMatches === 1 ? 'match' : 'matches'} entered</>
                : <>No position recorded yet &middot; {totalMatches} {totalMatches === 1 ? 'match' : 'matches'} entered</>}
            </p>
            {window.PhotoUploader && (window.useAdmin && window.useAdmin()) && <PhotoUploader playerNum={playerNum} />}
          </div>
        </header>

        {/* Competition + Season filters — League / Cup / All + 25/26 / All */}
        <div className="pp-comp-filter">
          <span className="pp-comp-filter__lbl t-eyebrow">SEASON</span>
          <div className="filters">
            <button
              type="button"
              className={`chip ${season === 'all' ? 'chip--volt' : ''}`}
              onClick={() => setSeason('all')}
            >All seasons</button>
            {ALL_SEASONS.map((s) => (
              <button
                key={s}
                type="button"
                className={`chip ${season === s ? 'chip--volt' : ''}`}
                onClick={() => setSeason(s)}
              >{s}</button>
            ))}
          </div>
        </div>

        <div className="pp-comp-filter">
          <span className="pp-comp-filter__lbl t-eyebrow">COMPETITION</span>
          <div className="filters">
            {COMPETITIONS.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`chip ${comp === c.key ? 'chip--volt' : ''}`}
                onClick={() => setComp(c.key)}
              >{c.label}</button>
            ))}
          </div>
        </div>

        {/* Auto-narrative + manual bio toggle */}
        <div className="pp-narrative">
          <div className="pp-narrative__head">
            <div className="pp-narrative__tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={storyMode === 'season'}
                className={`pp-narrative__tab ${storyMode === 'season' ? 'is-on' : ''}`}
                onClick={() => setStoryMode('season')}
              >SEASON STORY</button>
              <button
                type="button"
                role="tab"
                aria-selected={storyMode === 'bio'}
                className={`pp-narrative__tab ${storyMode === 'bio' ? 'is-on' : ''}`}
                onClick={() => setStoryMode('bio')}
              >PLAYER BIO</button>
            </div>
            <span className="pp-narrative__meta">
              {storyMode === 'season' ? 'AUTO · LIVE' : 'WRITTEN BIO'}
            </span>
          </div>
          {storyMode === 'season'
            ? narrative.split(/(?<=\.)\s+(?=[A-Z“])/g).map((para, i) => <p key={i}>{para}</p>)
            : (() => {
                const manual = window.PLAYER_BIOS && window.PLAYER_BIOS[playerNum];
                if (manual) return manual.split(/\n+/).map((p, i) => <p key={i}>{p}</p>);
                return (
                  <p className="pp-narrative__empty">
                    No personal bio yet for {base.first} {base.last}. Coach to add.
                  </p>
                );
              })()
          }
        </div>

        {/* KPI strip — grouped into clean labelled blocks rather than one long
            ragged row. Each group is a titled cluster; the headline number in
            each group is volt. Conditional metrics only appear when non-zero. */}
        <div className="pp-kpi">
          <div className="pp-kpi__group">
            <span className="pp-kpi__group-label">Appearances</span>
            <div className="pp-kpi__cells">
              <div className="pp-kpi__cell pp-kpi__cell--hero"><b>{stats.apps}</b><i>Apps</i></div>
              <div className="pp-kpi__cell"><b>{stats.started}</b><i>Starts</i></div>
              <div className="pp-kpi__cell"><b>{stats.subbedOn}</b><i>Sub</i></div>
            </div>
          </div>

          <div className="pp-kpi__group">
            <span className="pp-kpi__group-label">Attack</span>
            <div className="pp-kpi__cells">
              <div className="pp-kpi__cell pp-kpi__cell--hero"><b>{stats.goals}</b><i>Goals</i></div>
              <div className="pp-kpi__cell pp-kpi__cell--hero"><b>{stats.assists}</b><i>Assists</i></div>
              <div className="pp-kpi__cell"><b>{stats.goalInvolvements}</b><i>G+A</i></div>
              {stats.setPiecesScored > 0 && <div className="pp-kpi__cell"><b>{stats.setPiecesScored}</b><i>Set&nbsp;pc.</i></div>}
            </div>
          </div>

          {(stats.penaltyAttempts > 0 || stats.penaltiesScored > 0 || (base.gk && stats.penaltiesSaved > 0)) && (
            <div className="pp-kpi__group">
              <span className="pp-kpi__group-label">Penalties</span>
              <div className="pp-kpi__cells">
                <div className="pp-kpi__cell"><b>{stats.penaltiesScored}</b><i>Scored</i></div>
                {stats.penaltiesMissed > 0 && <div className="pp-kpi__cell"><b>{stats.penaltiesMissed}</b><i>Missed</i></div>}
                {stats.penaltyAttempts > 0 && <div className="pp-kpi__cell pp-kpi__cell--hero"><b>{stats.penaltyConversion}%</b><i>Conv.</i></div>}
                {base.gk && <div className="pp-kpi__cell"><b>{stats.penaltiesSaved}</b><i>Saved</i></div>}
              </div>
            </div>
          )}

          <div className="pp-kpi__group">
            <span className="pp-kpi__group-label">Recognition</span>
            <div className="pp-kpi__cells">
              <div className="pp-kpi__cell"><b>{stats.motm}</b><i>MOTM</i></div>
              {stats.captained > 0 && <div className="pp-kpi__cell"><b>{stats.captained}</b><i>Capt.</i></div>}
              <div className="pp-kpi__cell pp-kpi__cell--yc"><b>{stats.yc}</b><i>Yellow</i></div>
              <div className="pp-kpi__cell pp-kpi__cell--rc"><b>{stats.rc}</b><i>Red</i></div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="pp-tabs">
          {tabs.map(([k, l]) => (
            <button key={k} className={`pp-tab ${tab === k ? 'is-active' : ''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <React.Fragment>
            <div className="pp-row">
              <section className="pp-card">
                <h4>RECORD WHEN ON THE PITCH</h4>
                {stats.apps > 0
                  ? <WinGauge w={personalW} d={personalD} l={personalL} />
                  : <span className="pp-empty">Hasn&rsquo;t appeared in a logged match yet.</span>}
              </section>
              <section className="pp-card">
                <h4>POSITIONS PLAYED</h4>
                <PositionDonut breakdown={stats.positionBreakdown} total={totalPositionsLogged} />
              </section>
            </div>
            <section className="pp-card">
              <h4>HOW THEY GOT ON THE PITCH</h4>
              <StatBar value={stats.started}     total={totalMatches} label="Started" />
              <StatBar value={stats.subbedOn}    total={totalMatches} label="Came on from bench" color="#22D3EE" />
              <StatBar value={stats.subbedOff}   total={stats.started || 1} label="Subbed off after starting" color="#F2C744" />
              <StatBar value={stats.benchUnused} total={totalMatches} label="Unused sub" color="rgba(255,255,255,0.18)" />
            </section>
            {stats.goals > 0 && (
              <section className="pp-card">
                <h4>WHERE THE GOALS CAME FROM</h4>
                <StatBar value={Math.max(0, stats.goals - stats.penaltiesScored - stats.setPiecesScored)} total={stats.goals} label="Open play" />
                <StatBar value={stats.setPiecesScored} total={stats.goals} label="Set piece" color="#22D3EE" />
                <StatBar value={stats.penaltiesScored} total={stats.goals} label="Penalty" color="#F2C744" />
              </section>
            )}
            {stats.penaltyAttempts > 0 && (
              <section className="pp-card">
                <h4>PENALTY CONVERSION</h4>
                <div className="pp-pen-stats">
                  <div className="pp-pen-stats__main">
                    <span className="pp-pen-stats__pct">{stats.penaltyConversion}%</span>
                    <span className="pp-pen-stats__lbl">CONVERSION</span>
                  </div>
                  <div className="pp-pen-stats__breakdown">
                    <div className="pp-pen-stats__row">
                      <span className="pp-pen-stats__bar">
                        <span className="pp-pen-stats__bar-fill pp-pen-stats__bar-fill--scored" style={{ width: `${(stats.penaltiesScored / stats.penaltyAttempts) * 100}%` }} />
                      </span>
                      <span className="pp-pen-stats__v">{stats.penaltiesScored}</span>
                      <span className="pp-pen-stats__l">SCORED</span>
                    </div>
                    <div className="pp-pen-stats__row">
                      <span className="pp-pen-stats__bar">
                        <span className="pp-pen-stats__bar-fill pp-pen-stats__bar-fill--missed" style={{ width: `${(stats.penaltiesMissed / stats.penaltyAttempts) * 100}%` }} />
                      </span>
                      <span className="pp-pen-stats__v">{stats.penaltiesMissed}</span>
                      <span className="pp-pen-stats__l">MISSED</span>
                    </div>
                    <div className="pp-pen-stats__row pp-pen-stats__row--total">
                      <span className="pp-pen-stats__v">{stats.penaltyAttempts}</span>
                      <span className="pp-pen-stats__l">ATTEMPTS</span>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </React.Fragment>
        )}

        {tab === 'trends' && (
          <React.Fragment>
            <section className="pp-card">
              <h4>FORM RIBBON</h4>
              <FormRibbon matchLog={matchLog} />
            </section>
            <section className="pp-card">
              <h4>GOALS + ASSISTS BY MATCH</h4>
              <ContributionTimeline matchLog={matchLog} />
            </section>
            <div className="pp-row">
              <section className="pp-card">
                <h4>OUTPUT PER MATCH</h4>
                <div className="pp-bigstat">
                  <div className="pp-bigstat__v">{stats.apps ? ((stats.goals + stats.assists) / stats.apps).toFixed(2) : '0.00'}</div>
                  <div className="pp-bigstat__l">Goal involvements per game</div>
                </div>
                <div className="pp-bigstat">
                  <div className="pp-bigstat__v" style={{ color: '#22D3EE' }}>{stats.apps ? (stats.goals / stats.apps).toFixed(2) : '0.00'}</div>
                  <div className="pp-bigstat__l">Goals per game</div>
                </div>
              </section>
              <section className="pp-card">
                <h4>STARTER vs SUB</h4>
                <div className="pp-bigstat">
                  <div className="pp-bigstat__v">{stats.apps ? Math.round((stats.started / stats.apps) * 100) : 0}%</div>
                  <div className="pp-bigstat__l">Games started</div>
                </div>
                <div className="pp-bigstat">
                  <div className="pp-bigstat__v" style={{ color: '#22D3EE' }}>{stats.started ? Math.round((stats.subbedOff / stats.started) * 100) : 0}%</div>
                  <div className="pp-bigstat__l">Subbed off when starting</div>
                </div>
              </section>
            </div>
          </React.Fragment>
        )}

        {tab === 'achievements' && (
          <section className="pp-card">
            <h4>SEASON BADGES ({achievements.length})</h4>
            {achievements.length === 0 ? (
              <span className="pp-empty">No badges unlocked yet. Goals, assists, MOTMs and clean games unlock these automatically.</span>
            ) : (
              <div className="pp-badges">
                {achievements.map((b, i) => (
                  <div key={i} className="pp-badge">
                    <div className="pp-badge__icon">{b.icon}</div>
                    <div className="pp-badge__label">{b.label}</div>
                    <div className="pp-badge__sub">{b.sub}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'history' && (
          <section className="pp-card">
            <h4>EVERY MATCH ({matchLog.length})</h4>
            {matchLog.length === 0 ? (
              <span className="pp-empty">No matches logged yet.</span>
            ) : (
              <div className="pp-log-list">
                {matchLog.map((entry, i) => <MatchLogRow key={i} entry={entry} />)}
              </div>
            )}
          </section>
        )}

        <footer className="pp-foot">
          <span className="t-meta" style={{ color: 'var(--fg-3)' }}>Press <kbd>Esc</kbd> or click outside to close.</span>
        </footer>
      </div>
    </div>
  );
}

window.PlayerProfile = PlayerProfile;
