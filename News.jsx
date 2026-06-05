// News.jsx — magazine-style news feed with auto-generated match-report graphics.
//
// Coach-entered commentary on the Results page flows EXCLUSIVELY here as the
// lede of a "MATCH REPORT" article. Each match report uses a custom
// SVG-based graphic that names the home/away teams and shows the score.

// Renders an <img> for whichever team is on this side, falling back to a placeholder.
// Used by both MatchReportGraphic and MatchPreviewGraphic — they share styles.
function MrTeamBadge({ team }) {
  const meta = window.resolveBadge ? window.resolveBadge(team) : null;
  if (meta) {
    return <img src={meta.src} alt={meta.alt} className={`mr-graphic__badge mr-graphic__badge--${meta.aspect}`} />;
  }
  return <div className="mr-graphic__badge mr-graphic__badge--placeholder" />;
}

// Match-preview graphic — same layout language as MatchReportGraphic but for a
// fixture that hasn't been played yet. Shows both badges, the KO time, venue,
// and competition. Falls back gracefully if the opposition badge isn't known.
function MatchPreviewGraphic({ fx }) {
  const usHome = (fx.home || '').includes('Angels');
  const homeName = (fx.home || '').replace(' FC', '').toUpperCase();
  const awayName = (fx.away || '').replace(' FC', '').toUpperCase();
  const dateStr = [fx.day, fx.date, fx.mon].filter(Boolean).join(' ');
  return (
    <div className="mr-graphic mr-graphic--preview" data-result="P">
      <div className="mr-graphic__top">
        <span className="mr-graphic__ft">UPCOMING</span>
        <span className="mr-graphic__comp">{(fx.comp || 'LEAGUE TEN').toUpperCase()}</span>
        <span className="mr-graphic__chip mr-graphic__chip--preview">PREVIEW</span>
      </div>
      <div className="mr-graphic__main">
        <div className={`mr-graphic__side ${usHome ? 'mr-graphic__side--us' : ''}`}>
          <MrTeamBadge team={fx.home} />
          <span className="mr-graphic__team">{homeName}</span>
          <span className={`mr-graphic__tag ${usHome ? 'mr-graphic__tag--us' : ''}`}>{usHome ? 'SUE’S ANGELS · HOME' : 'HOME'}</span>
        </div>
        <div className="mr-graphic__score mr-graphic__score--preview">
          <span className="mr-graphic__vs">VS</span>
          {fx.kick && <span className="mr-graphic__pens">{fx.kick} KO</span>}
        </div>
        <div className={`mr-graphic__side ${!usHome ? 'mr-graphic__side--us' : ''}`}>
          <MrTeamBadge team={fx.away} />
          <span className="mr-graphic__team">{awayName}</span>
          <span className={`mr-graphic__tag ${!usHome ? 'mr-graphic__tag--us' : ''}`}>{!usHome ? 'SUE’S ANGELS · AWAY' : 'AWAY'}</span>
        </div>
      </div>
      <div className="mr-graphic__foot">
        {dateStr && <span>{dateStr}</span>}
        {fx.ven && <span>{fx.ven.toUpperCase()}</span>}
        {fx.loc && <span>{fx.loc.toUpperCase()}</span>}
      </div>
    </div>
  );
}

// SquadSpotlightGraphic — magazine cover for `kind: 'player'` articles.
// Uses the player's uploaded photo (window.getPlayerPhoto) when present,
// falls back to the avatar SVG so the article still has a graphic before
// any photo lands. Headline tag (GOAL MACHINE, IRON MAN, etc.) is rendered
// across the bottom-left in volt display type.
function SquadSpotlightGraphic({ player, headline }) {
  const photo = player && window.getPlayerPhoto ? window.getPlayerPhoto(player.num) : null;
  const role = player && window.blanketRole ? window.blanketRole(player).toUpperCase() : 'SQUAD';
  return (
    <div className="ss-cover">
      <div className="ss-cover__photo">
        {photo
          ? <img src={photo} alt={`${player.first} ${player.last}`} />
          : <img src="assets/players/avatar.svg" alt="" className="ss-cover__photo--avatar" />}
      </div>
      <div className="ss-cover__chrome">
        <span className="ss-cover__eye">SQUAD SPOTLIGHT · 25/26</span>
      </div>
      <span className="ss-cover__role">{role}</span>
      <div className="ss-cover__bottom">
        <span className="ss-cover__name">{player ? `${player.first} ${player.last}`.toUpperCase() : ''}</span>
        {headline && <span className="ss-cover__tag">{headline}</span>}
      </div>
    </div>
  );
}

