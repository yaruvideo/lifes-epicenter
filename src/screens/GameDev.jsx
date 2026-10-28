import { useEffect, useState } from 'react';
import { patch, remove, save } from '../db.js';
import { useItems } from '../store.js';
import { PEOPLE } from '../config.js';
import { PRIORITY, addTask, completeTask, isWaiting, priorityRank, undoTask } from '../tasks.js';
import { columnFor, columnsOf, inProject, saveGdProjects, tabsOf, useGdProjects } from '../gamedev.js';
import useBoardDrag, { BOARD_SORTS, BoardSortSelect, byAlpha, byMine } from './useBoardDrag.jsx';
import Live from './Live.jsx';
import OrderEditor from './OrderEditor.jsx';
import SectionInbox from './SectionInbox.jsx';
import useTaskActions from './useTaskActions.jsx';

const SECTION = 'gamedev';
const day = 864e5;
const migrated = new Set();

function ProjectBar({ projects, active, setActive }) {
  const shown = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);
  const add = () => {
    const name = (prompt('Name of the new project?') || '').trim();
    if (!name) return;
    const id = 'gd-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
    saveGdProjects([...projects, { id, name }]); setActive(id);
  };
  const cur = projects.find((p) => p.id === active);
  const rename = () => {
    const name = (prompt('Rename project', cur.name) || '').trim();
    if (name) saveGdProjects(projects.map((p) => (p.id === active ? { ...p, name } : p)));
  };
  const archive = () => {
    if (shown.length < 2) return alert('Keep at least one project open. Add another first.');
    if (!confirm('Archive "' + cur.name + '"? It is hidden from the switcher but nothing is deleted, and you can bring it back from Archived.')) return;
    saveGdProjects(projects.map((p) => (p.id === active ? { ...p, archived: true } : p)));
    setActive(shown.find((p) => p.id !== active).id);
  };
  const restore = (id) => { if (!id) return; saveGdProjects(projects.map((p) => (p.id === id ? { ...p, archived: false } : p))); setActive(id); };
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

const meta = (t) => [t.tag, t.due && 'Due ' + t.due, t.owner && t.owner !== 'yaru' && (PEOPLE[t.owner]?.name || 'Together')].filter(Boolean).join(' · ');

