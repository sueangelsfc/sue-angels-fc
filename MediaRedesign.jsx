// MediaRedesign.jsx, News + Gallery (v2). HUMAN-AUTHORED CONTENT ONLY.
// All AI generation (auto match reports, auto previews, auto player spotlights,
// AI draft + AI polish) has been removed per club direction. Articles come from
// (1) the manual composer (cloud) and (2) coach-written match commentary/preview.
const { Reveal, RDArrow, RDPage, RDPageHero } = window;

const RD_ART_CATS = ['News', 'Announcement', 'Match Report', 'Match Preview', 'Community', 'Charity', 'Club', 'Player'];

function rdParseDate(s) {
  const M = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const m = /^(\d{1,2})\s+(\w{3})\s+(\d{2})$/.exec((s || '').trim());
  return m ? new Date(2000 + +m[3], M[m[2]] || 0, +m[1]) : new Date(0);
}

// Build the human-authored article set.
function rdCollectArticles() {
  const out = [];
  // 1) Manual composer articles (cloud).
  for (const c of (window.getCustomArticles ? window.getCustomArticles() : [])) {
    out.push({ kind: 'custom', id: c.id, cat: c.cat || 'News', title: c.title, lede: c.lede, cover: c.cover || null, date: c.date, sort: new Date(c.sortISO || Date.now()) });
  }
  // 2) Coach-written match reports (data.commentary), NO AI.
  const results = window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || []);
  for (const r of results) {
    const data = window.loadMatchEntry ? window.loadMatchEntry(r.id) : null;
    const text = data && data.commentary && data.commentary.trim();
    if (!text) continue;
    const usHome = r.home.includes('Angels');
    const us = usHome ? r.hs : r.as, them = usHome ? r.as : r.hs;
    out.push({ kind: 'report', id: 'mr-' + r.id, cat: 'Match Report', r, data, title: `${r.kind === 'walkover' ? r.wo : `${us}–${them}`} ${usHome ? '(H)' : '(A)'} vs ${(usHome ? r.away : r.home).replace(' FC', '')}`, lede: text, date: r.date, sort: rdParseDate(r.date) });
  }
  // 3) Coach-written previews (data.preview), NO AI.
  const lookup = {};
  for (const f of (window.UPCOMING_FIXTURES || [])) lookup[f.id] = f;
  for (const r of (window.getDerivedResults ? window.getDerivedResults() : [])) if (!lookup[r.id]) lookup[r.id] = r;
  for (const id in lookup) {
    const data = window.loadMatchEntry ? window.loadMatchEntry(id) : null;
    const text = data && data.preview && data.preview.trim();
    if (!text) continue;
    const fx = lookup[id]; const usHome = (fx.home || '').includes('Angels');
    out.push({ kind: 'preview', id: 'pv-' + id, cat: 'Match Preview', fx, data, title: `Preview, ${(usHome ? fx.away : fx.home).replace(' FC', '')} (${usHome ? 'H' : 'A'})`, lede: text, date: fx.date && fx.mon ? `${fx.day} ${fx.date} ${fx.mon}` : (fx.date || ''), sort: rdParseDate(fx.date) });
  }
  out.sort((a, b) => (b.sort ? b.sort.getTime() : 0) - (a.sort ? a.sort.getTime() : 0));
  return out;
}

function rdTrunc(s, n) { if (!s) return ''; return s.length <= n ? s : s.slice(0, n).replace(/[\s,;:.!?, –]+\S*$/, '') + '…'; }