// SponsorCoverGraphic — magazine-style cover for sponsor feature articles.
// Renders both sponsor logos side by side on a navy bg with volt accents.
function SponsorCoverGraphic({ partners }) {
  const items = partners && partners.length ? partners : [];
  return (
    <div className="sp-cover">
      <div className="sp-cover__top">
        <span className="sp-cover__eyebrow">OUR MAIN PARTNERS</span>
        <span className="sp-cover__year">2025 / 26</span>
      </div>
      <div className="sp-cover__logos">
        {items.map((p, i) => (
          <React.Fragment key={p.name}>
            {i > 0 && <span className="sp-cover__amp">&amp;</span>}
            <div className="sp-cover__logo-cell">
              <img src={p.logo} alt={p.name} />
              <span className="sp-cover__role">{p.short}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
      <div className="sp-cover__foot">
        <span>OFFICIAL PARTNERS</span>
        <span>LEAGUE TEN CHAMPIONS</span>
      </div>
    </div>
  );
}

function MatchReportGraphic({ r, data }) {
  const usHome = r.home.includes('Angels');
  const homeName = r.home.replace(' FC', '').toUpperCase();
  const awayName = r.away.replace(' FC', '').toUpperCase();
  const isWalkover = r.kind === 'walkover';
  const hasPens = r.kind === 'penalty' && r.pens;
  let result = 'D';
  if (isWalkover) result = 'W';
  else if (hasPens) {
    const usP = usHome ? r.pens.hs : r.pens.as;
    const themP = usHome ? r.pens.as : r.pens.hs;
    result = usP > themP ? 'W' : 'L';
  } else {
    const us = usHome ? r.hs : r.as;
    const them = usHome ? r.as : r.hs;
    result = us > them ? 'W' : us === them ? 'D' : 'L';
  }
  const subtag = hasPens ? `Pens ${r.pens.hs}–${r.pens.as}` : null;
  const motm = data && data.motm && (window.SQUAD || []).find((x) => x.num === data.motm);
  const captain = data && data.captain && (window.SQUAD || []).find((x) => x.num === data.captain);

  return (
    <div className="mr-graphic" data-result={result}>
      <div className="mr-graphic__top">
        <span className="mr-graphic__ft">FULL TIME</span>
        <span className="mr-graphic__comp">{r.competition || 'LEAGUE TEN'}{r.round ? ` · ${r.round}` : ''}</span>
        <span className={`mr-graphic__chip mr-graphic__chip--${result.toLowerCase()}`}>{result}</span>
      </div>
      <div className="mr-graphic__main">
        {/* LEFT — always HOME team */}
        <div className={`mr-graphic__side ${usHome ? 'mr-graphic__side--us' : ''}`}>
          <MrTeamBadge team={r.home} />
          <span className="mr-graphic__team">{homeName}</span>
          <span className={`mr-graphic__tag ${usHome ? 'mr-graphic__tag--us' : ''}`}>{usHome ? 'SUE’S ANGELS · HOME' : 'HOME'}</span>
        </div>
        <div className="mr-graphic__score">
          {isWalkover ? (
            <span className="mr-graphic__wo">{r.wo}</span>
          ) : (
            <div className="mr-graphic__score-nums">
              <span className={`mr-graphic__num ${usHome && result === 'W' ? 'is-volt' : (!usHome && result === 'L' ? 'is-volt' : '')}`}>{r.hs}</span>
              <span className="mr-graphic__dash">{'–'}</span>
              <span className={`mr-graphic__num ${!usHome && result === 'W' ? 'is-volt' : (usHome && result === 'L' ? 'is-volt' : '')}`}>{r.as}</span>
            </div>
          )}
          {subtag && <span className="mr-graphic__pens">{subtag}</span>}
        </div>
        {/* RIGHT — always AWAY team */}
        <div className={`mr-graphic__side ${!usHome ? 'mr-graphic__side--us' : ''}`}>
          <MrTeamBadge team={r.away} />
          <span className="mr-graphic__team">{awayName}</span>
          <span className={`mr-graphic__tag ${!usHome ? 'mr-graphic__tag--us' : ''}`}>{!usHome ? 'SUE’S ANGELS · AWAY' : 'AWAY'}</span>
        </div>
      </div>
      <div className="mr-graphic__foot">
        <span>{r.date}</span>
        {r.kick && <span>KO {r.kick}</span>}
        {r.venue && <span>{r.venue.toUpperCase()}</span>}
        {motm && <span className="mr-graphic__motm">MOTM {'—'} {motm.first[0]}. {motm.last}</span>}
        {captain && <span className="mr-graphic__cap">(C) {captain.first[0]}. {captain.last}</span>}
      </div>
    </div>
  );
}

// Build a storytelling-style lede from match facts + coach notes.
// Written in elite-sports-journalist voice. Used when a match has commentary
// but hasn't been AI-polished yet — and as the basis for the polish prompt.
function buildStorytellingLede(r, data) {
  const usHome = r.home.includes('Angels');
  const opp = (usHome ? r.away : r.home).replace(' FC', '');
  const isWalkover = r.kind === 'walkover';
  const hasPens = r.kind === 'penalty' && r.pens;
  const us  = usHome ? r.hs : r.as;
  const them = usHome ? r.as : r.hs;
  let result;
  if (isWalkover) result = 'W';
  else if (hasPens) { const uP = usHome ? r.pens.hs : r.pens.as; const tP = usHome ? r.pens.as : r.pens.hs; result = uP > tP ? 'W' : 'L'; }
  else result = us > them ? 'W' : us === them ? 'D' : 'L';

  const scorers = (data.goals || []).map((g) => {
    const p = (window.SQUAD || []).find((x) => x.num === g.num);
    return p ? `${p.first} ${p.last}${g.minute ? ' ' + g.minute + '’' : ''}${g.type === 'pen' ? ' (pen)' : g.type === 'set' ? ' (set piece)' : ''}` : null;
  }).filter(Boolean);
  const motm = data.motm && (window.SQUAD || []).find((x) => x.num === data.motm);
  const venue = data.venue || r.venue;
  const kick  = data.kick  || r.kick;
  const where = usHome ? `at home` : `on the road`;

  const lines = [];

  if (isWalkover) {
    lines.push(`Three points for nothing. ${opp} couldn’t raise a side and the points came back with us before a ball had been kicked${venue ? ' at ' + venue : ''}.`);
  } else if (result === 'W') {
    const margin = us - them;
    if (margin >= 5) lines.push(`Total dominance ${where}. Sue’s Angels FC ripped ${opp} apart ${us}–${them}${venue ? ' at ' + venue : ''}${kick ? ' in front of a ' + kick + ' kick-off' : ''}, a statement performance from the very first whistle.`);
    else if (margin >= 3) lines.push(`This was the night the project announced itself again. Sue’s Angels FC beat ${opp} ${us}–${them}${venue ? ' at ' + venue : ''} — emphatic, clinical, and another reminder of where this team is going.`);
    else lines.push(`Three points, dug out the hard way. Sue’s Angels FC came past ${opp} ${us}–${them}${venue ? ' at ' + venue : ''} — not their cleanest performance, but the result is what counts.`);
  } else if (result === 'L') {
    lines.push(`A night the badge will want to forget. ${opp} took it ${them}–${us}${venue ? ' at ' + venue : ''}${hasPens ? ', edging Sue’s Angels FC on penalties after the regulation finish' : ''}. The room knows the response is coming.`);
  } else {
    lines.push(`A point each, when both sides knew there was more on offer. Sue’s Angels FC and ${opp} traded blows for ${us}–${them}${venue ? ' at ' + venue : ''} — a draw with the texture of a missed opportunity.`);
  }

  if (scorers.length) {
    if (scorers.length === 1) lines.push(`${scorers[0]} got the goal that mattered.`);
    else lines.push(`Goals from ${scorers.join(', ')}.`);
  }
  if (motm) lines.push(`${motm.first} ${motm.last} walked off with the Man of the Match award — deservedly so.`);
  if (data.commentary && data.commentary.trim()) lines.push(data.commentary.trim());

  return lines.join(' ');
}

function generateArticles() {
  const articles = [];
  const insights = window.TABLE_INSIGHTS ? window.TABLE_INSIGHTS() : null;

  // CHAMPIONS — render as a hero match-report from the title-clinching fixture
  // (10–1 vs Sporting Club Catania, 26 Apr 26). Falls back to a banner if the
  // fixture row can't be found.
  const allResults0 = window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || []);
  const cataniaResult = allResults0.find((r) => r.id === 'r20260426-catania');
  const cataniaData = (cataniaResult && window.loadMatchEntry) ? (window.loadMatchEntry('r20260426-catania') || {}) : {};
  if (insights && insights.champion && insights.champion.us && cataniaResult) {
    const fallbackReport = "Title clinched at home. Sue’s Angels FC tore Sporting Club Catania apart 10–1 on 26 April 26 — the win that confirmed the League Ten crown with games still to play.\n\nFrom the first whistle the room knew what this was. Inaugural season, top of the table all year, and the maths within reach. Catania put up a fight in the early minutes; the response was ten goals in front of our own supporters.\n\nThis was Sunday League football played with intent. The wide men found space, the back line stayed honest, and every chance was finished. By the time the celebrations started, the league was over as a contest.\n\nUnbeaten across the campaign, promoted into the next division, and the badge worn with the swagger of champions. The first chapter — written.";
    const lede = (cataniaData.polishedReport && cataniaData.polishedReport.trim())
              || (cataniaData.commentary    && cataniaData.commentary.trim())
              || fallbackReport;
    articles.push({
      kind: 'match-report',
      r: cataniaResult,
      data: cataniaData,
      cat: 'CHAMPIONS',
      title: 'CHAMPIONS. CONFIRMED IN APRIL.',
      lede,
      date: '26 Apr 2026',
      sortDate: new Date(2026, 3, 26),
      hero: true,
      isChampionsArticle: true,
    });
  }

  // Match reports from saved match data — sorted by fixture date.
  const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  const parse = (s) => { const m = /^(\d{1,2})\s+(\w{3})\s+(\d{2})$/.exec((s||'').trim()); return m ? new Date(2000 + parseInt(m[3]), months[m[2]] || 0, parseInt(m[1])) : new Date(0); };
  const allResults = allResults0;
  for (const r of allResults) {
    // Skip the Catania title-clincher — already pushed as the CHAMPIONS hero above.
    if (r.id === 'r20260426-catania' && articles.some((a) => a.isChampionsArticle)) continue;
    const data = window.loadMatchEntry ? window.loadMatchEntry(r.id) : null;
    // Prefer the polished match-report; fall back to raw commentary; skip if neither.
    const source = (data && data.polishedReport && data.polishedReport.trim())
                || (data && data.commentary    && data.commentary.trim())
                || null;
    if (!source) continue;
    const usHome = r.home.includes('Angels');
    const opp = usHome ? r.away : r.home;
    const us = usHome ? r.hs : r.as;
    const them = usHome ? r.as : r.hs;
    const lede = data.polishedReport && data.polishedReport.trim()
      ? data.polishedReport.trim()
      : buildStorytellingLede(r, data);
    articles.push({
      kind: 'match-report',
      r, data,
      cat: 'MATCH REPORT',
      title: `${r.kind === 'walkover' ? r.wo : `${us}–${them}`} ${usHome ? '(H)' : '(A)'} VS ${opp.replace(' FC', '').toUpperCase()}`,
      lede,
      date: r.date, sortDate: parse(r.date),
    });
  }

  // Match PREVIEW articles — sourced from match-entry data.preview (coach’s
  // pre-match notes). Persist forever, even after fixture date has passed.
  // Built from BOTH upcoming fixtures AND played results (since fixtures
  // auto-promote into results once the date passes — the preview survives).
  const fixtureLookup = {};
  for (const f of (window.UPCOMING_FIXTURES || [])) fixtureLookup[f.id] = f;
  for (const r of (window.SEASON_RESULTS || []))     fixtureLookup[r.id] = r;
  // Also include auto-promoted entries.
  for (const r of (window.getDerivedResults ? window.getDerivedResults() : [])) {
    if (!fixtureLookup[r.id]) fixtureLookup[r.id] = r;
  }
  for (const id in fixtureLookup) {
    const data = window.loadMatchEntry ? window.loadMatchEntry(id) : null;
    const previewText = data && (data.polishedPreview || data.preview);
    if (!previewText || !previewText.trim()) continue;
    const fx = fixtureLookup[id];
    if (!fx) continue;
    const usHome = fx.home.includes('Angels');
    const opp = (usHome ? fx.away : fx.home).replace(' FC', '');
    // Parse fixture date. Result records use date string "10 May 26".
    // Upcoming records use { date, day, mon }.
    let sortDate = null;
    if (fx.date && fx.mon && fx.day && fx.kick) {
      const monIdx = months[fx.mon] != null ? months[fx.mon] : 0;
      sortDate = new Date(2026, monIdx, parseInt(fx.date, 10));
    } else if (fx.date && typeof fx.date === 'string') {
      sortDate = parse(fx.date);
    }
    articles.push({
      kind: 'preview',
      cat: 'MATCH PREVIEW',
      title: `PREVIEW — ${opp.toUpperCase()} (${usHome ? 'H' : 'A'})`,
      lede: (data.polishedPreview && data.polishedPreview.trim()) || data.preview.trim(),
      date: fx.date && fx.mon ? `${fx.day} ${fx.date} ${fx.mon}` : (fx.date || ''),
      sortDate: sortDate || new Date(0),
      mood: 'e',
      fx,
      data,
    });
  }
  // Each player gets a short structured lede by default; admin can polish into
  // a 500-1000 word article via the modal's "Polish" button. Polished copy is
  // cached in localStorage under sa-player-article:<num>.
  const squad = window.derivedSquad ? window.derivedSquad() : [];
  const featured = squad.filter((p) => p.apps > 0).sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists) || b.apps - a.apps).slice(0, 6);
  for (const p of featured) {
    const blanket = window.blanketRole ? window.blanketRole(p) : 'Squad';
    const role = blanket.toLowerCase();
    const headline = p.goals >= 10 ? 'GOAL MACHINE'
                  : p.assists >= 5 ? 'CREATIVE FORCE'
                  : p.apps >= 12 ? 'IRON MAN'
                  : p.motm >= 2 ? 'MOTM REGULAR'
                  : 'KEY CONTRIBUTOR';
    const fullName = `${p.first} ${p.last}`;
    const firstName = p.first;

    // Find this player's most recent match contribution.
    let lastMatch = null;
    for (const r of allResults) {
      const md = window.loadMatchEntry ? window.loadMatchEntry(r.id) : null;
      if (!md) continue;
      const startE = (md.starters || []).find((s) => s.num === p.num);
      const subE   = (md.bench    || []).find((s) => s.num === p.num);
      if (!startE && !(subE && subE.positions && subE.positions.length)) continue;
      const goalsHere = (md.goals || []).filter((g) => g.num === p.num).length;
      const astHere   = (md.assists || []).filter((a) => a.num === p.num).length;
      const motmHere  = md.motm === p.num;
      lastMatch = { r, role: startE ? 'started' : 'came on', goalsHere, astHere, motmHere };
      break; // results are sorted desc, first match they appeared in is the most recent
    }

    // Opening paragraph — cinematic hook by archetype.
    let opener;
    if (headline === 'GOAL MACHINE') {
      opener = `When Sue’s Angels FC needed a moment, they looked at ${fullName}. The ${role} answered — every single time. ${p.goals} goals in ${p.apps} ${p.apps === 1 ? 'game' : 'games'} on a title-winning run, the kind of return that wins you League Ten and gets your name shouted from the touchline.`;
    } else if (headline === 'CREATIVE FORCE') {
      opener = `Champions are built around players who make the others look better. ${fullName} has been that player for Sue’s Angels FC. ${p.assists} assists this season, ${p.goals} ${p.goals === 1 ? 'goal' : 'goals'} of ${firstName}’s own — the connective tissue of the title-winning campaign.`;
    } else if (headline === 'IRON MAN') {
      opener = `Reliability is its own talent. ${fullName} has played ${p.apps} matches in a title-winning campaign — the sort of consistency that doesn’t make headlines until you realise the same name keeps showing up on the team-sheet. ${p.last} has shown up. Every time.`;
    } else if (headline === 'MOTM REGULAR') {
      opener = `${p.motm} times this season the Sue’s Angels FC dressing room has gathered after a win and pointed to the same shirt. ${fullName} has worn it every time. That kind of consistency from a ${role} is what separates good seasons from title-winning ones.`;
    } else {
      opener = `Every champion side has a name that doesn’t shout, just delivers. For Sue’s Angels FC this season, ${fullName} has been that name. ${p.apps} ${p.apps === 1 ? 'appearance' : 'appearances'}, ${p.goals} ${p.goals === 1 ? 'goal' : 'goals'}, ${p.assists} ${p.assists === 1 ? 'assist' : 'assists'} — quietly, unmistakably, a key contributor to a League Ten title.`;
    }

    // Recent-form paragraph — references the actual last match they featured in.
    let recentLine = null;
    if (lastMatch) {
      const lr = lastMatch.r;
      const usHome = lr.home.includes('Angels');
      const opp = (usHome ? lr.away : lr.home).replace(' FC', '');
      const us = usHome ? lr.hs : lr.as; const them = usHome ? lr.as : lr.hs;
      const lrScore = lr.kind === 'walkover' ? lr.wo : `${us}–${them}`;
      const lrWon = lr.kind === 'walkover' ? true : us > them;
      const contribBits = [];
      if (lastMatch.goalsHere > 0) contribBits.push(`${lastMatch.goalsHere === 1 ? 'a goal' : lastMatch.goalsHere + ' goals'}`);
      if (lastMatch.astHere   > 0) contribBits.push(`${lastMatch.astHere   === 1 ? 'an assist' : lastMatch.astHere + ' assists'}`);
      if (lastMatch.motmHere)      contribBits.push('the Man of the Match award');
      const contrib = contribBits.length ? ` with ${contribBits.join(', ')}` : '';
      const role2 = lastMatch.role === 'started' ? 'started' : 'came off the bench';
      recentLine = `${firstName} ${role2} most recently in the ${lrScore} ${lrWon ? 'win' : 'result'} ${usHome ? 'at home' : 'away'} against ${opp}${contrib} — the kind of contribution that keeps the engine running.`;
    }

    // Position paragraph.
    const positionsCovered = (p.positionBreakdown || []).length;
    let posLine;
    if (p.mostPlayedPosition) {
      if (positionsCovered > 1) {
        posLine = `${firstName}’s natural home has been at ${p.mostPlayedPosition}, where ${firstName} has done the bulk of the damage, but the gaffer has trusted ${firstName} across ${positionsCovered} different positions when the shape has needed it. That kind of versatility is what title runs are built on.`;
      } else {
        posLine = `Locked into the ${p.mostPlayedPosition} role from day one and never let it go. Owning a position in a title-winning side isn’t a small thing — it’s the kind of trust you earn week after week.`;
      }
    } else {
      posLine = `Used wherever the manager has needed reinforcements — the kind of player who makes a squad deeper, sharper, harder to beat.`;
    }

    // Extras paragraph (MOTM count, captaincy, penalties, discipline).
    const extras = [];
    if (p.motm > 0 && headline !== 'MOTM REGULAR') extras.push(`${p.motm === 1 ? 'A Man of the Match award already on the mantelpiece' : `${p.motm} Man of the Match awards`} — the squad recognises what the numbers can’t fully capture.`);
    if (p.captained > 0) extras.push(`${firstName} has worn the captain’s armband ${p.captained} ${p.captained === 1 ? 'time' : 'times'} this season — trust earned the only way it matters.`);
    if (p.penaltiesScored > 0) extras.push(`${p.penaltiesScored} from the spot. Ice in the veins.`);
    if (p.yc + p.rc === 0 && p.apps >= 5) extras.push(`And in ${p.apps} appearances, not a single card. Disciplined, intelligent, ruthless.`);
    const extrasLine = extras.length ? extras.join(' ') : null;

    const closer = `26/27 awaits. A new division, a new tier. If this season is the blueprint, ${firstName} is one of the names this club builds the next chapter around.`;

    const parts = [opener];
    if (recentLine) parts.push(recentLine);
    parts.push(posLine);
    if (extrasLine) parts.push(extrasLine);
    parts.push(closer);
    const rawLede = parts.join('\n\n');

    // Prefer cached polished article if present.
    let polished = null;
    try { polished = localStorage.getItem('sa-player-article:' + p.num); } catch (e) {}
    articles.push({
      kind: 'player',
      cat: 'PLAYER',
      title: `${p.first.toUpperCase()} ${p.last.toUpperCase()} — ${headline}`,
      headline,
      lede: (polished && polished.trim()) || rawLede,
      rawLede,
      date: 'Squad spotlight', sortDate: new Date(2026, 4, 26),
      mood: 'a',
      player: p,
      headline,
      isPolished: !!(polished && polished.trim()),
    });
  }

  // Sponsor feature — both main partners, with a custom cover graphic on the card.
  articles.push({
    kind: 'sponsor-feature',
    cat: 'SPONSORS',
    title: 'THE BRANDS BEHIND THE BADGE',
    lede: 'Two main partners carried Sue’s Angels FC through the inaugural campaign. Sporting Solutions on the front of the matchday shirt since August 2025. Hodgson Roofing on the warm-up and training top since February 2026. Both partners are still on board for 26/27 — and enquiries are open for new brands to join them.\n\nSporting Solutions Ltd are London and Surrey-based sports and garden maintenance contractors, specialising in sports-surface care, line marking, verti-draining, soft landscaping and grounds maintenance. They have backed the club every match since the opening fixture in September 2025.\n\nHodgson Roofing — Hodgson Group TA — are NFRC-accredited roofing specialists based in Harrow, serving London and the surrounding areas. New roofs, repairs, flat roofs, lead work, Velux installs. On board since February 2026 as the warm-up and training top sponsor.\n\nIf you want to put your brand on the kit, the matchday or the website for 26/27 — the sponsors page has the full pack.',
    date: 'Ongoing', sortDate: new Date(2025, 7, 1), mood: 'd',
    partners: [
      { name: 'Sporting Solutions', logo: 'assets/sponsors/sporting-solutions.png', short: 'MAIN KIT SPONSOR · AUG 25' },
      { name: 'Hodgson Roofing',    logo: 'assets/sponsors/hodgson-roofing.png',    short: 'WARM-UP & TRAINING TOP · FEB 26' },
    ],
  });

  // Sort with intent:
  // 1. Hero banner (if present) first
  // 2. All match reports together, strictly by FIXTURE DATE (descending) —
  //    never by save/polish time.
  // 3. Everything else by its own sortDate, descending.
  articles.sort((a, b) => {
    if (a.hero && !b.hero) return -1;
    if (b.hero && !a.hero) return 1;
    const aIsReport = a.kind === 'match-report';
    const bIsReport = b.kind === 'match-report';
    if (aIsReport && !bIsReport) return -1;
    if (bIsReport && !aIsReport) return 1;
    return (b.sortDate || 0) - (a.sortDate || 0);
  });
  return articles;
}

