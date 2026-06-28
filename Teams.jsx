function PlayerCardFull({ p, onOpen }) {
  const blanket = window.blanketRole(p);
  const isGK = blanket === 'Goalkeeper';
  const photo = window.usePlayerPhoto ? window.usePlayerPhoto(p.num) : null;
  const admin = window.useAdmin ? window.useAdmin() : false;
  const role = blanket.toUpperCase();
  const accent = isGK ? 'gk' : role === 'DEFENDER' ? 'def' : role === 'MIDFIELDER' ? 'mid' : role === 'ATTACKER' ? 'att' : 'sq';
  // Primary stat = position-relevant headline.
  const primary = isGK
    ? { v: p.cleanSheets || 0, l: (p.cleanSheets || 0) === 1 ? 'Clean Sheet' : 'Clean Sheets' }
    : p.goals > 0   ? { v: p.goals, l: 'Goals' }
    : p.assists > 0 ? { v: p.assists, l: 'Assists' }
    : { v: p.apps || 0, l: 'Apps' };
  // Hover-revealed secondary stats (3 metrics matching homepage carousel)
  const secondary = isGK
    ? [
        { v: p.gkApps || 0, l: 'GK Apps' },
        { v: p.goalsConceded || 0, l: 'Conceded' },
        { v: p.penaltiesSaved || 0, l: 'Saved' },
      ]
    : [
        { v: p.apps || 0, l: 'Apps' },
        { v: p.goals || 0, l: 'Goals' },
        { v: p.assists || 0, l: 'Assists' },
      ];
  return (
    <div
      role="button"
      tabIndex={0}
      className={`player-card is-live is-compact player-card--btn player-card--${accent}`}
      onClick={() => onOpen(p.num)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(p.num); } }}
    >
      <div className="player-card__rail" aria-hidden="true" />
      <div className="player-card__photo">
        <img src={photo || 'assets/players/avatar.svg'} alt="" />
        {(p.captained > 0 || p.motm > 0) && (
          <div className="player-card__badges">
            {p.captained > 0 && <span className="player-card__pill player-card__pill--c" title={`Captain × ${p.captained}`}>C</span>}
            {p.motm > 0     && <span className="player-card__pill player-card__pill--m" title={`MOTM × ${p.motm}`}>★</span>}
          </div>
        )}
        {admin && window.PhotoUploader && (
          // The whole pill bar sits in a corner overlay. Clicking pops the
          // hidden file input, we stop propagation so the surrounding card
          // doesn't also fire its onOpen handler.
          <div className="player-card__admin-photo" onClick={(e) => e.stopPropagation()}>
            <PhotoUploader playerNum={p.num} compact />
          </div>
        )}
      </div>
      <div className="player-card__info">
        <div className="player-card__name">{p.first} {p.last}</div>
        <div className="player-card__role">{role}</div>
        <div className="player-card__stat">
          <span className="player-card__stat-v">{primary.v || 0}</span>
          <span className="player-card__stat-l">{primary.l}</span>
        </div>
        <div className="player-card__hover-stats" aria-hidden="true">
          {secondary.map((s) => (
            <div key={s.l}>
              <span>{s.v}</span>
              <label>{s.l}</label>
            </div>
          ))}
        </div>
        {/* Bio slot, populated when window.PLAYER_BIOS[p.num] is set. Leaving
            the element in the DOM so the card height is consistent across the
            squad as bios get added one at a time. */}
        <div className="player-card__bio">
          {window.PLAYER_BIOS && window.PLAYER_BIOS[p.num]
            ? <p>{window.PLAYER_BIOS[p.num]}</p>
            : <p className="player-card__bio--placeholder">Bio coming soon.</p>}
        </div>
      </div>
    </div>
  );
}

