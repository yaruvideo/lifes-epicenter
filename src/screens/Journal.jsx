import { useState } from 'react';
import { save, remove } from '../db.js';
import { useItems, ownerLabel } from '../store.js';
import { listName } from '../tasks.js';

// The day as a timeline: finished tasks (with their outcome notes) and quick thoughts.
export default function Journal({ me }) {
  const entries = useItems('journal');
  const [text, setText] = useState('');
  const [kind, setKind] = useState('all');
  const add = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    save('journal', { type: 'thought', text: text.trim(), by: me, at: Date.now() });
    setText('');
  };
  const shown = entries.filter((x) => kind === 'all' || x.type === kind).sort((a, b) => b.at - a.at);
  const days = [];
  for (const x of shown) {
    const label = new Date(x.at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    if (!days.length || days[days.length - 1].label !== label) days.push({ label, items: [] });
    days[days.length - 1].items.push(x);
  }
  return (
    <>
      <header><div className="sub">Your thoughts through the day</div><h1>Journal</h1></header>
      <form className="card" onSubmit={add}>
        <textarea className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="What's on your mind?" aria-label="New journal entry" />
        <div className="row between">
          <div className="seg" role="group" aria-label="Show">
            {[['all', 'Everything'], ['thought', 'Thoughts'], ['task', 'Tasks done'], ['media', 'Media notes'], ['health', 'Health']].map(([id, l]) => <button key={id} type="button" aria-pressed={kind === id} onClick={() => setKind(id)}>{l}</button>)}
          </div>
          <button className="btn" type="submit">Save</button>
        </div>
      </form>
      {days.length === 0 && <div className="empty">No entries yet. Thoughts you write here and tasks you finish will show up as a timeline.</div>}
      {days.map((d) => (
        <section key={d.label} className="card" aria-label={d.label}>
          <h2>{d.label}</h2>
          {d.items.map((x) => (
            <div key={x.id} className="note" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span className="sub" style={{ flex: '0 0 64px' }}>{new Date(x.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {x.type === 'media'
                  ? <><span className="chip" style={{ background: 'var(--warm)', color: 'var(--on-accent)' }}>{x.label || 'Note'}</span> <b>{x.title}</b>{x.text && <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{x.text}</div>}</>
                  : x.type === 'health'
                  ? <><span className="chip" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>Exercise</span> {x.text}</>
                  : x.type === 'task'
                  ? <><span className="chip" style={{ background: 'var(--hi)', color: 'var(--on-accent)' }}>Task done</span> <b>{x.title}</b> <span className="sub">· {listName(x.list)}</span>{x.text && <div style={{ marginTop: 6 }}>{x.text}</div>}</>
                  : <div style={{ whiteSpace: 'pre-wrap' }}>{x.text}</div>}
                <div className="sub" style={{ fontSize: 12, marginTop: 4 }}>{ownerLabel(x.by, me)}</div>
              </div>
              {x.by === me && <button type="button" className="btn ghost small" aria-label="Delete entry" onClick={() => confirm('Delete this entry?') && remove(x.id)}>✕</button>}
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
