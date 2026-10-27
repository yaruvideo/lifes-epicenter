import { useState } from 'react';
import { newId, patch, remove, save } from '../db.js';
import { useItems } from '../store.js';
import Live from './Live.jsx';
import SectionInbox from './SectionInbox.jsx';
import useDragSort, { sortKeyOf } from './useDragSort.jsx';
import { DEFAULT_TEMPLATES, VIDEO_STAGES, fromTemplate, saveTemplates, useTemplates } from '../projects.js';

// Each video carries its own steps (v.stages) so its layout can change after a template is applied.
const stagesOf = (v) => (v.stages && v.stages.length ? v.stages : VIDEO_STAGES);
const templateLabel = (v) => v.templateName || (DEFAULT_TEMPLATES.video.find((t) => t.id === v.template) || {}).name || 'Custom';
const stageRank = (v) => { const st = stagesOf(v); return st.length > 1 ? st.indexOf(v.stage) / (st.length - 1) : 0; };

// Matches the mockup: one row per video with its stage strip, the picked video's details below.
function Details({ v, me }) {
  const STAGES = stagesOf(v);
  const templates = useTemplates('video');
  const [editSteps, setEditSteps] = useState(false);
  const set = (c) => save('video', { ...v, ...c }, v.id);
  const list = v.checklist?.[v.stage] || [];
  const setList = (l) => set({ checklist: { ...v.checklist, [v.stage]: l } });
  const [newItem, setNewItem] = useState('');
  const i = STAGES.indexOf(v.stage);
  const advance = () => {
    if (i < STAGES.length - 1) set({ stage: STAGES[i + 1] });
    else { set({ done: true, publishedAt: Date.now() }); save('journal', { type: 'task', title: v.title, list: 'video', text: 'Published', by: me, at: Date.now() }); }
  };
  return (
    <section className="card" aria-label="Project details" style={{ gap: 18 }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sub" style={{ fontSize: 13 }}>{[v.parked && 'On hold (in Inbox)', v.series, templateLabel(v) === 'Custom' ? 'Custom layout' : templateLabel(v) + ' template'].filter(Boolean).join(' · ')}</div>
          <Live className="field display" style={{ fontSize: 26, fontWeight: 600, background: 'transparent', border: 0, padding: 0, minHeight: 0 }} value={v.title} onSave={(val) => set({ title: val || 'Untitled video' })} aria-label="Video title" />
        </div>
        {!v.done ? <button type="button" className="btn vid" onClick={advance}>{i < STAGES.length - 1 ? 'Move to ' + STAGES[i + 1] + ' →' : 'Mark published ✓'}</button>
          : <button type="button" className="btn ghost" onClick={() => patch(v.id, { done: false })}>Reopen</button>}
      </div>
      <div className="row" style={{ alignItems: 'flex-start', gap: 20 }}>
        <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 className="display" style={{ margin: 0, fontSize: 17 }}>{v.stage} checklist</h3>
          {list.map((c) => (
            <div key={c.id} className={'task' + (c.done ? ' isdone' : '')}>
              <button type="button" className={'check' + (c.done ? ' done' : '')} aria-label={(c.done ? 'Uncheck ' : 'Check ') + c.text} onClick={() => setList(list.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))}>{c.done ? '✓' : ''}</button>
              <span className="title" style={{ cursor: 'default' }}>{c.text}</span>
              <button type="button" className="btn ghost small" aria-label={'Remove ' + c.text} onClick={() => setList(list.filter((x) => x.id !== c.id))}>✕</button>
            </div>
          ))}
          <form className="row" onSubmit={(e) => { e.preventDefault(); if (newItem.trim()) { setList([...list, { id: newId(), text: newItem.trim(), done: false }]); setNewItem(''); } }}>
            <input className="field" style={{ flex: 1 }} value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add a checklist item" aria-label="New checklist item" />
            <button className="btn small" type="submit">Add</button>
          </form>
          <div className="sub" style={{ fontSize: 12 }}>Each stage has its own checklist from the template. Jump to any stage by clicking it in the strip above.</div>
        </div>
        <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 className="display" style={{ margin: 0, fontSize: 17 }}>Script &amp; notes</h3>
          <Live as="textarea" className="field" style={{ minHeight: 200 }} value={v.script || ''} onSave={(val) => set({ script: val })} aria-label="Script and notes" />
          <div className="row" style={{ gap: 8 }}>
            <label className="pill">Publish: <input type="date" value={v.publishDate || ''} onChange={(e) => set({ publishDate: e.target.value || null })} aria-label="Publish date" /></label>
            <label className="pill">Series: <Live value={v.series || ''} onSave={(val) => set({ series: val })} placeholder="none" aria-label="Series" /></label>
            <label className="pill">Footage: <Live value={v.footage || ''} onSave={(val) => set({ footage: val })} placeholder="paste folder link" aria-label="Footage folder link" /></label>
            {/^https?:/.test(v.footage || '') && <a className="pill" href={v.footage} target="_blank" rel="noreferrer">Open footage ↗</a>}
          </div>
        </div>
      </div>
      {editSteps && <StepsEditor v={v} set={set} />}
      <div className="row">
        <button type="button" className="btn ghost small" aria-expanded={editSteps} onClick={() => setEditSteps(!editSteps)}>{editSteps ? 'Done editing steps' : '✎ Edit steps'}</button>
        <button type="button" className="btn ghost small" onClick={() => {
          const name = prompt('Name for the new template:', templateLabel(v) === 'Custom' ? v.title : templateLabel(v) + ' (custom)');
          if (name) saveTemplates('video', [...templates, { id: newId(), name, desc: 'Saved from "' + v.title + '"', outline: v.script || '', steps: STAGES.map((n) => ({ name: n, items: (v.checklist?.[n] || []).map((c) => c.text) })) }]).then(() => alert('Saved. It\'s in "+ New video" and in Settings → Project templates.'));
        }}>Save as template</button>
        {!v.done && <button type="button" className="btn ghost small" onClick={() => patch(v.id, v.parked ? { parked: false } : { parked: true, sortKey: Date.now() })}>{v.parked ? '↑ Make active again' : '↓ Move to Inbox (on hold)'}</button>}
        <button type="button" className="btn ghost small" onClick={() => { if (confirm('Delete this video project?')) remove(v.id); }}>Delete video</button>
      </div>
    </section>
  );
}

