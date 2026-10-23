import { useEffect, useState } from 'react';
import { newId, remove, save } from '../db.js';
import { useItems } from '../store.js';
import { STATUSES, TYPES, nextUp } from '../media.js';

const PLAY_JOURNAL = [['recap', 'Recap'], ['highlights', 'Highlights & timestamps'], ['thumbs', 'Thumbnail ideas'], ['next', 'Next session']];

export default function MediaModal({ item: start, types, me, onClose }) {
  const [it, setIt] = useState(start);
  const notes = useItems('medianote').filter((n) => n.mediaId === start.id).sort((a, b) => b.at - a.at);
  const [upTo, setUpTo] = useState('');
  const [note, setNote] = useState({ label: '', text: '' });
  const [pj, setPj] = useState(false);
  const [pjf, setPjf] = useState({});
  const t = TYPES[it.type] || TYPES.book;

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const set = (c) => { const next = { ...it, ...c, touched: Date.now() }; setIt(next); save('media', next, it.id); };
  const addNote = (label, text) => {
    save('medianote', { mediaId: it.id, label, text, at: Date.now(), by: me });
    save('journal', { type: 'media', title: it.title, label, text, mediaId: it.id, by: me, at: Date.now() });
  };
  const logBatch = (e) => {
    e.preventDefault();
    const to = Number(upTo);
    const from = (it.progress || 0) + 1;
    if (!to || to < from) return;
    set({ progress: to, status: 'active' });
    addNote(t.unit + ' ' + (to === from ? to : from + '–' + to), '');
    setUpTo('');
  };
  const submitNote = (e) => {
    e.preventDefault();
    const text = pj ? PLAY_JOURNAL.filter(([k]) => pjf[k]?.trim()).map(([k, l]) => l + ': ' + pjf[k].trim()).join('\n') : note.text.trim();
    if (!text) return;
    let label = note.label.trim();
    if (!label && it.type === 'game') { label = 'Session ' + ((it.sessions || 0) + 1); set({ sessions: (it.sessions || 0) + 1, status: 'active' }); }
    if (!label && it.type === 'show') { const n = nextUp(it); label = n ? n.part.name + ' Ep ' + Math.max(1, n.ep - 1) : ''; }
    if (!label && t.unit && it.type !== 'show') label = t.unit + ' ' + (it.progress || 0);
    addNote(label, text);
    setNote({ label: '', text: '' }); setPjf({});
  };
  const setPart = (id, c) => set({ parts: it.parts.map((p) => (p.id === id ? { ...p, ...c } : p)) });

  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={it.title}>
        <input className="field display" style={{ fontSize: 22, fontWeight: 600, background: 'transparent', border: 0, padding: 0 }} value={it.title} onChange={(e) => set({ title: e.target.value })} aria-label="Title" autoFocus />
        {(it.year || it.series || it.author || it.genres?.length || it.steamAppId || it.link) && (
          <div className="sub" style={{ fontSize: 13 }}>
            {[it.year, it.series, it.author, it.genres?.join(', ')].filter(Boolean).join(' · ')}
            {it.steamAppId ? <> · <a href={'https://store.steampowered.com/app/' + it.steamAppId} target="_blank" rel="noreferrer">Steam page</a></> : /^https?:/.test(it.link || '') ? <> · <a href={it.link} target="_blank" rel="noreferrer">Link</a></> : it.link ? ' · ' + it.link : null}
          </div>
        )}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <label className="lbl">Type<select className="field" value={it.type} onChange={(e) => set({ type: e.target.value })}>{types.map((k) => <option key={k} value={k}>{TYPES[k].label}</option>)}</select></label>
          <label className="lbl">Status<select className="field" value={it.status} onChange={(e) => set({ status: e.target.value })}>{STATUSES.map(([k, l]) => <option key={k} value={k}>{k === 'active' ? t.active : l}</option>)}</select></label>
          <label className="lbl">Rating<select className="field" value={it.rating || ''} onChange={(e) => set({ rating: e.target.value ? Number(e.target.value) : null })}><option value="">–</option>{[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} / 10</option>)}</select></label>
          {it.type === 'game' && <label className="lbl">Platform<input className="field" value={it.platform || ''} onChange={(e) => set({ platform: e.target.value })} placeholder="PC, Switch…" /></label>}
          {it.type === 'game' && <label className="lbl">Hours played<input className="field" type="number" value={it.hours || ''} onChange={(e) => set({ hours: Number(e.target.value) || 0 })} /></label>}
        </div>

        {['manga', 'webtoon', 'comic', 'book'].includes(it.type) && (
          <div className="card" style={{ padding: 14 }}>
            <div className="row">
              <b>Progress</b>
              <span>{t.unit}</span>
              <input className="field" type="number" style={{ width: 90 }} value={it.progress || 0} onChange={(e) => set({ progress: Number(e.target.value) || 0 })} aria-label="Current" />
              <span className="sub">of</span>
              <input className="field" type="number" style={{ width: 90 }} value={it.total || ''} onChange={(e) => set({ total: Number(e.target.value) || null })} placeholder="?" aria-label="Total" />
              <button type="button" className="btn small" onClick={() => { set({ progress: (it.progress || 0) + 1, status: 'active' }); }}>+1</button>
            </div>
            <form className="row" onSubmit={logBatch}>
              <span className="sub">Read a bunch at once? Read up to {t.unit}</span>
              <input className="field" type="number" style={{ width: 90 }} value={upTo} onChange={(e) => setUpTo(e.target.value)} aria-label="Read up to" />
              <button className="btn ghost small" type="submit">Log batch</button>
            </form>
          </div>
        )}

        {it.type === 'show' && (
          <div className="card" style={{ padding: 14 }}>
            <div className="row between"><b>Parts</b><span className="sub">Seasons, renamed series, movies, specials</span></div>
            {(it.parts || []).map((p) => (
              <div key={p.id} className="task" style={{ flexWrap: 'wrap' }}>
                <input className="field" style={{ flex: '2 1 160px' }} value={p.name} onChange={(e) => setPart(p.id, { name: e.target.value })} aria-label="Part name" />
                <span className="sub">watched</span>
                <input className="field" type="number" style={{ width: 80 }} value={p.watched || 0} onChange={(e) => setPart(p.id, { watched: Number(e.target.value) || 0 })} aria-label="Watched" />
                <span className="sub">of</span>
                <input className="field" type="number" style={{ width: 80 }} value={p.episodes || ''} onChange={(e) => setPart(p.id, { episodes: Number(e.target.value) || null })} aria-label="Episodes" />
                <button type="button" className="btn ghost small" aria-label={'Remove ' + p.name} onClick={() => set({ parts: it.parts.filter((x) => x.id !== p.id) })}>✕</button>
              </div>
            ))}
            <div className="row">
              <button type="button" className="btn ghost small" onClick={() => set({ parts: [...(it.parts || []), { id: newId(), name: 'Season ' + ((it.parts || []).length + 1), episodes: null, watched: 0 }] })}>+ Add part</button>
              {nextUp(it) && <button type="button" className="btn small" onClick={() => { const n = nextUp(it); setPart(n.part.id, { watched: n.ep }); }}>Watched {nextUp(it).part.name} Ep {nextUp(it).ep}</button>}
            </div>
          </div>
        )}

        <h2>Notes</h2>
        <form style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onSubmit={submitNote}>
          <div className="row">
            <input className="field" style={{ flex: '1 1 140px' }} value={note.label} onChange={(e) => setNote({ ...note, label: e.target.value })} placeholder={it.type === 'game' ? 'Session ' + ((it.sessions || 0) + 1) : t.unit ? t.unit + ' (auto)' : 'Label'} aria-label="Note label" />
            {it.type === 'game' && <label className="row" style={{ gap: 6, fontSize: 14 }}><input type="checkbox" checked={pj} onChange={(e) => setPj(e.target.checked)} /> Play journal template</label>}
          </div>
          {pj
            ? PLAY_JOURNAL.map(([k, l]) => <label key={k} className="lbl">{l}<textarea className="field" style={{ minHeight: 56 }} value={pjf[k] || ''} onChange={(e) => setPjf({ ...pjf, [k]: e.target.value })} /></label>)
            : <textarea className="field" value={note.text} onChange={(e) => setNote({ ...note, text: e.target.value })} placeholder="Thoughts, theories, favorite moments…" aria-label="Note" />}
          <div><button className="btn" type="submit">Save note</button> <span className="sub">Notes also land in your Journal.</span></div>
        </form>
        {notes.map((n) => (
          <div key={n.id} className="note">
            <div className="row between"><b>{n.label}</b><span className="sub" style={{ fontSize: 12 }}>{new Date(n.at).toLocaleDateString([], { month: 'short', day: 'numeric' })} <button type="button" onClick={() => remove(n.id)} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>delete</button></span></div>
            {n.text && <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{n.text}</div>}
          </div>
        ))}

        <label className="lbl">Review<textarea className="field" value={it.review || ''} onChange={(e) => set({ review: e.target.value })} placeholder="Your overall take" /></label>
        <div className="row between">
          <button type="button" className="btn ghost small" onClick={() => { if (confirm('Delete "' + it.title + '" and its notes?')) { notes.forEach((n) => remove(n.id)); remove(it.id); onClose(); } }}>Delete</button>
          <button type="button" className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
