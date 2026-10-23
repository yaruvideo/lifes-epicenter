import { useState } from 'react';
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
    ['myday', 'My Day', isToday],
    ['mine', 'Mine', (t) => !t.done && t.owner === me],
    ['theirs', PEOPLE[other(me)].name, (t) => !t.done && t.owner === other(me)],
    ['both', 'Together', (t) => !t.done && t.owner === 'both'],
    ['repeat', 'Repeating', (t) => !t.done && !!t.repeat],
    ...LISTS.map(([id, n]) => [id, n, (t) => !t.done && t.list === id]),
    ['done', 'Done', (t) => t.done]
  ];
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
      <div className="seg" role="group" aria-label="Show">
        {filters.map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
      </div>
      <QuickAdd me={me} extra={listExtra} />
      <section className="card" aria-label="Task list">
        {shown.length ? shown.map((t) => <TaskRow key={t.id} t={t} me={me} onCheck={onCheck} onOpen={onOpen} />) : <div className="empty">Nothing here yet.</div>}
      </section>
      {overlays}
    </>
  );
}
