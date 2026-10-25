import { useState } from 'react';

// Asked whenever a task is ticked. Saving with an empty box is fine.
export default function WrapUp({ task, onSave, onCancel }) {
  const [text, setText] = useState('');
  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <form className="modal" style={{ width: 'min(520px, 100%)' }} role="dialog" aria-modal="true" aria-label="Wrap up task" onSubmit={(e) => { e.preventDefault(); onSave(text); }}>
        <h2>Nice. What got done?</h2>
        <div className="sub">{task.title} · optional, saved to your Journal</div>
        <textarea autoFocus className="field" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSave(text); } }} placeholder="Outcome, what changed, what's next" />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn ghost" onClick={() => onSave('')}>Complete without a note</button>
          <button type="submit" className="btn">Save and complete</button>
        </div>
      </form>
    </div>
  );
}
