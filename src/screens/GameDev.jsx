import { useState } from 'react';
import { patch, remove, save } from '../db.js';
import { useItems } from '../store.js';
import Live from './Live.jsx';
import SectionInbox from './SectionInbox.jsx';

const COLUMNS = [['todo', 'To do'], ['doing', 'Doing'], ['review', 'Review'], ['done', 'Done']];
const SECTION = 'gamedev';
// Each game is its own project. Items saved before projects existed have no `project` and belong to the first one (gd-main).
const DEFAULT_PROJECTS = [{ id: 'gd-main', name: 'Second Sun' }];
const inProject = (pid) => (x) => (x.project || 'gd-main') === pid;

function ProjectBar({ projects, active, setActive }) {
  const all = projects;
  const shown = all.filter((p) => !p.archived);
  const archived = all.filter((p) => p.archived);
  const store = (list) => save('gdprojects', { projects: list }, 'gdprojects');
  const add = () => {
    const name = (prompt('Name of the new project?') || '').trim();
    if (!name) return;
    const id = 'gd-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
    store([...all, { id, name }]); setActive(id);
  };
  const cur = all.find((p) => p.id === active);
  const rename = () => {
    const name = (prompt('Rename project', cur.name) || '').trim();
    if (name) store(all.map((p) => (p.id === active ? { ...p, name } : p)));
  };
  const archive = () => {
    if (shown.length < 2) return alert('Keep at least one project open. Add another first.');
    if (!confirm('Archive "' + cur.name + '"? It is hidden from the switcher but nothing is deleted, and you can bring it back from Archived.')) return;
    store(all.map((p) => (p.id === active ? { ...p, archived: true } : p)));
    setActive(shown.find((p) => p.id !== active).id);
  };
  const restore = (id) => { if (!id) return; store(all.map((p) => (p.id === id ? { ...p, archived: false } : p))); setActive(id); };
  return (
    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
      <div className="seg" role="group" aria-label="Project">
        {shown.map((p) => <button key={p.id} type="button" aria-pressed={p.id === active} onClick={() => setActive(p.id)}>{p.name}</button>)}
      </div>
      <button type="button" className="btn ghost small" onClick={add}>+ New project</button>
      {cur && <button type="button" className="btn ghost small" onClick={rename}>Rename</button>}
      {cur && <button type="button" className="btn ghost small" onClick={archive}>Archive</button>}
      {archived.length > 0 && (
        <select className="field" style={{ width: 'auto', minHeight: 36 }} value="" onChange={(e) => restore(e.target.value)} aria-label="Archived projects">
          <option value="">Archived ({archived.length})</option>
          {archived.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
    </div>
  );
}

function CardModal({ card, onClose }) {
  const [c, setC] = useState(card);
  const set = (x) => { setC({ ...c, ...x }); patch(c.id, x); };
  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Edit card">
        <input className="field display" autoFocus style={{ fontSize: 22, fontWeight: 600, background: 'transparent', border: 0, padding: 0 }} value={c.title} onChange={(e) => set({ title: e.target.value })} aria-label="Card title" />
        <div className="row">
          <label className="lbl" style={{ flex: 1 }}>Column<select className="field" value={c.column} onChange={(e) => set({ column: e.target.value })}>{COLUMNS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="lbl" style={{ flex: 1 }}>Start<input type="date" className="field" value={c.start || ''} onChange={(e) => set({ start: e.target.value || null })} /></label>
          <label className="lbl" style={{ flex: 1 }}>Due<input type="date" className="field" value={c.due || ''} onChange={(e) => set({ due: e.target.value || null })} /></label>
          <label className="lbl" style={{ flex: 1 }}>Tag<input className="field" value={c.tag || ''} onChange={(e) => set({ tag: e.target.value })} placeholder="Art, code, audio…" /></label>
        </div>
        <label className="row" style={{ gap: 8, fontSize: 14 }}><input type="checkbox" checked={!!c.milestone} onChange={(e) => set({ milestone: e.target.checked })} /> Milestone (shows as ◆ on the Timeline)</label>
        <label className="lbl">Notes<textarea className="field" style={{ minHeight: 140 }} value={c.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></label>
        <div className="row between">
          <button type="button" className="btn ghost small" onClick={() => { if (confirm('Delete this card?')) { remove(c.id); onClose(); } }}>Delete card</button>
          <button type="button" className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// Six weeks from the start of this week. Cards need a due date (and optionally a start) to show.
function Timeline({ cards, onOpen }) {
  const day = 864e5;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const w0 = new Date(now - now.getDay() * day);
  const weeks = [...Array(6)].map((_, i) => new Date(+w0 + i * 7 * day));
  const end = +w0 + 42 * day;
  const at = (d) => new Date(d + 'T00:00');
  const col = (d) => Math.max(0, Math.min(5, Math.floor((at(d) - w0) / (7 * day))));
  const label = Object.fromEntries(COLUMNS);
  const dated = cards.filter((c) => c.due && !c.milestone && at(c.due) >= w0 && at(c.start || c.due) < end).sort((a, b) => (a.start || a.due).localeCompare(b.start || b.due));
  const miles = cards.filter((c) => c.milestone && c.due && at(c.due) >= w0 && at(c.due) < end);
  const grid = { display: 'grid', gridTemplateColumns: '220px repeat(6, minmax(0, 1fr))', alignItems: 'center', minHeight: 40 };
  return (
    <section className="card" style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 820, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ ...grid, minHeight: 0, fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}><span />{weeks.map((w) => <span key={+w}>{w.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>)}</div>
        {dated.length === 0 && <div className="empty">Give cards a due date (and a start date for longer work) to see them here.</div>}
        {dated.map((c) => {
          const a = c.start ? col(c.start) : col(c.due);
          return (
            <div key={c.id} style={grid}>
              <button type="button" className="linkish" style={{ fontWeight: 500, paddingRight: 12 }} onClick={() => onOpen(c.id)}>{c.title}</button>
              <span style={{ gridColumn: (a + 2) + ' / span ' + (col(c.due) - a + 1), height: 28, borderRadius: 8, background: c.column === 'done' ? 'var(--inner)' : '#FF9F45', color: c.column === 'done' ? 'var(--muted)' : '#131019', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', padding: '0 10px', marginRight: 4 }}>{label[c.column]} · due {at(c.due).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
            </div>
          );
        })}
        <div style={{ ...grid, borderTop: '1px dashed var(--border)', paddingTop: 8 }}>
          <span style={{ fontWeight: 600, color: '#F2545B' }}>Milestones</span>
          {miles.length === 0 ? <span className="sub" style={{ gridColumn: '2 / span 6', fontSize: 13 }}>Tick "Milestone" on a card to pin it here.</span>
            : miles.map((m) => <button key={m.id} type="button" className="linkish" style={{ gridColumn: (col(m.due) + 2) + ' / span 1', gridRow: 1, fontSize: 13, fontWeight: 600, color: '#F2545B' }} onClick={() => onOpen(m.id)}>◆ {m.title}</button>)}
        </div>
      </div>
    </section>
  );
}

export default function GameDev({ me }) {
  const projects = useItems('gdprojects').find((x) => x.id === 'gdprojects')?.projects || DEFAULT_PROJECTS;
  const prefs = useItems('prefs').find((p) => p.id === 'prefs-' + me) || {};
  const open1 = projects.filter((p) => !p.archived);
  const pid = (projects.find((p) => p.id === prefs.gdProject) || open1[0] || projects[0]).id;
  const setPid = (id) => save('prefs', { ...prefs, gdProject: id }, 'prefs-' + me);
  const mine = inProject(pid);
  const cards = useItems('card').filter((c) => c.section === SECTION && mine(c));
  const notes = useItems('secnote').filter((n) => n.section === SECTION && mine(n)).sort((a, b) => b.at - a.at);
  const docs = useItems('doc').filter((d) => d.section === SECTION && mine(d));
  const links = useItems('link').filter((l) => l.section === SECTION && mine(l));
  const pname = projects.find((p) => p.id === pid)?.name || 'Game Dev';
  const [view, setView] = useState('todos');
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
    save('card', { section: SECTION, project: pid, column: col, title, notes: '', order: Date.now() });
    setAdding({ ...adding, [col]: '' });
  };
  const move = (c, dir) => {
    const i = COLUMNS.findIndex(([k]) => k === c.column) + dir;
    if (i >= 0 && i < COLUMNS.length) patch(c.id, { column: COLUMNS[i][0], order: Date.now() });
  };

  return (
    <>
      <header><div className="sub row" style={{ gap: 8 }}><span className="dot" style={{ background: '#FF9F45' }} />Section</div><h1>Game Dev</h1></header>
      <ProjectBar projects={projects} active={pid} setActive={setPid} />
      <div className="seg" role="tablist" aria-label="View">
        {[['todos', 'To-dos'], ['board', 'Board'], ['list', 'List'], ['notes', 'Notes'], ['timeline', 'Timeline'], ['docs', 'Docs'], ['links', 'Links']].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={view === k} aria-pressed={view === k} onClick={() => setView(k)}>{l}</button>)}
      </div>

      {view === 'todos' && <SectionInbox key={pid} me={me} listId="gamedev" title={pname + ' to-dos'} match={mine} extra={{ project: pid }} />}

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
                          <button type="button" className="btn ghost small" style={{ minHeight: 28, padding: '0 8px' }} aria-label={'Edit ' + c.title} title="Edit" onClick={() => setOpenId(c.id)}>✎</button>
                          <button type="button" className="btn ghost small" style={{ minHeight: 28, padding: '0 8px' }} aria-label={'Delete ' + c.title} title="Delete" onClick={() => { if (confirm('Delete "' + c.title + '"?')) remove(c.id); }}>✕</button>
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
          <form style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (note.trim()) { save('secnote', { section: SECTION, project: pid, text: note.trim(), at: Date.now(), by: me }); save('journal', { type: 'thought', text: '[' + pname + '] ' + note.trim(), by: me, at: Date.now() }); setNote(''); } }}>
            <textarea className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Devlog: what you worked on, ideas, problems…" aria-label="Dev note" />
            <div><button className="btn" type="submit">Add note</button></div>
          </form>
          {notes.map((n) => (
            <div key={n.id} className="note"><div className="row between"><span className="sub" style={{ fontSize: 12 }}>{new Date(n.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span><button type="button" className="btn ghost small" style={{ minHeight: 28 }} onClick={() => remove(n.id)} aria-label="Delete note">✕</button></div><div style={{ whiteSpace: 'pre-wrap' }}>{n.text}</div></div>
          ))}
        </section>
      )}

      {view === 'timeline' && <Timeline cards={cards} onOpen={setOpenId} />}
      {view === 'docs' && (
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <section className="card" style={{ flex: '1 1 220px' }}>
            {docs.map((d) => <button key={d.id} type="button" className={'nav' + (doc?.id === d.id ? ' on' : '')} style={{ border: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => setDocId(d.id)}>{d.title || 'Untitled'}</button>)}
            <div className="row">
              {!docs.length && ['Game design doc', 'Art style guide', 'Story & lore', 'Patch notes'].map((t) => <button key={t} type="button" className="btn ghost small" onClick={() => save('doc', { section: SECTION, project: pid, title: t, body: '', touched: Date.now() })}>+ {t}</button>)}
              <button type="button" className="btn small" onClick={() => save('doc', { section: SECTION, project: pid, title: 'New doc', body: '', touched: Date.now() }).then((d) => setDocId(d.id))}>+ New doc</button>
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
          <form className="row" onSubmit={(e) => { e.preventDefault(); if (link.name.trim() && link.url.trim()) { save('link', { section: SECTION, project: pid, name: link.name.trim(), url: /^https?:/.test(link.url) ? link.url.trim() : 'https://' + link.url.trim() }); setLink({ name: '', url: '' }); } }}>
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
