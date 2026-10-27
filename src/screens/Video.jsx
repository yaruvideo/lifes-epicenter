import { useState } from 'react';
import { newId, patch, remove, save } from '../db.js';
import { useItems } from '../store.js';
import Live from './Live.jsx';
import SectionInbox from './SectionInbox.jsx';
import useDragSort, { sortKeyOf } from './useDragSort.jsx';

const STAGES = ['Idea', 'Script', 'Record', 'Edit', 'Publish'];
const TEMPLATES = {
  long: { name: 'Long-form', desc: 'A full episode with a written script.', outline: 'Hook (first 30s):\n\nIntro:\n\nMain points:\n1.\n2.\n3.\n\nOutro / call to action:', lists: { Idea: ['Working title', 'Who is it for?'], Script: ['Outline', 'Full draft', 'Read-through'], Record: ['Set up mic + lighting', 'Record A-roll', 'Record B-roll'], Edit: ['Rough cut', 'Music + SFX', 'Captions', 'Color + audio pass'], Publish: ['Thumbnail', 'Title + description', 'Tags + end screen', 'Schedule'] } },
  journal: { name: 'Play journal', desc: 'Your journaling series. Pulls notes from a game\'s session log.', outline: 'Session recap:\n\nHighlights & timestamps:\n\nThoughts / reactions:\n\nNext session plan:', lists: { Idea: ['Pick the game + session'], Script: ['Pull notes from the game\'s session log'], Record: ['Record gameplay', 'Record voiceover'], Edit: ['Cut highlights', 'Add chapter markers'], Publish: ['Thumbnail', 'Title (Ep #)', 'Add to playlist'] } },
  devlog: { name: 'Devlog', desc: 'Show what changed in your game. Links to Game Dev cards.', outline: 'What I worked on:\n\nShow & tell:\n\nProblems + how I solved them:\n\nWhat\'s next:', lists: { Idea: ['Pick features to show'], Script: ['Bullet points from Game Dev notes'], Record: ['Capture footage', 'Record voiceover'], Edit: ['Cut + captions'], Publish: ['Thumbnail', 'Post links (Steam, socials)'] } },
  short: { name: 'Short', desc: 'Vertical, under 60 seconds.', outline: 'Hook (1s):\n\nPayoff:\n\nLoop back:', lists: { Idea: ['Hook idea'], Script: ['3-line script'], Record: ['Vertical capture'], Edit: ['Captions', 'Under 60s'], Publish: ['Title + hashtags'] } }
};

// Matches the mockup: one row per video with its stage strip, the picked video's details below.
function Details({ v, me }) {
  const t = TEMPLATES[v.template] || TEMPLATES.long;
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
          <div className="sub" style={{ fontSize: 13 }}>{[v.parked && 'On hold (in Inbox)', v.series, t.name + ' template'].filter(Boolean).join(' · ')}</div>
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
      <div className="row">
        {!v.done && <button type="button" className="btn ghost small" onClick={() => patch(v.id, v.parked ? { parked: false } : { parked: true, sortKey: Date.now() })}>{v.parked ? '↑ Make active again' : '↓ Move to Inbox (on hold)'}</button>}
        <button type="button" className="btn ghost small" onClick={() => { if (confirm('Delete this video project?')) remove(v.id); }}>Delete video</button>
      </div>
    </section>
  );
}

function Strip({ v, onStage }) {
  const i = STAGES.indexOf(v.stage);
  return (
    <span style={{ flex: '2 1 360px', display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 4 }}>
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
  const active = videos.filter((v) => !v.done && !v.parked).sort((a, b) => (a.publishDate || '9999').localeCompare(b.publishDate || '9999') || (b.created || 0) - (a.created || 0));
  // On hold: videos moved to the Inbox, in your own drag-and-drop order.
  const parked = videos.filter((v) => !v.done && v.parked).sort((a, b) => sortKeyOf(a) - sortKeyOf(b));
  const { handle, dragClass } = useDragSort(parked);
  const done = videos.filter((v) => v.done).sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
  const sel = videos.find((v) => v.id === selId) || active[0];
  const create = (k) => {
    const t = TEMPLATES[k];
    const checklist = Object.fromEntries(STAGES.map((s) => [s, (t.lists[s] || []).map((text) => ({ id: newId(), text, done: false }))]));
    save('video', { title: 'New ' + t.name.toLowerCase(), template: k, stage: 'Idea', checklist, script: t.outline, notes: '', created: Date.now() }).then((v) => { setPicker(false); setSelId(v.id); });
  };
  const row = (v) => {
    const l = v.checklist?.[v.stage] || [];
    const meta = [v.series || (TEMPLATES[v.template] || TEMPLATES.long).name, v.done ? 'Published ' + new Date(v.publishedAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' }) : v.publishDate ? 'Publish ' + new Date(v.publishDate + 'T12:00').toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'No date', !v.done && l.length ? l.filter((c) => c.done).length + '/' + l.length + ' done' : ''].filter(Boolean).join(' · ');
    return (
      <div key={v.id} role="button" tabIndex={0} className={'vrow' + (sel && v.id === sel.id ? ' on' : '')} onClick={() => setSelId(v.id)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelId(v.id))} aria-pressed={sel && v.id === sel.id}>
        <span style={{ flex: '1 1 220px', minWidth: 0 }}><b style={{ display: 'block' }}>{v.title}</b><span className="sub" style={{ fontSize: 12 }}>{meta}</span></span>
        <Strip v={v} onStage={v.done ? null : (s) => { setSelId(v.id); save('video', { ...v, stage: s }, v.id); }} />
      </div>
    );
  };
  return (
    <>
      <header className="row between" style={{ alignItems: 'flex-end' }}>
        <div><div className="sub row" style={{ gap: 8 }}><span className="dot" style={{ background: '#F2545B' }} />Section</div><h1>Video Projects</h1></div>
        <button type="button" className="btn vid" onClick={() => setPicker(true)}>+ New video from template</button>
      </header>
      <section aria-label="Projects" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
              <span className="sub" style={{ display: 'block', fontSize: 12 }}>{[v.series || (TEMPLATES[v.template] || TEMPLATES.long).name, v.stage, v.publishDate && 'Publish ' + v.publishDate].filter(Boolean).join(' · ')}</span>
            </button>
            <button type="button" className="btn ghost small" onClick={() => { patch(v.id, { parked: false }); setSelId(v.id); }}>Make active</button>
          </div>
        ))}
      </section>
      <SectionInbox me={me} listId="video" />
      {picker && (
        <div className="modal-back" onClick={(e) => e.target === e.currentTarget && setPicker(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Start a video from a template">
            <h2>Start a video from a template</h2>
            <div className="sub">Each template sets up the script outline and a checklist for every stage.</div>
            <div className="themes" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              {Object.entries(TEMPLATES).map(([k, t]) => (
                <button key={k} type="button" className="theme" onClick={() => create(k)}>
                  <b>{t.name}</b><span className="sub" style={{ fontSize: 13, lineHeight: 1.4 }}>{t.desc}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn ghost" style={{ alignSelf: 'flex-end' }} onClick={() => setPicker(false)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