export const GD_SORTS = { ...BOARD_SORTS, due: 'Due date (soonest first)', priority: 'Priority (highest first)' };
const gdSorters = {
  mine: byMine,
  alpha: byAlpha,
  due: (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || byMine(a, b),
  priority: (a, b) => priorityRank(a.priority) - priorityRank(b.priority) || byMine(a, b)
};

function Board({ tasks, columns, me, onOpen, onEditColumns, pid, sort, setSort }) {
  const [adding, setAdding] = useState({});
  const last = columns[columns.length - 1].id;
  const mineOrder = sort === 'mine';
  // The last column means finished: moving a card there ticks the task off, moving it back out reopens it.
  // In My order a drop also sets where the card sits in its column.
  const moveTo = async (t, col, key) => {
    const from = columnFor(t, columns);
    if (col === last) { if (!t.done) await completeTask(t, me, ''); if (key !== undefined) await patch(t.id, { sortKey: key }); }
    else if (from !== col || key !== undefined) { if (t.done) await undoTask(t); await patch(t.id, { column: col, sortKey: key ?? Date.now() }); }
  };
  const drag = useBoardDrag(tasks, mineOrder, moveTo);
  const step = (t, dir) => { const i = columns.findIndex((c) => c.id === columnFor(t, columns)) + dir; if (i >= 0 && i < columns.length) moveTo(t, columns[i].id); };
  const add = (col) => (e) => {
    e.preventDefault();
    const title = (adding[col] || '').trim();
    if (!title) return;
    addTask(title, me, { list: SECTION, project: pid, column: col, sortKey: Date.now() });
    setAdding({ ...adding, [col]: '' });
  };
  // Outside My order the Done column keeps the most recently finished on top.
  const order = (c) => (c.id === last && !mineOrder ? (a, b) => (b.doneAt || 0) - (a.doneAt || 0) : gdSorters[sort] || byMine);
  return (
    <>
      <div className="row between">
        <span className="sub" style={{ fontSize: 13 }}>{mineOrder ? 'Drag cards up and down to order them, or across to change stage.' : 'Drag cards across to change stage. Pick My order to arrange them yourself.'} Cards in the last column count as done.</span>
        <span className="row" style={{ gap: 8 }}>
          <BoardSortSelect value={sort} options={GD_SORTS} onChange={setSort} />
          <button type="button" className="btn ghost small" onClick={onEditColumns}>Edit columns</button>
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, minmax(220px, 1fr))`, gap: 12, minWidth: columns.length * 232 }}>
          {columns.map((c, ci) => {
            const list = tasks.filter((t) => columnFor(t, columns) === c.id).sort(order(c));
            return (
              <section key={c.id} className="card" aria-label={c.name} style={{ padding: 12, minHeight: 300 }} {...drag.column(c.id, list)}>
                <div className="row between"><h2 style={{ fontSize: 16 }}>{c.name}</h2><span className="sub">{list.length}</span></div>
                {list.map((t) => (
                  <div key={t.id} {...drag.card(t)} className={'note' + drag.cardClass(t)} style={{ padding: 10, cursor: 'grab', display: 'flex', flexDirection: 'column', gap: 6, opacity: t.done ? 0.75 : 1 }}>
                    <button type="button" onClick={() => onOpen(t)} style={{ textAlign: 'left', background: 'none', border: 0, padding: 0, cursor: 'pointer', fontWeight: 600, color: 'inherit', textDecoration: t.done ? 'line-through' : 'none' }}>{t.milestone ? '◆ ' : ''}{t.title}</button>
                    {t.priority && <span className="pill" style={{ ...PRIORITY[t.priority], alignSelf: 'flex-start', fontSize: 11 }}>{t.priority}</span>}
                    <div className="row between">
                      <span className="sub" style={{ fontSize: 12 }}>{meta(t)}</span>
                      <span className="row" style={{ gap: 4 }}>
                        <button type="button" className="btn ghost small" style={{ minHeight: 28, padding: '0 8px' }} aria-label={'Edit ' + t.title} title="Edit" onClick={() => onOpen(t)}>✎</button>
                        <button type="button" className="btn ghost small" style={{ minHeight: 28, padding: '0 8px' }} aria-label={'Delete ' + t.title} title="Delete" onClick={() => { if (confirm('Delete "' + t.title + '"?')) remove(t.id); }}>✕</button>
                        {ci > 0 && <button type="button" className="btn ghost small" style={{ minHeight: 28, padding: '0 8px' }} aria-label={'Move ' + t.title + ' left'} onClick={() => step(t, -1)}>‹</button>}
                        {ci < columns.length - 1 && <button type="button" className="btn ghost small" style={{ minHeight: 28, padding: '0 8px' }} aria-label={'Move ' + t.title + ' right'} onClick={() => step(t, 1)}>›</button>}
                      </span>
                    </div>
                  </div>
                ))}
                {c.id !== last && <form onSubmit={add(c.id)}><input className="field" value={adding[c.id] || ''} onChange={(e) => setAdding({ ...adding, [c.id]: e.target.value })} placeholder="+ Add a card" aria-label={'Add a card to ' + c.name} /></form>}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}

function List({ tasks, columns, onOpen }) {
  const [sortBy, setSortBy] = useState(['column', 1]);
  const [sk, dir] = sortBy;
  const colIndex = (t) => columns.findIndex((c) => c.id === columnFor(t, columns));
  const val = {
    title: (t) => t.title.toLowerCase(),
    column: (t) => colIndex(t),
    priority: (t) => priorityRank(t.priority),
    due: (t) => t.due || '9999',
    owner: (t) => t.owner || ''
  };
  const rows = [...tasks].sort((a, b) => { const x = val[sk](a), y = val[sk](b); return (x < y ? -1 : x > y ? 1 : 0) * dir || (a.due || '9').localeCompare(b.due || '9'); });
  const cols = [['title', 'To-do'], ['column', 'Stage'], ['priority', 'Priority'], ['due', 'Due'], ['owner', 'Who']];
  return (
    <section className="card" style={{ overflowX: 'auto' }}>
      {!tasks.length ? <div className="empty">No to-dos yet. Add some on the To-dos tab or the Board.</div> : (
        <table className="tbl" style={{ minWidth: 560 }}>
          <thead><tr>{cols.map(([k, l]) => (
            <th key={k} style={{ textAlign: 'left' }} aria-sort={sk === k ? (dir > 0 ? 'ascending' : 'descending') : 'none'}>
              <button type="button" onClick={() => setSortBy(sk === k ? [k, -dir] : [k, 1])}>{l}{sk === k ? (dir > 0 ? ' ▲' : ' ▼') : ''}</button>
            </th>
          ))}</tr></thead>
          <tbody>{rows.map((t) => (
            <tr key={t.id}>
              <td><button type="button" className="linkish" style={{ fontWeight: 600, color: 'inherit', textDecoration: t.done ? 'line-through' : 'none' }} onClick={() => onOpen(t)}>{t.milestone ? '◆ ' : ''}{t.title}</button></td>
              <td style={{ textAlign: 'left' }}>{columns[colIndex(t)]?.name}</td>
              <td style={{ textAlign: 'left' }}>{t.priority ? <span className="pill" style={{ ...PRIORITY[t.priority], fontSize: 11 }}>{t.priority}</span> : ''}</td>
              <td style={{ textAlign: 'left' }}>{t.due || ''}</td>
              <td style={{ textAlign: 'left' }}>{t.owner === 'both' ? 'Together' : PEOPLE[t.owner]?.name || ''}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </section>
  );
}

// Six weeks from the start of this week. To-dos need a due date (and optionally a start) to show.
function Timeline({ tasks, columns, onOpen }) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const w0 = new Date(now - now.getDay() * day);
  const weeks = [...Array(6)].map((_, i) => new Date(+w0 + i * 7 * day));
  const end = +w0 + 42 * day;
  const at = (d) => new Date(d + 'T00:00');
  const col = (d) => Math.max(0, Math.min(5, Math.floor((at(d) - w0) / (7 * day))));
  const label = (t) => columns.find((c) => c.id === columnFor(t, columns))?.name;
  const dated = tasks.filter((c) => c.due && !c.milestone && at(c.due) >= w0 && at(c.start || c.due) < end).sort((a, b) => (a.start || a.due).localeCompare(b.start || b.due));
  const miles = tasks.filter((c) => c.milestone && c.due && at(c.due) >= w0 && at(c.due) < end);
  const grid = { display: 'grid', gridTemplateColumns: '220px repeat(6, minmax(0, 1fr))', alignItems: 'center', minHeight: 40 };
  return (
    <section className="card" style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 820, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ ...grid, minHeight: 0, fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}><span />{weeks.map((w) => <span key={+w}>{w.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>)}</div>
        {dated.length === 0 && <div className="empty">Give to-dos a due date (and a start date for longer work) to see them here.</div>}
        {dated.map((c) => {
          const a = c.start ? col(c.start) : col(c.due);
          return (
            <div key={c.id} style={grid}>
              <button type="button" className="linkish" style={{ fontWeight: 500, paddingRight: 12, color: 'inherit' }} onClick={() => onOpen(c)}>{c.title}</button>
              <span style={{ gridColumn: (a + 2) + ' / span ' + (col(c.due) - a + 1), height: 28, borderRadius: 8, background: c.done ? 'var(--inner)' : '#FF9F45', color: c.done ? 'var(--muted)' : '#131019', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', padding: '0 10px', marginRight: 4 }}>{label(c)} · due {at(c.due).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
            </div>
          );
        })}
        <div style={{ ...grid, borderTop: '1px dashed var(--border)', paddingTop: 8 }}>
          <span style={{ fontWeight: 600, color: '#F2545B' }}>Milestones</span>
          {miles.length === 0 ? <span className="sub" style={{ gridColumn: '2 / span 6', fontSize: 13 }}>Tick "Milestone" on a to-do to pin it here.</span>
            : miles.map((m) => <button key={m.id} type="button" className="linkish" style={{ gridColumn: (col(m.due) + 2) + ' / span 1', gridRow: 1, fontSize: 13, fontWeight: 600, color: '#F2545B' }} onClick={() => onOpen(m)}>◆ {m.title}</button>)}
        </div>
      </div>
    </section>
  );
}

export default function GameDev({ me }) {
  const projects = useGdProjects();
  const prefs = useItems('prefs').find((p) => p.id === 'prefs-' + me) || {};
  const openProjects = projects.filter((p) => !p.archived);
  const project = projects.find((p) => p.id === prefs.gdProject) || openProjects[0] || projects[0];
  const pid = project.id;
  const setPid = (id) => save('prefs', { ...prefs, gdProject: id }, 'prefs-' + me);
  const updateProject = (changes) => saveGdProjects(projects.map((p) => (p.id === pid ? { ...p, ...changes } : p)));
  const mine = inProject(pid);
  const columns = columnsOf(project);
  const tabs = tabsOf(project);
  const allTasks = useItems('task');
  const fortnight = Date.now() - 14 * day;
  // Open to-dos plus the ones finished in the last two weeks, so the Done column doesn't grow forever.
  const tasks = allTasks.filter((t) => t.list === SECTION && mine(t) && !isWaiting(t) && (!t.done || (t.doneAt || 0) > fortnight));
  const legacy = useItems('card').filter((c) => c.section === SECTION);
  const notes = useItems('secnote').filter((n) => n.section === SECTION && mine(n)).sort((a, b) => b.at - a.at);
  const docs = useItems('doc').filter((d) => d.section === SECTION && mine(d));
  const links = useItems('link').filter((l) => l.section === SECTION && mine(l));
  const { onOpen, overlays } = useTaskActions(me);
  const visible = tabs.filter((t) => !t.hidden);
  const [viewPick, setView] = useState(null);
  const view = visible.some((t) => t.id === viewPick) ? viewPick : visible[0]?.id;
  const [editing, setEditing] = useState(null); // 'columns' | 'tabs'
  const [note, setNote] = useState('');
  const [docId, setDocId] = useState(null);
  const [link, setLink] = useState({ name: '', url: '' });
  const doc = docs.find((d) => d.id === docId) || docs[0];

  // Board cards used to be their own items. Turn any left over into to-dos so there's one set of work.
  useEffect(() => {
    legacy.forEach((c) => {
      if (migrated.has(c.id)) return;
      migrated.add(c.id);
      const cols = columnsOf(projects.find((p) => p.id === (c.project || 'gd-main')));
      const done = c.column === cols[cols.length - 1].id;
      addTask(c.title, me, { list: SECTION, project: c.project || 'gd-main', column: c.column, notes: c.notes || '', due: c.due || null, start: c.start || null, tag: c.tag || '', milestone: !!c.milestone, sortKey: c.order, done, doneAt: done ? Date.now() : null })
        .then(() => remove(c.id));
    });
  }, [legacy.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const boardSort = GD_SORTS[project.boardSort] ? project.boardSort : 'mine';
  const setBoardSort = (v) => updateProject({ boardSort: v });

  const removeColumn = (c) => {
    const left = columns.filter((x) => x.id !== c.id);
    const open = tasks.filter((t) => !t.done && columnFor(t, columns) === c.id);
    if (!confirm('Remove "' + c.name + '"?' + (open.length ? ' Its ' + open.length + ' card(s) move to "' + left[0].name + '".' : ''))) return;
    open.forEach((t) => patch(t.id, { column: left[0].id }));
    updateProject({ columns: left });
  };

  return (
    <>
      <header><div className="sub row" style={{ gap: 8 }}><span className="dot" style={{ background: '#FF9F45' }} />Section</div><h1>Game Dev</h1></header>
      <ProjectBar projects={projects} active={pid} setActive={setPid} />
      <div className="row" style={{ gap: 8 }}>
        <div className="seg" role="tablist" aria-label="View">
          {visible.map((t) => <button key={t.id} type="button" role="tab" aria-selected={view === t.id} aria-pressed={view === t.id} onClick={() => setView(t.id)}>{t.name}</button>)}
        </div>
        <button type="button" className="btn ghost small" aria-expanded={editing === 'tabs'} onClick={() => setEditing(editing === 'tabs' ? null : 'tabs')}>Edit tabs</button>
      </div>

      {editing === 'tabs' && (
        <OrderEditor title={'Tabs for ' + project.name} hint="Drag the ⋮⋮ handle to change the order, or hide tabs this project doesn't use. Each project keeps its own." items={tabs}
          hide onChange={(list) => updateProject({ tabs: list.map((t) => t.id), hiddenTabs: list.filter((t) => t.hidden).map((t) => t.id) })} onDone={() => setEditing(null)} />
      )}
      {editing === 'columns' && (
        <OrderEditor title={'Board columns for ' + project.name} hint="Drag the ⋮⋮ handle to reorder. Rename, add or remove columns too. The last column always means done." items={columns}
          rename onRemove={removeColumn} addLabel="Add column" onChange={(list) => updateProject({ columns: list })} onDone={() => setEditing(null)}
          footer={<div className="row" style={{ gap: 8, paddingTop: 4 }}><BoardSortSelect value={boardSort} options={GD_SORTS} onChange={setBoardSort} /></div>} />
      )}

      {view === 'todos' && <SectionInbox key={pid} me={me} listId="gamedev" title={project.name + ' to-dos'} match={mine} extra={{ project: pid }} />}
      {view === 'board' && <Board tasks={tasks} columns={columns} me={me} pid={pid} onOpen={onOpen} onEditColumns={() => setEditing('columns')} sort={boardSort} setSort={setBoardSort} />}
      {view === 'list' && <List tasks={tasks} columns={columns} onOpen={onOpen} />}
      {view === 'timeline' && <Timeline tasks={tasks} columns={columns} onOpen={onOpen} />}

      {view === 'notes' && (
        <section className="card">
          <form style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (note.trim()) { save('secnote', { section: SECTION, project: pid, text: note.trim(), at: Date.now(), by: me }); save('journal', { type: 'thought', text: '[' + project.name + '] ' + note.trim(), by: me, at: Date.now() }); setNote(''); } }}>
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
      {!visible.length && <div className="empty">Every tab is hidden for this project. Use Edit tabs to show some again.</div>}
      {overlays}
    </>
  );
}