function NewsCard({ a, size = 'sm', onOpen }) {
  return (
    <article className={`news-card news-card--${size}`} onClick={() => onOpen && onOpen(a)}>
      {(() => {
        if (a.cover) return <div className="news-card__media news-card__media--custom"><img src={a.cover} alt="" /><span className="news-card__cat news-card__cat--floating">{a.cat}</span></div>;
        const ov = window.useArticleCover ? window.useArticleCover(articleKey(a)) : null;
        if (ov) return <div className="news-card__media news-card__media--custom"><img src={ov} alt="" /><span className="news-card__cat news-card__cat--floating">{a.cat}</span></div>;
        return a.kind === 'match-report'
        ? <div className="news-card__media news-card__media--report"><MatchReportGraphic r={a.r} data={a.data} /><span className="news-card__cat news-card__cat--floating">{a.cat}</span></div>
        : a.kind === 'sponsor-feature'
          ? <div className="news-card__media news-card__media--sponsor"><SponsorCoverGraphic partners={a.partners} /><span className="news-card__cat news-card__cat--floating">{a.cat}</span></div>
        : a.kind === 'player'
          ? <div className="news-card__media news-card__media--spotlight"><SquadSpotlightGraphic player={a.player} headline={a.headline} /><span className="news-card__cat news-card__cat--floating">{a.cat}</span></div>
        : (a.fx
            ? <div className="news-card__media news-card__media--report"><MatchPreviewGraphic fx={a.fx} /><span className="news-card__cat news-card__cat--floating">{a.cat}</span></div>
            : <div className={`news-card__media news-card__media--${a.mood || 'a'}`}><span className="news-card__cat">{a.cat}</span></div>);
      })()}
      <div className="news-card__body">
        <h3 className="news-card__title">{a.title}</h3>
        {a.lede && size !== 'xs' && <p className="news-card__lede">{truncate(a.lede, size === 'lg' ? 220 : 140)}</p>}
        <div className="news-card__meta-row">
          <span className="news-card__meta">{a.date}</span>
          <span className="news-card__read-more">Read more <span aria-hidden="true">→</span></span>
        </div>
      </div>
    </article>
  );
}

