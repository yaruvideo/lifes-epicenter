import { useState } from 'react';
import { useItems, other } from '../store.js';
import { isToday } from '../tasks.js';
import { PEOPLE } from '../config.js';
import TaskRow from './TaskRow.jsx';
import QuickAdd from './QuickAdd.jsx';
import useTaskActions from './useTaskActions.jsx';

export default function Today({ me }) {
  const tasks = useItems('task');
  const [who, setWho] = useState('both');
  const { onCheck, onOpen, overlays } = useTaskActions(me);
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const start = new Date().setHours(0, 0, 0, 0);
  const show = tasks
    .filter((t) => isToday(t) || (t.done && t.myDay && t.doneAt > start))
    .filter((t) => who === 'both' || t.owner === who || t.owner === 'both')
    .sort((a, b) => a.done - b.done || (a.due || '9').localeCompare(b.due || '9'));
  const doneToday = tasks.filter((t) => t.done && t.doneAt > start).length;

  return (
    <>
      <header className="row between" style={{ alignItems: 'flex-end' }}>
        <div>
          <div className="sub">{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h1>{hello}, {PEOPLE[me].name}</h1>
        </div>
        <div className="seg" role="group" aria-label="Whose day">
          {[['both', 'Both of us'], [me, 'Me'], [other(me), PEOPLE[other(me)].name]].map(([id, label]) => (
            <button key={id} type="button" aria-pressed={who === id} onClick={() => setWho(id)}>{label}</button>
          ))}
        </div>
      </header>
      <QuickAdd me={me} extra={{ myDay: true }} placeholder="What needs doing today?" />
      <div className="grid">
        <section className="card" aria-labelledby="today-h">
          <div className="row between"><h2 id="today-h">Today's tasks</h2><a href="#/tasks" className="sub">All tasks →</a></div>
          {show.length ? show.map((t) => <TaskRow key={t.id} t={t} me={me} onCheck={onCheck} onOpen={onOpen} />) : <div className="empty">Nothing due today. Add something above, or tick "Show on Today" on any task.</div>}
          <div className="sub">{doneToday} done today</div>
        </section>
        <section className="card" aria-labelledby="next-h">
          <h2 id="next-h">Coming next</h2>
          <div className="note">Habits, meds with "Skip today", macros and Claude's morning note arrive in the next build steps. This screen is the real app: anything you add here is saved and will sync.</div>
        </section>
      </div>
      {overlays}
    </>
  );
}
