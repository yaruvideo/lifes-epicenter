import { useState } from 'react';
import { sortKeyOf } from './useDragSort.jsx';

// Sort choices shared by the kanban boards. 'mine' is the order you drag cards into.
export const BOARD_SORTS = { mine: 'My order (drag)', alpha: 'A to Z' };

export const byAlpha = (a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base', numeric: true });
export const byMine = (a, b) => sortKeyOf(a) - sortKeyOf(b);

export function BoardSortSelect({ value, options, onChange }) {
  return (
    <label className="row sub" style={{ gap: 8, fontSize: 14 }}>Sort cards
      <select className="field" style={{ width: 'auto', minHeight: 36 }} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Sort cards">
        {Object.entries(options).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
    </label>
  );
}

// Drag cards between columns, and (in My order) up and down inside a column. A drop calls
// onMove(item, columnId, sortKey); sortKey is only set when the board is in My order.
export default function useBoardDrag(items, mine, onMove) {
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null); // { id, before }
  const end = () => { setDragId(null); setOver(null); };
  const card = (x) => ({
    draggable: true,
    'data-card-id': x.id,
    onDragStart: (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', x.id); setDragId(x.id); },
    onDragEnd: end,
    onDragOver: (e) => {
      if (!mine || !dragId || x.id === dragId) return;
      const r = e.currentTarget.getBoundingClientRect();
      const before = e.clientY < r.top + r.height / 2;
      if (over?.id !== x.id || over.before !== before) setOver({ id: x.id, before });
    }
  });
  const cardClass = (x) => (dragId === x.id ? ' dragging' : over?.id === x.id ? (over.before ? ' dropabove' : ' dropbelow') : '');
  // list: the column's cards in the order they're shown.
  const column = (colId, list) => ({
    onDragOver: (e) => { e.preventDefault(); if (over && !e.target.closest?.('[data-card-id]')) setOver(null); },
    onDrop: (e) => {
      e.preventDefault();
      const item = items.find((x) => x.id === dragId);
      if (item) {
        let key;
        if (mine) {
          const rest = list.filter((x) => x.id !== item.id);
          const i = over ? rest.findIndex((x) => x.id === over.id) : -1;
          const at = i < 0 ? rest.length : i + (over.before ? 0 : 1);
          const a = rest[at - 1], b = rest[at];
          key = a && b ? (sortKeyOf(a) + sortKeyOf(b)) / 2 : a ? sortKeyOf(a) + 1000 : b ? sortKeyOf(b) - 1000 : Date.now();
        }
        onMove(item, colId, key);
      }
      end();
    }
  });
  return { card, cardClass, column };
}
