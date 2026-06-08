// AdminPanel.jsx, unified author / CMS control panel (v2 design).
// Re-homes every editing tool into one clean dashboard instead of scattering
// admin controls across the public pages. Reuses the existing, working editors
// (MatchEntry, FixtureAdminPanel, AlbumComposer, MediaUploader, stores).
const { RDArrow } = window;

function CmsArticles() {
  const [, tick] = React.useState(0);
  const [edit, setEdit] = React.useState(undefined); // undefined=closed, null=new, obj=edit
  React.useEffect(() => { const h = () => tick((n) => n + 1); window.addEventListener('sa-articles-changed', h); return () => window.removeEventListener('sa-articles-changed', h); }, []);
  const arts = window.getCustomArticles ? window.getCustomArticles() : [];
  const CATS = ['News', 'Announcement', 'Match Report', 'Match Preview', 'Community', 'Charity', 'Club', 'Player'];

  function Editor({ existing }) {
    const [cat, setCat] = React.useState(existing ? existing.cat : 'News');
    const [title, setTitle] = React.useState(existing ? existing.title : '');
    const [body, setBody] = React.useState(existing ? existing.lede : '');
    const [cover, setCover] = React.useState(existing ? existing.cover : null);
    const [err, setErr] = React.useState(null);
    const save = () => {
      if (!title.trim() || !body.trim()) return setErr('Headline and body are required.');
      const now = new Date();
      window.saveCustomArticle({ id: existing ? existing.id : 'art-' + now.getTime(), cat, title: title.trim(), lede: body.trim(), date: existing ? existing.date : now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), sortISO: existing ? existing.sortISO : now.toISOString(), cover: cover || null });
      setEdit(undefined);
    };
    return (
      <div className="rd-card cms-editor">
        <div className="rd-form">
          <label className="rd-field"><span>Category</span><select value={cat} onChange={(e) => setCat(e.target.value)}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="rd-field"><span>Headline</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article headline" /></label>
          <label className="rd-field"><span>Body</span><textarea rows="8" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the article… one blank line between paragraphs"></textarea></label>
          <label className="rd-field"><span>Cover image (optional)</span>{window.MediaUploader ? <window.MediaUploader label={cover ? 'Replace image' : 'Upload image'} onPick={setCover} /> : null}</label>
          {cover ? <img src={cover} alt="" style={{ maxHeight: 110, borderRadius: 10, objectFit: 'cover' }} /> : null}
          {err ? <p style={{ color: 'var(--loss)', font: '600 13px var(--font-sans)' }}>{err}</p> : null}
          <div className="rd-form__actions"><button className="rd-btn rd-btn--ghost" onClick={() => setEdit(undefined)}>Cancel</button><button className="rd-btn rd-btn--volt" onClick={save}>{existing ? 'Save changes' : 'Publish'}</button></div>
        </div>
      </div>
    );
  }

  if (edit !== undefined) return <Editor existing={edit} />;
  return (
    <div>
      <div className="cms-sec__head"><div><h2 className="rd-h3">Articles &amp; news</h2><p className="cms-sec__sub">Write match reports, previews and announcements by hand. Published instantly to the public site.</p></div><button className="rd-btn rd-btn--volt rd-btn--sm" onClick={() => setEdit(null)}>+ New article</button></div>
      {arts.length === 0 ? <p className="cms-empty">No articles yet. Write your first one.</p> : (
        <div className="cms-list">
          {arts.sort((a, b) => new Date(b.sortISO || 0) - new Date(a.sortISO || 0)).map((a) => (
            <div className="cms-row" key={a.id}>
              <div><span className="rd-chip">{a.cat}</span><b className="cms-row__t">{a.title}</b><span className="cms-row__d">{a.date}</span></div>
              <div className="cms-row__act"><button className="rd-btn rd-btn--ghost rd-btn--sm" onClick={() => setEdit(a)}>Edit</button><button className="rd-btn rd-btn--ghost rd-btn--sm" onClick={() => { if (confirm('Delete this article?')) window.deleteCustomArticle(a.id); }}>Delete</button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CmsMatchData() {
  const results = window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || []);
  const fixtures = window.getActiveUpcoming ? window.getActiveUpcoming() : (window.UPCOMING_FIXTURES || []);
  const [openId, setOpenId] = React.useState(null);
  const [, force] = React.useState(0);
  const entries = window.getAllMatchEntries ? window.getAllMatchEntries() : [];
  const byId = {}; entries.forEach((e) => { byId[e.id] = e.data; });
  const completeness = (item) => {
    const d = byId[item.id] || {};
    const hasXI = (d.starters || []).length >= 7;
    const usHome = (item.home || '').indexOf('Angels') > -1;
    const ourGoals = item.kind === 'walkover' ? 0 : (usHome ? item.hs : item.as);
    const scorersOk = (d.goals || []).length >= (ourGoals || 0);
    const hasMOTM = !!d.motm;
    return { hasXI, scorersOk, hasMOTM, done: hasXI && scorersOk && hasMOTM };
  };
  const row = (item, isFixture) => {
    const c = isFixture ? null : completeness(item);
    const label = isFixture
      ? `${item.home} vs ${item.away} · ${item.day || ''} ${item.date || ''} ${item.mon || ''} · ${item.comp || ''}`
      : `${item.home} ${item.kind === 'walkover' ? item.wo : (item.hs + '–' + item.as)} ${item.away} · ${item.date} · ${item.competition || ''}`;
    const open = openId === item.id;
    return (
      <div className="cms-match" key={item.id}>
        <button className="cms-match__head" onClick={() => setOpenId(open ? null : item.id)}>
          <span className="cms-match__lbl">{label}</span>
          {c ? <span className="cms-prog">{[['XI', c.hasXI], ['Goals', c.scorersOk], ['MOTM', c.hasMOTM]].map(([l, ok]) => <span key={l} className={`cms-prog__pill ${ok ? 'is-ok' : 'is-miss'}`}>{l}</span>)}</span> : null}
          <span className="cms-match__chev">{open ? '–' : 'Edit'}</span>
        </button>
        {!isFixture && window.MediaUploader ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', flexWrap: 'wrap' }}>{(window.getArticleCover && window.getArticleCover(item.id)) ? <img src={window.getArticleCover(item.id)} alt="" style={{ width: 72, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)' }} /> : null}<window.MediaUploader label={(window.getArticleCover && window.getArticleCover(item.id)) ? 'Replace report cover' : 'Add report cover'} onPick={(d) => { Promise.resolve(window.setArticleCover(item.id, d)).then(() => { try { window.dispatchEvent(new CustomEvent('sa-media-changed')); } catch (e) {} force((n) => n + 1); }); }} />{(window.getArticleCover && window.getArticleCover(item.id)) ? <button className="rd-btn rd-btn--ghost rd-btn--sm" onClick={() => { Promise.resolve(window.setArticleCover(item.id, '')).then(() => { try { window.dispatchEvent(new CustomEvent('sa-media-changed')); } catch (e) {} force((n) => n + 1); }); }}>Remove cover</button> : null}<span className="cms-row__d" style={{ textTransform: 'none', letterSpacing: 0 }}>Fills the match-report card on the Media page.</span></div> : null}
        {open && window.MatchEntry ? <div className="cms-match__body"><window.MatchEntry matchId={item.id} matchLabel={label} /></div> : null}
      </div>
    );
  };
  return (
    <div>
      <div className="cms-sec__head"><div><h2 className="rd-h3">Match data</h2><p className="cms-sec__sub">Enter the starting XI, bench, scorers, assists, cards and MOTM. This powers every stat, the leaderboard and the player dashboards.</p></div></div>
      {fixtures.length ? <React.Fragment><h3 className="cms-subhead">Upcoming fixtures</h3>{fixtures.map((f) => row(f, true))}</React.Fragment> : null}
      <h3 className="cms-subhead">Results</h3>
      {results.length ? <p className="cms-sec__sub" style={{ margin: '0 0 10px' }}>{results.filter((r) => completeness(r).done).length} of {results.length} fully logged · the pills show which matches still need a lineup, goalscorers or MOTM.</p> : null}
      {results.length ? results.map((r) => row(r, false)) : <p className="cms-empty">No results yet.</p>}
    </div>
  );
}

function CmsFixtures() {
  return (
    <div>
      <div className="cms-sec__head"><div><h2 className="rd-h3">Fixtures</h2><p className="cms-sec__sub">Add and manage upcoming fixtures. Played fixtures move into Results automatically once kick-off passes.</p></div></div>
      {window.FixtureAdminPanel ? <window.FixtureAdminPanel /> : <p className="cms-empty">Fixture tool unavailable.</p>}
    </div>
  );
}

// Per-photo tagging: pick a photo in the album, then tag the players AND coaching
// staff who appear in THAT photo. Stored as album.photoTags (array parallel to
// photos); album.tags is kept as the union for back-compat displays.
function AlbumPhotoTagger({ album }) {
  const photos = window.galleryPhotos ? window.galleryPhotos(album) : (album.photos || []);
  const [sel, setSel] = React.useState(0);
  const photoTags = album.photoTags || [];
  const cur = photoTags[sel] || [];
  const players = (window.SQUAD || []).map((p) => `${p.first} ${p.last}`);
  const coaches = (window.COACHES || []).map((c) => c.name).filter(Boolean);
  function toggle(name) {
    const next = photoTags.slice();
    while (next.length < photos.length) next.push([]);
    const list = next[sel] || [];
    next[sel] = list.includes(name) ? list.filter((x) => x !== name) : [...list, name];
    const union = Array.from(new Set([].concat.apply([], next)));
    window.GalleryStore.update(album.id, { photoTags: next, tags: union });
  }
  if (!photos.length) return <p className="cms-sec__sub">No photos in this album.</p>;
  return (
    <div className="album-ptag">
      <p className="cms-sec__sub" style={{ margin: '0 0 10px' }}>Pick a photo, then tag the players &amp; coaching staff in <em>that</em> photo. Saved instantly.</p>
      <div className="album-ptag__strip">
        {photos.map((src, i) => {
          const n = (photoTags[i] || []).length;
          return (
            <button type="button" key={i} className={`album-ptag__thumb ${i === sel ? 'is-sel' : ''}`} onClick={() => setSel(i)}>
              <img src={src} alt={`Photo ${i + 1}`} />
              <span className="album-ptag__no">{i + 1}</span>
              {n > 0 ? <span className="album-ptag__badge">{n}</span> : null}
            </button>
          );
        })}
      </div>
      <div className="album-ptag__lbl">Photo {sel + 1} of {photos.length} &middot; {cur.length} tagged</div>
      <div className="album-ptag__grouplbl">Players</div>
      <div className="album-tags">
        {players.map((name, i) => {
          const on = cur.includes(name);
          return <button type="button" key={'p' + i} className={`album-tag ${on ? 'is-on' : ''}`} onClick={() => toggle(name)}>{name}</button>;
        })}
      </div>
      {coaches.length ? (
        <React.Fragment>
          <div className="album-ptag__grouplbl">Coaching staff</div>
          <div className="album-tags">
            {coaches.map((name, i) => {
              const on = cur.includes(name);
              return <button type="button" key={'c' + i} className={`album-tag album-tag--coach ${on ? 'is-on' : ''}`} onClick={() => toggle(name)}>{name}</button>;
            })}
          </div>
        </React.Fragment>
      ) : null}
    </div>
  );
}

function CmsGallery() {
  const items = window.useMediaStore ? window.useMediaStore(window.GalleryStore, 'gallery') : (window.GalleryStore ? window.GalleryStore.list() : []);
  const [tagId, setTagId] = React.useState(null);
  const squad = window.SQUAD || [];
  return (
    <div>
      <div className="cms-sec__head"><div><h2 className="rd-h3">Photo gallery</h2><p className="cms-sec__sub">Upload matchday albums, many photos per post, with a chosen cover. Set a <b>Category</b> on any album and it becomes a gallery tab. Tag one <b>Matchday</b> to upload both team badges + a photo credit (auto-generates a scorecard cover).</p></div></div>
      {window.AlbumComposer ? <window.AlbumComposer /> : null}
      {items.length ? (
        <div className="cms-list" style={{ marginTop: 16 }}>
          {items.map((it) => {
            const cover = window.galleryCover ? window.galleryCover(it) : it.src;
            const count = window.galleryCount ? window.galleryCount(it) : ((it.photos && it.photos.length) || 1);
            const tags = it.tags || [];
            const editing = tagId === it.id;
            return (
              <div className="cms-album" key={it.id} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div className="cms-row" style={{ gap: 12 }}>
                  {cover ? <img src={cover} alt="" style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 8, flex: '0 0 auto' }} /> : null}
                  <input defaultValue={it.title || it.caption || ''} placeholder="Album title" onBlur={(e) => window.GalleryStore.update(it.id, { title: e.target.value, caption: e.target.value })} style={{ flex: 1, minWidth: 120 }} />
                  <span className="rd-chip">{count} photo{count === 1 ? '' : 's'}</span>
                  <span className="rd-chip">{tags.length} tagged</span>
                  <button className={`rd-btn rd-btn--sm ${editing ? 'rd-btn--volt' : 'rd-btn--ghost'}`} onClick={() => setTagId(editing ? null : it.id)}>{editing ? 'Done' : 'Tag photos'}</button>
                  <button className="rd-btn rd-btn--ghost rd-btn--sm" onClick={() => { if (window.confirm('Delete this album? This cannot be undone.')) window.GalleryStore.remove(it.id); }}>Delete</button>
                </div>
                <div className="cms-row" style={{ gap: 10, flexWrap: 'wrap' }}>
                  <input defaultValue={it.category || ''} placeholder="Category → becomes a gallery tab (e.g. Matchday, Training, Celebration)" onBlur={(e) => window.GalleryStore.update(it.id, { category: e.target.value.trim() })} style={{ flex: 1, minWidth: 220 }} />
                  {(it.category || '').toLowerCase() === 'matchday' ? (
                    <React.Fragment>
                      {it.homeBadge ? <img src={it.homeBadge} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} /> : null}
                      {window.MediaUploader ? <window.MediaUploader label={it.homeBadge ? 'Home badge ✓' : 'Home badge'} onPick={(d) => window.GalleryStore.update(it.id, { homeBadge: d })} /> : null}
                      {it.awayBadge ? <img src={it.awayBadge} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} /> : null}
                      {window.MediaUploader ? <window.MediaUploader label={it.awayBadge ? 'Away badge ✓' : 'Away badge'} onPick={(d) => window.GalleryStore.update(it.id, { awayBadge: d })} /> : null}
                      <input defaultValue={it.photographer || ''} placeholder="Photos by…" onBlur={(e) => window.GalleryStore.update(it.id, { photographer: e.target.value.trim() })} style={{ minWidth: 150 }} />
                    </React.Fragment>
                  ) : null}
                </div>
                {editing ? (
                  <div className="cms-album__tags" style={{ padding: '10px 4px 14px' }}>
                    <AlbumPhotoTagger album={it} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : <p className="cms-empty" style={{ marginTop: 14 }}>No albums yet. Use “New album” above to publish one.</p>}
    </div>
  );
}

function CmsPhotos() {
  const [, tick] = React.useState(0);
  React.useEffect(() => { const h = () => tick((n) => n + 1); window.addEventListener('sa-media-changed', h); return () => window.removeEventListener('sa-media-changed', h); }, []);
  const squad = window.SQUAD || [];
  return (
    <div>
      <div className="cms-sec__head"><div><h2 className="rd-h3">Squad photos</h2><p className="cms-sec__sub">Set each player's main headshot, then add more photos for their dashboard gallery. Pick images one at a time to add several.</p></div></div>
      <div className="cms-photos">
        {squad.map((p) => {
          const photo = window.getPlayerPhoto ? window.getPlayerPhoto(p.num) : null;
          const gallery = window.getPlayerGallery ? window.getPlayerGallery(p.num) : [];
          return (
            <div className="cms-photo" key={p.num}>
              <div className="cms-photo__img">{photo ? <img src={photo} alt={`${p.first} ${p.last}`} /> : <span>{p.first[0]}{p.last[0]}</span>}</div>
              <div className="cms-photo__name">{p.first} {p.last}</div>
              {window.MediaUploader ? <window.MediaUploader label={photo ? 'Replace main' : 'Main photo'} onPick={(d) => window.setPlayerPhoto(p.num, d)} /> : null}
              {photo ? <button className="cms-photo__rm" onClick={() => window.clearPlayerPhoto(p.num)}>Remove main</button> : null}
              {gallery.length ? (
                <div className="cms-photo__gal">
                  {gallery.map((g, i) => (
                    <span className="cms-photo__galitem" key={i}><img src={g} alt="" /><button onClick={() => window.removePlayerPhotoAt(p.num, i)} aria-label="Remove">&times;</button></span>
                  ))}
                </div>
              ) : null}
              {window.MediaUploader ? <window.MediaUploader label={`+ Add photo${gallery.length ? ' (' + gallery.length + ')' : ''}`} onPick={(d) => window.addPlayerPhoto(p.num, d)} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CmsSponsors() {
  const items = window.useMediaStore ? window.useMediaStore(window.SponsorsStore, 'sponsors') : (window.SponsorsStore ? window.SponsorsStore.list() : []);
  const [form, setForm] = React.useState(null);
  const save = () => {
    if (!form.name || !form.logo) return;
    window.SponsorsStore.add({ name: form.name, short: form.short || 'Club partner', blurb: form.blurb || '', url: form.url || '', since: form.since || '2026', logo: form.logo });
    setForm(null);
  };
  return (
    <div>
      <div className="cms-sec__head"><div><h2 className="rd-h3">Sponsors</h2><p className="cms-sec__sub">Sporting Solutions, Hodgson Roofing and Staines Rugby Club ship by default. Add new partners here, they appear on the Sponsors page.</p></div>{!form ? <button className="rd-btn rd-btn--volt rd-btn--sm" onClick={() => setForm({ since: '2026' })}>+ Add partner</button> : null}</div>
      {form ? (
        <div className="rd-card"><div className="rd-form">
          <label className="rd-field"><span>Partner name</span><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="rd-field"><span>Role / tagline</span><input value={form.short || ''} onChange={(e) => setForm({ ...form, short: e.target.value })} placeholder="e.g. Official partner" /></label>
          <label className="rd-field"><span>Website URL</span><input value={form.url || ''} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" /></label>
          <label className="rd-field"><span>Blurb</span><textarea rows="3" value={form.blurb || ''} onChange={(e) => setForm({ ...form, blurb: e.target.value })}></textarea></label>
          <label className="rd-field"><span>Logo</span>{window.MediaUploader ? <window.MediaUploader label={form.logo ? 'Replace logo' : 'Upload logo'} onPick={(d) => setForm({ ...form, logo: d })} /> : null}</label>
          {form.logo ? <img src={form.logo} alt="" style={{ maxHeight: 70, background: '#fff', padding: 8, borderRadius: 8 }} /> : null}
          <div className="rd-form__actions"><button className="rd-btn rd-btn--ghost" onClick={() => setForm(null)}>Cancel</button><button className="rd-btn rd-btn--volt" onClick={save} disabled={!form.name || !form.logo}>Add partner</button></div>
        </div></div>
      ) : null}
      <div className="cms-list" style={{ marginTop: 16 }}>
        <div className="cms-row"><div><span className="rd-chip rd-chip--volt">Default</span><b className="cms-row__t">Sporting Solutions Ltd</b></div><span className="cms-row__d">Main kit sponsor</span></div>
        <div className="cms-row"><div><span className="rd-chip rd-chip--volt">Default</span><b className="cms-row__t">Hodgson Roofing</b></div><span className="cms-row__d">Training top sponsor</span></div>
        <div className="cms-row"><div><span className="rd-chip rd-chip--volt">Default</span><b className="cms-row__t">Staines Rugby Club</b></div><span className="cms-row__d">Ground-share partner</span></div>
        {items.map((s) => (
          <div className="cms-row" key={s.id}><div><span className="rd-chip">Added</span><b className="cms-row__t">{s.name}</b></div><button className="rd-btn rd-btn--ghost rd-btn--sm" onClick={() => window.SponsorsStore.remove(s.id)}>Remove</button></div>
        ))}
      </div>
    </div>
  );
}

function CmsCoaches() {
  const [, tick] = React.useState(0);
  const bump = () => tick((n) => n + 1);
  const save = (id, patch) => { const cur = window.getCoachData ? window.getCoachData(id) : {}; Promise.resolve(window.setCoachData(id, { ...cur, ...patch })).then(() => { try { window.dispatchEvent(new CustomEvent('sa-media-changed', { detail: { prefix: 'coach' } })); } catch (e) {} bump(); }); };
  return (
    <div>
      <div className="cms-sec__head"><div><h2 className="rd-h3">Coaches</h2><p className="cms-sec__sub">Upload a photo and edit the bio for each member of the backroom team. Shows on the Team &rarr; Coaches tab. For a manager, set their <b>seasons in charge</b> to power their Manager stats slide.</p></div></div>
      <div className="cms-list">
        {(window.COACHES || []).map((c) => {
          const ov = window.getCoachData ? window.getCoachData(c.id) : {};
          const photo = ov.photo || c.photo;
          return (
            <div className="rd-card" key={c.id} style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="cms-photo__img" style={{ width: 64, height: 64 }}>{photo ? <img src={photo} alt={c.name} /> : <span>{c.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>}</div>
                <div><b className="cms-row__t">{c.name}</b><span className="cms-row__d" style={{ display: 'block' }}>{c.role}</span></div>
                {window.MediaUploader ? <span style={{ marginLeft: 'auto' }}><window.MediaUploader label={photo ? 'Replace photo' : 'Upload photo'} onPick={(d) => save(c.id, { photo: d })} /></span> : null}
              </div>
              <label className="rd-field"><span>Bio</span><textarea rows="5" defaultValue={ov.bio || (c.bio || []).join('\n\n')} onBlur={(e) => save(c.id, { bio: e.target.value })} placeholder="One blank line between paragraphs"></textarea></label>
              {/manager/i.test(c.role || '') ? (
                <div className="rd-field">
                  <span>Seasons in charge</span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(window.ALL_SEASONS || ['25/26']).map((sn) => {
                      const cur = Array.isArray(ov.seasons) ? ov.seasons : [];
                      const on = cur.indexOf(sn) >= 0;
                      return (<button key={sn} type="button" className={`rd-btn rd-btn--sm ${on ? 'rd-btn--volt' : 'rd-btn--ghost'}`} onClick={() => save(c.id, { seasons: on ? cur.filter((x) => x !== sn) : [...cur, sn] })}>{sn}</button>);
                    })}
                  </div>
                  <span className="cms-row__d" style={{ textTransform: 'none', letterSpacing: 0, marginTop: 6 }}>Powers the Manager stats slide on their profile. Leave all off to default to the current season.</span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CmsRoster() {
  const [, tick] = React.useState(0);
  const bump = () => tick((n) => n + 1);
  const [pf, setPf] = React.useState({ first: '', last: '', gk: false });
  const [cf, setCf] = React.useState({ name: '', role: 'Coach' });
  const players = window.getCustomPlayers ? window.getCustomPlayers() : [];
  const coaches = window.getCustomCoaches ? window.getCustomCoaches() : [];
  const fire = () => { if (window.applyCustomRoster) window.applyCustomRoster(); try { window.dispatchEvent(new CustomEvent('sa-roster-changed')); } catch (e) {} bump(); };
  const addPlayer = () => {
    if (!pf.first.trim() || !pf.last.trim()) return;
    const nums = (window.SQUAD || []).map((p) => p.num);
    const num = (nums.length ? Math.max.apply(null, nums) : 0) + 1;
    Promise.resolve(window.saveCustomPlayers([...players, { num, first: pf.first.trim(), last: pf.last.trim(), gk: !!pf.gk }])).then(() => { setPf({ first: '', last: '', gk: false }); fire(); });
  };
  const removePlayer = (num) => {
    if (window.SQUAD) { const i = window.SQUAD.findIndex((p) => p.num === num); if (i >= 0) window.SQUAD.splice(i, 1); }
    Promise.resolve(window.saveCustomPlayers(players.filter((p) => p.num !== num))).then(fire);
  };
  const addCoach = () => {
    if (!cf.name.trim()) return;
    const id = 'c-' + cf.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    Promise.resolve(window.saveCustomCoaches([...coaches, { id, name: cf.name.trim(), role: (cf.role || 'Coach').toUpperCase(), short: cf.role, bio: [] }])).then(() => { setCf({ name: '', role: 'Coach' }); fire(); });
  };
  const removeCoach = (id) => {
    if (window.COACHES) { const i = window.COACHES.findIndex((c) => c.id === id); if (i >= 0) window.COACHES.splice(i, 1); }
    Promise.resolve(window.saveCustomCoaches(coaches.filter((c) => c.id !== id))).then(fire);
  };
  return (
    <div>
      <div className="cms-sec__head"><div><h2 className="rd-h3">Add players &amp; coaches</h2><p className="cms-sec__sub">New squad members and staff appear across the Team page, leaderboards and stats. Add photos and bios in the Squad photos / Coaches sections.</p></div></div>
      <div className="rd-card" style={{ marginBottom: 16 }}>
        <div className="rd-form">
          <p className="rd-eyebrow">New player</p>
          <div className="rd-form__row">
            <label className="rd-field"><span>First name</span><input value={pf.first} onChange={(e) => setPf({ ...pf, first: e.target.value })} /></label>
            <label className="rd-field"><span>Surname</span><input value={pf.last} onChange={(e) => setPf({ ...pf, last: e.target.value })} /></label>
          </div>
          <label className="rd-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><input type="checkbox" checked={pf.gk} onChange={(e) => setPf({ ...pf, gk: e.target.checked })} style={{ width: 'auto' }} /><span style={{ textTransform: 'none', letterSpacing: 0 }}>Goalkeeper</span></label>
          <div className="rd-form__actions"><span className="rd-form__note">{players.length} added by you</span><button className="rd-btn rd-btn--volt" onClick={addPlayer}>Add player</button></div>
        </div>
      </div>
      {players.length ? <div className="cms-list" style={{ marginBottom: 24 }}>{players.map((p) => (<div className="cms-row" key={p.num}><div><span className="rd-chip">#{p.num}</span><b className="cms-row__t">{p.first} {p.last}</b>{p.gk ? <span className="cms-row__d">GK</span> : null}</div><button className="rd-btn rd-btn--ghost rd-btn--sm" onClick={() => removePlayer(p.num)}>Remove</button></div>))}</div> : null}
      <div className="rd-card">
        <div className="rd-form">
          <p className="rd-eyebrow">New coach / staff</p>
          <div className="rd-form__row">
            <label className="rd-field"><span>Name</span><input value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} /></label>
            <label className="rd-field"><span>Role</span><input value={cf.role} onChange={(e) => setCf({ ...cf, role: e.target.value })} placeholder="e.g. Assistant manager" /></label>
          </div>
          <div className="rd-form__actions"><span className="rd-form__note">{coaches.length} added by you</span><button className="rd-btn rd-btn--volt" onClick={addCoach}>Add coach</button></div>
        </div>
      </div>
      {coaches.length ? <div className="cms-list" style={{ marginTop: 16 }}>{coaches.map((c) => (<div className="cms-row" key={c.id}><div><b className="cms-row__t">{c.name}</b><span className="cms-row__d">{c.role}</span></div><button className="rd-btn rd-btn--ghost rd-btn--sm" onClick={() => removeCoach(c.id)}>Remove</button></div>))}</div> : null}
    </div>
  );
}

function CmsStatus() {
  const [, tick] = React.useState(0);
  const bump = () => tick((n) => n + 1);
  React.useEffect(() => {
    const h = () => bump();
    window.addEventListener('sa-roster-changed', h);
    window.addEventListener('sa-media-changed', h);
    return () => { window.removeEventListener('sa-roster-changed', h); window.removeEventListener('sa-media-changed', h); };
  }, []);
  const squad = (window.SQUAD || []).slice().sort((a, b) => a.last.localeCompare(b.last) || a.first.localeCompare(b.first));
  const status = window.getPlayerStatus ? window.getPlayerStatus() : {};
  const STATES = [['active', 'Active'], ['retired', 'Retired'], ['departed', 'Departed']];
  const setStatus = (num, s) => {
    Promise.resolve(window.setPlayerStatus ? window.setPlayerStatus(num, s) : null).then(() => {
      try { window.dispatchEvent(new CustomEvent('sa-roster-changed')); } catch (e) {}
      bump();
    });
  };
  const active = squad.filter((p) => !status[p.num]);
  const past = squad.filter((p) => status[p.num]);
  const Row = (p) => {
    const cur = status[p.num] || 'active';
    const on2627 = window.isConfirmed2627 ? window.isConfirmed2627(p.num) : false;
    const toggle2627 = () => {
      Promise.resolve(window.setConfirmed2627 ? window.setConfirmed2627(p.num, !on2627) : null).then(() => {
        try { window.dispatchEvent(new CustomEvent('sa-roster-changed')); } catch (e) {}
        bump();
      });
    };
    return (
      <div className="cms-row" key={p.num} style={{ gap: 12 }}>
        <div><span className="rd-chip">#{p.num}</span><b className="cms-row__t">{p.first} {p.last}</b>{p.gk ? <span className="cms-row__d">GK</span> : null}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="me__goaltype" role="radiogroup" aria-label="Player status">
            {STATES.map(([k, l]) => (
              <button key={k} type="button" className={`me__goaltype-btn ${cur === k ? 'is-on' : ''}`} onClick={() => setStatus(p.num, k)}>{l}</button>
            ))}
          </div>
          <button type="button" className={`rd-btn rd-btn--sm ${on2627 ? 'rd-btn--volt' : 'rd-btn--ghost'}`} onClick={toggle2627} title="Confirm this player for the 26/27 squad (shows under Team → 26/27)">{on2627 ? '\u2713 26/27 squad' : '+ 26/27 squad'}</button>
        </div>
      </div>
    );
  };
  return (
    <div>
      <div className="cms-sec__head"><div><h2 className="rd-h3">Retired / departed &amp; seasons</h2><p className="cms-sec__sub">Move a player out of the active First-team squad without deleting them &mdash; retired &amp; departed players stay viewable under Team &rarr; Past players. Use <b>26/27 squad</b> to confirm who carries into next season (they appear under Team &rarr; 26/27).</p></div></div>
      {past.length ? (<React.Fragment><h3 className="cms-subhead">Past players ({past.length})</h3><div className="cms-list" style={{ marginBottom: 24 }}>{past.map(Row)}</div></React.Fragment>) : null}
      <h3 className="cms-subhead">Active squad ({active.length})</h3>
      <div className="cms-list">{active.map(Row)}</div>
    </div>
  );
}

function CmsDonations() {
  const [, tick] = React.useState(0);
  const bump = () => tick((n) => n + 1);
  const cfg = window.getDonateConfig ? window.getDonateConfig() : {};
  const save = (patch) => { const cur = window.getDonateConfig ? window.getDonateConfig() : {}; Promise.resolve(window.setDonateConfig({ ...cur, ...patch })).then(() => { try { window.dispatchEvent(new CustomEvent('sa-media-changed', { detail: { prefix: 'donate' } })); } catch (e) {} bump(); }); };
  return (
    <div>
      <div className="cms-sec__head"><div><h2 className="rd-h3">Donations</h2><p className="cms-sec__sub">Paste your <b>Stripe Payment Link</b> to take card donations for the club, plus the sepsis charity link. Shows on the Sponsors page &mdash; no code or keys, Stripe handles the secure payment.</p></div></div>
      <div className="rd-card" style={{ display: 'grid', gap: 16 }}>
        <label className="rd-field"><span>Stripe Payment Link (club donations)</span><input type="url" defaultValue={cfg.clubUrl || ''} onBlur={(e) => save({ clubUrl: e.target.value.trim() })} placeholder="https://buy.stripe.com/..." /></label>
        <label className="rd-field"><span>Sepsis charity link</span><input type="url" defaultValue={cfg.sepsisUrl || ''} onBlur={(e) => save({ sepsisUrl: e.target.value.trim() })} placeholder="https://sepsistrust.org (default)" /></label>
        <p className="cms-sec__sub" style={{ margin: 0 }}>Get a Stripe link: free Stripe account &rarr; <b>Payment Links</b> &rarr; New &rarr; choose &ldquo;Customers choose what to pay&rdquo; (donation) &rarr; copy &amp; paste the link above.</p>
      </div>
    </div>
  );
}

function CmsHero() {
  const [, tick] = React.useState(0);
  const bump = () => tick((n) => n + 1);
  const imgs = window.getHeroImages ? window.getHeroImages() : [];
  const save = (arr) => { Promise.resolve(window.setHeroImages(arr)).then(() => { try { window.dispatchEvent(new CustomEvent('sa-media-changed')); } catch (e) {} bump(); }); };
  const defaults = []; for (let i = 1; i <= 12; i++) defaults.push('assets/hero/banner-' + (i < 10 ? '0' : '') + i + '.jpg');
  const usingCustom = imgs.length > 0;
  const shown = usingCustom ? imgs : defaults;
  return (
    <div>
      <div className="cms-sec__head"><div><h2 className="rd-h3">Hero banner photos</h2><p className="cms-sec__sub">The rotating photos behind the homepage hero. {usingCustom ? 'Your photos are live — the defaults are hidden.' : 'Currently showing the 12 default photos. Add your own to take over the rotation.'} Reload the homepage to see changes.</p></div></div>
      <div className="rd-card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {window.MediaUploader ? <window.MediaUploader label="Add a hero photo" onPick={(d) => save([...imgs, d])} /> : null}
        {usingCustom ? <button className="rd-btn rd-btn--ghost rd-btn--sm" onClick={() => save([])}>Restore default photos</button> : null}
        <span className="cms-row__d" style={{ textTransform: 'none', letterSpacing: 0 }}>{shown.length} photo{shown.length === 1 ? '' : 's'} in the rotation</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
        {shown.map((src, i) => (
          <div key={i} className="rd-card" style={{ padding: 8 }}>
            <img src={src} alt="" style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', borderRadius: 8, display: 'block' }} />
            {usingCustom
              ? <button className="rd-btn rd-btn--ghost rd-btn--sm" style={{ marginTop: 8, width: '100%' }} onClick={() => save(imgs.filter((_, k) => k !== i))}>Remove</button>
              : <span className="cms-row__d" style={{ display: 'block', marginTop: 8, textAlign: 'center', textTransform: 'none', letterSpacing: 0 }}>Default</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CoverBuilder({ post, library }) {
  const cur = (window.getPostCover && window.getPostCover(post.id)) || {};
  const [spec, setSpec] = React.useState({
    layout: cur.layout || (post.type === 'report' ? 'score' : 'badges'),
    top: cur.top != null ? cur.top : (post.type === 'report' ? 'FULL TIME' : 'ANNOUNCEMENT'),
    left: cur.left || "assets/badge/sue-angels-shield.png",
    right: cur.right || '',
    center: cur.center != null ? cur.center : (post.r ? (post.r.hs + '-' + post.r.as) : ''),
    bottom: cur.bottom != null ? cur.bottom : (post.r ? (post.r.competition || 'League Ten') : ''),
    result: cur.result || ''
  });
  const [saved, setSaved] = React.useState(!!(window.getPostCover && window.getPostCover(post.id)));
  const set = (k) => (e) => { const v = e && e.target ? e.target.value : e; setSpec((s) => ({ ...s, [k]: v })); };
  const save = () => Promise.resolve(window.setPostCover(post.id, spec)).then(() => { try { window.dispatchEvent(new CustomEvent('sa-media-changed')); } catch (e) {} setSaved(true); });
  const clear = () => Promise.resolve(window.setPostCover(post.id, null)).then(() => { try { window.dispatchEvent(new CustomEvent('sa-media-changed')); } catch (e) {} setSaved(false); });
  const resLabel = spec.result === 'w' ? 'WIN' : spec.result === 'd' ? 'DRAW' : spec.result === 'l' ? 'LOSS' : '';
  const pick = (side) => (
    <label className="rd-field"><span>{side === 'left' ? 'Left badge' : 'Right badge'}</span><select value={spec[side] || ''} onChange={set(side)}><option value="">None</option>{library.map((b) => <option key={b.id} value={b.img}>{b.name}</option>)}</select></label>
  );
  return (
    <div className="cms-match__body" style={{ display: 'grid', gap: 14 }}>
      <div style={{ aspectRatio: '16 / 10', maxWidth: 320, borderRadius: 12, background: 'radial-gradient(120% 120% at 50% 0%, rgba(20,56,73,0.75), rgba(4,18,27,0.96))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: 18, color: '#fff' }}>
        <span style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.6 }}>{spec.top}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {spec.left ? <img src={spec.left} alt="" style={{ width: 46, height: 46, objectFit: 'contain' }} /> : null}
          {spec.layout === 'score' ? <b style={{ fontSize: 30, fontWeight: 700 }}>{spec.center}</b> : (spec.center ? <span style={{ opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{spec.center}</span> : null)}
          {spec.right ? <img src={spec.right} alt="" style={{ width: 46, height: 46, objectFit: 'contain' }} /> : null}
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#d6f23a', display: 'block' }}>{spec.bottom}</span>
          {resLabel ? <span style={{ fontSize: 9, letterSpacing: '0.12em', opacity: 0.85 }}>{resLabel}</span> : null}
        </div>
      </div>
      <div className="rd-form__row">
        <label className="rd-field"><span>Layout</span><select value={spec.layout} onChange={set('layout')}><option value="badges">Badges only</option><option value="score">Badges + score</option></select></label>
        <label className="rd-field"><span>Result chip</span><select value={spec.result} onChange={set('result')}><option value="">None</option><option value="w">Win</option><option value="d">Draw</option><option value="l">Loss</option></select></label>
      </div>
      <div className="rd-form__row">{pick('left')}{pick('right')}</div>
      <div className="rd-form__row">
        <label className="rd-field"><span>Top label</span><input value={spec.top} onChange={set('top')} /></label>
        <label className="rd-field"><span>Centre ({spec.layout === 'score' ? 'score' : 'text / VS'})</span><input value={spec.center} onChange={set('center')} /></label>
      </div>
      <label className="rd-field"><span>Bottom label (competition / league)</span><input value={spec.bottom} onChange={set('bottom')} /></label>
      <div className="rd-form__actions">
        <span className="rd-form__note">{saved ? 'Custom cover active' : 'Using default cover'}</span>
        {saved ? <button className="rd-btn rd-btn--ghost rd-btn--sm" onClick={clear}>Use default</button> : null}
        <button className="rd-btn rd-btn--volt rd-btn--sm" onClick={save}>Save cover</button>
      </div>
    </div>
  );
}

function CmsCovers() {
  const [, tick] = React.useState(0);
  const bump = () => tick((n) => n + 1);
  const badges = window.getCoverBadges ? window.getCoverBadges() : [];
  const CLUB = { id: 'club', name: "Sue's Angels", img: 'assets/badge/sue-angels-shield.png' };
  const library = [CLUB].concat(badges);
  const saveBadges = (arr) => Promise.resolve(window.saveCoverBadges(arr)).then(() => { try { window.dispatchEvent(new CustomEvent('sa-media-changed')); } catch (e) {} bump(); });
  const [bname, setBname] = React.useState('');
  const [openId, setOpenId] = React.useState(null);
  const articles = (window.getCustomArticles ? window.getCustomArticles() : []).filter((a) => a && a.title).map((a) => ({ id: a.id, title: a.title, sub: a.cat || 'Article', type: 'article' }));
  const reports = (window.getDerivedResults ? window.getDerivedResults() : []).filter((r) => r.hs != null).map((r) => ({ id: r.id, title: r.home.replace(' FC', '') + ' v ' + r.away.replace(' FC', ''), sub: (r.competition || 'League Ten') + ' \u00b7 ' + r.date, type: 'report', r }));
  const posts = articles.concat(reports);
  return (
    <div>
      <div className="cms-sec__head"><div><h2 className="rd-h3">Post covers</h2><p className="cms-sec__sub">Build a badge / scorecard cover for any Media post. Add badges to your library, then pick them per post. Match reports already auto-generate — use this to customise or to give articles a cover.</p></div></div>
      <div className="rd-card" style={{ marginBottom: 18 }}>
        <p className="rd-eyebrow">Badge library</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start', marginTop: 10 }}>
          {library.map((b) => (
            <div key={b.id} style={{ textAlign: 'center', width: 78 }}>
              <img src={b.img} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} />
              <span className="cms-row__d" style={{ display: 'block', fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>{b.name}</span>
              {b.id !== 'club' ? <button className="rd-btn rd-btn--ghost rd-btn--sm" style={{ padding: '2px 8px', fontSize: 10, marginTop: 4 }} onClick={() => saveBadges(badges.filter((x) => x.id !== b.id))}>Remove</button> : null}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
          <input value={bname} onChange={(e) => setBname(e.target.value)} placeholder="Badge name (team / league)" style={{ maxWidth: 220 }} />
          {window.MediaUploader ? <window.MediaUploader label="Upload badge" onPick={(d) => { saveBadges(badges.concat([{ id: 'b' + Date.now(), name: bname.trim() || 'Badge', img: d }])); setBname(''); }} /> : null}
        </div>
      </div>
      {posts.map((p) => (
        <div className="cms-match" key={p.id}>
          <button className="cms-match__head" onClick={() => setOpenId(openId === p.id ? null : p.id)}>
            <span className="cms-match__lbl">{p.title} · <span style={{ opacity: 0.6 }}>{p.sub}</span></span>
            <span className="cms-match__chev">{(window.getPostCover && window.getPostCover(p.id)) ? '✓ Custom' : (openId === p.id ? '–' : 'Cover')}</span>
          </button>
          {openId === p.id ? <CoverBuilder post={p} library={library} /> : null}
        </div>
      ))}
    </div>
  );
}

function CmsVideos() {
  const [, tick] = React.useState(0);
  const bump = () => tick((n) => n + 1);
  const vids = window.getClubVideos ? window.getClubVideos() : [];
  const save = (arr) => Promise.resolve(window.saveClubVideos(arr)).then(() => { try { window.dispatchEvent(new CustomEvent('sa-media-changed')); } catch (e) {} bump(); });
  const [f, setF] = React.useState({ title: '', url: '', category: 'Goals', homeBadge: '', awayBadge: '' });
  const add = () => { if (!f.url.trim()) return; save(vids.concat([{ id: 'v' + Date.now(), title: f.title.trim(), url: f.url.trim(), category: f.category.trim(), homeBadge: f.homeBadge, awayBadge: f.awayBadge }])); setF({ title: '', url: '', category: 'Goals', homeBadge: '', awayBadge: '' }); };
  return (
    <div>
      <div className="cms-sec__head"><div><h2 className="rd-h3">Videos</h2><p className="cms-sec__sub">Add match goals &amp; clips — a YouTube link or a direct .mp4 URL. They appear under Media &rarr; Videos with an auto-generated cover.</p></div></div>
      <div className="rd-card" style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
        <label className="rd-field"><span>Title</span><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Osunkoya screamer vs Catania" /></label>
        <label className="rd-field"><span>Video URL</span><input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="YouTube link or .mp4 URL" /></label>
        <label className="rd-field"><span>Category (cover label)</span><input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Goals" /></label>
        <datalist id="cms-vclubs">{(window.KNOWN_CLUBS || []).map((n) => <option key={n} value={n} />)}</datalist>
        <div className="rd-form__row">
          <label className="rd-field"><span>Home club (cover badge)</span><input list="cms-vclubs" placeholder="Type a club" onChange={(e) => { var rb = window.resolveBadge ? window.resolveBadge(e.target.value) : null; setF((x) => ({ ...x, homeBadge: (rb && rb.src) || '' })); }} /></label>
          <label className="rd-field"><span>Away club (cover badge)</span><input list="cms-vclubs" placeholder="Type a club" onChange={(e) => { var rb = window.resolveBadge ? window.resolveBadge(e.target.value) : null; setF((x) => ({ ...x, awayBadge: (rb && rb.src) || '' })); }} /></label>
        </div>
        <div className="rd-form__actions"><button className="rd-btn rd-btn--volt" onClick={add}>Add video</button></div>
      </div>
      {vids.length ? <div className="cms-list">{vids.map((v) => <div className="cms-row" key={v.id}><div><b className="cms-row__t">{v.title || v.url}</b><span className="cms-row__d">{v.category}</span></div><button className="rd-btn rd-btn--ghost rd-btn--sm" onClick={() => save(vids.filter((x) => x.id !== v.id))}>Remove</button></div>)}</div> : <p className="cms-empty">No videos yet.</p>}
    </div>
  );
}

function CmsRecognition() {
  const [, tick] = React.useState(0);
  const bump = () => tick((n) => n + 1);
  const rows = (window.getRecognitionStored ? window.getRecognitionStored() : []).slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const squad = (window.SQUAD || []).slice().sort((a, b) => (a.first + a.last).localeCompare(b.first + b.last));
  const seasons = window.ALL_SEASONS || ['25/26'];
  const results = (window.getDerivedResults ? window.getDerivedResults() : []);
  const months = ['August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June', 'July'];
  const awardNames = ['Player of the Season', 'Players’ Player of the Season', 'Manager’s Player of the Season', 'Top Goalscorer', 'Top Assist Provider', 'Golden Glove', 'Goal of the Season', 'Newcomer of the Season', 'Most Improved Player', 'Clubman of the Season', 'Moment of the Season'];
  const TYPES = [['potm', 'Player of the Month'], ['trophy', 'Trophy / honour'], ['season_award', 'End of Season award'], ['match_award', 'Match award'], ['milestone', 'Milestone'], ['club_record', 'Club record'], ['leadership', 'Leadership group']];
  const blank = { type: 'potm', season: window.CURRENT_SEASON || '25/26' };
  const [f, setF] = React.useState(blank);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const pname = (num) => (window.playerNameByNum ? window.playerNameByNum(parseInt(num, 10)) : '') || '';
  const matchLabel = (r) => (r.home || '').replace(' FC', '') + ' ' + (r.hs != null ? r.hs + '-' + r.as : 'v') + ' ' + (r.away || '').replace(' FC', '') + (r.date ? ' · ' + r.date : '');
  const save = () => {
    const id = f.id || (f.type + '-' + Date.now());
    const rec = Object.assign({}, f, { id: id, createdAt: f.createdAt || Date.now(), updatedAt: Date.now() });
    if (rec.playerId) { rec.playerId = parseInt(rec.playerId, 10); rec.playerName = pname(rec.playerId); }
    ['clubCaptainPlayerId', 'viceCaptainPlayerId', 'thirdChoiceCaptainPlayerId'].forEach((k) => { if (rec[k]) { rec[k] = parseInt(rec[k], 10); rec[k.replace('PlayerId', 'Name')] = pname(rec[k]); } });
    ['statApps', 'statGoals', 'statAssists', 'statCleanSheets', 'statMotm'].forEach((k) => { if (rec[k] === '' || rec[k] == null) delete rec[k]; else rec[k] = parseInt(rec[k], 10) || 0; });
    if (rec.order === '' || rec.order == null) { delete rec.order; } else { const _o = parseInt(rec.order, 10); if (_o > 0) rec.order = _o; else delete rec.order; }
    Promise.resolve(window.saveRecognition(rec)).then(() => { setF(Object.assign({}, blank)); bump(); }).catch(() => { alert('Could not save right now — please check your connection and try again.'); });
  };
  const del = (id) => { if (window.confirm('Delete this entry?')) Promise.resolve(window.deleteRecognition(id)).then(bump).catch(() => {}); };
  const edit = (r) => { setF(Object.assign({}, r)); try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {} };
  const playerSel = (label, key, optional) => (
    <label className="rd-field"><span>{label}{optional ? ' (optional)' : ''}</span>
      <select value={f[key] || ''} onChange={(e) => set(key, e.target.value)}>
        <option value="">{optional ? 'None / team' : 'Select player'}</option>
        {squad.map((p) => <option key={p.num} value={p.num}>{p.first} {p.last}</option>)}
      </select></label>);
  const seasonSel = (
    <label className="rd-field"><span>Season</span>
      <select value={f.season || ''} onChange={(e) => set('season', e.target.value)}>{seasons.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>);
  const matchSel = (optional) => (
    <label className="rd-field"><span>Match{optional ? ' (optional)' : ''}</span>
      <select value={f.matchId || ''} onChange={(e) => set('matchId', e.target.value)}>
        <option value="">{optional ? 'None' : 'Select match'}</option>
        {results.map((r) => <option key={r.id} value={r.id}>{matchLabel(r)}</option>)}
      </select></label>);
  const imgField = (
    <label className="rd-field"><span>Image / graphic (optional)</span>{window.MediaUploader ? <window.MediaUploader label={f.imageUrl ? 'Replace image' : 'Upload image'} onPick={(d) => set('imageUrl', d)} /> : null}{f.imageUrl ? <img src={f.imageUrl} alt="" style={{ maxHeight: 80, borderRadius: 8, marginTop: 8 }} /> : null}</label>);
  let body = null;
  if (f.type === 'potm') body = (<React.Fragment>
    <div className="rd-form__row"><label className="rd-field"><span>Month</span><select value={f.month || ''} onChange={(e) => set('month', e.target.value)}><option value="">Select month</option>{months.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>{seasonSel}</div>
    <label className="rd-field"><span>Order in season (optional)</span><input type="number" min="1" value={f.order != null ? f.order : ''} onChange={(e) => set('order', e.target.value)} placeholder="e.g. 1 = first POTM of the season — sets the tab order on the Awards page" /></label>
    {playerSel('Winner', 'playerId')}
    <label className="rd-field"><span>Position (optional)</span><input value={f.position || ''} onChange={(e) => set('position', e.target.value)} placeholder="e.g. Left centre-back" /></label>
    <label className="rd-field"><span>Reason for winning</span><textarea rows="3" value={f.reason || ''} onChange={(e) => set('reason', e.target.value)} placeholder="Why they won this month" /></label>
    <p className="cms-sec__sub">Appearances, goals, assists, clean sheets and Man of the Match awards for the month pull in automatically from the match data — no need to type them.</p>
    <label className="rd-field"><span>Quote (optional)</span><textarea rows="2" value={f.quote || ''} onChange={(e) => set('quote', e.target.value)} /></label>
    {imgField}
  </React.Fragment>);
  else if (f.type === 'trophy') body = (<React.Fragment>
    <div className="rd-form__row"><label className="rd-field"><span>Trophy / honour</span><input value={f.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="e.g. League Cup Winners" /></label>{seasonSel}</div>
    <label className="rd-field"><span>Label (optional)</span><input value={f.value || ''} onChange={(e) => set('value', e.target.value)} placeholder="e.g. Champions" /></label>
    <label className="rd-field"><span>Description (optional)</span><textarea rows="2" value={f.description || ''} onChange={(e) => set('description', e.target.value)} /></label>
    {imgField}
  </React.Fragment>);
  else if (f.type === 'season_award') body = (<React.Fragment>
    <div className="rd-form__row"><label className="rd-field"><span>Award name</span><input list="cms-awardnames" value={f.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Player of the Season" /></label>{seasonSel}</div>
    <datalist id="cms-awardnames">{awardNames.map((n) => <option key={n} value={n} />)}</datalist>
    {playerSel('Winner', 'playerId', true)}
    <label className="rd-field"><span>Description (optional)</span><textarea rows="2" value={f.description || ''} onChange={(e) => set('description', e.target.value)} /></label>
    <label className="rd-field"><span>Quote (optional)</span><textarea rows="2" value={f.quote || ''} onChange={(e) => set('quote', e.target.value)} /></label>
    {imgField}
  </React.Fragment>);
  else if (f.type === 'match_award') body = (<React.Fragment>
    <div className="rd-form__row"><label className="rd-field"><span>Award</span><select value={f.awardType || ''} onChange={(e) => set('awardType', e.target.value)}><option value="">Select award</option><option value="performance_of_the_match">Performance of the Match</option><option value="goal_contribution_award">Goal Contribution Award</option></select></label>{seasonSel}</div>
    {matchSel(false)}
    {playerSel('Winner', 'playerId')}
    <p className="cms-sec__sub">Man of the Match is already recorded with match data and counts automatically.</p>
  </React.Fragment>);
  else if (f.type === 'milestone') body = (<React.Fragment>
    {playerSel('Player', 'playerId')}
    <div className="rd-form__row"><label className="rd-field"><span>Milestone</span><input value={f.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="e.g. First Goal" /></label>{seasonSel}</div>
    <div className="rd-form__row"><label className="rd-field"><span>Date achieved (optional)</span><input value={f.date || ''} onChange={(e) => set('date', e.target.value)} placeholder="e.g. 12 Oct 2025" /></label><label className="rd-field"><span>Value (optional)</span><input value={f.value || ''} onChange={(e) => set('value', e.target.value)} /></label></div>
    {matchSel(true)}
    <label className="rd-field"><span>Note (optional)</span><textarea rows="2" value={f.description || ''} onChange={(e) => set('description', e.target.value)} /></label>
  </React.Fragment>);
  else if (f.type === 'club_record') body = (<React.Fragment>
    <div className="rd-form__row"><label className="rd-field"><span>Record title</span><input value={f.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="e.g. First Ever Goal" /></label><label className="rd-field"><span>Holder type</span><select value={f.group || 'player'} onChange={(e) => set('group', e.target.value)}><option value="player">Player</option><option value="team">Team</option></select></label></div>
    <div className="rd-form__row"><label className="rd-field"><span>Value</span><input value={f.value || ''} onChange={(e) => set('value', e.target.value)} placeholder="e.g. 1-0 v Catania" /></label>{seasonSel}</div>
    {f.group !== 'team' ? playerSel('Player', 'playerId', true) : null}
    <label className="rd-field"><span>Note (optional)</span><textarea rows="2" value={f.description || ''} onChange={(e) => set('description', e.target.value)} /></label>
  </React.Fragment>);
  else if (f.type === 'leadership') body = (<React.Fragment>
    {seasonSel}
    {playerSel('Club captain', 'clubCaptainPlayerId')}
    {playerSel('Vice-captain (context only)', 'viceCaptainPlayerId', true)}
    {playerSel('Third-choice captain (context only)', 'thirdChoiceCaptainPlayerId', true)}
    <label className="rd-field"><span>Note</span><textarea rows="2" value={f.note || ''} onChange={(e) => set('note', e.target.value)} placeholder="Leadership context sentence" /></label>
    <p className="cms-sec__sub">Only the club captain becomes a record and a profile achievement. Vice and third-choice are saved as context only.</p>
  </React.Fragment>);
  const rowLabel = (r) => {
    if (r.type === 'leadership') return 'Leadership ' + (r.season || '');
    if (r.type === 'potm') return (r.order != null && r.order !== '' ? '#' + r.order + ' · ' : '') + (r.month || '') + ' ' + (r.season || '') + ' POTM';
    return r.title || r.awardType || r.type;
  };
  return (
    <div>
      <div className="cms-sec__head"><div><h2 className="rd-h3">Recognition</h2><p className="cms-sec__sub">Player of the Month, end-of-season awards, match awards, milestones, club records and leadership. Winners you tag also appear on that player&rsquo;s profile. Club records and stat milestones already calculate automatically; use this to add the rest.</p></div></div>
      <div className="rd-card" style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
        <label className="rd-field"><span>Type</span><select value={f.type} onChange={(e) => setF({ type: e.target.value, season: f.season || (window.CURRENT_SEASON || '25/26') })}>{TYPES.map((t) => <option key={t[0]} value={t[0]}>{t[1]}</option>)}</select></label>
        {body}
        <div className="rd-form__actions">{f.id ? <button className="rd-btn rd-btn--ghost" onClick={() => setF(Object.assign({}, blank))}>Cancel</button> : null}<button className="rd-btn rd-btn--volt" onClick={save}>{f.id ? 'Save changes' : 'Add'}</button></div>
      </div>
      {rows.length ? <div className="cms-list">{rows.map((r) => <div className="cms-row" key={r.id}><div><span className="rd-chip rd-chip--volt">{(TYPES.find((t) => t[0] === r.type) || [, r.type])[1]}</span><b className="cms-row__t">{rowLabel(r)}</b></div><div style={{ display: 'flex', gap: 8 }}><span className="cms-row__d">{r.playerName || r.clubCaptainName || ''}</span><button className="rd-btn rd-btn--ghost rd-btn--sm" onClick={() => edit(r)}>Edit</button><button className="rd-btn rd-btn--ghost rd-btn--sm" onClick={() => del(r.id)}>Delete</button></div></div>)}</div> : <p className="cms-empty">No recognition entries yet. The Club Records page already shows auto-calculated records.</p>}
    </div>
  );
}

const CMS_SECTIONS = [
  ['matchdata', 'Match data', CmsMatchData],
  ['fixtures', 'Fixtures', CmsFixtures],
  ['roster', 'Add players/coaches', CmsRoster],
  ['status', 'Retired / departed', CmsStatus],
  ['articles', 'Articles', CmsArticles],
  ['gallery', 'Gallery', CmsGallery],
  ['photos', 'Squad photos', CmsPhotos],
  ['coaches', 'Coaches', CmsCoaches],
  ['recognition', 'Recognition', CmsRecognition],
  ['sponsors', 'Sponsors', CmsSponsors],
  ['donations', 'Donations', CmsDonations],
  ['hero', 'Hero banner', CmsHero],
  ['covers', 'Post covers', CmsCovers],
  ['videos', 'Videos', CmsVideos],
];

function AdminPanel() {
  const admin = window.useAdmin ? window.useAdmin() : false;
  const [sec, setSec] = React.useState('matchdata');
  React.useEffect(() => { document.body.classList.add('rd-body'); }, []);
  if (!admin) {
    return (
      <React.Fragment>
        <window.RDHeader />
        <main className="cms-gate">
          <div className="rd-container">
            <div className="rd-card cms-gate__card">
              <p className="rd-eyebrow">Staff only</p>
              <h1 className="rd-h2" style={{ marginTop: 12 }}>Author control panel</h1>
              <p className="rd-lead" style={{ margin: '14px 0 24px' }}>Sign in with your club admin account to manage match data, fixtures, articles, photos and sponsors.</p>
              <button className="rd-btn rd-btn--volt rd-btn--lg" onClick={() => window.openAdmin && window.openAdmin()}>Sign in <RDArrow /></button>
            </div>
          </div>
        </main>
        <window.RDFooter />
      </React.Fragment>
    );
  }
  const Active = (CMS_SECTIONS.find((s) => s[0] === sec) || CMS_SECTIONS[0])[2];
  return (
    <React.Fragment>
      <window.RDHeader />
      <main className="cms">
        <div className="rd-container">
          <div className="cms__top">
            <div><p className="rd-eyebrow">Control panel</p><h1 className="rd-h2" style={{ marginTop: 10 }}>Author dashboard</h1></div>
            <button className="rd-btn rd-btn--ghost rd-btn--sm" onClick={async () => {
              try { if (window.saSignOut) await window.saSignOut(); } catch (e) {}
              try { if (window.setAdmin) window.setAdmin(false); } catch (e) {}
              try { localStorage.setItem('sa-admin', '0'); } catch (e) {}
              window.location.reload();
            }}>Sign out</button>
          </div>
          <div className="cms__layout">
            <aside className="cms__nav">
              {CMS_SECTIONS.map(([k, l]) => <button key={k} className={`cms__navbtn ${sec === k ? 'is-active' : ''}`} onClick={() => setSec(k)}>{l}</button>)}
            </aside>
            <section className="cms__content"><Active /></section>
          </div>
        </div>
      </main>
      <window.RDFooter />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('rd-root')).render(<AdminPanel />);
