import { useState } from 'react';
import { patch, remove, save } from '../db.js';
import { useItems } from '../store.js';
import Live from './Live.jsx';

const COLUMNS = [['todo', 'To do'], ['doing', 'Doing'], ['review', 'Review'], ['done', 'Done']];
const SECTION = 'gamedev';

function CardModal({ card, onClose }) {
  const [c, setC] = useState(card);
  const set = (x) => { setC({ ...c, ...x }); patch(c.id, x); };
  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Edit card">
        <input className="field display" autoFocus style={{ fontSize: 22, fontWeight: 600, background: 'transparent', border: 0, padding: 0 }} value={c.title} onChange={(e) => set({ title: e.target.value })} aria-label="Card title" />
        <div className="row">
          <label className="lbl" style={{ flex: 1 }}>Column<select className="field" value={c.column} onChange={(e) => set({ column: e.target.value })}>{COLUMNS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="lbl" style={{ flex: 1 }}>Due<input type="date" className="field" value={c.due || ''} onChange={(e) => set({ due: e.target.value || null })} /></label>
          <label className="lbl" style={{ flex: 1 }}>Tag<input className="field" value={c.tag || ''} onChange={(e) => set({ tag: e.target.value })} placeholder="Art, code, audio…" /></label>
        </div>
        <label className="lbl">Notes<textarea className="field" style={{ minHeight: 140 }} value={c.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></label>
        <div className="row between">
          <button type="button" className="btn ghost small" onClick={() => { if (confirm('Delete this card?')) { remove(c.id); onClose(); } }}>Delete card</button>
          <button type="button" className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

export default function GameDev({ me }) {
  const cards = useItems('card').filter((c) => c.section === SECTION);
  const notes = useItems('secnote').filter((n) => n.section === SECTION).sort((a, b) => b.at - a.at);
  const docs = useItems('doc').filter((d) => d.section === SECTION);
  const links = useItems('link').filter((l) => l.section === SECTION);
  const [view, setView] = useState('board');
  const [adding, setAdding] = useState({});
  const [openId, setOpenId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [note, setNote] = useState('');
  const [docId, setDocId] = useState(null);
  const [link, setLink] = useState({ name: '', url: '' });
  const open = cards.find((c) => c.id === openId);
  const doc = docs.find((d) => d.id === docId) || docs[0];

  const addCard = (col) => (e) => {
    e.preventDefault();
    const title = (adding[col] || '').trim();
    if (!title) return;
    save('card', { section: SECTION, column: col, title, notes: '', order: Date.now() });
    setAdding({ ...adding, [col]: '' });
  };
  const move = (c, dir) => {
    const i = COLUMNS.findIndex(([k]) => k === c.column) + dir;
    if (i >= 0 && i < COLUMNS.length) patch(c.id, { column: COLUMNS[i][0], order: Date.now() });
  };

  return (
    <>
      <header><div className="sub">Section</div><h1>Game Dev</h1></header>
      <div className="seg" role="tablist" aria-label="View">
        {[['board', 'Board'], ['list', 'List'], ['notes', 'Notes'], ['docs', 'Docs'], ['links', 'Links']].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={view === k} aria-pressed={view === k} onClick={() => setView(k)}>{l}</button>)}
      </div>

      {view === 'board' && (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(220px, 1fr))', gap: 12, minWidth: 900 }}>
            {COLUMNS.map(([k, l], ci) => {
              const list = cards.filter((c) => c.column === k).sort((a, b) => a.order - b.order);
              return (
                <section key={k} className="card" aria-label={l} style={{ padding: 12, minHeight: 300 }}
                  onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragId) patch(dragId, { column: k, order: Date.now() }); setDragId(null); }}>
                  <div className="row between"><h2 style={{ fontSize: 16 }}>{l}</h2><span className="sub">{list.length}</span></div>
                  {list.map((c) => (
                    <div key={c.id} draggable onDragStart={() => setDragId(c.id)} className="note" style={{ padding: 10, cursor: 'grab', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button type="button" onClick={() => setOpenId(c.id)} style={{ textAlign: 'left', background: 'none', border: 0, padding: 0, cursor: 'pointer', fontWeight: 600 }}>{c.title}</button>
                      <div className="row between">
                        <span className="sub" style={{ fontSize: 12 }}>{[c.tag, c.due && 'Due ' + c.due].filter(Boolean).join(' · ')}</span>
                        <span className="row" style={{ gap: 4 }}>
                          {ci > 0 && <button type="button" className="btn ghost small" style={{ minHeight: 28, padding: '0 8px' }} aria-label={'Move ' + c.title + ' left'} onClick={() => move(c, -1)}>‹</button>}
                          {ci < COLUMNS.length - 1 && <button type="button" className="btn ghost small" style={{ minHeight: 28, padding: '0 8px' }} aria-label={'Move ' + c.title + ' right'} onClick={() => move(c, 1)}>›</button>}
                        </span>
                      </div>
                    </div>
                  ))}
                  <form onSubmit={addCard(k)}><input className="field" value={adding[k] || ''} onChange={(e) => setAdding({ ...adding, [k]: e.target.value })} placeholder="+ Add a card" aria-label={'Add a card to ' + l} /></form>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {view === 'list' && (
        <section className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead><tr>{['Card', 'Column', 'Tag', 'Due'].map((h) => <th key={h} style={{ textAlign: 'left', padding: 8, color: 'var(--muted)', fontSize: 13, borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
            <tbody>{cards.sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).map((c) => (
              <tr key={c.id} onClick={() => setOpenId(c.id)} style={{ cursor: 'pointer' }}>
                <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{c.title}</td>
                <td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{COLUMNS.find(([k]) => k === c.column)?.[1]}</td>
                <td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{c.tag}</td>
                <td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{c.due}</td>
              </tr>
            ))}</tbody>
          </table>
          {!cards.length && <div className="empty">No cards yet. Add some on the Board.</div>}
        </section>
      )}

      {view === 'notes' && (
        <section className="card">
          <form style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (note.trim()) { save('secnote', { section: SECTION, text: note.trim(), at: Date.now(), by: me }); save('journal', { type: 'thought', text: '[Game Dev] ' + note.trim(), by: me, at: Date.now() }); setNote(''); } }}>
            <textarea className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Devlog: what you worked on, ideas, problems…" aria-label="Dev note" />
            <div><button className="btn" type="submit">Add note</button></div>
          </form>
          {notes.map((n) => (
            <div key={n.id} className="note"><div className="row between"><span className="sub" style={{ fontSize: 12 }}>{new Date(n.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span><button type="button" className="btn ghost small" style={{ minHeight: 28 }} onClick={() => remove(n.id)} aria-label="Delete note">✕</button></div><div style={{ whiteSpace: 'pre-wrap' }}>{n.text}</div></div>
          ))}
        </section>
      )}

      {view === 'docs' && (
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <section className="card" style={{ flex: '1 1 220px' }}>
            {docs.map((d) => <button key={d.id} type="button" className={'nav' + (doc?.id === d.id ? ' on' : '')} style={{ border: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => setDocId(d.id)}>{d.title || 'Untitled'}</button>)}
            <div className="row">
              {!docs.length && ['Game design doc', 'Art style guide', 'Story & lore', 'Patch notes'].map((t) => <button key={t} type="button" className="btn ghost small" onClick={() => save('doc', { section: SECTION, title: t, body: '', touched: Date.now() })}>+ {t}</button>)}
              <button type="button" className="btn small" onClick={() => save('doc', { section: SECTION, title: 'New doc', body: '', touched: Date.now() }).then((d) => setDocId(d.id))}>+ New doc</button>
            </div>
          </section>
          {doc && (
            <section className="card" style={{ flex: '3 1 420px' }}>
              <Live key={doc.id + 't'} className="field display" style={{ fontSize: 20, background: 'transparent', border: 0, padding: 0 }} value={doc.title} onSave={(v) => patch(doc.id, { title: v, touched: Date.now() })} aria-label="Doc title" />
              <Live as="textarea" key={doc.id + 'b'} className="field" style={{ minHeight: 420 }} value={doc.body} onSave={(v) => patch(doc.id, { body: v, touched: Date.now() })} aria-label="Doc body" />
              <div className="row between"><span className="sub" style={{ fontSize: 12 }}>Saved as you type</span><button type="button" className="btn ghost small" onClick={() => { if (confirm('Delete this doc?')) { remove(doc.id); setDocId(null); } }}>Delete doc</button></div>
            </section>
          )}
        </div>
      )}

      {view === 'links' && (
        <section className="card">
          {links.map((l) => (
            <div key={l.id} className="task"><a href={l.url} target="_blank" rel="noreferrer" style={{ flex: 1, fontWeight: 600 }}>{l.name}</a><span className="sub" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280, whiteSpace: 'nowrap' }}>{l.url}</span><button type="button" className="btn ghost small" aria-label={'Remove ' + l.name} onClick={() => remove(l.id)}>✕</button></div>
          ))}
          {!links.length && <div className="empty">Link your Google Drive folder, Docs, Sheets, Chat space, code repo, Steamworks page…</div>}
          <form className="row" onSubmit={(e) => { e.preventDefault(); if (link.name.trim() && link.url.trim()) { save('link', { section: SECTION, name: link.name.trim(), url: /^https?:/.test(link.url) ? link.url.trim() : 'https://' + link.url.trim() }); setLink({ name: '', url: '' }); } }}>
            <input className="field" style={{ flex: '1 1 160px' }} value={link.name} onChange={(e) => setLink({ ...link, name: e.target.value })} placeholder="Name (e.g. Google Drive)" aria-label="Link name" />
            <input className="field" style={{ flex: '2 1 240px' }} value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} placeholder="https://…" aria-label="Link URL" />
            <button className="btn" type="submit">Add link</button>
          </form>
        </section>
      )}
      {open && <CardModal key={open.id} card={open} onClose={() => setOpenId(null)} />}
    </>
  );
}
