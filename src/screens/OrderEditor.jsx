import { useState } from 'react';

// One editor for both board columns and tabs: drag the ⋮⋮ handle to reorder (arrow buttons stay for
// keyboard and screen readers), and optionally rename, hide, remove and add.
export default function OrderEditor({ title, hint, items, onChange, rename, hide, onRemove, addLabel, onDone }) {
  const [name, setName] = useState('');
  const [drag, setDrag] = useState(null);
  const move = (i, dir) => {
    const next = [...items];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };
  const idx = (id) => items.findIndex((x) => x.id === id);
  const drop = () => {
    if (drag && drag.over !== drag.id) {
      const next = items.filter((x) => x.id !== drag.id);
      next.splice(idx(drag.over), 0, items[idx(drag.id)]);
      onChange(next);
    }
    setDrag(null);
  };
  const rowClass = (id) => 'row listrow' + (!drag ? '' : drag.id === id ? ' dragging' : drag.over === id ? (idx(id) > idx(drag.id) ? ' dropbelow' : ' dropabove') : '');
  return (
    <section className="card" aria-label={title}>
      <div className="row between"><h2 style={{ fontSize: 16 }}>{title}</h2><button type="button" className="btn small" onClick={onDone}>Done</button></div>
      {hint && <div className="sub" style={{ fontSize: 13 }}>{hint}</div>}
      {items.map((it, i) => (
        <div key={it.id} data-order-id={it.id} className={rowClass(it.id)} style={{ flexWrap: 'nowrap', gap: 6 }}>
          <span className="draghandle" aria-hidden="true" title="Drag to reorder"
            onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setDrag({ id: it.id, over: it.id }); }}
            onPointerMove={(e) => { if (!drag) return; const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-order-id]'); if (el && el.dataset.orderId !== drag.over) setDrag({ ...drag, over: el.dataset.orderId }); }}
            onPointerUp={drop} onPointerCancel={() => setDrag(null)}>⋮⋮</span>
          <span className="sr-only">
            <button type="button" disabled={i === 0} aria-label={'Move ' + it.name + ' up'} onClick={() => move(i, -1)}>↑</button>
            <button type="button" disabled={i === items.length - 1} aria-label={'Move ' + it.name + ' down'} onClick={() => move(i, 1)}>↓</button>
          </span>
          {rename
            ? <input className="field" style={{ flex: 1 }} defaultValue={it.name} aria-label={'Rename ' + it.name}
                onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== it.name) onChange(items.map((x) => (x.id === it.id ? { ...x, name: v } : x))); else e.target.value = it.name; }} />
            : <span style={{ flex: 1, padding: '0 12px', color: it.hidden ? 'var(--muted)' : undefined }}>{it.name}</span>}
          {hide && <label className="row sub" style={{ gap: 6, fontSize: 14, whiteSpace: 'nowrap' }}><input type="checkbox" checked={!it.hidden} onChange={(e) => onChange(items.map((x) => (x.id === it.id ? { ...x, hidden: !e.target.checked } : x)))} /> Show</label>}
          {onRemove && <button type="button" className="btn ghost small" disabled={items.length < 3} title={items.length < 3 ? 'Keep at least two' : ''} onClick={() => onRemove(it)}>Remove</button>}
        </div>
      ))}
      {addLabel && (
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; onChange([...items, { id: 'c-' + Date.now().toString(36), name: name.trim() }]); setName(''); }}>
          <input className="field" style={{ flex: 1 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="New column name" aria-label="New column name" />
          <button className="btn small" type="submit">{addLabel}</button>
        </form>
      )}
    </section>
  );
}
