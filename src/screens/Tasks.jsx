import { useState } from 'react';
import { save } from '../db.js';
import { useItems, other } from '../store.js';
import { LISTS, isToday } from '../tasks.js';
import { PEOPLE } from '../config.js';
import TaskRow from './TaskRow.jsx';
import QuickAdd from './QuickAdd.jsx';
import useTaskActions from './useTaskActions.jsx';

export default function Tasks({ me }) {
  const tasks = useItems('task');
  const [filter, setFilter] = useState('all');
  const { onCheck, onOpen, overlays } = useTaskActions(me);
  const filters = [
    ['all', 'All', (t) => !t.done],
    ['myday', 'My Day', (t) => isToday(t, tasks)],
    ['mine', 'Mine', (t) => !t.done && t.owner === me],
    ['theirs', PEOPLE[other(me)].name, (t) => !t.done && t.owner === other(me)],
    ['both', 'Together', (t) => !t.done && t.owner === 'both'],
    ['repeat', 'Repeating', (t) => !t.done && !!t.repeat],
    ...LISTS.map(([id, n]) => [id, n, (t) => !t.done && t.list === id]),
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
  const shown = tasks.filter(test).sort((a, b) =>
    filter === 'done' ? (b.doneAt || 0) - (a.doneAt || 0) : (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3) || (a.due || '9').localeCompare(b.due || '9'));
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
        {shown.length ? shown.map((t) => <TaskRow key={t.id} t={t} me={me} all={tasks} onCheck={onCheck} onOpen={onOpen} />) : <div className="empty">Nothing here yet.</div>}
      </section>
      {overlays}
    </>
  );
}
