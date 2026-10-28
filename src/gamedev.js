import { save } from './db.js';
import { useItems } from './store.js';

// Game Dev projects live in one shared item ('gdprojects'). Each project keeps its own board columns
// and tab order. Its work items are tasks in the 'gamedev' list with `project` set; a task with no
// `project` belongs to gd-main.
export const DEFAULT_PROJECTS = [{ id: 'gd-main', name: 'Second Sun' }];
export const DEFAULT_COLUMNS = [{ id: 'todo', name: 'To do' }, { id: 'doing', name: 'Doing' }, { id: 'review', name: 'Review' }, { id: 'done', name: 'Done' }];
export const TABS = [['todos', 'To-dos'], ['board', 'Board'], ['list', 'List'], ['timeline', 'Timeline'], ['notes', 'Notes'], ['docs', 'Docs'], ['links', 'Links']];

export const useGdProjects = () => useItems('gdprojects').find((x) => x.id === 'gdprojects')?.projects || DEFAULT_PROJECTS;
export const saveGdProjects = (projects) => save('gdprojects', { projects }, 'gdprojects');
export const inProject = (pid) => (x) => (x.project || 'gd-main') === pid;
export const columnsOf = (p) => (p?.columns?.length ? p.columns : DEFAULT_COLUMNS);

// Tabs in the project's order; tabs added to the app later show up at the end. Hidden ones are left out.
export function tabsOf(p) {
  const order = p?.tabs || [];
  const known = TABS.map(([id]) => id);
  const ids = [...order.filter((id) => known.includes(id)), ...known.filter((id) => !order.includes(id))];
  const hidden = p?.hiddenTabs || [];
  return ids.map((id) => TABS.find((t) => t[0] === id)).map(([id, name]) => ({ id, name, hidden: hidden.includes(id) }));
}

// Which column a task shows in: the last column means finished, so done tasks always sit there
// and an open task is never shown there (or in a column that was removed).
export function columnFor(t, columns) {
  const last = columns[columns.length - 1].id;
  if (t.done) return last;
  return columns.some((c) => c.id === t.column && c.id !== last) ? t.column : columns[0].id;
}