// score-card cover for match reports/previews
function RDScoreCover({ a }) {
  if (a.kind === 'report') {
    const r = a.r, usHome = r.home.includes('Angels');
    let res = 'd'; const us = usHome ? r.hs : r.as, them = usHome ? r.as : r.hs;
    if (r.kind === 'walkover') res = 'w'; else if (us > them) res = 'w'; else if (us < them) res = 'l';
    return (
      <div className={`rd-score-cover rd-score-cover--${res}`}>
        <span className="rd-score-cover__ft">Full time</span>
        <div className="rd-score-cover__row">
          {window.TeamBadge ? <window.TeamBadge team={r.home} size={34} /> : null}
          <b>{r.kind === 'walkover' ? r.wo : `${r.hs}–${r.as}`}</b>
          {window.TeamBadge ? <window.TeamBadge team={r.away} size={34} /> : null}
        </div>
        <span className="rd-score-cover__comp">{r.competition || 'League Ten'}</span>
      </div>
    );
  }
  const fx = a.fx, usHome = (fx.home || '').includes('Angels');
  return (
    <div className="rd-score-cover rd-score-cover--p">
      <span className="rd-score-cover__ft">Upcoming</span>
      <div className="rd-score-cover__row">
        {window.TeamBadge ? <window.TeamBadge team={fx.home} size={34} /> : null}
        <b>{fx.kick || 'VS'}</b>
        {window.TeamBadge ? <window.TeamBadge team={fx.away} size={34} /> : null}
      </div>
      <span className="rd-score-cover__comp">{fx.comp || 'League Ten'}</span>
    </div>
  );
}

function RDArticleCover({ a }) {
  const ov = window.getArticleCover ? window.getArticleCover(a.id) : null;
  if (ov || a.cover) return <div className="rd-article__cover rd-article__cover--img"><img src={ov || a.cover} alt="" /></div>;
  if (a.kind === 'report' || a.kind === 'preview') return <div className="rd-article__cover">{<RDScoreCover a={a} />}</div>;
  return <div className="rd-article__cover rd-article__cover--plain"><img className="rd-slot__mark" src="assets/badge/sue-angels-shield.png" alt="" /></div>;
}

