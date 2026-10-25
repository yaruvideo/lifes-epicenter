import { useState } from 'react';
import { remove, save } from '../db.js';
import { useItems } from '../store.js';
import { MACROS } from '../health.js';

const num = (v) => (v === '' || v == null ? 0 : Number(v));
const r1 = (v) => Math.round(v * 10) / 10;
export const macroLine = (r) => Math.round(r.calories || 0) + ' cal · P ' + r1(r.protein || 0) + 'g · C ' + r1(r.carbs || 0) + 'g · F ' + r1(r.fat || 0) + 'g';

// Macros are stored per serving so the meal box on Health can scale them.
export default function Recipes({ me }) {
  const recipes = useItems('recipe');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const s = q.trim().toLowerCase();
  const list = recipes
    .filter((r) => !s || [r.name, r.tags, r.ingredients].some((t) => (t || '').toLowerCase().includes(s)))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return (
    <>
      <header className="row between" style={{ alignItems: 'flex-end' }}>
        <div><div className="sub">Saved meals and their macros</div><h1>Recipes · {recipes.length}</h1></div>
        <button type="button" className="btn" onClick={() => setOpen({ name: q.trim(), servings: 1 })}>New recipe</button>
      </header>
      <section className="card">
        <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipes, tags or ingredients…" aria-label="Search recipes" />
        {recipes.length === 0 ? <div className="empty">No recipes yet. Add one and it will show up when you type a meal on Health.</div>
          : list.length === 0 ? <div className="empty">Nothing matches "{q}".</div>
          : (
            <div className="themes" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {list.map((r) => (
                <button key={r.id} type="button" className="theme" onClick={() => setOpen(r)}>
                  <b>{r.name}</b>
                  <span className="sub" style={{ fontSize: 13 }}>{macroLine(r)} per serving</span>
                  <span className="sub" style={{ fontSize: 12 }}>{[r.servings > 1 && 'Makes ' + r.servings, r.tags].filter(Boolean).join(' · ')}</span>
                </button>
              ))}
            </div>
          )}
      </section>
      {open && <RecipeModal recipe={open} me={me} onClose={() => setOpen(null)} />}
    </>
  );
}

export function RecipeModal({ recipe, me, onClose }) {
  const [d, setD] = useState({ servings: 1, ingredients: '', steps: '', tags: '', link: '', ...recipe, ...Object.fromEntries(MACROS.map(([k]) => [k, recipe[k] == null ? '' : String(recipe[k])])) });
  const [mode, setMode] = useState('serving');
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  const servings = Math.max(1, num(d.servings) || 1);
  const per = (k) => (mode === 'whole' ? num(d[k]) / servings : num(d[k]));
  const submit = (e) => {
    e.preventDefault();
    if (!d.name.trim()) return;
    const macros = Object.fromEntries(MACROS.map(([k]) => [k, r1(per(k))]));
    save('recipe', { ...d, ...macros, name: d.name.trim(), servings, by: d.by || me, added: d.added || Date.now() }, recipe.id);
    onClose();
  };
  const switchMode = (m) => {
    if (m === mode) return;
    // Convert what's typed so switching doesn't lose the numbers.
    const f = m === 'whole' ? servings : 1 / servings;
    setD({ ...d, ...Object.fromEntries(MACROS.map(([k]) => [k, d[k] === '' ? '' : String(r1(num(d[k]) * f))])) });
    setMode(m);
  };
  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-label={recipe.id ? 'Edit recipe' : 'New recipe'} onSubmit={submit}>
        <h2>{recipe.id ? 'Edit recipe' : 'New recipe'}</h2>
        <input autoFocus={!recipe.id} className="field" value={d.name} onChange={set('name')} placeholder="Recipe name" aria-label="Recipe name" />
        <div className="row">
          <label className="lbl" style={{ flex: '0 1 120px' }}>Servings it makes<input className="field" type="number" min="1" step="0.5" value={d.servings} onChange={set('servings')} /></label>
          <div className="seg" role="group" aria-label="Macros are for">
            <button type="button" aria-pressed={mode === 'serving'} onClick={() => switchMode('serving')}>Per serving</button>
            <button type="button" aria-pressed={mode === 'whole'} onClick={() => switchMode('whole')}>Whole recipe</button>
          </div>
        </div>
        <div className="row">
          {MACROS.map(([k, label, unit]) => (
            <label key={k} className="lbl" style={{ flex: '1 1 90px' }}>{label}{unit && ' (' + unit + ')'}<input className="field" type="number" step="any" inputMode="decimal" value={d[k]} onChange={set(k)} /></label>
          ))}
        </div>
        {mode === 'whole' && servings > 1 && <div className="sub" style={{ fontSize: 13 }}>Each serving: {macroLine(Object.fromEntries(MACROS.map(([k]) => [k, per(k)])))}</div>}
        <label className="lbl">Ingredients<textarea className="field" value={d.ingredients} onChange={set('ingredients')} placeholder="One per line" /></label>
        <label className="lbl">Steps<textarea className="field" value={d.steps} onChange={set('steps')} placeholder="How to make it" /></label>
        <div className="row">
          <label className="lbl" style={{ flex: '1 1 160px' }}>Tags<input className="field" value={d.tags} onChange={set('tags')} placeholder="Breakfast, quick, high protein" /></label>
          <label className="lbl" style={{ flex: '2 1 220px' }}>Link<input className="field" value={d.link} onChange={set('link')} placeholder="Where it came from" /></label>
        </div>
        {d.link && /^https?:\/\//.test(d.link) && <a href={d.link} target="_blank" rel="noreferrer" className="sub">Open the original recipe ↗</a>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          {recipe.id && <button type="button" className="btn ghost" style={{ marginRight: 'auto' }} onClick={() => { if (confirm('Delete ' + recipe.name + '?')) { remove(recipe.id); onClose(); } }}>Delete</button>}
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn">Save recipe</button>
        </div>
      </form>
    </div>
  );
}
