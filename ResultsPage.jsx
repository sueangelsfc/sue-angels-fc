// ResultsPage.jsx — full 25/26 season results from window.SEASON_RESULTS.
// Includes both League Ten and the Dylan Rigobert Trophy cup run.
// Cup rounds (Final / Semi Final / Quarter Final / Last 16 / Round of 32) get
// distinct row treatment so the cup story reads visually.

function compIsLeague(c) { return (c || '').toLowerCase().includes('league'); }
function compMatcher(key) {
  const def = (window.COMPETITIONS || []).find((c) => c.key === key);
  return def ? def.match : () => true;
}
function roundSlug(round) {
  if (!round) return null;
  return round.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function ResultRow({ r }) {
  const usHome = r.home.includes('Angels');
  const isWalkover = r.kind === 'walkover';
  const isLeague = compIsLeague(r.competition);
  const rSlug = roundSlug(r.round);
  const matchData = window.loadMatchEntry ? window.loadMatchEntry(r.id) : null;

  if (isWalkover) {
    return (
      <article className={`rr rr--wo ${isLeague ? '' : 'rr--cup'} ${rSlug ? 'rr--' + rSlug : ''}`}>
        <div className="rr__date">
          <div className="rr__dt">{r.date}</div>
          <div className="rr__tm">{r.kick} · {isLeague ? 'LG10' : 'CUP'}</div>
        </div>
        <div className="rr__teams">
          <div className="rr__side">
            <TeamBadge team={r.home} /><span className="rr__name">{r.home}</span>
          </div>
          <div className="rr__score rr__score--wo">
            <span className="rr__wochip">{r.wo === 'A-W' ? 'AWAY WALKOVER' : 'HOME WALKOVER'}</span>
          </div>
          <div className="rr__side rr__side--right">
            <TeamBadge team={r.away} /><span className="rr__name">{r.away}</span>
          </div>
        </div>
        <div className="rr__tag"><span className="chip chip--win">W</span></div>
      </article>
    );
  }
  const usScore = usHome ? r.hs : r.as;
  const themScore = usHome ? r.as : r.hs;
  const us = usScore, them = themScore;
  let result;
  if (r.kind === 'penalty' && r.pens) {
    // Match drawn; decided on penalties.
    const usPens = usHome ? r.pens.hs : r.pens.as;
    const themPens = usHome ? r.pens.as : r.pens.hs;
    result = usPens > themPens ? 'W' : 'L';
  } else {
    result = us > them ? 'W' : us === them ? 'D' : 'L';
  }
  const hasPens = r.kind === 'penalty' && r.pens;
  return (
    <article className={`rr ${isLeague ? '' : 'rr--cup'} ${rSlug ? 'rr--' + rSlug : ''} ${result === 'L' ? 'rr--loss' : ''} ${r.pending ? 'rr--pending' : ''}`}>
      {r.pending && <span className="rr__round rr__round--pending">AWAITING MATCH DATA</span>}
      {r.round && !r.pending && <span className={`rr__round rr__round--${rSlug}`}>{r.round.toUpperCase()}{hasPens ? ' · DECIDED ON PENS' : ''}</span>}
      <div className="rr__date">
        <div className="rr__dt">{r.date}</div>
        <div className="rr__tm">{r.kick} · {r.competition ? r.competition.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'CUP' : 'CUP'}</div>
      </div>
      <div className="rr__teams">
        <div className="rr__side">
          <TeamBadge team={r.home} /><span className="rr__name">{r.home}</span>
        </div>
        <div className="rr__score">
          <span className={usHome && result === 'W' && !hasPens ? 'is-volt' : (usHome && result === 'L' && !hasPens ? 'is-loss' : '')}>{r.hs}</span>
          <span className="rr__dash">–</span>
          <span className={!usHome && result === 'W' && !hasPens ? 'is-volt' : (!usHome && result === 'L' && !hasPens ? 'is-loss' : '')}>{r.as}</span>
          {hasPens && (
            <span className="rr__pens">PENS <strong className={result === 'W' ? 'is-volt' : 'is-loss'}>{r.pens.hs}{'–'}{r.pens.as}</strong></span>
          )}
        </div>
        <div className="rr__side rr__side--right">
          <TeamBadge team={r.away} /><span className="rr__name">{r.away}</span>
        </div>
      </div>
      <div className="rr__tag"><span className={`chip chip--${result === 'W' ? 'win' : result === 'D' ? 'draw' : 'loss'}`}>{result}</span></div>
      {matchData && <ResultDetails r={r} data={matchData} />}
    </article>
  );
}

// Inline summary that appears under the score once the coach has entered
// match data. Lists scorers, assists, cards and MOTM by name.
function ResultDetails({ r, data }) {
  const usHome = r.home.includes('Angels');
  const findP = (num) => (window.SQUAD || []).find((p) => p.num === num);
  const fmt = (e) => {
    const p = findP(e.num);
    if (!p) return null;
    const mins = e.minute ? ` ${e.minute}’` : '';
    const t = e.type || (e.penalty ? 'pen' : 'open');
    const tag = t === 'pen' ? ' (pen)' : t === 'set' ? ' (SP)' : '';
    return `${p.last}${mins}${tag}`;
  };

  const scorers = (data.goals || []).map(fmt).filter(Boolean);
  const assists = (data.assists || []).map(fmt).filter(Boolean);
  const oppGoals = (data.opponentGoals || []).map((og) => {
    const nm = (og.name || '').trim();
    if (!nm) return null;
    const mins = og.minute ? ` ${og.minute}’` : '';
    const t = og.type || (og.penalty ? 'pen' : 'open');
    const tag = t === 'pen' ? ' (pen)' : t === 'set' ? ' (SP)' : '';
    return `${nm}${mins}${tag}`;
  }).filter(Boolean);
  const yc = (data.yellowCards || []).map(fmt).filter(Boolean);
  const rc = (data.redCards || []).map(fmt).filter(Boolean);
  const oppRc = (data.opponentRedCards || []).map((orc) => {
    const nm = (orc.name || '').trim();
    if (!nm) return null;
    const mins = orc.minute ? ` ${orc.minute}’` : '';
    return `${nm}${mins}`;
  }).filter(Boolean);
  const penSaves = (data.penaltiesSaved || []).map(fmt).filter(Boolean);
  const motm = data.motm && findP(data.motm);
  const captain = data.captain && findP(data.captain);

  // If there's literally nothing to show, render nothing.
  // NOTE: commentary is intentionally NOT shown here — it lives only on the
  // Media › News match-report graphic.
  if (!scorers.length && !assists.length && !oppGoals.length && !yc.length && !rc.length && !oppRc.length && !motm && !captain && !data.formation) return null;

  return (
    <div className="rr__details">
      <div className="rr__details-grid">
        {data.formation && (
          <div className="rr__detail">
            <span className="rr__detail-lbl" style={{ color: 'var(--volt)' }}>FORMATION</span>
            <div className="rr__detail-val" style={{ fontFamily: 'var(--font-stat)', fontSize: 18 }}>{data.formation}</div>
          </div>
        )}
        {scorers.length > 0 && (
          <div className="rr__detail">
            <span className="rr__detail-lbl">{usHome ? 'GOALS' : 'GOALS'}</span>
            <div className="rr__detail-val">{scorers.join(' · ')}</div>
          </div>
        )}
        {oppGoals.length > 0 && (
          <div className="rr__detail">
            <span className="rr__detail-lbl" style={{ color: 'var(--loss)' }}>OPPOSITION GOALS</span>
            <div className="rr__detail-val">{oppGoals.join(' · ')}</div>
          </div>
        )}
        {assists.length > 0 && (
          <div className="rr__detail">
            <span className="rr__detail-lbl">ASSISTS</span>
            <div className="rr__detail-val">{assists.join(' · ')}</div>
          </div>
        )}
        {yc.length > 0 && (
          <div className="rr__detail">
            <span className="rr__detail-lbl rr__detail-lbl--yc">YELLOWS</span>
            <div className="rr__detail-val">{yc.join(' · ')}</div>
          </div>
        )}
        {rc.length > 0 && (
          <div className="rr__detail">
            <span className="rr__detail-lbl rr__detail-lbl--rc">REDS</span>
            <div className="rr__detail-val">{rc.join(' · ')}</div>
          </div>
        )}
        {oppRc.length > 0 && (
          <div className="rr__detail">
            <span className="rr__detail-lbl rr__detail-lbl--rc">OPPOSITION REDS</span>
            <div className="rr__detail-val">{oppRc.join(' · ')}</div>
          </div>
        )}
        {penSaves.length > 0 && (
          <div className="rr__detail">
            <span className="rr__detail-lbl">PEN SAVES</span>
            <div className="rr__detail-val">{penSaves.join(' · ')}</div>
          </div>
        )}
        {motm && (
          <div className="rr__detail">
            <span className="rr__detail-lbl" style={{ color: 'var(--volt)' }}>MOTM</span>
            <div className="rr__detail-val" style={{ color: 'var(--volt)' }}>{motm.first} {motm.last}</div>
          </div>
        )}
        {captain && (
          <div className="rr__detail">
            <span className="rr__detail-lbl" style={{ color: 'var(--volt)' }}>CAPTAIN</span>
            <div className="rr__detail-val">(C) {captain.first} {captain.last}</div>
          </div>
        )}
      </div>
      {data.commentary && false && (
        <div className="rr__commentary">
          <span className="rr__detail-lbl">COACH&rsquo;S NOTES</span>
          <p>{data.commentary}</p>
        </div>
      )}
    </div>
  );
}

function ResultsPage() {
  const SEASON = window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || []);
  const COMPETITIONS = window.COMPETITIONS || [];
  const [filter, setFilter] = React.useState('all');

  // Aggregate stats for a given set of matches. Penalty losses count as L,
  // penalty wins as W, regular score W/D/L, walkovers as W.
  function statsFor(matches) {
    let played = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0, walkovers = 0;
    for (const r of matches) {
      played++;
      if (r.kind === 'walkover') { w++; walkovers++; continue; }
      const usHome = r.home.includes('Angels');
      const us = usHome ? r.hs : r.as;
      const them = usHome ? r.as : r.hs;
      gf += us; ga += them;
      if (r.kind === 'penalty' && r.pens) {
        const usP = usHome ? r.pens.hs : r.pens.as;
        const themP = usHome ? r.pens.as : r.pens.hs;
        if (usP > themP) w++; else l++;
      } else if (us > them) w++;
      else if (us === them) d++;
      else l++;
    }
    return { played, w, d, l, gf, ga, gd: gf - ga, walkovers, winPct: played > 0 ? Math.round((w / played) * 100) : 0 };
  }

  // Compute stats once per competition tab.
  const statsByKey = {};
  const matchesByKey = {};
  for (const comp of COMPETITIONS) {
    const matches = SEASON.filter((r) => comp.match(r.competition));
    matchesByKey[comp.key] = matches;
    statsByKey[comp.key]   = statsFor(matches);
  }

  const filtered  = matchesByKey[filter] || SEASON;
  const viewStats = statsByKey[filter]   || statsFor(SEASON);
  const allStats   = statsByKey.all   || statsFor(SEASON);
  const leagueS    = statsByKey.league;
  const drtS       = statsByKey.drt;
  const ccupS      = statsByKey.ccup;

  // Tab-aware hero copy. Each tab gets its own narrative.
  const heroForFilter = {
    all: {
      eyebrow: '25/26 SEASON · ALL COMPETITIONS',
      title: <>SEASON <em>RESULTS</em></>,
      sub: ``,
      meta: `LEAGUE ${leagueS ? leagueS.w + 'W ' + leagueS.d + 'D ' + leagueS.l + 'L' : ''} · DRT ${drtS ? drtS.w + 'W ' + drtS.l + 'L' : ''} · CCUP ${ccupS ? ccupS.w + 'W ' + ccupS.l + 'L' : ''} · MLIP ${statsByKey.mlip ? statsByKey.mlip.w + 'W ' + statsByKey.mlip.l + 'L' : ''}`,
    },
    league: {
      eyebrow: '25/26 SEASON · LEAGUE TEN',
      title: <>UN<em>BEATEN</em></>,
      sub: `${leagueS ? leagueS.w : 0} from ${leagueS ? leagueS.played : 0}. ${leagueS ? leagueS.gf : 0} scored. ${leagueS ? leagueS.ga : 0} conceded. Goal difference +${leagueS ? leagueS.gd : 0}. ${leagueS ? leagueS.winPct : 0}% win rate. Champions confirmed mathematically.`,
      meta: `LEAGUE FORM · W W W W W · ${leagueS ? leagueS.winPct : 0}% WIN RATE`,
    },
    drt: {
      eyebrow: 'DYLAN RIGOBERT TROPHY · 25/26',
      title: <>CUP <em>FINALISTS</em></>,
      sub: `${drtS ? drtS.played : 0} cup matches. ${drtS ? drtS.w : 0} won (Round of 32 → Last 16 → Quarter Final → Semi Final), beaten in the final. ${drtS ? drtS.gf : 0} scored, ${drtS ? drtS.ga : 0} conceded. ${drtS ? drtS.winPct : 0}% win rate.`,
      meta: `DRT RUN · 5–1 → 6–0 → 7–0 → 3–0 → 0–3 (F)`,
    },
    ccup: {
      eyebrow: "CHIPOTLE UK CHAIRMAN'S CUP · 25/26",
      title: <>CCUP <em>LAST 16</em></>,
      sub: `${ccupS ? ccupS.played : 0} cup matches. ${ccupS ? ccupS.w : 0} won, ${ccupS ? ccupS.l : 0} lost — knocked out at the Last 16 on penalties after a 2–2 draw with Kew Antigua. ${ccupS ? ccupS.gf : 0} scored, ${ccupS ? ccupS.ga : 0} conceded.`,
      meta: `CCUP RUN · 2–0 → 1–0 → 2–1 → 2–2 (Pens 3–4)`,
    },
    mlip: (() => {
      const s = statsByKey.mlip;
      return {
        eyebrow: 'SUPREME TROPHIES MARCUS LIPTON CUP · 25/26',
        title: <>MLIP <em>2ND ROUND</em></>,
        sub: `${s ? s.played : 0} cup matches. ${s ? s.w : 0} won, ${s ? s.l : 0} lost — knocked out at the 2nd Round by Argentina FC 1st Team. ${s ? s.gf : 0} scored, ${s ? s.ga : 0} conceded.`,
        meta: `MLIP RUN · 2–1 → 0–2 (KO)`,
      };
    })(),
    cc: (() => {
      const s = statsByKey.cc;
      return {
        eyebrow: 'SURREY FA SUNDAY LOWER JUNIOR COUNTY CUP · 25/26',
        title: <>SURREY FA <em>CUP</em></>,
        sub: `${s ? s.played : 0} cup matches. ${s ? s.w : 0} won, ${s ? s.l : 0} lost — knocked out at the Quarter Final by Sheen Park Rangers. ${s ? s.gf : 0} scored, ${s ? s.ga : 0} conceded.`,
        meta: `CC RUN · 7–1 → 7–0 → 3–0 → 0–3 (QF)`,
      };
    })(),
  }[filter] || { eyebrow: '', title: '', sub: '', meta: '' };

  const tiles = [
    { l: 'MATCHES',  v: viewStats.played, color: 'var(--volt)' },
    { l: 'WINS',     v: viewStats.w,      color: 'var(--volt)' },
    { l: 'DRAWS',    v: viewStats.d,      color: 'var(--fg-2)' },
    { l: 'LOSSES',   v: viewStats.l,      color: viewStats.l > 0 ? 'var(--loss)' : 'var(--fg-2)' },
    { l: 'GOALS FOR',     v: viewStats.gf, color: 'var(--volt)' },
    { l: 'GOALS AGAINST', v: viewStats.ga, color: viewStats.ga > 0 ? 'var(--fg-1)' : 'var(--volt)' },
    { l: 'GOAL DIFF',     v: (viewStats.gd >= 0 ? '+' : '') + viewStats.gd, color: 'var(--volt)' },
    { l: 'WIN %',         v: viewStats.winPct + '%', color: 'var(--volt)' },
  ];

  const sectionTitle =
    filter === 'all'    ? 'SEASON RESULTS' :
    filter === 'league' ? 'LEAGUE TEN'     :
    filter === 'drt'    ? 'DYLAN RIGOBERT TROPHY' :
    filter === 'ccup'   ? "CHIPOTLE UK CHAIRMAN'S CUP" :
    filter === 'mlip'   ? 'SUPREME TROPHIES MARCUS LIPTON CUP' :
    filter === 'cc'     ? 'SURREY FA SUNDAY LOWER JUNIOR COUNTY CUP' : 'RESULTS';

  return (
    <React.Fragment>
      <PageHero
        eyebrow={heroForFilter.eyebrow}
        title={heroForFilter.title}
        sub={heroForFilter.sub}
      >
      </PageHero>

      {/* Tab filter — generated from window.COMPETITIONS */}
      <div className="container" style={{ marginTop: 'var(--sp-5)' }}>
        <div className="filters">
          {COMPETITIONS.map((comp) => {
            const s = statsByKey[comp.key];
            return (
              <button key={comp.key} className={`chip ${filter === comp.key ? 'chip--volt' : ''}`} onClick={() => setFilter(comp.key)}>
                {comp.label} <span style={{ opacity: 0.6, marginLeft: 6 }}>{s.played} · {s.winPct}%</span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="section" style={{ paddingTop: 'var(--sp-5)' }}>
        <div className="container">
          <div className="stats-grid">
            {tiles.map((s) => (
              <div key={s.l} className="stat-tile">
                <div className="stat-tile__v" style={{ color: s.color }}>{s.v}</div>
                <div className="stat-tile__l">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--alt" style={{ paddingTop: 'var(--sp-6)' }}>
        <div className="container">
          <header className="section__head">
            <div>
              <div className="t-eyebrow">EVERY MATCH · 25/26</div>
              <h2 className="t-h1">{sectionTitle}</h2>
            </div>
          </header>

          <div className="rr-list">
            {filtered.map((r) => (
              <React.Fragment key={r.id}>
                <ResultRow r={r} />
                {window.MatchEntry && (
                  <div style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 8 }}>
                    <MatchEntry
                      matchId={r.id}
                      matchLabel={`${r.home} ${r.kind === 'walkover' ? r.wo : (r.hs + '–' + r.as)} ${r.away} · ${r.date} · ${r.competition || ''}${r.round ? ' · ' + r.round : ''}`}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>
    </React.Fragment>
  );
}

window.ResultsPage = ResultsPage;
