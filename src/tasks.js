import { newId, patch, save } from './db.js';
import { todayStr } from './store.js';

export const LISTS = [['inbox', 'Inbox'], ['health', 'Health'], ['client', 'Client Work'], ['video', 'Video Projects'], ['gamedev', 'Game Dev'], ['home', 'Home']];
export const listName = (id) => (LISTS.find((l) => l[0] === id) || [id, id])[1];
// Every task asks "what got done?" when it's ticked. The note (optional) goes to the Journal.

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
    await save('task', { ...rest, due: nextDue(t.due, t.repeat), subtasks: cloneSubs(t.subtasks, true), created: Date.now() });
  }
}

export const undoTask = (t) => patch(t.id, { done: false, doneAt: null, doneBy: null });

// A task waiting on another unfinished task stays off Today until that one is done.
export const isBlocked = (t, all) => !!t.waitingOn && all.some((x) => x.id === t.waitingOn && !x.done);
export const isToday = (t, all = []) => !t.done && !isBlocked(t, all) && (t.myDay || (t.due && t.due <= todayStr()));

// "This Week" runs Monday to Sunday. Ticking "Show in This Week" stores that Sunday, so the flag clears itself next week.
export const weekEnd = () => {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
export const isThisWeek = (t) => !!(t.myDay || (t.due && t.due <= weekEnd()) || (t.thisWeek && t.thisWeek >= todayStr()));

// Sub-tasks nest: each one can hold its own `subtasks`, `notes` and `waitingOn` (another sub-task here, or another task).
export const MAX_SUB_DEPTH = 3;
export const flatSubs = (list = [], depth = 1, parent = null) =>
  list.flatMap((s) => [{ s, depth, parent }, ...flatSubs(s.subtasks, depth + 1, s)]);
export const updateSub = (list = [], id, fn) =>
  list.flatMap((s) => (s.id === id ? [fn(s)].filter(Boolean) : [{ ...s, subtasks: updateSub(s.subtasks, id, fn) }]));
export const subBlocker = (s, root = [], tasks = []) => {
  if (!s.waitingOn) return null;
  const hit = flatSubs(root).find((x) => x.s.id === s.waitingOn)?.s || tasks.find((x) => x.id === s.waitingOn);
  return hit && !hit.done ? hit : null;
};
// Fresh ids for a copied tree (repeating tasks, "Make task"), keeping waiting-on links inside it pointing the right way.
export function cloneSubs(list = [], reset = false) {
  const ids = {};
  for (const { s } of flatSubs(list)) ids[s.id] = newId();
  const copy = (l) => l.map((s) => ({ ...s, id: ids[s.id], done: reset ? false : s.done, waitingOn: ids[s.waitingOn] || s.waitingOn || null, subtasks: copy(s.subtasks || []) }));
  return copy(list);
}
