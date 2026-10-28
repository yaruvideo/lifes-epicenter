import Live from './Live.jsx';
import { removeStep, renameStep, setStepDue, toggleStep } from '../steps.js';

// One checklist step in a video or client project. A due date turns it into a to-do on Today and in Tasks.
export default function StepRow({ parent, item, me, onRemove, compact = false }) {
  return (
    <div className={'task' + (item.done ? ' isdone' : '')} style={compact ? { padding: '4px 0', gap: 6, fontSize: 13 } : undefined}>
      <button type="button" className={'check' + (item.done ? ' done' : '')} style={compact ? { width: 22, height: 22, flex: '0 0 22px' } : undefined} aria-label={(item.done ? 'Uncheck ' : 'Check ') + item.text} onClick={() => toggleStep(parent, item, me)}>{item.done ? '✓' : ''}</button>
      <Live className="title" style={{ cursor: 'text', border: 0, background: 'transparent', minWidth: 0 }} value={item.text} onSave={(val) => val.trim() && renameStep(parent, item, val.trim())} aria-label={'Edit ' + item.text} />
      <input type="date" className="stepdate" value={item.due || ''} title={item.due ? 'Also on Today and in Tasks' : 'Add a due date to put this on Today and in Tasks'}
        onChange={(e) => setStepDue(parent, item, e.target.value || null, me)} aria-label={'Due date for ' + item.text} />
      <button type="button" className="btn ghost small" style={compact ? { minHeight: 26, padding: '0 6px' } : undefined} aria-label={'Remove ' + item.text} onClick={() => { removeStep(item); onRemove(); }}>✕</button>
    </div>
  );
}
