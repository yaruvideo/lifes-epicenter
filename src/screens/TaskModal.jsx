import { useEffect, useRef, useState } from 'react';
import { newId, patch, remove, save } from '../db.js';
import { useItems } from '../store.js';
import { LISTS } from '../tasks.js';
import { PEOPLE } from '../config.js';
import { other } from '../store.js';

export default function TaskModal({ task, me, onClose }) {
  const [t, setT] = useState(task);
  const [newSub, setNewSub] = useState('');
  const others = useItems('task').filter((x) => x.id !== task.id && !x.done);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const set = (changes) => { const next = { ...t, ...changes }; setT(next); patch(t.id, changes); };
  const setSub = (id, changes) => set({ subtasks: t.subtasks.map((s) => (s.id === id ? { ...s, ...changes } : s)) });
  const addSub = (e) => {
    e.preventDefault();
    if (!newSub.trim()) return;
    set({ subtasks: [...(t.subtasks || []), { id: newId(), title: newSub.trim(), done: false, due: null }] });
    setNewSub('');
  };

  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Edit task">
        <input ref={ref} className="field display" style={{ fontSize: 22, fontWeight: 600, background: 'transparent', border: 0, padding: 0 }} value={t.title} onChange={(e) => set({ title: e.target.value })} aria-label="Task title" />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <label className="lbl">Who
            <select className="field" value={t.owner} onChange={(e) => set({ owner: e.target.value })}>
              <option value={me}>Me</option>
              <option value={other(me)}>{PEOPLE[other(me)].name}</option>
              <option value="both">Together</option>
            </select>
          </label>
          <label className="lbl">List
            <select className="field" value={t.list} onChange={(e) => set({ list: e.target.value })}>
              {LISTS.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
            </select>
          </label>
          <label className="lbl">Due
            <input type="date" className="field" value={t.due || ''} onChange={(e) => set({ due: e.target.value || null })} />
          </label>
          <label className="lbl">Remind me
            <input type="datetime-local" className="field" value={t.remindAt || ''} onChange={(e) => set({ remindAt: e.target.value || null })} />
          </label>
          <label className="lbl">Priority
            <select className="field" value={t.priority || ''} onChange={(e) => set({ priority: e.target.value || null })}>
              <option value="">None</option><option>High</option><option>Medium</option><option>Low</option>
            </select>
          </label>
          <label className="lbl">Repeats
            <select className="field" value={t.repeat || ''} onChange={(e) => set({ repeat: e.target.value || null })}>
              <option value="">Never</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
          </label>
          <label className="lbl">Waiting on
            <select className="field" value={t.waitingOn || ''} onChange={(e) => set({ waitingOn: e.target.value || null })}>
              <option value="">Nothing</option>
              {others.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </label>
          <label className="lbl" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22 }}>
            <input type="checkbox" checked={!!t.myDay} onChange={(e) => set({ myDay: e.target.checked })} style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} />
            Show on Today
          </label>
        </div>
        <label className="lbl">Notes
          <textarea className="field" value={t.notes || ''} onChange={(e) => set({ notes: e.target.value })} placeholder="Details, links, anything to remember" />
        </label>
        <div className="row between"><h2>Sub-tasks</h2></div>
        {(t.subtasks || []).map((s) => (
          <div key={s.id} className="task">
            <button type="button" className={'check' + (s.done ? ' done' : '')} aria-label={(s.done ? 'Mark not done: ' : 'Complete: ') + s.title} onClick={() => setSub(s.id, { done: !s.done })}>{s.done ? '✓' : ''}</button>
            <input className="field" style={{ background: 'transparent', border: 0, padding: 0, textDecoration: s.done ? 'line-through' : 'none' }} value={s.title} onChange={(e) => setSub(s.id, { title: e.target.value })} aria-label="Sub-task" />
            <input type="date" className="field" style={{ width: 150 }} value={s.due || ''} onChange={(e) => setSub(s.id, { due: e.target.value || null })} aria-label={'Due date for ' + s.title} title="Due" />
            <input type="datetime-local" className="field" style={{ width: 200 }} value={s.remindAt || ''} onChange={(e) => setSub(s.id, { remindAt: e.target.value || null })} aria-label={'Reminder for ' + s.title} title="Remind me" />
            <button type="button" className="btn ghost small" title="Make into its own task" onClick={() => { save('task', { title: s.title, owner: t.owner, list: t.list, due: s.due || null, remindAt: s.remindAt || null, priority: null, repeat: null, notes: 'From: ' + t.title, subtasks: [], done: false, myDay: false, created: Date.now() }); set({ subtasks: t.subtasks.filter((x) => x.id !== s.id) }); }}>Make task</button>
            <button type="button" className="btn ghost small" onClick={() => set({ subtasks: t.subtasks.filter((x) => x.id !== s.id) })} aria-label={'Remove ' + s.title}>✕</button>
          </div>
        ))}
        <form className="row" onSubmit={addSub}>
          <input className="field" style={{ flex: 1 }} value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="Add a sub-task" aria-label="New sub-task" />
          <button className="btn small" type="submit">Add</button>
        </form>
        {t.outcome && <div className="note"><b>Outcome:</b> {t.outcome}</div>}
        <div className="row between">
          <button type="button" className="btn ghost small" onClick={() => { if (confirm('Delete "' + t.title + '"?')) { remove(t.id); onClose(); } }}>Delete task</button>
          <button type="button" className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
