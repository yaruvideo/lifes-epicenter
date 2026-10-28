import { useEffect, useRef, useState } from 'react';
import { newId, patch, remove, save } from '../db.js';
import { useItems, todayStr } from '../store.js';
import { PRIORITY_ORDER, listName, useLists, weekEnd, updateSub } from '../tasks.js';
import SubtaskItem from './SubtaskItem.jsx';
import SearchPick from './SearchPick.jsx';
import { PEOPLE } from '../config.js';
import { other } from '../store.js';

export default function TaskModal({ task, me, onClose, onCheck }) {
  const [t, setT] = useState(task);
  const [newSub, setNewSub] = useState('');
  const allTasks = useItems('task');
  const lists = useLists();
  const gdProjects = (useItems('gdprojects').find((x) => x.id === 'gdprojects')?.projects || [{ id: 'gd-main', name: 'Second Sun' }]).filter((p) => !p.archived || p.id === t.project);
  const others = allTasks.filter((x) => x.id !== task.id && !x.done);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const set = (changes) => { const next = { ...t, ...changes }; setT(next); patch(t.id, changes); };
  const addSub = (e) => {
    e.preventDefault();
    if (!newSub.trim()) return;
    set({ subtasks: [...(t.subtasks || []), { id: newId(), title: newSub.trim(), done: false, due: null, notes: '', subtasks: [] }] });
    setNewSub('');
  };

  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Edit task">
        <input ref={ref} className="field display" style={{ fontSize: 22, fontWeight: 600, background: 'transparent', border: 0, padding: 0 }} value={t.title} onChange={(e) => set({ title: e.target.value })} aria-label="Task title" />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
          <label className="lbl">Who
            <select className="field" value={t.owner} onChange={(e) => set({ owner: e.target.value })}>
              <option value={me}>Me</option>
              <option value={other(me)}>{PEOPLE[other(me)].name}</option>
              <option value="both">Together</option>
            </select>
          </label>
          <label className="lbl">List
            <select className="field" value={t.list} onChange={(e) => set({ list: e.target.value })}>
              {lists.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
            </select>
          </label>
          {t.list === 'gamedev' && (
            <label className="lbl">Game project
              <select className="field" value={t.project || 'gd-main'} onChange={(e) => set({ project: e.target.value })}>
                {gdProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
          <label className="lbl">Due
            <input type="date" className="field" value={t.due || ''} onChange={(e) => set({ due: e.target.value || null })} />
          </label>
          <label className="lbl">Remind me
            <input type="datetime-local" className="field" value={t.remindAt || ''} onChange={(e) => set({ remindAt: e.target.value || null })} />
          </label>
          <label className="lbl">Priority
            <select className="field" value={t.priority || ''} onChange={(e) => set({ priority: e.target.value || null })}>
              <option value="">None</option>{PRIORITY_ORDER.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="lbl">Repeats
            <select className="field" value={t.repeat || ''} onChange={(e) => set({ repeat: e.target.value || null })}>
              <option value="">Never</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
          </label>
          <div className="lbl">Waiting on
            <SearchPick label="Waiting on" value={t.waitingOn} onChange={(id) => set({ waitingOn: id })}
              options={others.map((o) => ({ id: o.id, label: o.title, hint: listName(o.list, lists) }))} placeholder="Nothing (type to search)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
            <label className="lbl" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={!!t.myDay} onChange={(e) => set({ myDay: e.target.checked })} style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} />
              Show on Today
            </label>
            <label className="lbl" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={!!t.thisWeek && t.thisWeek >= todayStr()} onChange={(e) => set({ thisWeek: e.target.checked ? weekEnd() : null })} style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} />
              Show in This Week
            </label>
          </div>
        </div>
        <label className="lbl">Notes
          <textarea className="field" value={t.notes || ''} onChange={(e) => set({ notes: e.target.value })} placeholder="Details, links, anything to remember" />
        </label>
        <div className="row between"><h2>Sub-tasks</h2></div>
        {(t.subtasks || []).map((s) => <SubtaskItem key={s.id} s={s} depth={1} task={t} tasks={allTasks} onUpdate={(id, fn) => set({ subtasks: updateSub(t.subtasks, id, fn) })} />)}
        <form className="row" onSubmit={addSub}>
          <input className="field" style={{ flex: 1 }} value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="Add a sub-task" aria-label="New sub-task" />
          <button className="btn small" type="submit">Add</button>
        </form>
        {t.outcome && <div className="note"><b>Outcome:</b> {t.outcome}</div>}
        <div className="row between">
          <button type="button" className="btn ghost small" onClick={() => { if (confirm('Delete "' + t.title + '"?')) { remove(t.id); onClose(); } }}>Delete task</button>
          <div className="row">
            <button type="button" className="btn ghost" onClick={onClose}>Close</button>
            <button type="button" className="btn" onClick={() => onCheck(t)}>{t.done ? 'Mark not done' : '✓ Complete task'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