function truncate(s, n) {
  if (!s) return '';
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/[\s,;:.!?—–]+\S*$/, '') + '…';
}

function PlayerPolishControl({ a, onPolished }) {
  const admin = window.useAdmin ? window.useAdmin() : false;
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  if (!admin) return null;
  const canPolish = typeof window !== 'undefined' && window.claude && window.claude.complete;

  const polish = async () => {
    setBusy(true); setError(null);
    try {
      const p = a.player;
      const blanket = window.blanketRole ? window.blanketRole(p) : 'Squad';
      const positionList = (p.positionBreakdown || []).map(([pos, n]) => `${pos} (${n})`).join(', ');
      const prompt = [
        'You are the in-house writer for Sue’s Angels FC — a London Sunday-league football club. Treat the role like a passionate club beat writer covering grassroots football for the people who actually play it. Authoritative and well-crafted, but grounded — this is Sunday League, not the Champions League.',
        'Take the structured player facts below and write a 700-900 word player spotlight article.',
        '',
        '*** PRIMARY RULE *** Stick strictly to the player facts provided. Do not invent stats, moments, biography or backstory not present in the data. Build the article AROUND the facts you have.',
        '',
        'Voice: speak from inside Sue’s Angels FC — "we", "the club", "the lads" — with the craft of a good club feature writer. Refer to the player by full name first, then surname/first-name interchangeably. Keep the scale honest — this is grassroots football.',
        'Tone: easy to read, warm, character-driven, football-culture native. Sentences should sing without straining. Plain words, real feelings. UK English. No corporate jargon, no emoji, no quotes.',
        'Structure: lead with the headline angle. Build through their season — the numbers, position(s) played, defining contributions. Reflect on what they’ve meant to Sue’s Angels FC’s League Ten title-winning campaign. Close with what comes next. 4-7 paragraphs. Plain prose. No headings, no markdown.',
        '',
        'Word count requirement: between 700 and 900 words. Do not produce anything shorter than 700 words. Aim for 800.',
        '',
        `PLAYER: ${p.first} ${p.last}`,
        `Role: ${blanket}`,
        `Headline angle: ${a.headline}`,
        `Appearances: ${p.apps} (${p.started} starts, ${p.subbedOn} sub apps)`,
        `Goals: ${p.goals}`,
        p.penaltiesScored > 0 ? `Penalties scored: ${p.penaltiesScored}` : '',
        p.setPiecesScored > 0 ? `Set-piece goals: ${p.setPiecesScored}` : '',
        `Assists: ${p.assists}`,
        p.motm > 0 ? `Man of the Match awards: ${p.motm}` : '',
        p.captained > 0 ? `Times worn the captain’s armband: ${p.captained}` : '',
        positionList ? `Positions covered: ${positionList}` : '',
        p.mostPlayedPosition ? `Most-played position: ${p.mostPlayedPosition}` : '',
        p.yc + p.rc === 0 && p.apps >= 5 ? 'Disciplinary record: spotless — zero cards' : '',
        p.yc > 0 || p.rc > 0 ? `Cards: ${p.yc} yellow, ${p.rc} red` : '',
        '',
        'CONTEXT: Sue’s Angels FC are League Ten champions of the 25/26 season, finishing the season unbeaten across the league campaign. The season ran from September 2025 to May 2026. The club was founded in 2025.',
        '',
        'Write the player feature now. Output the prose only — no preamble, no labels.',
      ].filter(Boolean).join('\n');

      const result = await window.claude.complete(prompt);
      if (!result || typeof result !== 'string' || !result.trim()) throw new Error('Empty response');
      try { localStorage.setItem('sa-player-article:' + p.num, result.trim()); } catch (e) {}
      onPolished(result.trim());
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    try { localStorage.removeItem('sa-player-article:' + a.player.num); } catch (e) {}
    onPolished(a.rawLede || a.lede);
  };

  return (
    <div className="me__polish" style={{ marginTop: 'var(--sp-3)' }}>
      <button type="button" className="btn btn--volt btn--sm" disabled={!canPolish || busy} onClick={polish}>
        {busy ? 'Writing feature…' : (a.isPolished ? 'Re-write feature' : 'Polish into feature article')}
      </button>
      {a.isPolished && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={clear}>Revert</button>
      )}
      {error && <span className="t-meta" style={{ color: 'var(--loss)' }}>{error}</span>}
    </div>
  );
}

