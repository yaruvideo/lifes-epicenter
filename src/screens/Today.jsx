import { useState } from 'react';
import { useItems, other } from '../store.js';
import { isToday } from '../tasks.js';
import { PEOPLE } from '../config.js';
import TaskRow from './TaskRow.jsx';
import QuickAdd from './QuickAdd.jsx';
import useTaskActions from './useTaskActions.jsx';
import { todayStr } from '../store.js';
import { goalsFor, logMed, medLogId, totals } from '../health.js';
import { save } from '../db.js';
import { promptFor } from '../prompts.js';

export default function Today({ me }) {
  const tasks = useItems('task');
  const meds = useItems('med');
  const logs = useItems('medlog');
  const meals = useItems('meal');
  const goalsAll = useItems('goals');
  const weights = useItems('weight');
  const claudeNotes = useItems('claudenote');
  const events = useItems('event');
  const [who, setWho] = useState('both');
  const journal = useItems('journal');
  const [skip, setSkip] = useState(0);
  const [answer, setAnswer] = useState('');
  const { onCheck, onOpen, overlays } = useTaskActions(me);
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const start = new Date().setHours(0, 0, 0, 0);
  const show = tasks
    .filter((t) => isToday(t, tasks) || (t.done && t.myDay && t.doneAt > start))
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
      {(() => {
        // Morning journal prompt: Claude's morning note can set the question (field "prompt"); otherwise one from the list.
        const day = todayStr();
        const done = journal.find((x) => x.type === 'prompt' && x.by === me && x.day === day);
        const fromClaude = claudeNotes.find((n) => n.prompt && (!n.for || n.for === me) && n.at >= start);
        const q = done ? done.prompt : skip === 0 && fromClaude ? fromClaude.prompt : promptFor(day, skip);
        const submit = (e) => {
          e.preventDefault();
          if (!answer.trim()) return;
          save('journal', { type: 'prompt', prompt: q, text: answer.trim(), day, by: me, at: Date.now() });
          setAnswer('');
        };
        return done ? (
          <section className="card row" aria-label="Morning journal" style={{ gap: 10 }}>
            <span className="chip" style={{ background: 'var(--hi)', color: 'var(--on-accent)' }}>✓ Journaled</span>
            <span className="sub" style={{ flex: 1, minWidth: 0 }}>{q}</span>
            <a href="#/journal" className="sub">Journal →</a>
          </section>
        ) : (
          <form className="card" aria-labelledby="prompt-h" onSubmit={submit} style={{ borderColor: 'var(--accent)' }}>
            <div className="row between"><h2 id="prompt-h">Morning journal</h2><button type="button" className="btn ghost small" onClick={() => setSkip(skip + 1)}>Another question</button></div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{q}</div>
            <textarea className="field" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write as much or as little as you like" aria-label={q} />
            <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" type="submit">Save to Journal</button></div>
          </form>
        );
      })()}
      <div className="grid">
        <section className="card" aria-labelledby="today-h">
          <div className="row between"><h2 id="today-h">Today's tasks</h2><a href="#/tasks" className="sub">All tasks →</a></div>
          {show.length ? show.map((t) => <TaskRow key={t.id} t={t} me={me} all={tasks} onCheck={onCheck} onOpen={onOpen} />) : <div className="empty">Nothing due today. Add something above, or tick "Show on Today" on any task.</div>}
          <div className="sub">{doneToday} done today</div>
        </section>
        {(() => {
          const n = claudeNotes.filter((x) => !x.for || x.for === me).sort((a, b) => b.at - a.at)[0];
          if (!n) return null;
          return (
            <section className="card" aria-labelledby="claude-h" style={{ borderColor: 'var(--accent)' }}>
              <div className="row between"><h2 id="claude-h">Morning note from Claude</h2><span className="sub" style={{ fontSize: 12 }}>{new Date(n.at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span></div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{n.text}</div>
            </section>
          );
        })()}
        <section className="card" aria-labelledby="up-h">
          <div className="row between"><h2 id="up-h">Up next</h2><a href="#/calendar" className="sub">Calendar →</a></div>
          {(() => {
            const day = todayStr();
            const list = events.filter((e) => e.date === day && (who === 'both' || e.who === who || e.who === 'both')).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
            return list.length ? list.map((e) => (
              <div key={e.id} className="task"><span className="sub" style={{ flex: '0 0 64px', fontSize: 13 }}>{e.time || 'All day'}</span><b style={{ flex: 1 }}>{e.title}</b>{e.source === 'google' && <span className="chip" style={{ background: 'var(--inner)', color: 'var(--muted)', border: '1px solid var(--border)' }}>{e.calendar || 'Google'}</span>}</div>
            )) : <div className="empty">Nothing on the calendar today.</div>;
          })()}
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
                {m.canSkip && <button type="button" className="btn ghost small" onClick={() => logMed(m, 'skipped', me)}>Skip</button>}
                <button type="button" className="btn small" onClick={() => logMed(m, 'taken', me)}>Taken</button>
              </div>
            ));
          })()}
        </section>
        <section className="card" aria-labelledby="mac-h">
          <div className="row between"><h2 id="mac-h">Macros</h2><a href="#/health" className="sub">Log a meal →</a></div>
          {[me, other(me)].filter((p) => who === 'both' || p === who).map((p) => {
            const g = goalsFor(p, goalsAll, weights);
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
