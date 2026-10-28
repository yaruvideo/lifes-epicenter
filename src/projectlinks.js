import { createContext, createElement, useContext, useMemo } from 'react';
import { save } from './db.js';
import { useItems } from './store.js';
import { useGdProjects } from './gamedev.js';

// Any task can belong to a project: a Game Dev project, a video, or a client job (task.project = its id).
// Game Dev to-dos with no project belong to its first project, gd-main.
export const LIST_FOR = { game: 'gamedev', video: 'video', client: 'client' };
export const projectOf = (t) => t.project || (t.list === 'gamedev' ? 'gd-main' : null);

const Ctx = createContext({ all: [], open: [], byId: {} });

// Loads the projects once for the whole app, so every task row can show its project without its own query.
export function ProjectsProvider({ children }) {
  const gd = useGdProjects();
  const videos = useItems('video');
  const cps = useItems('cproject');
  const value = useMemo(() => {
    const all = [
      ...gd.map((p) => ({ id: p.id, name: p.name, kind: 'game', group: 'Game Dev', closed: !!p.archived })),
      ...videos.map((v) => ({ id: v.id, name: v.title, kind: 'video', group: 'Video Projects', closed: !!v.done })),
      ...cps.map((p) => ({ id: p.id, name: p.title, kind: 'client', group: 'Client Work', closed: p.stage === 'Delivered' }))
    ];
    return { all, open: all.filter((p) => !p.closed), byId: Object.fromEntries(all.map((p) => [p.id, p])) };
  }, [gd, videos, cps]);
  return createElement(Ctx.Provider, { value }, children);
}
export const useProjects = () => useContext(Ctx);

// Tabs on a section page, in the order you dragged them, with the ones you hid marked. Shared, so it syncs.
export function usePageTabs(page, defaults) {
  const rec = useItems('pagetabs').find((r) => r.id === 'pagetabs-' + page) || {};
  const order = rec.tabs || [];
  const known = defaults.map(([id]) => id);
  const ids = [...order.filter((id) => known.includes(id)), ...known.filter((id) => !order.includes(id))];
  const hidden = rec.hiddenTabs || [];
  const tabs = ids.map((id) => ({ id, name: defaults.find((d) => d[0] === id)[1], hidden: hidden.includes(id) }));
  const saveTabs = (list) => save('pagetabs', { tabs: list.map((t) => t.id), hiddenTabs: list.filter((t) => t.hidden).map((t) => t.id) }, 'pagetabs-' + page);
  return [tabs, saveTabs];
}