function RDArticleModal({ a, onClose }) {
  const admin = window.useAdmin ? window.useAdmin() : false;
  const [, ctick] = React.useState(0);
  React.useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  const paras = (a.lede || '').split(/\n+/).flatMap((p) => p.split(/(?<=[.!?…])\s+(?=[A-Z“])/g)).filter((p) => p && p.trim());
  let extras = null;
  if (a.kind === 'report' && a.data) {
    const scorers = (a.data.goals || []).map((g) => { const p = (window.SQUAD || []).find((x) => x.num === g.num); return p ? `${p.first} ${p.last}${g.type === 'pen' ? ' (pen)' : ''}` : null; }).filter(Boolean);
    const motm = a.data.motm && (window.SQUAD || []).find((x) => x.num === a.data.motm);
    const venue = a.data.venue || a.r.venue, kick = a.data.kick || a.r.kick;
    extras = (
      <div className="rd-art-extras">
        {a.r.competition ? <div><span>Competition</span><b>{a.r.competition}</b></div> : null}
        {kick ? <div><span>Kick-off</span><b>{kick}</b></div> : null}
        {venue ? <div><span>Venue</span><b>{venue}</b></div> : null}
        {scorers.length ? <div><span>Our goals</span><b>{scorers.join(' · ')}</b></div> : null}
        {motm ? <div><span>MOTM</span><b>{motm.first} {motm.last}</b></div> : null}
      </div>
    );
  }
  if (a.kind === 'preview' && a.fx) {
    extras = (
      <div className="rd-art-extras">
        {a.fx.comp ? <div><span>Competition</span><b>{a.fx.comp}</b></div> : null}
        {a.fx.kick ? <div><span>Kick-off</span><b>{a.fx.kick}</b></div> : null}
        {a.fx.ven ? <div><span>Venue</span><b>{a.fx.ven}</b></div> : null}
        {a.fx.loc ? <div><span>Home / away</span><b>{a.fx.loc}</b></div> : null}
      </div>
    );
  }
  return (
    <div className="rd-modal" onClick={onClose}>
      <div className="rd-modal__panel rd-modal__panel--wide" onClick={(e) => e.stopPropagation()}>
        <button className="rd-modal__close" onClick={onClose} aria-label="Close">×</button>
        <RDArticleCover a={a} />
        {admin && window.MediaUploader ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
            <window.MediaUploader label="Change cover" onPick={(d) => { window.setArticleCover(a.id, d); ctick((n) => n + 1); }} />
            {window.getArticleCover && window.getArticleCover(a.id) ? <button className="rd-btn rd-btn--ghost rd-btn--sm" onClick={() => { window.setArticleCover(a.id, ''); ctick((n) => n + 1); }}>Reset cover</button> : null}
          </div>
        ) : null}
        <p className="rd-eyebrow" style={{ marginTop: 22 }}>{a.cat}</p>
        <h2 className="rd-h3" style={{ marginTop: 10 }}>{a.title}</h2>
        <p style={{ color: 'var(--fg-3)', font: '600 12px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 8 }}>{a.date}</p>
        <div className="rd-prose" style={{ marginTop: 18 }}>{paras.map((p, i) => <p key={i}>{p}</p>)}</div>
        {extras}
      </div>
    </div>
  );
}

// manual composer, NO AI
function RDComposer({ existing, onClose }) {
  const [cat, setCat] = React.useState(existing ? existing.cat : 'News');
  const [custom, setCustom] = React.useState('');
  const [title, setTitle] = React.useState(existing ? existing.title : '');
  const [body, setBody] = React.useState(existing ? existing.lede : '');
  const [cover, setCover] = React.useState(existing ? existing.cover : null);
  const [err, setErr] = React.useState(null);
  const eff = cat === '__c' ? (custom.trim() || 'News') : cat;
  const save = () => {
    if (!title.trim()) return setErr('Give the article a headline.');
    if (!body.trim()) return setErr('Write the article body.');
    const now = new Date();
    window.saveCustomArticle({ id: existing ? existing.id : 'art-' + now.getTime(), cat: eff, title: title.trim(), lede: body.trim(), date: existing ? existing.date : now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), sortISO: existing ? existing.sortISO : now.toISOString(), cover: cover || null });
    onClose();
  };
  return (
    <div className="rd-modal" onClick={onClose}>
      <div className="rd-modal__panel" onClick={(e) => e.stopPropagation()}>
        <button className="rd-modal__close" onClick={onClose} aria-label="Close">×</button>
        <p className="rd-eyebrow">{existing ? 'Edit article' : 'Write an article'}</p>
        <div className="rd-form" style={{ marginTop: 18 }}>
          <label className="rd-field"><span>Category</span>
            <select value={cat} onChange={(e) => setCat(e.target.value)}>{RD_ART_CATS.map((c) => <option key={c} value={c}>{c}</option>)}<option value="__c">+ Custom…</option></select>
          </label>
          {cat === '__c' ? <label className="rd-field"><span>Custom category</span><input value={custom} onChange={(e) => setCustom(e.target.value)} /></label> : null}
          <label className="rd-field"><span>Headline</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Club announces summer charity match" /></label>
          <label className="rd-field"><span>Article body</span><textarea rows="9" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your article… one blank line between paragraphs"></textarea></label>
          <label className="rd-field"><span>Cover image (optional)</span>{window.MediaUploader ? <window.MediaUploader label={cover ? 'Replace image' : 'Upload image'} onPick={setCover} /> : null}</label>
          {cover ? <img src={cover} alt="" style={{ maxHeight: 120, borderRadius: 10, objectFit: 'cover' }} /> : null}
          {err ? <p style={{ color: 'var(--loss)', font: '600 13px var(--font-sans)' }}>{err}</p> : null}
          <div className="rd-form__actions">
            <button className="rd-btn rd-btn--ghost" onClick={onClose}>Cancel</button>
            <button className="rd-btn rd-btn--volt" onClick={save}>{existing ? 'Save changes' : 'Publish article'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RDNews() {
  const admin = window.useAdmin ? window.useAdmin() : false;
  const [filter, setFilter] = React.useState('all');
  const [open, setOpen] = React.useState(null);
  const [compose, setCompose] = React.useState(false);
  const [edit, setEdit] = React.useState(null);
  const [, tick] = React.useState(0);
  React.useEffect(() => { const h = () => tick((n) => n + 1); window.addEventListener('sa-articles-changed', h); return () => window.removeEventListener('sa-articles-changed', h); }, []);
  const all = rdCollectArticles();
  const cats = ['all', ...Array.from(new Set(all.map((a) => a.cat)))];
  const list = all.filter((a) => filter === 'all' || a.cat === filter);
  return (
    <div>
      <div className="rd-news-bar">
        <div className="rd-tabs">{cats.map((c) => <button key={c} className={`rd-tab ${filter === c ? 'is-active' : ''}`} onClick={() => setFilter(c)}>{c}</button>)}</div>
        {admin ? <button className="rd-btn rd-btn--volt rd-btn--sm" onClick={() => { setEdit(null); setCompose(true); }}>+ New article</button> : null}
      </div>
      {list.length === 0 ? (
        <div className="rd-empty"><h3 className="rd-h3">No articles yet</h3><p className="rd-lead" style={{ margin: '12px auto 0' }}>Match reports, previews and club news will appear here.</p></div>
      ) : (
        <div className="rd-news" style={{ marginTop: 24 }}>
          {list.map((a) => (
            <div key={a.id} style={{ position: 'relative' }}>
              <button className="rd-article" onClick={() => setOpen(a)}>
                <RDArticleCover a={a} />
                <div className="rd-article__body">
                  <span className="rd-article__cat">{a.cat}</span>
                  <h3 className="rd-article__title">{a.title}</h3>
                  <p className="rd-article__excerpt">{rdTrunc(a.lede, 130)}</p>
                  <div className="rd-article__foot"><span>{a.date}</span><span>Read more →</span></div>
                </div>
              </button>
              {admin && a.kind === 'custom' ? (
                <div className="rd-article__admin">
                  <button className="rd-btn rd-btn--ghost rd-btn--sm" onClick={() => { setEdit(a); setCompose(true); }}>Edit</button>
                  <button className="rd-btn rd-btn--ghost rd-btn--sm" onClick={() => { if (confirm('Delete this article?')) window.deleteCustomArticle(a.id); }}>Delete</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {open ? <RDArticleModal a={open} onClose={() => setOpen(null)} /> : null}
      {compose ? <RDComposer existing={edit} onClose={() => { setCompose(false); setEdit(null); }} /> : null}
    </div>
  );
}

function RDGalleryTab() {
  const admin = window.useAdmin ? window.useAdmin() : false;
  const items = window.useMediaStore ? window.useMediaStore(window.GalleryStore, 'gallery') : (window.GalleryStore ? window.GalleryStore.list() : []);
  const [lightbox, setLightbox] = React.useState(null);
  return (
    <div>
      {admin && window.AlbumComposer ? <div style={{ marginBottom: 22 }}><window.AlbumComposer /></div> : null}
      {(!items || items.length === 0) ? (
        <div className="rd-empty"><h3 className="rd-h3">No photos yet</h3><p className="rd-lead" style={{ margin: '12px auto 0' }}>Matchday albums will appear here.</p></div>
      ) : (
        <div className="rd-gallery-rail">
          {items.map((it, i) => {
            const cover = window.galleryCover ? window.galleryCover(it) : it.src;
            const count = window.galleryCount ? window.galleryCount(it) : 1;
            return (
              <button className="rd-gtile rd-gtile--rail" key={it.id || i} title={it.title || it.caption || 'Matchday'} onClick={() => setLightbox(it)}>
                {cover ? <img className="rd-slot__photo" src={cover} alt={it.title || ''} /> : <img className="rd-slot__mark" src="assets/badge/sue-angels-shield.png" alt="" />}
                {count > 1 ? <span className="rd-gtile__count">{count}</span> : null}
              </button>
            );
          })}
        </div>
      )}
      {lightbox && window.AlbumLightbox ? <window.AlbumLightbox album={lightbox} onClose={() => setLightbox(null)} /> : null}
    </div>
  );
}

function RDVideoTab() {
  const admin = window.useAdmin ? window.useAdmin() : false;
  const [, tick] = React.useState(0);
  const [form, setForm] = React.useState({ title: '', url: '' });
  const videos = window.getClubVideos ? window.getClubVideos() : [];
  const fire = () => tick((n) => n + 1);
  const add = () => { if (!form.url.trim()) return; const id = 'v' + Date.now(); Promise.resolve(window.saveClubVideos([{ id, title: form.title.trim() || 'Match video', url: form.url.trim() }, ...videos])).then(() => { setForm({ title: '', url: '' }); fire(); }); };
  const remove = (id) => Promise.resolve(window.saveClubVideos(videos.filter((v) => v.id !== id))).then(fire);
  const ytId = (u) => { const m = /(?:youtu\.be\/|v=|embed\/)([\w-]{11})/.exec(u || ''); return m ? m[1] : null; };
  return (
    <div>
      {admin ? (
        <div className="rd-card" style={{ marginBottom: 20 }}><div className="rd-form">
          <p className="rd-eyebrow">Add a video</p>
          <div className="rd-form__row">
            <label className="rd-field"><span>Title</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Highlights vs Hillside" /></label>
            <label className="rd-field"><span>Link (VEO or YouTube)</span><input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://app.veo.co/... or https://youtu.be/..." /></label>
          </div>
          <div className="rd-form__actions"><span className="rd-form__note">Paste a VEO match link or a YouTube link.</span><button className="rd-btn rd-btn--volt" onClick={add}>Add video</button></div>
        </div></div>
      ) : null}
      {videos.length === 0 ? (
        <div className="rd-empty"><h3 className="rd-h3">No videos yet</h3><p className="rd-lead" style={{ margin: '12px auto 0' }}>Match highlights and full VEO recordings will appear here.</p></div>
      ) : (
        <div className="rd-news">
          {videos.map((v) => { const yt = ytId(v.url); return (
            <div className="rd-article" key={v.id}>
              <div className="rd-article__cover" style={{ aspectRatio: '16/9' }}>
                {yt ? <iframe src={`https://www.youtube.com/embed/${yt}`} title={v.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} allowFullScreen></iframe>
                    : <a href={v.url} target="_blank" rel="noopener" className="rd-video-link"><span className="rd-video-play">▶</span><span>Watch on VEO</span></a>}
              </div>
              <div className="rd-article__body"><span className="rd-article__cat">Video</span><h3 className="rd-article__title">{v.title}</h3><div className="rd-article__foot"><a href={v.url} target="_blank" rel="noopener" style={{ color: 'var(--rd-volt)', textDecoration: 'none' }}>Open &rarr;</a>{admin ? <button className="rd-btn rd-btn--ghost rd-btn--sm" onClick={() => remove(v.id)}>Remove</button> : null}</div></div>
            </div>
          ); })}
        </div>
      )}
    </div>
  );
}

function MediaV2() {
  const initial = (() => { try { return new URL(location.href).searchParams.get('tab'); } catch (e) { return null; } })() || window.RD_MEDIA_TAB || 'news';
  const [tab, setTab] = React.useState(['news', 'gallery', 'video'].includes(initial) ? initial : 'news');
  React.useEffect(() => { try { const u = new URL(location.href); u.searchParams.set('tab', tab); history.replaceState({}, '', u); } catch (e) {} }, [tab]);
  return (
    <RDPage>
      <main>
        <RDPageHero eyebrow="Media" title={<>News &amp; <em>media</em>.</>} sub={tab === 'news' ? 'Match reports, previews and club news, written by us.' : 'Matchday photography and behind the scenes.'} />
        <section className="rd-section rd-section--tight">
          <div className="rd-container">
            <div className="rd-tabs" style={{ marginBottom: 28 }}>
              <button className={`rd-tab ${tab === 'news' ? 'is-active' : ''}`} onClick={() => setTab('news')}>Latest news</button>
              <button className={`rd-tab ${tab === 'gallery' ? 'is-active' : ''}`} onClick={() => setTab('gallery')}>Photo gallery</button>
              <button className={`rd-tab ${tab === 'video' ? 'is-active' : ''}`} onClick={() => setTab('video')}>Video</button>
            </div>
            {tab === 'news' ? <RDNews /> : tab === 'gallery' ? <RDGalleryTab /> : <RDVideoTab />}
          </div>
        </section>
      </main>
    </RDPage>
  );
}

ReactDOM.createRoot(document.getElementById('rd-root')).render(<MediaV2 />);
