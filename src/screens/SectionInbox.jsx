import { useState } from 'react';
import { save } from '../db.js';
import useDragSort, { sortKeyOf } from './useDragSort.jsx';
import { useItems } from '../store.js';
import { isWaiting, priorityRank } from '../tasks.js';
import TaskRow from './TaskRow.jsx';
import QuickAdd from './QuickAdd.jsx';
import useTaskActions from './useTaskActions.jsx';

// The loose to-dos for a section (Video Projects, Client Work): the open tasks in that task list,
// shown under the section's own pages. Same tasks as on the Tasks page, so ticking one here ticks it there.
// `match` narrows it further (Game Dev shows one project's tasks) and `extra` is stamped on new ones.
export default function SectionInbox({ me, listId, title = 'To-dos', match = () => true, extra = {}, hideProject = false, empty = 'Nothing here. Loose to-dos for this section land here, and they also show in this list on the Tasks page.' }) {
  const tasks = useItems('task');
  const prefs = useItems('prefs').find((p) => p.id === 'prefs-' + me) || {};
  const { onCheck, onOpen, overlays } = useTaskActions(me);
  const prefKey = 'section-' + listId + (extra.project ? '-p' : '');
  const sortBy = (prefs.sortBy || {})[prefKey] || 'mine';
  const setSort = (v) => save('prefs', { ...prefs, sortBy: { ...(prefs.sortBy || {}), [prefKey]: v } }, 'prefs-' + me);
  const key = sortKeyOf;
  const byDue = (a, b) => (a.due || '9').localeCompare(b.due || '9');
  const sorters = {
    mine: (a, b) => key(a) - key(b),
    priority: (a, b) => priorityRank(a.priority) - priorityRank(b.priority) || byDue(a, b),
    due: (a, b) => byDue(a, b) || priorityRank(a.priority) - priorityRank(b.priority),
    alpha: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true })
  };
  const shown = tasks.filter((t) => t.list === listId && match(t) && !t.done && !isWaiting(t)).sort(sorters[sortBy]);
  const weekAgo = Date.now() - 7 * 864e5;
  const recent = tasks.filter((t) => t.list === listId && match(t) && t.done && (t.doneAt || 0) > weekAgo).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const [showDone, setShowDone] = useState(false);

  const { handle: dragHandle, dragClass } = useDragSort(shown, sortBy === 'mine');
  const handle = dragHandle;

  return (
    <section className="card" aria-labelledby={'inbox-' + listId}>
      <div className="row between">
        <h2 id={'inbox-' + listId}>{title} <span className="sub" style={{ fontSize: 14, fontWeight: 400 }}>{shown.length} open</span></h2>
        <label className="row sub" style={{ gap: 8, fontSize: 14 }}>Sort by
          <select className="field" style={{ width: 'auto', minHeight: 36 }} value={sortBy} onChange={(e) => setSort(e.target.value)}>
            <option value="mine">My order (drag)</option>
            <option value="priority">Priority</option>
            <option value="due">Due date</option>
            <option value="alpha">A to Z</option>
          </select>
        </label>
      </div>
      <QuickAdd me={me} extra={{ list: listId, ...extra }} placeholder="Add a to-do…" />
      {shown.length ? shown.map((t) => <TaskRow key={t.id} t={t} me={me} all={tasks} onCheck={onCheck} onOpen={onOpen} handle={handle(t)} className={dragClass(t)} hideProject={hideProject} />)
        : <div className="empty">{empty}</div>}
      {recent.length > 0 && (
        <>
          <button type="button" className="donehead" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>
            <span aria-hidden="true">{showDone ? '▾' : '▸'}</span> Completed <span className="sub">{recent.length}</span>
          </button>
          {showDone && recent.map((t) => <TaskRow key={t.id} t={t} me={me} all={tasks} onCheck={onCheck} onOpen={onOpen} hideProject={hideProject} />)}
        </>
      )}
      {overlays}
    </section>
  );
}