// ─── CoachesGrid ─────────────────────────────────────────────────────────
// Renders the FIRST-TEAM MANAGER as a featured card with photo + bio +
// playing & managerial CV. The remaining backroom roles render as compact
// "TBA" tiles so the section still feels populated.
function CoachesGrid() {
  const coaches = window.COACHES || [];
  const manager = coaches.find((c) => c.role === 'FIRST-TEAM MANAGER') || null;
  const otherRoles = ['ASSISTANT MANAGER', 'COACH', 'GK COACH', 'PHYSIO'];
  return (
    <div className="coaches-grid">
      {manager && (
        <article className="coach-feature">
          <div className="coach-feature__photo">
            {(() => {
              const key = 'coach-' + manager.id;
              const custom = window.usePlayerPhoto ? window.usePlayerPhoto(key) : null;
              const admin = window.useAdmin ? window.useAdmin() : false;
              return (
                <React.Fragment>
                  <img src={custom || manager.photo} alt={manager.name} />
                  <span className="coach-feature__role">{manager.role}</span>
                  {admin && window.PhotoUploader && (
                    <div className="coach-feature__upload" onClick={(e) => e.stopPropagation()}>
                      <window.PhotoUploader playerNum={key} compact={true} />
                    </div>
                  )}
                </React.Fragment>
              );
            })()}
          </div>
          <div className="coach-feature__body">
            <header className="coach-feature__head">
              <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>{manager.role}</span>
              <h2 className="coach-feature__name">{manager.name}</h2>
              <p className="coach-feature__short">{manager.short}</p>
            </header>
            <div className="coach-feature__bio">
              {(manager.bio || []).map((para, i) => <p key={i}>{para}</p>)}
            </div>
            <div className="coach-feature__cv">
              {manager.playedFor && manager.playedFor.length > 0 && (
                <section>
                  <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>PLAYED FOR</span>
                  <ul>{manager.playedFor.map((club) => <li key={club}>{club}</li>)}</ul>
                </section>
              )}
              {manager.managed && manager.managed.length > 0 && (
                <section>
                  <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>MANAGED</span>
                  <ul>{manager.managed.map((club) => <li key={club}>{club}</li>)}</ul>
                </section>
              )}
              {manager.supports && (
                <section className="coach-feature__supports">
                  <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>SUPPORTS</span>
                  <strong>{manager.supports}</strong>
                </section>
              )}
            </div>
          </div>
        </article>
      )}
      <div className="coach-tba-grid">
        {otherRoles.map((r) => (
          <article key={r} className="coach-card">
            <PlaceholderTile label={r} hint="To be confirmed" />
            <div className="coach-card__meta">
              <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>{r}</span>
              <div className="t-h4" style={{ color: 'var(--fg-1)' }}>TBA</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function StatLeaderRow({ rank, p, value, label }) {
  return (
    <div className="leader-row">
      <span className="leader-row__rank">{rank}</span>
      <span className="leader-row__name">{p.first} {p.last}</span>
      <span className="leader-row__v">{value}</span>
      <span className="leader-row__l">{label}</span>
    </div>
  );
}

function EmptyLeader({ label }) {
  return (
    <div className="leader-row" style={{ opacity: 0.6 }}>
      <span className="leader-row__rank">-</span>
      <span className="leader-row__name" style={{ color: 'var(--fg-3)' }}>No data yet</span>
      <span className="leader-row__l">{label}</span>
    </div>
  );
}

// Leaderboards, sortable stats table with avatar column.
// Columns are bucketed: Player / Apps / Goals (subtotals) / Creativity / Discipline.
function LeaderRowPhoto({ num }) {
  const photo = window.usePlayerPhoto ? window.usePlayerPhoto(num) : null;
  return (
    <div className="lb-avatar">
      {photo
        ? <img src={photo} alt="" />
        : <span className="lb-avatar__placeholder" aria-hidden="true">•</span>}
    </div>
  );
}

function CompFilteredLeaders() {
  const [comp, setComp] = React.useState('all');
  const [season, setSeason] = React.useState(window.CURRENT_SEASON || '25/26');
  const [sortKey, setSortKey] = React.useState('goals');
  const [sortDir, setSortDir] = React.useState('desc');
  const [openPlayer, setOpenPlayer] = React.useState(null);
  const COMPETITIONS = window.COMPETITIONS || [];
  const ALL_SEASONS = window.ALL_SEASONS || ['25/26'];
  // 26/27 (League Eight) competitions are built from the data: League Eight
  // always shows; as soon as cup/friendly fixtures are logged for 26/27, those
  // competitions + an "All" option appear automatically.
  const compsForSeason = (() => {
    if (season !== '26/27') return COMPETITIONS;
    const seasonOf = window.seasonOf || (() => window.CURRENT_SEASON);
    const items = [...(window.SEASON_RESULTS || []), ...(window.UPCOMING_FIXTURES || [])]
      .filter((it) => seasonOf(it) === '26/27');
    const names = Array.from(new Set(items.map((it) => it.competition || it.comp).filter(Boolean)));
    const isLeague = (c) => /league eight|league 8/i.test(c || '');
    const cups = names.filter((c) => !isLeague(c));
    const list = [];
    if (cups.length > 0) list.push({ key: 'all', label: 'All', match: () => true });
    list.push({ key: 'league8', label: 'League Eight', match: (c) => isLeague(c) });
    cups.forEach((name, i) => list.push({ key: 'cup' + i, label: name, match: (c) => (c || '') === name }));
    return list;
  })();
  const matcher = (compsForSeason.find((c) => c.key === comp) || { match: () => true }).match;

  const rows = window.derivedSquad(matcher, season)
    .filter((p) => p.apps > 0 || p.benchUnused > 0)
    .map((p) => ({
      ...p,
      openPlay: Math.max(0, p.goals - p.penaltiesScored - p.setPiecesScored),
      goalInvolvements: (p.goals || 0) + (p.assists || 0),
      penAttempts: (p.penaltiesScored || 0) + (p.penaltiesMissed || 0),
      penPct: ((p.penaltiesScored || 0) + (p.penaltiesMissed || 0)) > 0
        ? Math.round(((p.penaltiesScored || 0) / ((p.penaltiesScored || 0) + (p.penaltiesMissed || 0))) * 100)
        : null,
    }));
  rows.sort((a, b) => {
    const dir = sortDir === 'desc' ? -1 : 1;
    const av = a[sortKey] || 0, bv = b[sortKey] || 0;
    if (av === bv) return (b.goals - a.goals) || (b.apps - a.apps);
    return av < bv ? -dir : dir;
  });

  const onSort = (k) => {
    if (k === sortKey) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  // Compact narrow header with sort caret. Tooltip via title attribute.
  const Hdr = ({ k, children, title, group }) => (
    <th className={`lb2__th lb2__th--num ${sortKey === k ? 'is-sorted is-sorted--' + sortDir : ''} ${group ? 'lb2__th--' + group : ''}`}
        onClick={() => onSort(k)} title={title || ''}>
      <span className="lb2__th-l">{children}</span>
      <span className="lb2__caret" aria-hidden="true">{sortKey === k ? (sortDir === 'desc' ? '▼' : '▲') : '↕'}</span>
    </th>
  );

  return (
    <React.Fragment>
      <div className="lb2-toolbar">
        <div className="lb2-toolbar__group">
          <span className="t-eyebrow lb2-toolbar__lbl">SEASON</span>
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

        <div className="lb2-toolbar__group">
          <span className="t-eyebrow lb2-toolbar__lbl">COMPETITION</span>
          <div className="filters">
            {compsForSeason.map((c) => (
              <button key={c.key} className={`chip ${comp === c.key ? 'chip--volt' : ''}`} onClick={() => setComp(c.key)}>{c.label}</button>
            ))}
          </div>
        </div>
        <div className="lb2-toolbar__meta">
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="placeholder placeholder--big">
          <div className="placeholder__inner">
            <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>NO DATA YET</span>
            <span className="placeholder__hint">No appearances logged for this competition yet.</span>
          </div>
        </div>
      ) : (
        <div className="lb2-wrap">
          <table className="lb2">
            <thead>
              <tr>
                <th className="lb2__th lb2__th--pos">#</th>
                <th className="lb2__th lb2__th--name">PLAYER</th>
                <Hdr k="apps"    title="Appearances"        group="apps">APPS</Hdr>
                <Hdr k="started" title="Starts"             group="apps">ST</Hdr>
                <Hdr k="subbedOn" title="Sub appearances"   group="apps">SUB</Hdr>
                <Hdr k="goals"    title="Total goals"       group="goals">GLS</Hdr>
                <Hdr k="openPlay" title="Open play"         group="goals">OP</Hdr>
                <Hdr k="setPiecesScored" title="Set piece"  group="goals">SP</Hdr>
                <Hdr k="assists"  title="Assists"           group="creat">AST</Hdr>
                <Hdr k="goalInvolvements" title="Goals + Assists" group="creat">G/A</Hdr>
                <Hdr k="motm"     title="Man of the Match"  group="creat">MOTM</Hdr>
                <Hdr k="penaltiesScored" title="Penalties scored"    group="pen">PS</Hdr>
                <Hdr k="penaltiesMissed" title="Penalties missed"    group="pen">PM</Hdr>
                <Hdr k="penPct"          title="Conversion %"        group="pen">%</Hdr>
                <Hdr k="yc"       title="Yellow cards"      group="disc">YC</Hdr>
                <Hdr k="rc"       title="Red cards"         group="disc">RC</Hdr>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.num} onClick={() => setOpenPlayer(p.num)}
                    className={`lb2__row ${i === 0 ? 'lb2__row--top' : ''}`}>
                  <td className="lb2__pos">
                    {i === 0 && <span className="lb2__crown" aria-label="Top">★</span>}
                    <span className="lb2__pos-n">{i + 1}</span>
                  </td>
                  <td className="lb2__name">
                    <LeaderRowPhoto num={p.num} />
                    <div className="lb2__name-text">
                      <span className="lb2__name-main">{p.first} {p.last}</span>
                      <span className="lb2__name-sub">{window.blanketRole ? window.blanketRole(p) : 'Squad'}</span>
                    </div>
                  </td>
                  <td className={`lb2__td ${sortKey === 'apps' ? 'is-on' : ''}`}>{p.apps}</td>
                  <td className="lb2__td lb2__td--muted">{p.started}</td>
                  <td className="lb2__td lb2__td--muted">{p.subbedOn || ''}</td>
                  <td className={`lb2__td lb2__td--big ${sortKey === 'goals' ? 'is-on' : ''}`}>{p.goals}</td>
                  <td className="lb2__td lb2__td--muted">{p.openPlay || ''}</td>
                  <td className="lb2__td lb2__td--muted">{p.setPiecesScored || ''}</td>
                  <td className={`lb2__td ${sortKey === 'assists' ? 'is-on' : ''}`}>{p.assists}</td>
                  <td className={`lb2__td lb2__td--big ${sortKey === 'goalInvolvements' ? 'is-on' : ''}`}>{p.goalInvolvements || ''}</td>
                  <td className="lb2__td lb2__td--muted">{p.motm || ''}</td>
                  <td className="lb2__td lb2__td--muted">{p.penaltiesScored || ''}</td>
                  <td className="lb2__td lb2__td--muted">{p.penaltiesMissed || ''}</td>
                  <td className="lb2__td lb2__td--muted">{p.penPct == null ? '' : `${p.penPct}%`}</td>
                  <td className="lb2__td lb2__td--yc">{p.yc || ''}</td>
                  <td className="lb2__td lb2__td--rc">{p.rc || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openPlayer && <PlayerProfile playerNum={openPlayer} onClose={() => setOpenPlayer(null)} />}
    </React.Fragment>
  );
}

function Teams() {
  const [tab, setTab] = React.useState('first');
  const [openPlayer, setOpenPlayer] = React.useState(null);
  // Team-stats competition split: all / league / cups (all cups combined).
  const [statsComp, setStatsComp] = React.useState('all');
  // Face cards order: most appearances first (then goals as a tie-breaker, then squad number).
  const squad = window.derivedSquad().sort((a, b) =>
    (b.apps - a.apps) || (b.goals - a.goals) || (a.num - b.num)
  );

  // Competition matcher for the Team Stats tab.
  //   league → League Ten only
  //   cups   → everything that isn't league and isn't a friendly (all cups merged)
  //   all    → everything
  const statsMatcher =
    statsComp === 'league' ? (c) => /league/i.test(c || '')
    : statsComp === 'cups' ? (c) => !!c && !/league/i.test(c) && !/friendly/i.test(c)
    : null;
  // Squad totals respect the competition split.
  const statSquad = window.derivedSquad(statsMatcher);
  // Matches that fall in the selected competition split. Counts only PLAYED
  // games (SEASON_RESULTS + auto-promoted fixtures), so freshly-played fixtures
  // with match data count without being hardcoded first.
  const playedResults = (typeof window.getDerivedResults === 'function')
    ? window.getDerivedResults()
    : (window.SEASON_RESULTS || []);
  const statsMatchCount = (window.getAllMatchEntries() || []).filter(({ id }) => {
    const r = playedResults.find((x) => x.id === id);
    if (!r) return false;
    return !statsMatcher || statsMatcher(r.competition);
  }).length;

  const totalGoals     = statSquad.reduce((s, p) => s + p.goals, 0);
  const totalAssists   = statSquad.reduce((s, p) => s + p.assists, 0);
  const totalSetPieces = statSquad.reduce((s, p) => s + (p.setPiecesScored || 0), 0);
  const totalYC        = statSquad.reduce((s, p) => s + p.yc, 0);
  const totalRC        = statSquad.reduce((s, p) => s + p.rc, 0);
  const totalPenScored = statSquad.reduce((s, p) => s + p.penaltiesScored, 0);
  const totalPenMissed = statSquad.reduce((s, p) => s + (p.penaltiesMissed || 0), 0);
  const totalPenSaved  = statSquad.reduce((s, p) => s + p.penaltiesSaved, 0);
  const totalCleans    = statSquad.reduce((n, p) => Math.max(n, p.cleanSheets || 0), 0);
  const totalMatchesEntered = statsMatchCount;

  const formation = window.detectFormation ? window.detectFormation() : null;

  // Team stats tiles, grouped by theme. Each tile renders with a position-coded
  // accent so the grid feels alive, not a wall of numbers.
  // (Total apps removed, the headline is matches + squad + per-player work.)
  const statsAttack = [
    { l: 'GOALS',           v: totalGoals,    accent: 'volt' },
    { l: 'ASSISTS',         v: totalAssists,  accent: 'volt' },
    { l: 'SET PIECES',      v: totalSetPieces, accent: 'volt' },
    { l: 'PEN SCORED',      v: totalPenScored, accent: 'volt' },
    { l: 'PEN MISSED',      v: totalPenMissed, accent: 'muted' },
  ];
  const statsDefence = [
    { l: 'CLEAN SHEETS',    v: totalCleans,   accent: 'cyan' },
    { l: 'PEN SAVED',       v: totalPenSaved, accent: 'cyan' },
    { l: 'YELLOW CARDS',    v: totalYC,       accent: 'amber' },
    { l: 'RED CARDS',       v: totalRC,       accent: 'red' },
  ];
  const statsOverview = [
    { l: 'MATCHES ENTERED', v: totalMatchesEntered, accent: 'volt' },
    { l: 'SQUAD SIZE',      v: squad.length, accent: 'volt' },
  ];

  // Standout-performer leaders respect the competition split (statSquad).
  const topScorers  = [...statSquad].filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 10);
  const topAssists  = [...statSquad].filter((p) => p.assists > 0).sort((a, b) => b.assists - a.assists).slice(0, 10);
  const topApps     = [...statSquad].filter((p) => p.apps > 0).sort((a, b) => b.apps - a.apps).slice(0, 10);
  const topCleans   = [...statSquad].filter((p) => (p.cleanSheets || 0) > 0).sort((a, b) => (b.cleanSheets || 0) - (a.cleanSheets || 0)).slice(0, 10);

  return (
    <React.Fragment>
      <PageHero
        eyebrow="2025/26 SEASON · LEAGUE TEN"
        title={<>THE <em>SQUAD</em></>}
        sub="The first team and coaching staff. Tap any player for the full breakdown."
      />

      <div className="container">
        <div className="tabs">
          {[['first','First Team'],['leaders','Leaderboards'],['coaches','Coaches'],['stats','Team Stats']].map(([k, l]) => (
            <button key={k} className={`tabs__btn ${tab===k ? 'is-active' : ''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>

      {tab === 'first' && (
        <section className="section" style={{ paddingTop: 'var(--sp-6)' }}>
          <div className="container">
            <div className="squad-banner">
              <span className="t-meta">{squad.length} REGISTERED PLAYERS</span>
            </div>

            {/* Grouped by position with dividers so the long squad is easy to
                scan. Order: Goalkeepers → Defenders → Midfielders → Attackers.
                Players the blanket-role helper can't place fall into "Squad". */}
            {(() => {
              const groups = [
                { key: 'Goalkeeper', label: 'GOALKEEPERS', short: 'GK' },
                { key: 'Defender',   label: 'DEFENDERS',   short: 'DEF' },
                { key: 'Midfielder', label: 'MIDFIELDERS', short: 'MID' },
                { key: 'Attacker',   label: 'ATTACKERS',   short: 'ATT' },
              ];
              const placed = new Set();
              const sections = groups.map((g) => {
                const players = squad.filter((p) => window.blanketRole(p) === g.key);
                players.forEach((p) => placed.add(p.num));
                return { ...g, players };
              });
              const leftover = squad.filter((p) => !placed.has(p.num));
              if (leftover.length) sections.push({ key: 'other', label: 'SQUAD', short: '-', players: leftover });
              return sections.filter((s) => s.players.length > 0).map((s) => (
                <div key={s.key} className="squad-pos-group">
                  <div className="squad-pos-divider">
                    <span className="squad-pos-divider__short">{s.short}</span>
                    <span className="squad-pos-divider__label">{s.label}</span>
                    <span className="squad-pos-divider__count">{s.players.length}</span>
                    <span className="squad-pos-divider__rule" aria-hidden="true" />
                  </div>
                  <div className="squad-grid squad-grid--full">
                    {s.players.map((p) => <PlayerCardFull key={p.num} p={p} onOpen={setOpenPlayer} />)}
                  </div>
                </div>
              ));
            })()}
          </div>
        </section>
      )}

      {tab === 'leaders' && (
        <section className="section" style={{ paddingTop: 'var(--sp-6)' }}>
          <div className="container">
            <CompFilteredLeaders />
          </div>
        </section>
      )}

      {tab === 'coaches' && (
        <section className="section" style={{ paddingTop: 'var(--sp-6)' }}>
          <div className="container">
            <CoachesGrid />
          </div>
        </section>
      )}

      {tab === 'stats' && (
        <section className="section" style={{ paddingTop: 'var(--sp-6)' }}>
          <div className="container">

            {/* Competition split toggle, All / League / Cups (cups combined) */}
            <div className="ts-split">
              <span className="t-eyebrow ts-split__lbl">COMPETITION</span>
              <div className="ts-split__seg">
                {[['all','All'],['league','League'],['cups','Cups']].map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    className={`ts-split__btn ${statsComp === k ? 'is-on' : ''}`}
                    onClick={() => setStatsComp(k)}
                  >{l}</button>
                ))}
              </div>
              <span className="ts-split__note">
                {statsComp === 'all' ? 'ALL COMPETITIONS' : statsComp === 'league' ? 'LEAGUE TEN ONLY' : 'ALL CUP COMPETITIONS COMBINED'}
              </span>
            </div>

            {/* Top-line overview */}
            <div className="ts-headline">
              {statsOverview.map((s) => (
                <div key={s.l} className="ts-headline__tile">
                  <span className="ts-headline__v">{s.v}</span>
                  <span className="ts-headline__l">{s.l}</span>
                </div>
              ))}
              {topScorers[0] && (
                <div className="ts-headline__tile ts-headline__tile--accent">
                  <span className="ts-headline__eye">TOP SCORER</span>
                  <span className="ts-headline__name">{topScorers[0].first} {topScorers[0].last}</span>
                  <span className="ts-headline__v ts-headline__v--sm">{topScorers[0].goals} GOALS</span>
                </div>
              )}
            </div>

            {/* Attack vs Defence, grouped tile sets */}
            <div className="ts-section">
              <header className="ts-section__head">
                <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>ATTACK</span>
                <span className="t-meta" style={{ color: 'var(--fg-3)' }}>HOW SUE’S ANGELS SCORE</span>
              </header>
              <div className="ts-tiles">
                {statsAttack.map((s) => (
                  <div key={s.l} className={`ts-tile ts-tile--${s.accent}`}>
                    <div className="ts-tile__rail" aria-hidden="true" />
                    <div className="ts-tile__v">{s.v}</div>
                    <div className="ts-tile__l">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ts-section">
              <header className="ts-section__head">
                <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>DEFENCE &amp; DISCIPLINE</span>
                <span className="t-meta" style={{ color: 'var(--fg-3)' }}>DEFENSIVE UNIT</span>
              </header>
              <div className="ts-tiles">
                {statsDefence.map((s) => (
                  <div key={s.l} className={`ts-tile ts-tile--${s.accent}`}>
                    <div className="ts-tile__rail" aria-hidden="true" />
                    <div className="ts-tile__v">{s.v}</div>
                    <div className="ts-tile__l">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Standout performers */}
            <div className="ts-section">
              <header className="ts-section__head">
                <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>STANDOUT PERFORMERS</span>
                <span className="t-meta" style={{ color: 'var(--fg-3)' }}>LEADERS THIS SEASON</span>
              </header>
              <div className="stats-callouts">
                {topScorers[0] ? (
                  <div className="stat-tile" style={{ textAlign: 'left' }}>
                    <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>TOP SCORER</span>
                    <div className="t-h3" style={{ color: 'var(--fg-1)', marginTop: 6 }}>{topScorers[0].first} {topScorers[0].last}</div>
                    <div className="stat-tile__v" style={{ color: 'var(--volt)', fontSize: 56, marginTop: 8 }}>{topScorers[0].goals}</div>
                    <span className="t-meta" style={{ color: 'var(--fg-3)' }}>Goals · {topScorers[0].first[0]}. {topScorers[0].last}</span>
                  </div>
                ) : <PlaceholderTile label="TOP SCORER" hint="Enter scorers in a match" />}

                {topAssists[0] ? (
                  <div className="stat-tile" style={{ textAlign: 'left' }}>
                    <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>MOST ASSISTS</span>
                    <div className="t-h3" style={{ color: 'var(--fg-1)', marginTop: 6 }}>{topAssists[0].first} {topAssists[0].last}</div>
                    <div className="stat-tile__v" style={{ color: 'var(--volt)', fontSize: 56, marginTop: 8 }}>{topAssists[0].assists}</div>
                    <span className="t-meta" style={{ color: 'var(--fg-3)' }}>Assists · {topAssists[0].first[0]}. {topAssists[0].last}</span>
                  </div>
                ) : <PlaceholderTile label="MOST ASSISTS" hint="Enter assists in a match" />}

                {topApps[0] ? (() => {
                  // Find everyone tied on the top apps figure so joint leaders are credited.
                  const topVal = topApps[0].apps;
                  const joint = topApps.filter((p) => p.apps === topVal);
                  const lead = joint[0];
                  const others = joint.slice(1);
                  const subline = others.length === 0
                    ? <>Apps &middot; <strong>{lead.first[0]}. {lead.last}</strong></>
                    : <>Tied with {others.map((p, i) => (
                        <React.Fragment key={p.num}>
                          {i > 0 ? ', ' : ''}<strong>{p.first[0]}. {p.last}</strong>
                        </React.Fragment>
                      ))}</>;
                  return (
                    <div className="stat-tile" style={{ textAlign: 'left' }}>
                      <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>MOST APPS{joint.length > 1 ? ` · ${joint.length} TIED` : ''}</span>
                      <div className="t-h3" style={{ color: 'var(--fg-1)', marginTop: 6 }}>{lead.first} {lead.last}</div>
                      <div className="stat-tile__v" style={{ color: 'var(--volt)', fontSize: 56, marginTop: 8 }}>{topVal}</div>
                      <span className="t-meta" style={{ color: 'var(--fg-3)' }}>{subline}</span>
                    </div>
                  );
                })() : <PlaceholderTile label="MOST APPEARANCES" hint="Enter starting XI in a match" />}

                {topCleans[0] ? (
                  <div className="stat-tile" style={{ textAlign: 'left' }}>
                    <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>CLEAN SHEETS</span>
                    <div className="t-h3" style={{ color: 'var(--fg-1)', marginTop: 6 }}>{topCleans[0].first} {topCleans[0].last}</div>
                    <div className="stat-tile__v" style={{ color: '#22D3EE', fontSize: 56, marginTop: 8 }}>{topCleans[0].cleanSheets}</div>
                    <span className="t-meta" style={{ color: 'var(--fg-3)' }}>Clean sheets · {topCleans[0].first[0]}. {topCleans[0].last}</span>
                  </div>
                ) : <PlaceholderTile label="CLEAN SHEETS" hint="Tick a GK clean sheet in a match" />}
              </div>
            </div>
          </div>
        </section>
      )}
      {openPlayer && <PlayerProfile playerNum={openPlayer} onClose={() => setOpenPlayer(null)} />}
    </React.Fragment>
  );
}

window.Teams = Teams;
