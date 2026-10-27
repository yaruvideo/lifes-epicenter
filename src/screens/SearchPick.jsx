import { useState } from 'react';

// A type-to-search picker (used for "Waiting on"). options: [{ id, label, hint }]. Shows the choice as a chip once picked.
export default function SearchPick({ value, options, onChange, placeholder = 'Type to search…', label }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const picked = options.find((o) => o.id === value);
  if (value) {
    return (
      <div className="field row searchpick-chosen" style={{ flexWrap: 'nowrap', gap: 6 }}>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{picked ? picked.label : 'A finished or removed item'}</span>
        <button type="button" className="btn ghost small" style={{ minHeight: 28, padding: '0 8px' }} aria-label={'Clear ' + (label || 'choice')} onClick={() => onChange(null)}>✕</button>
      </div>
    );
  }
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = words.length ? options.filter((o) => words.every((w) => (o.label + ' ' + (o.hint || '')).toLowerCase().includes(w))).slice(0, 8) : [];
  return (
    <div className="searchpick">
      <input className="field" value={q} placeholder={placeholder} aria-label={label} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (hits[0]) { onChange(hits[0].id); setQ(''); } } if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } }} />
      {open && words.length > 0 && (
        <div className="searchpick-list" role="listbox">
          {hits.length ? hits.map((o) => (
            <button key={o.id} type="button" role="option" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(o.id); setQ(''); setOpen(false); }}>
              {o.label}{o.hint && <span className="sub" style={{ fontSize: 12 }}> · {o.hint}</span>}
            </button>
          )) : <div className="sub" style={{ padding: '8px 12px', fontSize: 13 }}>No matches</div>}
        </div>
      )}
    </div>
  );
}
