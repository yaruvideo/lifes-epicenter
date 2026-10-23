import { useEffect, useState } from 'react';
import { device } from '../db.js';
import { importSteamLibrary, searchSteam, steamImage } from '../steam.js';
import { save } from '../db.js';
import { useItems } from '../store.js';
import { STATUSES, TYPES, nextUp, progressText, statusLabel } from '../media.js';
import MediaModal from './MediaModal.jsx';

// Big libraries (hundreds of games from Obsidian or Steam) show a page at a time.
const PAGE = 60;

// Shared by Games, Books & manga, and Shows & movies; `types` decides which items show.
export default function Library({ me, title, types, sub, addPlaceholder }) {
  const all = useItems('media');
  const notes = useItems('medianote');
  const items = all.filter((m) => types.includes(m.type));
  const [draft, setDraft] = useState({ title: '', type: types[0] });
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recent');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => setLimit(PAGE), [status, sort, q]);
  const open = items.find((m) => m.id === openId);
  const isGames = types.includes('game');
  const [hits, setHits] = useState([]);
  const [steamMsg, setSteamMsg] = useState('');
  const [importing, setImporting] = useState(false);
  useEffect(() => {
    if (!isGames || draft.title.trim().length < 3) { setHits([]); return; }
    const t = setTimeout(() => searchSteam(draft.title.trim()).then(setHits).catch(() => setHits([])), 450);
    return () => clearTimeout(t);
  }, [draft.title, isGames]);
  const addFromSteam = (h) => {
    const id = 'steam-' + h.appid;
    if (items.some((m) => m.id === id)) { setOpenId(id); setDraft({ ...draft, title: '' }); setHits([]); return; }
    save('media', { title: h.name, type: 'game', steamAppId: h.appid, image: steamImage(h.appid), platform: 'Steam', status: 'active', added: Date.now(), touched: Date.now(), owner: me }, id).then((row) => setOpenId(row.id));
    setDraft({ ...draft, title: '' }); setHits([]);
  };
  const runImport = async () => {
    const profile = prompt('Paste your Steam profile link (or your Steam ID):', device.get('steam-profile', ''));
    if (!profile) return;
    device.set('steam-profile', profile);
    setImporting(true); setSteamMsg('Importing from Steam…');
    try {
      const r = await importSteamLibrary(profile, me);
      setSteamMsg('Imported ' + r.added + ' new games' + (r.updated ? ' and updated hours on ' + r.updated : '') + ' (' + r.total + ' on Steam). Games played in the last 2 weeks are under Playing; the rest are under Want to.');
    } catch (e) { setSteamMsg('⚠ ' + e.message); }
    setImporting(false);
  };

  const add = (e) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const base = { title: draft.title.trim(), type: draft.type, status: 'active', added: Date.now(), touched: Date.now(), owner: me };
    if (draft.type === 'show') base.parts = [{ id: crypto.randomUUID(), name: 'Season 1', episodes: null, watched: 0 }];
    save('media', base).then((row) => setOpenId(row.id));
    setDraft({ ...draft, title: '' });
  };
  const bump = (m) => {
    if (m.type === 'show') { const n = nextUp(m); if (n) save('media', { ...m, touched: Date.now(), parts: m.parts.map((p, i) => (i === n.index ? { ...p, watched: n.ep } : p)) }, m.id); }
    else save('media', { ...m, progress: (m.progress || 0) + 1, touched: Date.now() }, m.id);
  };

  const active = items.filter((m) => m.status === 'active').sort((a, b) => (b.touched || 0) - (a.touched || 0));
  const ids = new Set(items.map((m) => m.id));
  const feed = notes.filter((n) => ids.has(n.mediaId)).sort((a, b) => b.at - a.at).slice(0, 8);
  const shown = items
    .filter((m) => (status === 'all' || m.status === status) && m.title.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (sort === 'az' ? a.title.localeCompare(b.title) : (b.touched || 0) - (a.touched || 0)));
  const groups = sort === 'category' ? types.map((t) => [t, shown.filter((m) => m.type === t)]).filter(([, l]) => l.length) : [[null, shown]];
  const count = (k) => (k === 'all' ? items.length : items.filter((m) => m.status === k).length);
  const more = (n) => n > limit && <button type="button" className="btn ghost" style={{ alignSelf: 'center' }} onClick={() => setLimit(limit + PAGE * 2)}>Show more ({n - limit} left)</button>;

  const card = (m) => (
    <button key={m.id} type="button" className="theme" onClick={() => setOpenId(m.id)} style={{ gap: 6 }}>
      {m.image && <img src={m.image} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '460 / 215', objectFit: 'cover', borderRadius: 'var(--r)' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
      <span className="row between" style={{ width: '100%' }}><span className="chip" style={{ background: 'var(--panel)', color: 'var(--muted)', border: '1px solid var(--border)' }}>{TYPES[m.type].label}</span>{m.rating ? <span className="display" style={{ color: 'var(--warm)' }}>{m.rating}/10</span> : null}</span>
      <b style={{ lineHeight: 1.3 }}>{m.title}</b>
      <span className="sub" style={{ fontSize: 13 }}>{statusLabel(m.type, m.status)}{progressText(m) ? ' · ' + progressText(m) : ''}</span>
    </button>
  );

  return (
    <>
      <header><div className="sub">{sub}</div><h1>{title}</h1></header>
      <form className="row" onSubmit={add}>
        <input className="field" style={{ flex: '1 1 240px' }} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={addPlaceholder} aria-label="Title to add" />
        {types.length > 1 && <select className="field" style={{ width: 'auto' }} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} aria-label="Type">{types.map((t) => <option key={t} value={t}>{TYPES[t].label}</option>)}</select>}
        <button className="btn" type="submit">Add</button>
        {isGames && <button type="button" className="btn ghost" disabled={importing} onClick={runImport}>Import Steam library</button>}
      </form>
      {hits.length > 0 && (
        <div className="card" style={{ padding: 10, gap: 6 }} aria-label="Steam matches">
          <div className="sub" style={{ fontSize: 12 }}>From Steam (or press Add to use your own title)</div>
          {hits.map((h) => (
            <button key={h.appid} type="button" className="task" style={{ border: 0, cursor: 'pointer', textAlign: 'left' }} onClick={() => addFromSteam(h)}>
              {h.image && <img src={h.image} alt="" width="92" height="35" style={{ borderRadius: 6, objectFit: 'cover' }} />}
              <span style={{ flex: 1 }}>{h.name}</span><span className="sub" style={{ fontSize: 12 }}>Add</span>
            </button>
          ))}
        </div>
      )}
      {steamMsg && <div className="note" role="status">{steamMsg}</div>}

      <div className="grid">
        <section className="card" aria-labelledby="cur-h">
          <h2 id="cur-h">Currently {TYPES[types[0]].active.toLowerCase()}</h2>
          {active.length ? active.map((m) => (
            <div key={m.id} className="task">
              <button type="button" className="title" onClick={() => setOpenId(m.id)}><b>{m.title}</b><span className="sub" style={{ display: 'block', fontSize: 13 }}>{progressText(m)}</span></button>
              {m.type !== 'movie' && m.type !== 'game' && (m.type !== 'show' || nextUp(m)) && <button type="button" className="btn small" onClick={() => bump(m)}>{m.type === 'show' ? 'Watched Ep ' + nextUp(m).ep : '+1'}</button>}
              <button type="button" className="btn ghost small" onClick={() => setOpenId(m.id)}>{m.type === 'game' ? 'Log session' : 'Open'}</button>
            </div>
          )) : <div className="empty">Nothing in progress. Add something above.</div>}
        </section>
        <section className="card" aria-labelledby="feed-h">
          <h2 id="feed-h">Latest notes</h2>
          {feed.length ? feed.map((n) => {
            const m = items.find((x) => x.id === n.mediaId);
            return (
              <button key={n.id} type="button" className="note" onClick={() => setOpenId(n.mediaId)} style={{ textAlign: 'left', border: 0, cursor: 'pointer' }}>
                <span className="row between"><b>{m?.title}</b><span className="sub" style={{ fontSize: 12 }}>{n.label}</span></span>
                {n.text && <span style={{ display: 'block', marginTop: 4, whiteSpace: 'pre-wrap', maxHeight: 66, overflow: 'hidden' }}>{n.text}</span>}
              </button>
            );
          }) : <div className="empty">Notes you write on any title show up here.</div>}
        </section>
      </div>

      <section className="card" aria-labelledby="lib-h">
        <div className="row between">
          <h2 id="lib-h">Library · {shown.length}</h2>
          <div className="row">
            <input className="field" style={{ width: 200 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your library" aria-label="Search" />
            <select className="field" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort"><option value="recent">Most recent</option>{types.length > 1 && <option value="category">Category</option>}<option value="az">A–Z</option></select>
          </div>
        </div>
        <div className="seg" role="group" aria-label="Status">
          {[['all', 'All'], ...STATUSES].map(([k, l]) => <button key={k} type="button" aria-pressed={status === k} onClick={() => setStatus(k)}>{k === 'active' ? TYPES[types[0]].active : l} {count(k) || ''}</button>)}
        </div>
        {groups.map(([t, list]) => t ? (
          <details key={t} open>
            <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '6px 0' }}>{TYPES[t].label}{t === 'manga' || t === 'comic' ? '' : 's'} · {list.length}</summary>
            <div className="themes" style={{ marginTop: 8 }}>{list.slice(0, limit).map(card)}</div>
            {more(list.length)}
          </details>
        ) : <div key="all" style={{ display: 'contents' }}><div className="themes">{list.length ? list.slice(0, limit).map(card) : <div className="empty">Nothing here yet.</div>}</div>{more(list.length)}</div>)}
      </section>
      {open && <MediaModal key={open.id} item={open} types={types} me={me} onClose={() => setOpenId(null)} />}
    </>
  );
}
