import { db, patch, remove } from './db.js';
import { addTask, completeTask, undoTask, updateStepItem } from './tasks.js';

// Checklist steps inside a video or client project. Giving a step a due date makes a real task for it
// (list = the section, project = the video/job, stepRef points back), so it shows on Today and in Tasks.
// Ticking either one ticks the other; clearing the date removes the task.
const LIST = { video: 'video', cproject: 'client' };
const liveTask = async (id) => { const r = id && (await db.items.get(id)); return r && !r.deleted ? r.data : null; };

export async function setStepDue(parent, item, due, me) {
  const t = await liveTask(item.taskId);
  if (!due) { if (t) await remove(t.id); return updateStepItem(parent.id, item.id, { due: null, taskId: null }); }
  if (t) { await patch(t.id, { due }); return updateStepItem(parent.id, item.id, { due }); }
  const kind = (await db.items.get(parent.id))?.kind;
  const nt = await addTask(item.text, me, { list: LIST[kind] || 'inbox', project: parent.id, due, done: !!item.done, stepRef: { id: parent.id, item: item.id } });
  return updateStepItem(parent.id, item.id, { due, taskId: nt.id });
}

export async function toggleStep(parent, item, me) {
  const t = await liveTask(item.taskId);
  if (t) return t.done ? undoTask(t) : completeTask(t, me, '');
  return updateStepItem(parent.id, item.id, { done: !item.done });
}

export async function renameStep(parent, item, text) {
  await updateStepItem(parent.id, item.id, { text });
  const t = await liveTask(item.taskId);
  if (t) await patch(t.id, { title: text });
}

export async function removeStep(item) {
  const t = await liveTask(item.taskId);
  if (t) await remove(t.id);
}
