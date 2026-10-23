import { useState } from 'react';
import { remove, save } from '../db.js';
import { useItems, other, ownerLabel, todayStr } from '../store.js';
import { PEOPLE } from '../config.js';
import useTaskActions from './useTaskActions.jsx';

const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const colorOf = (who) => (who === 'both' ? 'var(--hi)' : PEOPLE[who]?.color || 'var(--accent)');

function mondayOf(offsetWeeks) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offsetWeeks * 7);
  return d;
}

export default function Calendar({ me }) {
  const events = useItems('event');
  const tasks = useItems('task');
  const [week, setWeek] = useState(0);
  const [who, setWho] = useState('all');
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState(null);
  const { onOpen, overlays } = useTaskActions(me);

  const start = mondayOf(week);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  const today = todayStr();
  const show = (w) => who === 'all' || w === who || w === 'both';
  const [ed, setEd] = useState(null);
  const selected = sel && ed && ed.id === sel ? ed : null;
  const pick = (e) => { setDraft(null); setSel(e.id); setEd(e); };

  const openNew = (date) => { setSel(null); setDraft({ title: '', date, time: '', who: me, notes: '' }); };
  const saveDraft = (e) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    save('event', { ...draft, title: draft.title.trim() }).then((row) => pick(row));
  };
  const edit = (changes) => { const next = { ...ed, ...changes }; setEd(next); save('event', next, next.id); };

  const form = (val, set, onSubmit, submitLabel) => (
    <form style={{ display: 'flex', flexDirection: 'column', gap: 10 }} onSubmit={onSubmit}>
      <label className="lbl">Title<input className="field" autoFocus={!!onSubmit} value={val.title} onChange={(e) => set({ title: e.target.value })} /></label>
      <div className="row">
        <label className="lbl" style={{ flex: 1 }}>Date<input type="date" className="field" value={val.date} onChange={(e) => set({ date: e.target.value })} /></label>
        <label className="lbl" style={{ flex: 1 }}>Time<input type="time" className="field" value={val.time || ''} onChange={(e) => set({ time: e.target.value })} /></label>
      </div>
      <label className="lbl">Who
        <select className="field" value={val.who} onChange={(e) => set({ who: e.target.value })}>
          <option value={me}>Me</option><option value={other(me)}>{PEOPLE[other(me)].name}</option><option value="both">Together</option>
        </select>
      </label>
      <label className="lbl">Notes<textarea className="field" value={val.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></label>
      {submitLabel && <button className="btn" type="submit">{submitLabel}</button>}
    </form>
  );

  return (
    <>
      <header className="row between" style={{ alignItems: 'flex-end' }}>
        <div>
          <div className="sub">{days[0].toLocaleDateString([], { month: 'long', day: 'numeric' })} – {days[6].toLocaleDateString([], { month: 'long', day: 'numeric' })}</div>
          <h1>Calendar</h1>
        </div>
        <div className="row">
          <div className="seg" role="group" aria-label="Show">
            {[['all', 'Everyone'], [me, 'Me'], [other(me), PEOPLE[other(me)].name]].map(([id, l]) => <button key={id} type="button" aria-pressed={who === id} onClick={() => setWho(id)}>{l}</button>)}
          </div>
          <button type="button" className="btn ghost small" aria-label="Previous week" onClick={() => setWeek(week - 1)}>‹</button>
          <button type="button" className="btn ghost small" onClick={() => setWeek(0)}>This week</button>
          <button type="button" className="btn ghost small" aria-label="Next week" onClick={() => setWeek(week + 1)}>›</button>
          <button type="button" className="btn" onClick={() => openNew(week === 0 ? today : iso(days[0]))}>+ New event</button>
        </div>
      </header>
      <div className="row sub" style={{ fontSize: 13 }}>
        <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: PEOPLE[me].color }} />Me</span>
        <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: PEOPLE[other(me)].color }} />{PEOPLE[other(me)].name}</span>
        <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: 'var(--hi)' }} />Together</span>
        <span className="row" style={{ gap: 6 }}><span className="dot" style={{ border: '2px dashed var(--muted)' }} />Task due</span>
        <span>Google Calendar events are copied in each morning by Claude (edit those in Google Calendar).</span>
      </div>
      <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: '999 1 600px', minWidth: 0, overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(108px, 1fr))', gap: 8, minWidth: 780 }}>
            {days.map((d) => {
              const ds = iso(d);
              const evs = events.filter((e) => e.date === ds && show(e.who)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
              const due = tasks.filter((t) => !t.done && t.due === ds && show(t.owner));
              return (
                <section key={ds} aria-label={d.toDateString()} style={{ minHeight: 440, padding: 8, borderRadius: 'calc(var(--r) + 4px)', display: 'flex', flexDirection: 'column', gap: 6, background: ds === today ? 'color-mix(in srgb, var(--accent) 12%, var(--panel))' : 'var(--panel)', border: '1px solid ' + (ds === today ? 'var(--accent)' : 'var(--border)') }}>
                  <button type="button" onClick={() => openNew(ds)} title="Add an event" style={{ display: 'flex', justifyContent: 'space-between', background: 'none', border: 0, padding: '2px 2px 6px', cursor: 'pointer' }}>
                    <span className="sub">{d.toLocaleDateString([], { weekday: 'short' })}</span>
                    <span className="display" style={{ fontSize: 18 }}>{d.getDate()}</span>
                  </button>
                  {evs.map((e) => (
                    <button key={e.id} type="button" onClick={() => pick(e)} style={{ textAlign: 'left', padding: 8, borderRadius: 'var(--r)', border: 0, cursor: 'pointer', fontSize: 13, background: colorOf(e.who), color: 'var(--on-accent)', outline: sel === e.id ? '3px solid var(--text)' : 'none', outlineOffset: 2 }}>
                      {e.time && <span style={{ display: 'block', fontSize: 12, opacity: 0.85 }}>{e.time}</span>}
                      <b>{e.title}</b>
                    </button>
                  ))}
                  {due.map((t) => (
                    <button key={t.id} type="button" onClick={() => onOpen(t)} style={{ textAlign: 'left', padding: 8, borderRadius: 'var(--r)', cursor: 'pointer', fontSize: 13, background: 'transparent', border: '2px dashed ' + colorOf(t.owner) }}>
                      <span style={{ display: 'block', fontSize: 12 }} className="sub">Task due</span>{t.title}
                    </button>
                  ))}
                </section>
              );
            })}
          </div>
        </div>
        <aside className="card" style={{ flex: '1 1 260px', minWidth: 0 }} aria-label="Event details">
          {draft && <><h2>New event</h2>{form(draft, (c) => setDraft({ ...draft, ...c }), saveDraft, 'Save event')}</>}
          {!draft && selected && (
            <>
              <div className="sub">{ownerLabel(selected.who, me)}{selected.source === 'google' ? ' · from Google Calendar (' + (selected.calendar || 'Google') + '). Changes here stay in the app only.' : ''}</div>
              {form(selected, edit)}
              <button type="button" className="btn ghost small" onClick={() => { if (confirm('Delete "' + selected.title + '"?')) { remove(selected.id); setSel(null); } }}>Delete event</button>
            </>
          )}
          {!draft && !selected && <div className="sub">Pick an event to see or edit it, or click a day's date to add one. Tasks with a due date show up as dashed boxes.</div>}
        </aside>
      </div>
      {overlays}
    </>
  );
}
