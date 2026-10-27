import { useState } from 'react';
import { save } from '../db.js';
import { MAX_SUB_DEPTH, cloneSubs, flatSubs, subBlocker } from '../tasks.js';
import { newId } from '../db.js';
import SearchPick from './SearchPick.jsx';

// One sub-task (and, inside it, its own steps). Clicking it opens the details: name, dates, waiting on, notes and the less-used buttons.
export default function SubtaskItem({ s, depth, task, tasks, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const root = task.subtasks || [];
  const set = (changes) => onUpdate(s.id, (x) => ({ ...x, ...changes }));
  const blocker = subBlocker(s, root, tasks);
  const kids = s.subtasks || [];
  const mine = new Set(flatSubs([s]).map((x) => x.s.id));
  const choices = flatSubs(root).filter((x) => !mine.has(x.s.id) && !x.s.done);
  const addKid = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    set({ subtasks: [...kids, { id: newId(), title: newTitle.trim(), done: false, due: null, notes: '', subtasks: [] }] });
    setNewTitle('');
  };
  const summary = [blocker && '🔒 Waiting on: ' + blocker.title, s.due && 'Due ' + s.due, s.remindAt && '🔔 ' + s.remindAt.replace('T', ' '), s.notes && '📝 Note', kids.length && kids.filter((k) => k.done).length + '/' + kids.length + ' steps'].filter(Boolean).join(' · ');

  return (
    <div className={'task subtask' + (blocker ? ' blocked' : '')} style={depth > 1 ? { background: 'transparent', padding: '6px 0 0 12px', borderLeft: '2px solid var(--border)', borderRadius: 0 } : undefined}>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <button type="button" className={'check' + (s.done ? ' done' : '')} aria-label={(s.done ? 'Mark not done: ' : 'Complete: ') + s.title} onClick={() => set({ done: !s.done })}>{s.done ? '✓' : ''}</button>
        <button type="button" className="title" aria-expanded={open} onClick={() => setOpen(!open)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 0, padding: '4px 0', cursor: 'pointer', textDecoration: s.done ? 'line-through' : 'none' }}>
          {s.title}
          {summary && <span className="sub" style={{ display: 'block', fontSize: 12 }}>{summary}</span>}
        </button>
        {depth < MAX_SUB_DEPTH && <button type="button" className="btn ghost small" onClick={() => setAdding(!adding)} title="Add a step inside this one">+ Step</button>}
        <button type="button" className="btn ghost small" aria-label={(open ? 'Collapse ' : 'Expand ') + s.title} onClick={() => setOpen(!open)}>{open ? '▾' : '▸'}</button>
      </div>
      {open && (
        <div className="subdetails">
          <label className="lbl">Name
            <input className="field" value={s.title} onChange={(e) => set({ title: e.target.value })} aria-label="Sub-task name" />
          </label>
          <div className="row subdates">
            <label className="lbl">Due
              <input type="date" className="field" value={s.due || ''} onChange={(e) => set({ due: e.target.value || null })} aria-label={'Due date for ' + s.title} />
            </label>
            <label className="lbl">Remind me
              <input type="datetime-local" className="field" value={s.remindAt || ''} onChange={(e) => set({ remindAt: e.target.value || null })} aria-label={'Reminder for ' + s.title} />
            </label>
            <div className="lbl">Waiting on
              <SearchPick label={'Waiting on, for ' + s.title} value={s.waitingOn} onChange={(id) => set({ waitingOn: id })} placeholder="Nothing (type to search)"
                options={[...choices.map((x) => ({ id: x.s.id, label: x.s.title, hint: 'step in this task' })), ...tasks.filter((x) => x.id !== task.id && !x.done).map((x) => ({ id: x.id, label: x.title, hint: 'task' }))]} />
            </div>
          </div>
          <label className="lbl">Notes
            <textarea className="field" value={s.notes || ''} onChange={(e) => set({ notes: e.target.value })} placeholder="Details, links, anything to remember" />
          </label>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn ghost small" title="Make into its own task" onClick={() => { save('task', { title: s.title, owner: task.owner, list: task.list, due: s.due || null, remindAt: s.remindAt || null, priority: null, repeat: null, notes: [s.notes, 'From: ' + task.title].filter(Boolean).join('\n\n'), subtasks: cloneSubs(kids), done: false, myDay: false, created: Date.now() }); onUpdate(s.id, () => null); }}>Make into a task</button>
            <button type="button" className="btn ghost small" onClick={() => (!kids.length || confirm('Remove "' + s.title + '" and its steps?')) && onUpdate(s.id, () => null)}>Remove</button>
          </div>
        </div>
      )}
      {kids.map((k) => <SubtaskItem key={k.id} s={k} depth={depth + 1} task={task} tasks={tasks} onUpdate={onUpdate} />)}
      {adding && (
        <form className="row" onSubmit={addKid} style={{ paddingLeft: 12 }}>
          <input className="field" autoFocus style={{ flex: 1 }} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={'Add a step inside "' + s.title + '"'} aria-label="New step" />
          <button className="btn small" type="submit">Add</button>
        </form>
      )}
    </div>
  );
}