// ─── Admin article-cover overrides ────────────────────────────────────────
// Each article gets a stable key; admins can upload a custom cover that's
// stored (localStorage 'sa-article-covers') and used instead of the auto
// graphic. Clearing the override restores the auto cover.
function articleKey(a) {
  if (!a) return 'x';
  if (a.kind === 'match-report' && a.r) return 'mr-' + a.r.id;
  if (a.kind === 'player' && a.player) return 'pl-' + a.player.num;
  if (a.kind === 'sponsor-feature') return 'sp-feature';
  if (a.fx) return 'fx-' + a.fx.id;
  return 'a-' + (a.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
}
function loadCovers() {
  try { return JSON.parse(localStorage.getItem('sa-article-covers') || '{}') || {}; } catch (e) { return {}; }
}
function saveCover(key, dataUrl) {
  const all = loadCovers();
  if (dataUrl) all[key] = dataUrl; else delete all[key];
  try { localStorage.setItem('sa-article-covers', JSON.stringify(all)); } catch (e) {}
  window.dispatchEvent(new CustomEvent('sa-covers-changed'));
}
window.useArticleCover = function (key) {
  const [v, setV] = React.useState(() => loadCovers()[key] || null);
  React.useEffect(() => {
    const h = () => setV(loadCovers()[key] || null);
    h();
    window.addEventListener('sa-covers-changed', h);
    return () => window.removeEventListener('sa-covers-changed', h);
  }, [key]);
  return v;
};

function ArticleDetail({ a: aInitial, onClose }) {
  const [a, setA] = React.useState(aInitial);
  React.useEffect(() => setA(aInitial), [aInitial]);

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  // Break the lede into paragraphs on sentence-ish boundaries for readability.
  const paragraphs = (a.lede || '')
    .split(/\n+/)
    .flatMap((para) => para.split(/(?<=[.!?…])\s+(?=[A-Z“])/g))
    .filter((p) => p && p.trim().length);

  // For match reports, also surface scorers + cards + commentary as separate blocks.
  let extras = null;
  if (a.kind === 'match-report' && a.data) {
    const scorers = (a.data.goals || []).map((g) => {
      const p = (window.SQUAD || []).find((x) => x.num === g.num);
      return p ? `${p.first} ${p.last}${g.minute ? ' ' + g.minute + '’' : ''}${g.type === 'pen' ? ' (pen)' : g.type === 'set' ? ' (SP)' : ''}` : null;
    }).filter(Boolean);
    const oppGoals = (a.data.opponentGoals || []).map((g) => {
      const min = g.minute ? ` ${g.minute}’` : '';
      return g.name ? `${g.name}${min}${g.penalty || g.type === 'pen' ? ' (pen)' : ''}` : null;
    }).filter(Boolean);
    const yc = (a.data.yellowCards || []).map((c) => {
      const p = (window.SQUAD || []).find((x) => x.num === c.num);
      return p ? `${p.last}${c.minute ? ' ' + c.minute + '’' : ''}` : null;
    }).filter(Boolean);
    const motm    = a.data.motm    && (window.SQUAD || []).find((x) => x.num === a.data.motm);
    const captain = a.data.captain && (window.SQUAD || []).find((x) => x.num === a.data.captain);
    extras = (
      <div className="ad-extras">
        {(a.r && (a.r.competition)) && <div className="ad-extra"><span className="ad-extra__lbl">COMPETITION</span><div>{a.r.competition}</div></div>}
        {(a.data.kick || (a.r && a.r.kick)) && <div className="ad-extra"><span className="ad-extra__lbl">KICK-OFF</span><div>{a.data.kick || a.r.kick}</div></div>}
        {(a.data.venue || (a.r && a.r.venue)) && <div className="ad-extra"><span className="ad-extra__lbl">VENUE</span><div>{a.data.venue || a.r.venue}</div></div>}
        {scorers.length > 0 && <div className="ad-extra"><span className="ad-extra__lbl">OUR GOALS</span><div>{scorers.join(' · ')}</div></div>}
        {oppGoals.length > 0 && <div className="ad-extra"><span className="ad-extra__lbl" style={{ color: 'var(--loss)' }}>OPPOSITION GOALS</span><div>{oppGoals.join(' · ')}</div></div>}
        {yc.length > 0 && <div className="ad-extra"><span className="ad-extra__lbl" style={{ color: 'var(--draw)' }}>YELLOWS</span><div>{yc.join(' · ')}</div></div>}
        {motm && <div className="ad-extra"><span className="ad-extra__lbl" style={{ color: 'var(--volt)' }}>MOTM</span><div>{motm.first} {motm.last}</div></div>}
        {captain && <div className="ad-extra"><span className="ad-extra__lbl">CAPTAIN</span><div>(C) {captain.first} {captain.last}</div></div>}
        {a.data.formation && <div className="ad-extra"><span className="ad-extra__lbl">FORMATION</span><div style={{ fontFamily: 'var(--font-stat)', color: 'var(--volt)' }}>{a.data.formation}</div></div>}
      </div>
    );
  }

  return (
    <div className="ad-overlay" onClick={onClose}>
      <article className="ad" onClick={(e) => e.stopPropagation()}>
        <button className="ad__close" onClick={onClose} aria-label="Close">×</button>

        {(() => {
          const key = articleKey(a);
          const override = a.cover || (window.useArticleCover ? window.useArticleCover(key) : null);
          const admin = window.useAdmin ? window.useAdmin() : false;
          const auto = a.kind === 'match-report'
            ? <div className="ad__media ad__media--report"><MatchReportGraphic r={a.r} data={a.data} /></div>
            : a.kind === 'sponsor-feature'
              ? <div className="ad__media ad__media--sponsor"><SponsorCoverGraphic partners={a.partners} /></div>
            : a.kind === 'player'
              ? <div className="ad__media ad__media--spotlight"><SquadSpotlightGraphic player={a.player} headline={a.headline} /></div>
            : (a.fx
                ? <div className="ad__media ad__media--report"><MatchPreviewGraphic fx={a.fx} /></div>
                : <div className={`ad__media ad__media--${a.mood || 'a'}`}><span className="news-card__cat" style={{ position: 'absolute', top: 18, left: 18 }}>{a.cat}</span></div>);
          return (
            <React.Fragment>
              {override
                ? <div className="ad__media ad__media--custom"><img src={override} alt="" /></div>
                : auto}
              {admin && (
                <div className="ad__coveradmin">
                  {window.MediaUploader && <window.MediaUploader label={override ? 'Replace cover' : 'Change cover'} onPick={(dataUrl) => saveCover(key, dataUrl)} />}
                  {override && <button type="button" className="ad__cover-reset" onClick={() => saveCover(key, null)}>Reset to auto</button>}
                </div>
              )}
            </React.Fragment>
          );
        })()}

        <div className="ad__body">
          <span className="ad__cat">{a.cat}</span>
          <h1 className="ad__title">{a.title}</h1>
          <span className="ad__date">{a.date}</span>

          <div className="ad__story">
            {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>

          {extras}

          {a.kind === 'player' && window.useAdmin && (
            <PlayerPolishControl
              a={a}
              onPolished={(text) => setA({ ...a, lede: text, isPolished: !!text && text !== a.rawLede })}
            />
          )}

          <footer className="ad__foot">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Close</button>
            {a.kind === 'match-report' && (
              <a href="schedule.html?tab=results" className="btn btn--volt">See all results →</a>
            )}
          </footer>
        </div>
      </article>
    </div>
  );
}

// ─── ArticleComposer — admin-only "write a news article" modal ─────────────
// Saves to the cloud (dataStore.articles) so posts appear for everyone. Offers
// an optional AI draft (window.claude.complete) from a one-line brief.
const ARTICLE_CATEGORIES = ['News', 'Announcement', 'Community', 'Charity', 'Match Report', 'Club', 'Player'];

function ArticleComposer({ existing, onClose }) {
  const isEdit = !!existing;
  const [cat, setCat] = React.useState(existing ? existing.cat : 'News');
  const [customCat, setCustomCat] = React.useState('');
  const [title, setTitle] = React.useState(existing ? existing.title : '');
  const [body, setBody] = React.useState(existing ? existing.lede : '');
  const [cover, setCover] = React.useState(existing ? existing.cover : null);
  const [brief, setBrief] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);

  const canAI = typeof window !== 'undefined' && window.claude && window.claude.complete;
  const effectiveCat = cat === '__custom__' ? (customCat.trim() || 'News') : cat;

  const draft = async () => {
    if (!brief.trim()) { setErr('Add a sentence or two for the AI to work from.'); return; }
    setErr(null); setBusy(true);
    try {
      const prompt = [
        "You are the club writer for Sue's Angels FC, a London Sunday-league football club, League Ten champions 25/26.",
        "Write a polished, warm but professional news article based on the brief below.",
        "Return ONLY the article body — 3 to 5 short paragraphs, no headline, no markdown.",
        title ? `Headline (for context): ${title}` : '',
        `Category: ${effectiveCat}`,
        `Brief: ${brief.trim()}`,
      ].filter(Boolean).join('\n');
      const out = await window.claude.complete(prompt);
      if (!out || !out.trim()) throw new Error('Empty response');
      setBody((prev) => (prev.trim() ? prev.trim() + '\n\n' : '') + out.trim());
    } catch (e) { setErr((e && e.message) || 'AI draft failed.'); }
    setBusy(false);
  };

  const save = () => {
    if (!title.trim()) { setErr('Give the article a headline.'); return; }
    if (!body.trim())  { setErr('Write or generate some body text.'); return; }
    const now = new Date();
    const id = existing ? existing.id : 'art-' + now.getTime();
    const dateStr = existing ? existing.date : now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    window.saveCustomArticle({
      id, cat: effectiveCat, title: title.trim(), lede: body.trim(),
      date: dateStr, sortISO: existing ? existing.sortISO : now.toISOString(), cover: cover || null,
    });
    onClose();
  };

  return (
    <div className="ad-overlay" onClick={onClose}>
      <div className="composer" onClick={(e) => e.stopPropagation()}>
        <button className="ad__close" onClick={onClose} aria-label="Close">×</button>
        <div className="composer__eyebrow">{isEdit ? 'EDIT ARTICLE' : 'WRITE AN ARTICLE'}</div>

        <label className="composer__label">Category</label>
        <select className="composer__input" value={cat} onChange={(e) => setCat(e.target.value)}>
          {ARTICLE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="__custom__">+ Custom category…</option>
        </select>
        {cat === '__custom__' && (
          <input className="composer__input" placeholder="New category name" value={customCat} onChange={(e) => setCustomCat(e.target.value)} />
        )}

        <label className="composer__label">Headline</label>
        <input className="composer__input" placeholder="e.g. Club announces summer charity match" value={title} onChange={(e) => setTitle(e.target.value)} />

        {canAI && (
          <div className="composer__ai">
            <label className="composer__label">AI draft <span>— give a sentence or two, we write it</span></label>
            <textarea className="composer__input composer__input--brief" rows={2} placeholder="e.g. We're hosting a charity match on 12 July to raise sepsis awareness, all welcome" value={brief} onChange={(e) => setBrief(e.target.value)} />
            <button type="button" className="btn btn--ghost composer__ai-btn" onClick={draft} disabled={busy}>
              {busy ? 'Writing…' : '✨ Generate draft'}
            </button>
          </div>
        )}

        <label className="composer__label">Article body</label>
        <textarea className="composer__input composer__input--body" rows={10} placeholder="Write your article here… (one blank line between paragraphs)" value={body} onChange={(e) => setBody(e.target.value)} />

        <label className="composer__label">Cover image (optional)</label>
        <div className="composer__cover">
          {cover && <img src={cover} alt="" className="composer__cover-preview" />}
          {window.MediaUploader && <window.MediaUploader label={cover ? 'Replace image' : 'Upload image'} onPick={(dataUrl) => setCover(dataUrl)} />}
          {cover && <button type="button" className="ad__cover-reset" onClick={() => setCover(null)}>Remove</button>}
        </div>

        {err && <div className="composer__err">{err}</div>}
        <div className="composer__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn--volt" onClick={save}>{isEdit ? 'Save changes' : 'Publish article'}</button>
        </div>
      </div>
    </div>
  );
}

function News() {
  const [filter, setFilter] = React.useState('all');
  const [openArticle, setOpenArticle] = React.useState(null);
  const [composing, setComposing] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [, forceTick] = React.useState(0);
  const admin = window.useAdmin ? window.useAdmin() : false;

  // Re-render when custom articles change (cloud sync / save / delete).
  React.useEffect(() => {
    const h = () => forceTick((n) => n + 1);
    window.addEventListener('sa-articles-changed', h);
    return () => window.removeEventListener('sa-articles-changed', h);
  }, []);

  const auto = generateArticles();
  const custom = (window.getCustomArticles ? window.getCustomArticles() : []).map((c) => ({
    kind: 'custom', custom: true, id: c.id, cat: c.cat, title: c.title, lede: c.lede,
    cover: c.cover || null, date: c.date, sortDate: new Date(c.sortISO || Date.now()),
  }));
  const all = [...custom, ...auto].sort((x, y) => (y.sortDate ? y.sortDate.getTime() : 0) - (x.sortDate ? x.sortDate.getTime() : 0));

  const cats = ['all', ...Array.from(new Set(all.map((a) => a.cat.toLowerCase())))];
  const filtered = all.filter((a) => filter === 'all' || a.cat.toLowerCase() === filter);
  const hero = filtered[0];
  const secondary = filtered.slice(1, 4);
  const feed = filtered.slice(4);

  const closeComposer = () => { setComposing(false); setEditing(null); };

  return (
    <React.Fragment>
      <div className="container" style={{ marginTop: 'var(--sp-4)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div className="filters">
          {cats.map((c) => (
            <button key={c} className={`chip ${filter === c ? 'chip--volt' : ''}`} onClick={() => setFilter(c)}>{c.toUpperCase()}</button>
          ))}
        </div>
        {admin && (
          <button type="button" className="btn btn--volt news-compose-btn" onClick={() => { setEditing(null); setComposing(true); }}>+ New article</button>
        )}
      </div>

      {hero && (
        <section className="section section--compact">
          <div className="container">
            <NewsCard a={hero} size="lg" onOpen={setOpenArticle} />
            {admin && hero.custom && <CustomArticleAdmin a={hero} onEdit={() => { setEditing(hero); setComposing(true); }} />}
          </div>
        </section>
      )}

      {secondary.length > 0 && (
        <section className="section section--compact section--alt">
          <div className="container">
            <div className="news-secondary">
              {secondary.map((a, i) => (
                <div key={i}>
                  <NewsCard a={a} size="md" onOpen={setOpenArticle} />
                  {admin && a.custom && <CustomArticleAdmin a={a} onEdit={() => { setEditing(a); setComposing(true); }} />}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {feed.length > 0 && (
        <section className="section section--compact">
          <div className="container">
            <header className="section__head section__head--compact">
              <div><div className="t-eyebrow">MORE FROM THE CLUB</div><h2 className="t-h2">EVERYTHING ELSE</h2></div>
            </header>
            <div className="news-feed">
              {feed.map((a, i) => (
                <div key={i}>
                  <NewsCard a={a} size="xs" onOpen={setOpenArticle} />
                  {admin && a.custom && <CustomArticleAdmin a={a} onEdit={() => { setEditing(a); setComposing(true); }} />}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {openArticle && <ArticleDetail a={openArticle} onClose={() => setOpenArticle(null)} />}
      {composing && <ArticleComposer existing={editing} onClose={closeComposer} />}
    </React.Fragment>
  );
}

// Small edit/delete bar shown under custom articles in admin mode.
function CustomArticleAdmin({ a, onEdit }) {
  return (
    <div className="custom-art-admin">
      <button type="button" className="custom-art-admin__btn" onClick={onEdit}>Edit</button>
      <button type="button" className="custom-art-admin__btn custom-art-admin__btn--danger" onClick={() => {
        if (window.confirm('Delete this article?')) window.deleteCustomArticle(a.id);
      }}>Delete</button>
    </div>
  );
}

window.News = News;
