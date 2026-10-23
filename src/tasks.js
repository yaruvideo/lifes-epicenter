import { newId, patch, save } from './db.js';
import { todayStr } from './store.js';

export const LISTS = [['inbox', 'Inbox'], ['health', 'Health'], ['client', 'Client Work'], ['video', 'Video Projects'], ['gamedev', 'Game Dev'], ['home', 'Home']];
export const listName = (id) => (LISTS.find((l) => l[0] === id) || [id, id])[1];
// Lists that ask "what got done?" when a task is finished. The note goes to the Journal.
export const WRAP_UP_LISTS = ['client', 'video', 'gamedev'];
export const needsWrapUp = (t) => WRAP_UP_LISTS.includes(t.list) || t.owner === 'both';

export const PRIORITY = { High: { background: 'var(--warm)', color: 'var(--on-accent)' }, Medium: { background: 'var(--inner)', color: 'var(--warm)', border: '1px solid var(--warm)' }, Low: { background: 'var(--inner)', color: 'var(--muted)', border: '1px solid var(--border)' } };

export function addTask(title, me, extra = {}) {
  return save('task', { title: title.trim(), owner: me, list: 'inbox', due: null, priority: null, repeat: null, notes: '', subtasks: [], done: false, myDay: false, created: Date.now(), ...extra });
}

function nextDue(due, repeat) {
  const d = due ? new Date(due + 'T12:00:00') : new Date();
  if (repeat === 'daily') d.setDate(d.getDate() + 1);
  else if (repeat === 'weekdays') { do d.setDate(d.getDate() + 1); while (d.getDay() === 0 || d.getDay() === 6); }
  else if (repeat === 'weekly') d.setDate(d.getDate() + 7);
  else if (repeat === 'monthly') d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export async function completeTask(t, me, outcome = '') {
  await patch(t.id, { done: true, doneAt: Date.now(), doneBy: me, outcome: outcome.trim() });
  await save('journal', { type: 'task', text: outcome.trim(), title: t.title, list: t.list, taskId: t.id, by: me, at: Date.now() });
  if (t.repeat) {
    const { id, done, doneAt, doneBy, outcome: _o, ...rest } = t;
    await save('task', { ...rest, due: nextDue(t.due, t.repeat), subtasks: (t.subtasks || []).map((s) => ({ ...s, id: newId(), done: false })), created: Date.now() });
  }
}

export const undoTask = (t) => patch(t.id, { done: false, doneAt: null, doneBy: null });

export const isToday = (t) => !t.done && (t.myDay || (t.due && t.due <= todayStr()));
