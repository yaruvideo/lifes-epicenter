import { useState } from 'react';
import { completeTask, needsWrapUp, undoTask } from '../tasks.js';
import TaskModal from './TaskModal.jsx';
import WrapUp from './WrapUp.jsx';

// Shared by Today and Tasks: ticking a box, the wrap-up question, and the edit pop-up.
export default function useTaskActions(me) {
  const [wrap, setWrap] = useState(null);
  const [open, setOpen] = useState(null);
  const onCheck = (t) => {
    if (t.done) undoTask(t);
    else if (needsWrapUp(t)) setWrap(t);
    else completeTask(t, me);
  };
  const overlays = (
    <>
      {wrap && <WrapUp task={wrap} onCancel={() => setWrap(null)} onSave={(text) => { completeTask(wrap, me, text); setWrap(null); }} />}
      {open && <TaskModal key={open.id} task={open} me={me} onClose={() => setOpen(null)} />}
    </>
  );
  return { onCheck, onOpen: setOpen, overlays };
}