// Change one video's steps after it's made: rename (its checklist follows), reorder, add or remove.
function StepsEditor({ v, set }) {
  const st = stagesOf(v);
  const cl = v.checklist || {};
  const rename = (from, to) => {
    to = to.trim();
    if (!to || to === from || st.includes(to)) return false;
    const { [from]: items, ...rest } = cl;
    set({ stages: st.map((x) => (x === from ? to : x)), checklist: { ...rest, [to]: items || [] }, stage: v.stage === from ? to : v.stage });
    return true;
  };
  const move = (i, d) => { const s = [...st]; const j = i + d; if (j < 0 || j >= s.length) return; [s[i], s[j]] = [s[j], s[i]]; set({ stages: s }); };
  const drop = (name) => {
    const n = (cl[name] || []).length;
    if (n && !confirm('Remove the "' + name + '" step and its ' + n + ' checklist item(s)?')) return;
    const { [name]: _gone, ...rest } = cl;
    const s = st.filter((x) => x !== name);
    set({ stages: s, checklist: rest, stage: v.stage === name ? s[Math.max(0, st.indexOf(name) - 1)] : v.stage });
  };
  const add = () => { let n = 'New step', k = 2; while (st.includes(n)) n = 'New step ' + k++; set({ stages: [...st, n], checklist: { ...cl, [n]: [] } }); };
  return (
    <div className="note" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <b>Steps for this video</b>
      <div className="sub" style={{ fontSize: 13 }}>Only this video changes. Each step keeps its own checklist, which you edit by picking the step in the strip above.</div>
      {st.map((name, i) => (
        <div key={name} className="row" style={{ flexWrap: 'nowrap' }}>
          <input className="field" style={{ flex: 1 }} defaultValue={name} aria-label={'Rename step ' + name} onBlur={(e) => { if (!rename(name, e.target.value)) e.target.value = name; }} />
          <span className="sub" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{(cl[name] || []).length} items</span>
          <button type="button" className="btn ghost small" disabled={i === 0} aria-label={'Move ' + name + ' earlier'} onClick={() => move(i, -1)}>↑</button>
          <button type="button" className="btn ghost small" disabled={i === st.length - 1} aria-label={'Move ' + name + ' later'} onClick={() => move(i, 1)}>↓</button>
          <button type="button" className="btn ghost small" disabled={st.length < 2} aria-label={'Remove step ' + name} onClick={() => drop(name)}>✕</button>
        </div>
      ))}
      <button type="button" className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={add}>+ Add step</button>
    </div>
  );
}

