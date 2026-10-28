import { useState } from 'react';
import { patch, save } from '../db.js';
import { useItems, other, todayStr } from '../store.js';
import { isWaiting, priorityRank, useLists, saveLists, newListId, isToday, isThisWeek, isBlocked, weekEnd } from '../tasks.js';
import { PEOPLE } from '../config.js';
import TaskRow from './TaskRow.jsx';
import QuickAdd from './QuickAdd.jsx';
import useTaskActions from './useTaskActions.jsx';
import { projectOf, useProjects } from '../projectlinks.js';

export default function Tasks({ me }) {
  const tasks = useItems('task');
  const lists = useLists();
  const [filter, setFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('');
  const { open: openProjects, byId: projectById } = useProjects();
  const inProjectFilter = (t) => !projectFilter || (projectFilter === 'none' ? !projectOf(t) : projectOf(t) === projectFilter);
  const { onCheck, onOpen, overlays } = useTaskActions(me);
  // Each list's test ignores done/not-done; open tasks and the "Completed" section both use it.
  const filters = [
    ['all', 'All', () => true],
    ['myday', 'My Day', (t) => (t.done ? t.myDay || (t.due && t.due <= todayStr()) : isToday(t, tasks))],
    ['week', 'This Week', (t) => isThisWeek(t) && (t.done || !isBlocked(t, tasks))],
    ['mine', 'Mine', (t) => t.owner === me],
    ['theirs', PEOPLE[other(me)].name, (t) => t.owner === other(me)],
    ['both', 'Together', (t) => t.owner === 'both'],
    ['repeat', 'Repeating', (t) => !!t.repeat],
    ...lists.map(([id, n]) => [id, n, (t) => t.list === id]),
    ['done', 'Done', (t) => t.done]
  ];
  const prefs = useItems('prefs').find((p) => p.id === 'prefs-' + me) || {};
  const [editing, setEditing] = useState(false);
  const [listDrag, setListDrag] = useState(null);
  const dropList = () => {
    if (listDrag && listDrag.over !== listDrag.id) {
      const ids = ordered.map((f) => f[0]).filter((x) => x !== listDrag.id);
      const from = ordered.findIndex((f) => f[0] === listDrag.id), to = ordered.findIndex((f) => f[0] === listDrag.over);
      ids.splice(ids.indexOf(listDrag.over) + (to > from ? 1 : 0), 0, listDrag.id);
      save('prefs', { ...prefs, listOrder: ids }, 'prefs-' + me);
    }
    setListDrag(null);
  };
  const [newList, setNewList] = useState('');
  const addList = (e) => {
    e.preventDefault();
    const name = newList.trim();
    if (!name) return;
    saveLists([...lists, [newListId(name, lists), name]]);
    setNewList('');
  };
  // Removing a list never loses tasks: anything in it (done or not) moves to the Inbox.
  const removeList = async (id, name) => {
    const inIt = tasks.filter((t) => t.list === id);
    if (!confirm('Remove the "' + name + '" list?' + (inIt.length ? ' Its ' + inIt.length + ' task(s) will move to the Inbox.' : ''))) return;
    for (const t of inIt) await patch(t.id, { list: 'inbox' });
    await saveLists(lists.filter((l) => l[0] !== id));
    if (filter === id) setFilter('all');
  };
  const order = prefs.listOrder || [];
  // A list added after you arranged yours slots in right after the list it follows by default.
  const pos = (id) => {
    const i = order.indexOf(id);
    if (i >= 0) return i;
    const k = filters.findIndex((f) => f[0] === id);
    return order.length && k > 0 ? pos(filters[k - 1][0]) + 0.5 : 999 + k;
  };
  const ordered = [...filters].sort((a, b) => pos(a[0]) - pos(b[0]));
  const moveList = (id, dir) => {
    const ids = ordered.map((f) => f[0]);
    const i = ids.indexOf(id), j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    save('prefs', { ...prefs, listOrder: ids }, 'prefs-' + me);
  };
  const [, , test] = filters.find((f) => f[0] === filter) || filters[0];
  // Each list remembers how you sort it. "My order" is drag and drop; the order is saved on the tasks, so it syncs.
  const sortBy = filter === 'done' ? 'recent' : (prefs.sortBy || {})[filter] || 'priority';
  const setSort = (v) => save('prefs', { ...prefs, sortBy: { ...(prefs.sortBy || {}), [filter]: v } }, 'prefs-' + me);
  const key = (t) => t.sortKey ?? t.created ?? 0;
  const byDue = (a, b) => (a.due || '9').localeCompare(b.due || '9');
  const sorters = {
    priority: (a, b) => priorityRank(a.priority) - priorityRank(b.priority) || byDue(a, b),
    due: (a, b) => byDue(a, b) || priorityRank(a.priority) - priorityRank(b.priority),
    alpha: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true }),
    mine: (a, b) => key(a) - key(b),
    recent: (a, b) => (b.doneAt || 0) - (a.doneAt || 0)
  };
  const shown = tasks.filter((t) => test(t) && inProjectFilter(t) && (filter === 'done' || !t.done) && (filter === 'repeat' || !isWaiting(t))).sort(sorters[sortBy]);
  const [drag, setDrag] = useState(null);
  const dropDrag = () => {
    if (drag && drag.over !== drag.id) {
      const rest = shown.filter((t) => t.id !== drag.id);
      const at = rest.findIndex((t) => t.id === drag.over) + (shown.findIndex((t) => t.id === drag.over) > shown.findIndex((t) => t.id === drag.id) ? 1 : 0);
      const before = rest[at - 1], after = rest[at];
      const k = before && after ? (key(before) + key(after)) / 2 : before ? key(before) + 1000 : key(after) - 1000;
      patch(drag.id, { sortKey: k });
    }
    setDrag(null);
  };
  const handle = (t) => sortBy === 'mine' && (
    <span className="draghandle" aria-hidden="true" title="Drag to reorder"
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setDrag({ id: t.id, over: t.id }); }}
      onPointerMove={(e) => { if (!drag) return; const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-task-id]'); if (el && el.dataset.taskId !== drag.over) setDrag({ ...drag, over: el.dataset.taskId }); }}
      onPointerUp={dropDrag} onPointerCancel={() => setDrag(null)}>⋮⋮</span>
  );
  // Finished tasks stay in their list for a week, under a collapsible "Completed" heading.
  const weekAgo = Date.now() - 7 * 864e5;
  const recent = filter === 'done' ? [] : tasks.filter((t) => t.done && (t.doneAt || 0) > weekAgo && test(t) && inProjectFilter(t)).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const showDone = prefs.showCompleted !== false;
  const listExtra = lists.some((l) => l[0] === filter) ? { list: filter } : filter === 'week' ? { thisWeek: weekEnd() } : filter === 'myday' ? { myDay: true } : {};

  return (
    <>
      <header>
        <div className="sub">{tasks.filter((t) => !t.done && !isWaiting(t)).length} open</div>
        <h1>Tasks</h1>
      </header>
      <div className="row">
        <div className="seg" role="group" aria-label="Show">
          {ordered.map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
        </div>
        <button type="button" className="btn ghost small" aria-expanded={editing} onClick={() => setEditing(!editing)}>{editing ? 'Done editing' : 'Edit lists'}</button>
      </div>
      {editing && (
        <section className="card" aria-labelledby="lists-h">
          <h2 id="lists-h">Your lists</h2>
          <div className="sub" style={{ fontSize: 13 }}>Drag the ⋮⋮ handle to change the order of the tabs. Built-in views can be moved but not renamed or removed.</div>
          {ordered.map(([id, label], i) => {
            const own = lists.some((l) => l[0] === id);
            return (
              <div key={id + label} data-list-id={id} className={'row listrow' + (listDrag ? (listDrag.id === id ? ' dragging' : listDrag.over === id ? (i > ordered.findIndex((f) => f[0] === listDrag.id) ? ' dropbelow' : ' dropabove') : '') : '')} style={{ flexWrap: 'nowrap' }}>
                <span className="draghandle" aria-hidden="true" title="Drag to reorder"
                  onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setListDrag({ id, over: id }); }}
                  onPointerMove={(e) => { if (!listDrag) return; const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-list-id]'); if (el && el.dataset.listId !== listDrag.over) setListDrag({ ...listDrag, over: el.dataset.listId }); }}
                  onPointerUp={dropList} onPointerCancel={() => setListDrag(null)}>⋮⋮</span>
                <span className="sr-only">
                  <button type="button" disabled={i === 0} aria-label={'Move ' + label + ' up'} onClick={() => moveList(id, -1)}>↑</button>
                  <button type="button" disabled={i === ordered.length - 1} aria-label={'Move ' + label + ' down'} onClick={() => moveList(id, 1)}>↓</button>
                </span>
                {own
                  ? <input className="field" style={{ flex: 1 }} defaultValue={label} aria-label={'Rename ' + label}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== label) saveLists(lists.map((l) => (l[0] === id ? [id, v] : l))); else e.target.value = label; }} />
                  : <span style={{ flex: 1, padding: '0 12px' }}>{label}</span>}
                {own && <span className="sub" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{tasks.filter((t) => t.list === id && !t.done).length} open</span>}
                {!own ? <span className="sub" style={{ fontSize: 13, width: 84, textAlign: 'center' }}>Built-in</span>
                  : id === 'inbox' ? <span className="sub" style={{ fontSize: 13, width: 84, textAlign: 'center' }}>Always kept</span>
                  : <button type="button" className="btn ghost small" style={{ width: 84 }} onClick={() => removeList(id, label)}>Remove</button>}
              </div>
            );
          })}
          <form className="row" onSubmit={addList}>
            <input className="field" style={{ flex: 1 }} value={newList} onChange={(e) => setNewList(e.target.value)} placeholder="New list name" aria-label="New list name" />
            <button className="btn small" type="submit">Add list</button>
          </form>
        </section>
      )}
      <QuickAdd me={me} extra={listExtra} />
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: -6 }}>
        <label className="row sub" style={{ gap: 8, fontSize: 14 }}>Project
          <select className="field" style={{ width: 'auto', minHeight: 36, maxWidth: 240 }} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">All projects</option>
            <option value="none">No project</option>
            {['Game Dev', 'Video Projects', 'Client Work'].map((g) => openProjects.some((p) => p.group === g) && (
              <optgroup key={g} label={g}>{openProjects.filter((p) => p.group === g).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
            ))}
            {projectFilter && projectFilter !== 'none' && !openProjects.some((p) => p.id === projectFilter) && projectById[projectFilter] && <option value={projectFilter}>{projectById[projectFilter].name}</option>}
          </select>
        </label>
        {filter !== 'done' && (
          <label className="row sub" style={{ gap: 8, fontSize: 14 }}>Sort by
            <select className="field" style={{ width: 'auto', minHeight: 36 }} value={sortBy} onChange={(e) => setSort(e.target.value)}>
              <option value="priority">Priority</option>
              <option value="due">Due date</option>
              <option value="alpha">A to Z</option>
              <option value="mine">My order (drag)</option>
            </select>
          </label>
        )}
      </div>
      <section className="card" aria-label="Task list">
        {shown.length ? shown.map((t) => <TaskRow key={t.id} t={t} me={me} all={tasks} onCheck={onCheck} onOpen={onOpen} handle={handle(t)} className={drag ? (drag.id === t.id ? ' dragging' : drag.over === t.id ? (shown.findIndex((x) => x.id === t.id) > shown.findIndex((x) => x.id === drag.id) ? ' dropbelow' : ' dropabove') : '') : ''} />) : <div className="empty">{recent.length ? 'All done here.' : 'Nothing here yet.'}</div>}
        {recent.length > 0 && (
          <>
            <button type="button" className="donehead" aria-expanded={showDone} onClick={() => save('prefs', { ...prefs, showCompleted: !showDone }, 'prefs-' + me)}>
              <span aria-hidden="true">{showDone ? '▾' : '▸'}</span> Completed <span className="sub">{recent.length}</span>
            </button>
            {showDone && recent.map((t) => <TaskRow key={t.id} t={t} me={me} all={tasks} onCheck={onCheck} onOpen={onOpen} />)}
          </>
        )}
      </section>
      {overlays}
    </>
  );
}
