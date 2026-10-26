import { useState } from 'react';
import { save } from '../db.js';
import { useItems, other, todayStr } from '../store.js';
import { LISTS, isToday } from '../tasks.js';
import { PEOPLE } from '../config.js';
import TaskRow from './TaskRow.jsx';
import QuickAdd from './QuickAdd.jsx';
import useTaskActions from './useTaskActions.jsx';

export default function Tasks({ me }) {
  const tasks = useItems('task');
  const [filter, setFilter] = useState('all');
  const { onCheck, onOpen, overlays } = useTaskActions(me);
  // Each list's test ignores done/not-done; open tasks and the "Completed" section both use it.
  const filters = [
    ['all', 'All', () => true],
    ['myday', 'My Day', (t) => (t.done ? t.myDay || (t.due && t.due <= todayStr()) : isToday(t, tasks))],
    ['mine', 'Mine', (t) => t.owner === me],
    ['theirs', PEOPLE[other(me)].name, (t) => t.owner === other(me)],
    ['both', 'Together', (t) => t.owner === 'both'],
    ['repeat', 'Repeating', (t) => !!t.repeat],
    ...LISTS.map(([id, n]) => [id, n, (t) => t.list === id]),
    ['done', 'Done', (t) => t.done]
  ];
  const prefs = useItems('prefs').find((p) => p.id === 'prefs-' + me) || {};
  const [arranging, setArranging] = useState(false);
  const order = prefs.listOrder || [];
  const pos = (id) => { const i = order.indexOf(id); return i < 0 ? 999 + filters.findIndex((f) => f[0] === id) : i; };
  const ordered = [...filters].sort((a, b) => pos(a[0]) - pos(b[0]));
  const moveList = (id, dir) => {
    const ids = ordered.map((f) => f[0]);
    const i = ids.indexOf(id), j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    save('prefs', { ...prefs, listOrder: ids }, 'prefs-' + me);
  };
  const [, , test] = filters.find((f) => f[0] === filter) || filters[0];
  const rank = { High: 0, Medium: 1, Low: 2 };
  const shown = tasks.filter((t) => test(t) && (filter === 'done' || !t.done)).sort((a, b) =>
    filter === 'done' ? (b.doneAt || 0) - (a.doneAt || 0) : (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3) || (a.due || '9').localeCompare(b.due || '9'));
  // Finished tasks stay in their list for a week, under a collapsible "Completed" heading.
  const weekAgo = Date.now() - 7 * 864e5;
  const recent = filter === 'done' ? [] : tasks.filter((t) => t.done && (t.doneAt || 0) > weekAgo && test(t)).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const showDone = prefs.showCompleted !== false;
  const listExtra = LISTS.some((l) => l[0] === filter) ? { list: filter } : {};

  return (
    <>
      <header>
        <div className="sub">{tasks.filter((t) => !t.done).length} open</div>
        <h1>Tasks</h1>
      </header>
      <div className="row">
        <div className="seg" role="group" aria-label="Show">
          {ordered.map(([id, label]) => arranging
            ? <span key={id} className="row" style={{ gap: 2, padding: '0 4px' }}><button type="button" aria-label={'Move ' + label + ' left'} onClick={() => moveList(id, -1)}>‹</button><span style={{ fontSize: 14 }}>{label}</span><button type="button" aria-label={'Move ' + label + ' right'} onClick={() => moveList(id, 1)}>›</button></span>
            : <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
        </div>
        <button type="button" className="btn ghost small" onClick={() => setArranging(!arranging)}>{arranging ? 'Done arranging' : 'Rearrange lists'}</button>
      </div>
      <QuickAdd me={me} extra={listExtra} />
      <section className="card" aria-label="Task list">
        {shown.length ? shown.map((t) => <TaskRow key={t.id} t={t} me={me} all={tasks} onCheck={onCheck} onOpen={onOpen} />) : <div className="empty">{recent.length ? 'All done here.' : 'Nothing here yet.'}</div>}
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