// Share of the whole project's checklist ticked off, across every step.
const progress = (v) => {
  const all = Object.values(v.checklist || {}).flat();
  return all.length ? all.filter((c) => c.done).length / all.length : 0;
};

function Strip({ v, onStage }) {
  const STAGES = stagesOf(v);
  const i = STAGES.indexOf(v.stage);
  return (
    <span style={{ flex: '2 1 360px', display: 'grid', gridTemplateColumns: 'repeat(' + STAGES.length + ', minmax(0, 1fr))', gap: 4 }}>
      {STAGES.map((s, j) => (
        <span key={s} className={'stage' + (v.done || j < i ? ' past' : j === i ? ' now' : '')} onClick={onStage ? (e) => { e.stopPropagation(); onStage(s); } : undefined}>{s}</span>
      ))}
    </span>
  );
}

export default function Video({ me }) {
  const videos = useItems('video');
  const [selId, setSelId] = useState(null);
  const [picker, setPicker] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const prefs = useItems('prefs').find((p) => p.id === 'prefs-' + me) || {};
  const sortBy = (prefs.sortBy || {}).videos || 'date';
  const setSort = (v) => save('prefs', { ...prefs, sortBy: { ...(prefs.sortBy || {}), videos: v } }, 'prefs-' + me);
  const byDate = (a, b) => (a.publishDate || '9999').localeCompare(b.publishDate || '9999') || (b.created || 0) - (a.created || 0);
  const sorters = {
    date: byDate,
    stage: (a, b) => stageRank(b) - stageRank(a) || byDate(a, b),
    stageUp: (a, b) => stageRank(a) - stageRank(b) || byDate(a, b),
    mine: (a, b) => sortKeyOf(a) - sortKeyOf(b),
    series: (a, b) => (a.series || '~').localeCompare(b.series || '~') || byDate(a, b),
    progress: (a, b) => progress(b) - progress(a) || byDate(a, b),
    alpha: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true }),
    newest: (a, b) => (b.created || 0) - (a.created || 0)
  };
  const active = videos.filter((v) => !v.done && !v.parked).sort(sorters[sortBy] || byDate);
  const activeDrag = useDragSort(active, sortBy === 'mine');
  // On hold: videos moved to the Inbox, in your own drag-and-drop order.
  const parked = videos.filter((v) => !v.done && v.parked).sort((a, b) => sortKeyOf(a) - sortKeyOf(b));
  const { handle, dragClass } = useDragSort(parked);
  const done = videos.filter((v) => v.done).sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
  const sel = videos.find((v) => v.id === selId) || active[0];
  const templates = useTemplates('video');
  // t is a template, or null for a blank project with the usual five steps and empty checklists.
  const create = (t) => {
    const { stages, checklist } = fromTemplate(t, VIDEO_STAGES);
    save('video', { title: t ? 'New ' + t.name.toLowerCase() : 'New video', template: t?.id || null, templateName: t?.name || 'Custom', stages, stage: stages[0], checklist, script: t?.outline || '', notes: '', created: Date.now() }).then((v) => { setPicker(false); setSelId(v.id); });
  };
  const row = (v) => {
    const l = v.checklist?.[v.stage] || [];
    const meta = [v.series || templateLabel(v), v.done ? 'Published ' + new Date(v.publishedAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' }) : v.publishDate ? 'Publish ' + new Date(v.publishDate + 'T12:00').toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'No date', !v.done && l.length ? l.filter((c) => c.done).length + '/' + l.length + ' done' : ''].filter(Boolean).join(' · ');
    return (
      <div key={v.id} data-drag-id={v.id} role="button" tabIndex={0} className={'vrow' + (sel && v.id === sel.id ? ' on' : '') + (v.done || v.parked ? '' : activeDrag.dragClass(v))} onClick={() => setSelId(v.id)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelId(v.id))} aria-pressed={sel && v.id === sel.id}>
        {!v.done && activeDrag.handle(v)}
        <span style={{ flex: '1 1 220px', minWidth: 0 }}><b style={{ display: 'block' }}>{v.title}</b><span className="sub" style={{ fontSize: 12 }}>{meta}</span></span>
        <Strip v={v} onStage={v.done ? null : (s) => { setSelId(v.id); save('video', { ...v, stage: s }, v.id); }} />
      </div>
    );
  };
  return (
    <>
      <header className="row between" style={{ alignItems: 'flex-end' }}>
        <div><div className="sub row" style={{ gap: 8 }}><span className="dot" style={{ background: '#F2545B' }} />Section</div><h1>Video Projects</h1></div>
        <button type="button" className="btn vid" onClick={() => setPicker(true)}>+ New video</button>
      </header>
      <section aria-label="Projects" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {active.length > 1 && (
          <label className="row sub" style={{ gap: 8, fontSize: 14, alignSelf: 'flex-end' }}>Sort by
            <select className="field" style={{ width: 'auto', minHeight: 36 }} value={sortBy} onChange={(e) => setSort(e.target.value)}>
              <option value="date">Publish date (soonest first)</option>
              <option value="stage">Current step (furthest along first)</option>
              <option value="stageUp">Current step (just started first)</option>
              <option value="mine">My order (drag)</option>
              <option value="progress">Checklist progress (most done first)</option>
              <option value="series">Series</option>
              <option value="alpha">A to Z</option>
              <option value="newest">Newest first</option>
            </select>
          </label>
        )}
        {active.length === 0 && <div className="empty">No videos in progress. Start one from a template.</div>}
        {active.map(row)}
        {done.length > 0 && <button type="button" className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setShowDone(!showDone)}>{showDone ? 'Hide' : 'Show'} published ({done.length})</button>}
        {showDone && done.map(row)}
      </section>
      {sel && <Details key={sel.id} v={sel} me={me} />}
      <section className="card" aria-labelledby="vinbox-h">
        <h2 id="vinbox-h">Inbox <span className="sub" style={{ fontSize: 14, fontWeight: 400 }}>on hold · {parked.length}</span></h2>
        {parked.length === 0 && <div className="empty">Videos you put on hold or postpone land here. Use "Move to Inbox" under a video's details.</div>}
        {parked.map((v) => (
          <div key={v.id} data-drag-id={v.id} className={'task' + dragClass(v)} style={sel && v.id === sel.id ? { boxShadow: 'inset 3px 0 0 #F2545B' } : undefined}>
            {handle(v)}
            <button type="button" className="title" onClick={() => setSelId(v.id)}>
              {v.title}
              <span className="sub" style={{ display: 'block', fontSize: 12 }}>{[v.series || templateLabel(v), v.stage, v.publishDate && 'Publish ' + v.publishDate].filter(Boolean).join(' · ')}</span>
            </button>
            <button type="button" className="btn ghost small" onClick={() => { patch(v.id, { parked: false }); setSelId(v.id); }}>Make active</button>
          </div>
        ))}
      </section>
      <SectionInbox me={me} listId="video" />
      {picker && (
        <div className="modal-back" onClick={(e) => e.target === e.currentTarget && setPicker(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Start a new video">
            <h2>Start a new video</h2>
            <div className="sub">Pick a template or start blank. Templates are edited in Settings → Project templates.</div>
            <div className="themes" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              {templates.map((t) => (
                <button key={t.id} type="button" className="theme" onClick={() => create(t)}>
                  <b>{t.name}</b><span className="sub" style={{ fontSize: 13, lineHeight: 1.4 }}>{t.desc || t.steps.map((x) => x.name).join(' → ')}</span>
                </button>
              ))}
              <button type="button" className="theme" onClick={() => create(null)}>
                <b>Blank project</b><span className="sub" style={{ fontSize: 13, lineHeight: 1.4 }}>No template. Starts with the usual steps and empty checklists, and you set it up with "Edit steps".</span>
              </button>
            </div>
            <button type="button" className="btn ghost" style={{ alignSelf: 'flex-end' }} onClick={() => setPicker(false)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
