import { ownerLabel, ownerStyle, todayStr } from '../store.js';
import { PRIORITY, isBlocked } from '../tasks.js';

export default function TaskRow({ t, me, all = [], onCheck, onOpen, handle, className = '' }) {
  const blocker = isBlocked(t, all) && all.find((x) => x.id === t.waitingOn);
  const subs = t.subtasks || [];
  const overdue = t.due && !t.done && t.due < todayStr();
  return (
    <div className={'task' + (t.done ? ' isdone' : '') + className} data-task-id={t.id}>
      {handle}
      <button type="button" className={'check' + (t.done ? ' done' : '')} aria-label={(t.done ? 'Mark not done: ' : 'Complete: ') + t.title} onClick={() => onCheck(t)}>{t.done ? '✓' : ''}</button>
      <button type="button" className="title" onClick={() => onOpen(t)}>
        {t.title}
        <span className="sub" style={{ display: 'block', fontSize: 12 }}>
          {[blocker && '🔒 Waiting on: ' + blocker.title, t.due && (overdue ? 'Overdue · ' : 'Due ') + t.due, t.repeat && '↻ ' + t.repeat, t.remindAt && '🔔 ' + t.remindAt.replace('T', ' '), subs.length && subs.filter((s) => s.done).length + '/' + subs.length + ' sub-tasks'].filter(Boolean).join(' · ')}
        </span>
      </button>
      {t.priority && <span className="chip" style={PRIORITY[t.priority]}>{t.priority}</span>}
      <span className="chip" style={ownerStyle(t.owner)}>{ownerLabel(t.owner, me)}</span>
    </div>
  );
}
