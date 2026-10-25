import { useEffect, useState } from 'react';
import { remove, save } from '../db.js';
import { useItems, other, todayStr } from '../store.js';
import { PEOPLE } from '../config.js';
import Live from './Live.jsx';
import { macroLine } from './Recipes.jsx';
import { ACTIVITY, GOAL_ADJUST, DEFAULT_GOALS, MACROS, calcTargets, goalsFor, latestWeight, logMed, medLogId, seedMedsIfEmpty, totals } from '../health.js';

const num = (v) => (v === '' || v == null ? 0 : Number(v));

function Bar({ value, goal, color }) {
  const pct = goal ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return <div style={{ height: 10, borderRadius: 99, background: 'var(--inner)' }}><div style={{ width: pct + '%', height: '100%', borderRadius: 99, background: color }} /></div>;
}

export default function Health({ me }) {
  const [who, setWho] = useState(me);
  const meds = useItems('med');
  const logs = useItems('medlog');
  const goalsAll = useItems('goals');
  const weights = useItems('weight');
  const [wIn, setWIn] = useState('');
  const meals = useItems('meal');
  const waters = useItems('water');
  const exercise = useItems('exercise');
  const [editMeds, setEditMeds] = useState(false);
  const [editGoals, setEditGoals] = useState(false);
  const [meal, setMeal] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  const recipes = useItems('recipe');
  const [pick, setPick] = useState(null);
  const [servings, setServings] = useState('1');
  const [menu, setMenu] = useState(false);
  const [hl, setHl] = useState(0);
  const [keep, setKeep] = useState(false);
  const [ex, setEx] = useState({ what: '', minutes: '' });
  const [newMed, setNewMed] = useState({ name: '', schedule: '', time: '08:00', canSkip: false });

  useEffect(() => { const t = setTimeout(() => seedMedsIfEmpty(meds), 1500); return () => clearTimeout(t); }, [meds.length]);

  const today = todayStr();
  const color = PEOPLE[who].color;
  const myMeds = meds.filter((m) => m.person === who && m.active !== false).sort((a, b) => (a.time || '').localeCompare(b.time || '') || (a.order || 0) - (b.order || 0));
  const logOf = (m) => logs.find((l) => l.id === medLogId(m.id, today));
  const due = myMeds.filter((m) => !logOf(m));
  const handled = myMeds.filter((m) => logOf(m));
  const stored = { ...DEFAULT_GOALS, ...(goalsAll.find((g) => g.id === 'goals-' + who) || {}) };
  const goals = goalsFor(who, goalsAll, weights);
  const lastW = latestWeight(who, weights);
  const preview = calcTargets(stored, lastW?.lb);
  const myWeights = weights.filter((w) => w.person === who).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const setBody = (c) => save('goals', { ...stored, ...c }, 'goals-' + who);
  const logWeight = (e) => {
    e.preventDefault();
    const lb = Number(wIn);
    if (!lb) return;
    save('weight', { person: who, date: today, lb, at: Date.now() }, 'weight-' + who + '-' + today);
    setWIn('');
  };
  const todaysMeals = meals.filter((m) => m.person === who && m.date === today).sort((a, b) => a.at - b.at);
  const tot = totals(todaysMeals);
  const [sortBy, setSortBy] = useState([null, 0]);
  // Numbers sort highest first on the first click; names A to Z. Third click goes back to time order.
  const sortMeals = (k) => {
    const first = k === 'name' ? 1 : -1;
    setSortBy(sortBy[0] !== k ? [k, first] : sortBy[1] === first ? [k, -first] : [null, 0]);
  };
  const sortedMeals = !sortBy[0] ? todaysMeals : [...todaysMeals].sort((a, b) => sortBy[1] * (sortBy[0] === 'name' ? a.name.localeCompare(b.name) : (a[sortBy[0]] || 0) - (b[sortBy[0]] || 0)));
  const water = waters.find((w) => w.id === 'water-' + who + '-' + today)?.count || 0;
  const todaysEx = exercise.filter((e) => e.person === who && e.date === today);

  const setGoal = (k, v) => save('goals', { ...stored, [k]: num(v) }, 'goals-' + who);
  const setWater = (n) => save('water', { person: who, date: today, count: Math.max(0, n) }, 'water-' + who + '-' + today);
  const mq = meal.name.trim().toLowerCase();
  const matches = mq && !pick ? recipes.filter((r) => (r.name || '').toLowerCase().includes(mq)).sort((a, b) => (a.name.toLowerCase().startsWith(mq) ? 0 : 1) - (b.name.toLowerCase().startsWith(mq) ? 0 : 1) || a.name.localeCompare(b.name)).slice(0, 6) : [];
  const showMenu = menu && matches.length > 0;
  const scaled = (r, n) => Object.fromEntries(MACROS.map(([k]) => [k, String(Math.round((r[k] || 0) * (num(n) || 0) * 10) / 10)]));
  const choose = (r) => { setPick(r); setServings('1'); setMeal({ name: r.name, ...scaled(r, 1) }); setMenu(false); };
  const setServ = (n) => { setServings(n); if (pick) setMeal({ ...meal, ...scaled(pick, n) }); };
  const mealKey = (e) => {
    if (!showMenu) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHl((hl + 1) % matches.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHl((hl - 1 + matches.length) % matches.length); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(matches[hl] || matches[0]); }
    else if (e.key === 'Escape') setMenu(false);
  };
  const addMeal = (e) => {
    e.preventDefault();
    if (!meal.name.trim()) return;
    const m = { name: meal.name.trim(), calories: num(meal.calories), protein: num(meal.protein), carbs: num(meal.carbs), fat: num(meal.fat) };
    save('meal', { person: who, date: today, at: Date.now(), ...m, ...(pick ? { recipe: pick.id, servings: num(servings) } : {}) });
    if (!pick && keep) save('recipe', { ...m, servings: 1, ingredients: '', steps: '', tags: '', link: '', by: me, added: Date.now() });
    setMeal({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    setPick(null); setServings('1'); setKeep(false);
  };
  const addEx = (e) => {
    e.preventDefault();
    if (!ex.what.trim()) return;
    save('exercise', { person: who, date: today, at: Date.now(), what: ex.what.trim(), minutes: num(ex.minutes) });
    save('journal', { type: 'health', text: ex.what.trim() + (ex.minutes ? ' · ' + ex.minutes + ' min' : ''), by: me, at: Date.now() });
    setEx({ what: '', minutes: '' });
  };
  const addMed = (e) => {
    e.preventDefault();
    if (!newMed.name.trim()) return;
    save('med', { ...newMed, name: newMed.name.trim(), person: who, active: true, order: myMeds.length + 1 });
    setNewMed({ name: '', schedule: '', time: '08:00', canSkip: false });
  };

  return (
    <>
      <header className="row between" style={{ alignItems: 'flex-end' }}>
        <div><div className="sub">{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div><h1>Health &amp; macros</h1></div>
        <div className="seg" role="group" aria-label="Whose health">
          {[me, other(me)].map((id) => <button key={id} type="button" aria-pressed={who === id} onClick={() => setWho(id)}>{id === me ? 'Me' : PEOPLE[id].name}</button>)}
        </div>
      </header>

      <section className="card" aria-labelledby="meds-h">
        <div className="row between"><h2 id="meds-h">Medication</h2><button type="button" className="btn ghost small" onClick={() => setEditMeds(!editMeds)}>{editMeds ? 'Done editing' : 'Edit meds'}</button></div>
        {!editMeds && (myMeds.length === 0 ? <div className="empty">No meds yet. Press "Edit meds" to add some.</div>
          : due.length === 0 ? <div className="note" style={{ borderLeft: '4px solid var(--hi)' }}>All handled for today.</div>
          : due.map((m) => (
            <div key={m.id} className="task">
              <div style={{ flex: 1 }}><b>{m.name}</b><div className="sub" style={{ fontSize: 13 }}>{[m.schedule, m.time && 'at ' + m.time].filter(Boolean).join(' · ')}</div></div>
              <button type="button" className="btn small" onClick={() => logMed(m, 'taken', me)}>Taken</button>
              {m.canSkip && <button type="button" className="btn ghost small" onClick={() => logMed(m, 'skipped', me)}>Skip today</button>}
            </div>
          )))}
        {!editMeds && handled.length > 0 && (
          <div className="row">
            {handled.map((m) => {
              const l = logOf(m);
              return <button key={m.id} type="button" className="chip" style={{ background: 'var(--inner)', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer', padding: '6px 10px' }} onClick={() => remove(l.id)} title="Undo">{(l.state === 'skipped' ? 'Skipped: ' : '✓ ') + m.name} · undo</button>;
            })}
          </div>
        )}
        {editMeds && (
          <>
            {meds.filter((m) => m.person === who).map((m) => (
              <div key={m.id} className="task" style={{ flexWrap: 'wrap', opacity: m.active === false ? 0.55 : 1 }}>
                <Live className="field" style={{ flex: '2 1 140px' }} value={m.name} onSave={(v) => save('med', { ...m, name: v }, m.id)} aria-label="Name" />
                <Live className="field" style={{ flex: '2 1 160px' }} value={m.schedule || ''} onSave={(v) => save('med', { ...m, schedule: v }, m.id)} placeholder="When / why" aria-label="Schedule" />
                <input className="field" type="time" style={{ flex: '0 1 120px' }} value={m.time || ''} onChange={(e) => save('med', { ...m, time: e.target.value }, m.id)} aria-label="Reminder time" />
                <label className="row" style={{ gap: 6, fontSize: 14 }}><input type="checkbox" checked={!!m.canSkip} onChange={(e) => save('med', { ...m, canSkip: e.target.checked }, m.id)} /> Can skip</label>
                <button type="button" className="btn ghost small" onClick={() => save('med', { ...m, active: m.active === false }, m.id)}>{m.active === false ? 'Bring back' : 'Retire'}</button>
              </div>
            ))}
            <form className="row" onSubmit={addMed}>
              <input className="field" style={{ flex: '2 1 140px' }} value={newMed.name} onChange={(e) => setNewMed({ ...newMed, name: e.target.value })} placeholder="New med" aria-label="New med name" />
              <input className="field" style={{ flex: '2 1 160px' }} value={newMed.schedule} onChange={(e) => setNewMed({ ...newMed, schedule: e.target.value })} placeholder="When / why" aria-label="New med schedule" />
              <input className="field" type="time" style={{ flex: '0 1 120px' }} value={newMed.time} onChange={(e) => setNewMed({ ...newMed, time: e.target.value })} aria-label="New med time" />
              <label className="row" style={{ gap: 6, fontSize: 14 }}><input type="checkbox" checked={newMed.canSkip} onChange={(e) => setNewMed({ ...newMed, canSkip: e.target.checked })} /> Can skip</label>
              <button className="btn small" type="submit">Add</button>
            </form>
            <div className="sub">Retired meds stay in history but stop showing up each day. Reminders fire at the time you set.</div>
          </>
        )}
      </section>

      <section className="card" aria-labelledby="mac-h">
        <div className="row between"><h2 id="mac-h">Macros today</h2>{!stored.auto && <button type="button" className="btn ghost small" onClick={() => setEditGoals(!editGoals)}>{editGoals ? 'Done' : 'Edit goals'}</button>}</div>
        <div className="sub" style={{ fontSize: 13 }}>{stored.auto ? (preview ? 'Targets worked out from body stats and latest weight (' + lastW.lb + ' lb).' : 'Add body stats and a weight below to work out targets.') : 'Using goals you typed in. Turn on "Work out my targets" below to use the formula.'}</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {MACROS.map(([k, label, unit]) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="row between" style={{ fontSize: 14 }}><b>{label}</b><span className="sub">{Math.round(tot[k])}{unit} of {editGoals ? <Live className="field" type="number" style={{ width: 90, minHeight: 32, display: 'inline-block' }} value={String(goals[k])} onSave={(v) => setGoal(k, v)} aria-label={label + ' goal'} /> : goals[k]}{unit}</span></div>
              <Bar value={tot[k]} goal={goals[k]} color={k === 'calories' ? 'var(--accent)' : color} />
            </div>
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="meal-h">
        <h2 id="meal-h">Meals</h2>
        {todaysMeals.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr>
                {[['name', 'Food'], ...MACROS.map(([k, l, u]) => [k, l + (u ? ' (' + u + ')' : '')])].map(([k, l]) => (
                  <th key={k} aria-sort={sortBy[0] === k ? (sortBy[1] > 0 ? 'ascending' : 'descending') : 'none'} style={{ textAlign: k === 'name' ? 'left' : 'right' }}>
                    <button type="button" onClick={() => sortMeals(k)}>{l}{sortBy[0] === k ? (sortBy[1] > 0 ? ' ▲' : ' ▼') : ''}</button>
                  </th>
                ))}
                <th><span className="sr-only">Remove</span></th>
              </tr></thead>
              <tbody>
                {sortedMeals.map((m) => (
                  <tr key={m.id}>
                    <td><b>{m.name}</b>{m.servings && m.servings !== 1 ? <span className="sub"> · {m.servings} servings</span> : null}</td>
                    {MACROS.map(([k]) => <td key={k} className="n">{Math.round((m[k] || 0) * 10) / 10}</td>)}
                    <td className="n"><button type="button" className="btn ghost small" aria-label={'Remove ' + m.name} onClick={() => remove(m.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
              {todaysMeals.length > 1 && <tfoot><tr><td>Total</td>{MACROS.map(([k]) => <td key={k} className="n">{Math.round(tot[k] * 10) / 10}</td>)}<td /></tr></tfoot>}
            </table>
            <div className="sub" style={{ fontSize: 12, marginTop: 6 }}>Click a column to sort. Click again to flip it{sortBy[0] ? ', or a third time to go back to the order you ate' : ''}.</div>
          </div>
        )}
        <form className="row" onSubmit={addMeal}>
          <div style={{ flex: '3 1 180px', position: 'relative' }}>
            <input className="field" style={{ width: '100%' }} value={meal.name} onChange={(e) => { setMeal({ ...meal, name: e.target.value }); setPick(null); setMenu(true); setHl(0); }} onKeyDown={mealKey} onFocus={() => setMenu(true)} onBlur={() => setTimeout(() => setMenu(false), 150)} placeholder={recipes.length ? 'Meal or recipe…' : 'What did you eat?'} aria-label="Meal" role="combobox" aria-expanded={showMenu} aria-controls="recipe-menu" aria-autocomplete="list" />
            {showMenu && (
              <div id="recipe-menu" role="listbox" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 5, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,.35)', overflow: 'hidden' }}>
                {matches.map((r, i) => (
                  <div key={r.id} role="option" aria-selected={i === hl} onMouseDown={(e) => { e.preventDefault(); choose(r); }} onMouseEnter={() => setHl(i)} style={{ padding: '8px 12px', cursor: 'pointer', background: i === hl ? 'var(--inner)' : 'transparent' }}>
                    <b>{r.name}</b><div className="sub" style={{ fontSize: 12 }}>{macroLine(r)} per serving</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {pick && <label className="row" style={{ gap: 6, fontSize: 14, flex: '0 1 auto' }}>Servings<input className="field" type="number" min="0" step="0.25" inputMode="decimal" style={{ width: 80 }} value={servings} onChange={(e) => setServ(e.target.value)} aria-label="Servings" /></label>}
          {MACROS.map(([k, label]) => <input key={k} className="field" type="number" inputMode="decimal" style={{ flex: '1 1 80px' }} value={meal[k]} onChange={(e) => setMeal({ ...meal, [k]: e.target.value })} placeholder={k === 'calories' ? 'Cal' : label[0] + ' (g)'} aria-label={label} />)}
          <button className="btn" type="submit">Log meal</button>
        </form>
        {pick ? <div className="sub" style={{ fontSize: 13 }}>From your recipe <b>{pick.name}</b>. Change servings to scale it, or edit any number before logging.</div>
          : meal.name.trim() && <label className="row" style={{ gap: 6, fontSize: 14 }}><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> Also save this to Recipes</label>}
      </section>

      <section className="card" aria-labelledby="body-h">
        <div className="row between">
          <h2 id="body-h">Body &amp; targets</h2>
          <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={!!stored.auto} onChange={(e) => setBody({ auto: e.target.checked })} style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} /> Work out my targets</label>
        </div>
        <form className="row" onSubmit={logWeight}>
          <span><b>Weight</b> {lastW ? <span className="sub">· latest {lastW.lb} lb on {lastW.date}</span> : <span className="sub">· none logged yet</span>}</span>
          <input className="field" type="number" step="0.1" inputMode="decimal" style={{ width: 120 }} value={wIn} onChange={(e) => setWIn(e.target.value)} placeholder="lb" aria-label="Today's weight in pounds" />
          <button className="btn small" type="submit">Log weight</button>
          {myWeights.length > 1 && <span className="sub" style={{ fontSize: 13 }}>{myWeights.map((w) => w.lb).join(' ← ')}</span>}
        </form>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <label className="lbl">Sex (for the formula)<select className="field" value={stored.sex || ''} onChange={(e) => setBody({ sex: e.target.value })}><option value="">Pick one</option><option value="male">Male</option><option value="female">Female</option></select></label>
          <label className="lbl">Age<Live className="field" type="number" value={String(stored.age || '')} onSave={(v) => setBody({ age: num(v) || null })} /></label>
          <label className="lbl">Height (ft)<Live className="field" type="number" value={stored.heightIn ? String(Math.floor(stored.heightIn / 12)) : ''} onSave={(v) => setBody({ heightIn: num(v) * 12 + ((stored.heightIn || 0) % 12) })} /></label>
          <label className="lbl">Height (in)<Live className="field" type="number" value={stored.heightIn ? String(stored.heightIn % 12) : ''} onSave={(v) => setBody({ heightIn: Math.floor((stored.heightIn || 0) / 12) * 12 + num(v) })} /></label>
          <label className="lbl">Activity<select className="field" value={String(stored.activity || '1.375')} onChange={(e) => setBody({ activity: e.target.value })}>{ACTIVITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="lbl">Goal<select className="field" value={String(stored.adjust || '0')} onChange={(e) => setBody({ adjust: e.target.value })}>{GOAL_ADJUST.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="lbl">Protein per lb<select className="field" value={String(stored.proteinPerLb || '0.8')} onChange={(e) => setBody({ proteinPerLb: e.target.value })}>{['0.6', '0.7', '0.8', '0.9', '1', '1.1'].map((v) => <option key={v} value={v}>{v} g</option>)}</select></label>
          <label className="lbl">Fat share<select className="field" value={String(stored.fatPct || '25')} onChange={(e) => setBody({ fatPct: e.target.value })}>{['20', '25', '30', '35'].map((v) => <option key={v} value={v}>{v}% of calories</option>)}</select></label>
        </div>
        {preview && <div className="note">Burns about <b>{preview.bmr}</b> cal at rest. Daily targets: <b>{preview.calories}</b> cal · protein <b>{preview.protein}g</b> · carbs <b>{preview.carbs}g</b> · fat <b>{preview.fat}g</b> · water <b>{preview.water}</b> glasses.{!stored.auto && ' Tick "Work out my targets" to use these.'}</div>}
        <div className="sub" style={{ fontSize: 12 }}>Uses the Mifflin-St Jeor formula. Protein comes from your weight, fat from the share you pick, carbs fill the rest. Targets update every time you log a new weight. These are estimates, so check with a doctor or dietitian for medical needs.</div>
      </section>

      <div className="grid">
        <section className="card" aria-labelledby="water-h">
          <h2 id="water-h">Water</h2>
          <div className="row">
            <button type="button" className="btn ghost" aria-label="One less glass" onClick={() => setWater(water - 1)}>−</button>
            <span className="display" style={{ fontSize: 28, minWidth: 90, textAlign: 'center' }}>{water} / {goals.water}</span>
            <button type="button" className="btn" aria-label="One more glass" onClick={() => setWater(water + 1)}>+</button>
            <span className="sub">glasses</span>
          </div>
          <Bar value={water} goal={goals.water} color="var(--hi)" />
          {editGoals && <label className="lbl">Daily water goal (glasses)<Live className="field" type="number" value={String(goals.water)} onSave={(v) => setGoal('water', v)} /></label>}
        </section>
        <section className="card" aria-labelledby="ex-h">
          <h2 id="ex-h">Exercise</h2>
          {todaysEx.map((e) => (
            <div key={e.id} className="task"><div style={{ flex: 1 }}><b>{e.what}</b>{e.minutes ? <span className="sub"> · {e.minutes} min</span> : null}</div><button type="button" className="btn ghost small" aria-label={'Remove ' + e.what} onClick={() => remove(e.id)}>✕</button></div>
          ))}
          <form className="row" onSubmit={addEx}>
            <input className="field" style={{ flex: '2 1 160px' }} value={ex.what} onChange={(e) => setEx({ ...ex, what: e.target.value })} placeholder="Walk, gym, yoga…" aria-label="Exercise" />
            <input className="field" type="number" style={{ flex: '1 1 80px' }} value={ex.minutes} onChange={(e) => setEx({ ...ex, minutes: e.target.value })} placeholder="Min" aria-label="Minutes" />
            <button className="btn" type="submit">Log</button>
          </form>
        </section>
      </div>
    </>
  );
}
