import { useState } from 'react';
import { patch } from '../db.js';

// Drag-and-drop ordering for any list of items. Order lives on each item as sortKey (falls back to created),
// and a drop only rewrites the moved item's key, halfway between its new neighbours.
export const sortKeyOf = (x) => x.sortKey ?? x.created ?? 0;

export default function useDragSort(items, enabled = true) {
  const [drag, setDrag] = useState(null);
  const idx = (id) => items.findIndex((x) => x.id === id);
  const drop = () => {
    if (drag && drag.over !== drag.id) {
      const rest = items.filter((x) => x.id !== drag.id);
      const at = rest.findIndex((x) => x.id === drag.over) + (idx(drag.over) > idx(drag.id) ? 1 : 0);
      const before = rest[at - 1], after = rest[at];
      patch(drag.id, { sortKey: before && after ? (sortKeyOf(before) + sortKeyOf(after)) / 2 : before ? sortKeyOf(before) + 1000 : sortKeyOf(after) - 1000 });
    }
    setDrag(null);
  };
  const handle = (x) => enabled && (
    <span className="draghandle" aria-hidden="true" title="Drag to reorder"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setDrag({ id: x.id, over: x.id }); }}
      onPointerMove={(e) => { if (!drag) return; const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drag-id]'); if (el && el.dataset.dragId !== drag.over) setDrag({ ...drag, over: el.dataset.dragId }); }}
      onPointerUp={drop} onPointerCancel={() => setDrag(null)}>⋮⋮</span>
  );
  const dragClass = (x) => !drag ? '' : drag.id === x.id ? ' dragging' : drag.over === x.id ? (idx(x.id) > idx(drag.id) ? ' dropbelow' : ' dropabove') : '';
  return { handle, dragClass };
}
