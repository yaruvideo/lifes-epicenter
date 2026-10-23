import { useState } from 'react';
import { useItems, other } from '../store.js';
import { isToday } from '../tasks.js';
import { PEOPLE } from '../config.js';
import TaskRow from './TaskRow.jsx';
import QuickAdd from './QuickAdd.jsx';
import useTaskActions from './useTaskActions.jsx';
import { todayStr } from '../store.js';
import { DEFAULT_GOALS, logMed, medLogId, totals } from '../health.js';

export default function Today({ me }) {
  const tasks = useItems('task');
  const meds = useItems('med');
  const logs = useItems('medlog');
  const meals = useItems('meal');
  const goalsAll = useItems('goals');
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
        <section className="card" aria-labelledby="meds-h">
          <div className="row between"><h2 id="meds-h">Meds due</h2><a href="#/health" className="sub">Health →</a></div>
          {(() => {
            const day = todayStr();
            const logged = new Set(logs.map((l) => l.id));
            const due = meds.filter((m) => m.active !== false && (who === 'both' || m.person === who) && !logged.has(medLogId(m.id, day)))
              .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
            if (!due.length) return <div className="note" style={{ borderLeft: '4px solid var(--hi)' }}>All meds handled for today.</div>;
            return due.map((m) => (
              <div key={m.id} className="task">
                <span className="dot" style={{ background: PEOPLE[m.person]?.color, borderRadius: '50%' }} />
                <div style={{ flex: 1 }}><b>{m.name}</b><div className="sub" style={{ fontSize: 13 }}>{(m.person === me ? 'Me' : PEOPLE[m.person]?.name) + (m.time ? ' · ' + m.time : '')}</div></div>
                <button type="button" className="btn small" onClick={() => logMed(m, 'taken', me)}>Taken</button>
                {m.canSkip && <button type="button" className="btn ghost small" onClick={() => logMed(m, 'skipped', me)}>Skip</button>}
              </div>
            ));
          })()}
        </section>
        <section className="card" aria-labelledby="mac-h">
          <div className="row between"><h2 id="mac-h">Macros</h2><a href="#/health" className="sub">Log a meal →</a></div>
          {[me, other(me)].filter((p) => who === 'both' || p === who).map((p) => {
            const g = { ...DEFAULT_GOALS, ...(goalsAll.find((x) => x.id === 'goals-' + p) || {}) };
            const t = totals(meals.filter((m) => m.person === p && m.date === todayStr()));
            return (
              <div key={p} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="row between" style={{ fontSize: 14 }}><b>{p === me ? 'Me' : PEOPLE[p].name}</b><span className="sub">{Math.round(t.calories)} / {g.calories} cal · P {Math.round(t.protein)}/{g.protein}g</span></div>
                <div style={{ height: 10, borderRadius: 99, background: 'var(--inner)' }}><div style={{ width: Math.min(100, Math.round((t.protein / g.protein) * 100)) + '%', height: '100%', borderRadius: 99, background: PEOPLE[p].color }} /></div>
              </div>
            );
          })}
        </section>
      </div>
      {overlays}
    </>
  );
}
