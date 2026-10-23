import { useState } from 'react';
import { remove, save, patch } from '../db.js';
import { useItems, other, todayStr } from '../store.js';
import { PEOPLE } from '../config.js';
import TaskRow from './TaskRow.jsx';
import QuickAdd from './QuickAdd.jsx';
import useTaskActions from './useTaskActions.jsx';

export default function Shared({ me }) {
  const notes = useItems('sharednote');
  const groceries = useItems('grocery');
  const tasks = useItems('task');
  const events = useItems('event');
  const [note, setNote] = useState('');
  const [item, setItem] = useState('');
  const { onCheck, onOpen, overlays } = useTaskActions(me);
  const them = other(me);

  const sendNote = (e) => { e.preventDefault(); if (note.trim()) { save('sharednote', { text: note.trim(), by: me, at: Date.now() }); setNote(''); } };
  const addItem = (e) => { e.preventDefault(); if (item.trim()) { save('grocery', { name: item.trim(), done: false, by: me, at: Date.now() }); setItem(''); } };
  const today = todayStr();
  const weekEnd = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();
  const together = events.filter((e) => e.who === 'both' && e.date >= today && e.date <= weekEnd).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const sharedTasks = tasks.filter((t) => t.owner === 'both' && !t.done);
  const avatar = (p) => <span aria-hidden="true" style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 700, background: PEOPLE[p].color, color: 'var(--on-accent)' }}>{PEOPLE[p].name[0]}</span>;

  return (
    <>
      <header><div className="sub">Things for both of you</div><h1>Shared with {PEOPLE[them].name}</h1></header>
      <div className="grid">
        <section className="card" aria-labelledby="notes-h">
          <h2 id="notes-h">Notes to each other</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
            {notes.sort((a, b) => a.at - b.at).slice(-30).map((n) => {
              const mine = n.by === me;
              return (
                <div key={n.id} className="row" style={{ alignItems: 'flex-end', flexDirection: mine ? 'row-reverse' : 'row', flexWrap: 'nowrap' }}>
                  {avatar(n.by)}
                  <div style={{ maxWidth: '78%', padding: '10px 12px', borderRadius: 14, background: mine ? 'var(--accent)' : PEOPLE[n.by]?.color, color: 'var(--on-accent)' }}>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{n.text}</div>
                    <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>{new Date(n.at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}{mine && <button type="button" onClick={() => remove(n.id)} style={{ marginLeft: 8, background: 'none', border: 0, color: 'inherit', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }}>delete</button>}</div>
                  </div>
                </div>
              );
            })}
            {!notes.length && <div className="empty">No notes yet. Leave one below and it shows up on {PEOPLE[them].name}'s side.</div>}
          </div>
          <form className="row" onSubmit={sendNote}>
            <input className="field" style={{ flex: 1 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder={'Leave a note for ' + PEOPLE[them].name + '…'} aria-label="Note" />
            <button className="btn" type="submit">Send</button>
          </form>
        </section>
        <section className="card" aria-labelledby="groc-h">
          <div className="row between"><h2 id="groc-h">Grocery list</h2>{groceries.some((g) => g.done) && <button type="button" className="btn ghost small" onClick={() => groceries.filter((g) => g.done).forEach((g) => remove(g.id))}>Clear checked</button>}</div>
          {groceries.sort((a, b) => a.done - b.done || a.at - b.at).map((g) => (
            <div key={g.id} className={'task' + (g.done ? ' isdone' : '')}>
              <button type="button" className={'check' + (g.done ? ' done' : '')} aria-label={(g.done ? 'Uncheck ' : 'Check ') + g.name} onClick={() => patch(g.id, { done: !g.done })}>{g.done ? '✓' : ''}</button>
              <span className="title" style={{ cursor: 'default' }}>{g.name}</span>
              <span className="sub" style={{ fontSize: 12 }}>{g.by === me ? 'Me' : PEOPLE[g.by]?.name}</span>
            </div>
          ))}
          <form className="row" onSubmit={addItem}>
            <input className="field" style={{ flex: 1 }} value={item} onChange={(e) => setItem(e.target.value)} placeholder="Add an item" aria-label="Grocery item" />
            <button className="btn" type="submit">Add</button>
          </form>
        </section>
        <section className="card" aria-labelledby="week-h">
          <div className="row between"><h2 id="week-h">This week together</h2><a href="#/calendar" className="sub">Calendar →</a></div>
          {together.length ? together.map((e) => (
            <div key={e.id} className="task"><span className="sub" style={{ flex: '0 0 92px', fontSize: 13 }}>{new Date(e.date + 'T12:00').toLocaleDateString([], { weekday: 'short', day: 'numeric' })}{e.time ? ' · ' + e.time : ''}</span><b style={{ flex: 1 }}>{e.title}</b></div>
          )) : <div className="empty">Nothing planned together this week.</div>}
        </section>
        <section className="card" aria-labelledby="st-h">
          <h2 id="st-h">Shared tasks</h2>
          <QuickAdd me={me} defaultOwner="both" placeholder="A task for both of you" />
          {sharedTasks.length ? sharedTasks.map((t) => <TaskRow key={t.id} t={t} me={me} onCheck={onCheck} onOpen={onOpen} />) : <div className="empty">No shared tasks. Pick "Together" when adding one.</div>}
        </section>
      </div>
      {overlays}
    </>
  );
}
