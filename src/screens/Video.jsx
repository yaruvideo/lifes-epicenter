import { useState } from 'react';
import { newId, patch, remove, save } from '../db.js';
import { useItems } from '../store.js';
import Live from './Live.jsx';

const STAGES = ['Idea', 'Script', 'Record', 'Edit', 'Publish'];
const TEMPLATES = {
  long: { name: 'Long-form', outline: 'Hook (first 30s):\n\nIntro:\n\nMain points:\n1.\n2.\n3.\n\nOutro / call to action:', lists: { Idea: ['Working title', 'Who is it for?'], Script: ['Outline', 'Full draft', 'Read-through'], Record: ['Set up mic + lighting', 'Record A-roll', 'Record B-roll'], Edit: ['Rough cut', 'Music + SFX', 'Captions', 'Color + audio pass'], Publish: ['Thumbnail', 'Title + description', 'Tags + end screen', 'Schedule'] } },
  journal: { name: 'Play journal', outline: 'Session recap:\n\nHighlights & timestamps:\n\nThoughts / reactions:\n\nNext session plan:', lists: { Idea: ['Pick the game + session'], Script: ['Pull notes from the game\'s session log'], Record: ['Record gameplay', 'Record voiceover'], Edit: ['Cut highlights', 'Add chapter markers'], Publish: ['Thumbnail', 'Title (Ep #)', 'Add to playlist'] } },
  devlog: { name: 'Devlog', outline: 'What I worked on:\n\nShow & tell:\n\nProblems + how I solved them:\n\nWhat\'s next:', lists: { Idea: ['Pick features to show'], Script: ['Bullet points from Game Dev notes'], Record: ['Capture footage', 'Record voiceover'], Edit: ['Cut + captions'], Publish: ['Thumbnail', 'Post links (Steam, socials)'] } },
  short: { name: 'Short', outline: 'Hook (1s):\n\nPayoff:\n\nLoop back:', lists: { Idea: ['Hook idea'], Script: ['3-line script'], Record: ['Vertical capture'], Edit: ['Captions', 'Under 60s'], Publish: ['Title + hashtags'] } }
};

function VideoModal({ v, me, onClose }) {
  const [it, setIt] = useState(v);
  const t = TEMPLATES[it.template] || TEMPLATES.long;
  const set = (c) => { const n = { ...it, ...c }; setIt(n); save('video', n, it.id); };
  const list = it.checklist?.[it.stage] || [];
  const setList = (l) => set({ checklist: { ...it.checklist, [it.stage]: l } });
  const [newItem, setNewItem] = useState('');
  const i = STAGES.indexOf(it.stage);
  const advance = () => {
    if (i < STAGES.length - 1) set({ stage: STAGES[i + 1] });
    else { set({ done: true, publishedAt: Date.now() }); save('journal', { type: 'task', title: it.title, list: 'video', text: 'Published', by: me, at: Date.now() }); }
  };
  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={it.title}>
        <input className="field display" autoFocus style={{ fontSize: 22, fontWeight: 600, background: 'transparent', border: 0, padding: 0 }} value={it.title} onChange={(e) => set({ title: e.target.value })} aria-label="Video title" />
        <div className="sub">Template: {t.name}</div>
        <div className="seg" role="group" aria-label="Stage">{STAGES.map((s) => <button key={s} type="button" aria-pressed={it.stage === s} onClick={() => set({ stage: s })}>{s}</button>)}</div>
        <h2>{it.stage} checklist</h2>
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
        <div className="row">
          <label className="lbl" style={{ flex: 1 }}>Publish date<input type="date" className="field" value={it.publishDate || ''} onChange={(e) => set({ publishDate: e.target.value || null })} /></label>
        </div>
        <label className="lbl">Script<Live as="textarea" className="field" style={{ minHeight: 180 }} value={it.script || ''} onSave={(val) => set({ script: val })} /></label>
        <label className="lbl">Notes<Live as="textarea" className="field" value={it.notes || ''} onSave={(val) => set({ notes: val })} /></label>
        <div className="row between">
          <button type="button" className="btn ghost small" onClick={() => { if (confirm('Delete this video project?')) { remove(it.id); onClose(); } }}>Delete</button>
          <span className="row">
            {!it.done && <button type="button" className="btn ghost" onClick={advance}>{i < STAGES.length - 1 ? 'Move to ' + STAGES[i + 1] + ' →' : 'Mark published ✓'}</button>}
            <button type="button" className="btn" onClick={onClose}>Done</button>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Video({ me }) {
  const videos = useItems('video');
  const [openId, setOpenId] = useState(null);
  const [newV, setNewV] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const open = videos.find((v) => v.id === openId);
  const create = (e) => {
    e.preventDefault();
    const t = TEMPLATES[newV.template];
    const checklist = Object.fromEntries(STAGES.map((s) => [s, (t.lists[s] || []).map((text) => ({ id: newId(), text, done: false }))]));
    save('video', { title: newV.title.trim() || 'Untitled video', template: newV.template, stage: 'Idea', checklist, script: t.outline, notes: '', created: Date.now() }).then((v) => { setNewV(null); setOpenId(v.id); });
  };
  const active = videos.filter((v) => !v.done);
  return (
    <>
      <header className="row between" style={{ alignItems: 'flex-end' }}>
        <div><div className="sub">Section</div><h1>Video Projects</h1></div>
        <button type="button" className="btn" onClick={() => setNewV({ title: '', template: 'long' })}>+ New video from template</button>
      </header>
      {newV && (
        <form className="card" onSubmit={create}>
          <h2>New video</h2>
          <input className="field" autoFocus value={newV.title} onChange={(e) => setNewV({ ...newV, title: e.target.value })} placeholder="Working title" aria-label="Working title" />
          <div className="themes">
            {Object.entries(TEMPLATES).map(([k, t]) => (
              <button key={k} type="button" className="theme" aria-pressed={newV.template === k} onClick={() => setNewV({ ...newV, template: k })}>
                <b>{t.name}</b><span className="sub" style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{t.outline.split('\n').filter((l) => l.trim()).slice(0, 3).join(' · ')}</span>
              </button>
            ))}
          </div>
          <div className="row"><button className="btn" type="submit">Create</button><button type="button" className="btn ghost" onClick={() => setNewV(null)}>Cancel</button></div>
        </form>
      )}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(190px, 1fr))', gap: 12, minWidth: 980 }}>
          {STAGES.map((s) => (
            <section key={s} className="card" style={{ padding: 12, minHeight: 260 }} aria-label={s}>
              <div className="row between"><h2 style={{ fontSize: 16 }}>{s}</h2><span className="sub">{active.filter((v) => v.stage === s).length}</span></div>
              {active.filter((v) => v.stage === s).map((v) => {
                const l = v.checklist?.[s] || [];
                return (
                  <button key={v.id} type="button" className="note" style={{ textAlign: 'left', border: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }} onClick={() => setOpenId(v.id)}>
                    <b>{v.title}</b>
                    <span className="sub" style={{ fontSize: 12 }}>{(TEMPLATES[v.template] || TEMPLATES.long).name}{l.length ? ' · ' + l.filter((c) => c.done).length + '/' + l.length : ''}{v.publishDate ? ' · ' + v.publishDate : ''}</span>
                    {l.length > 0 && <span style={{ height: 6, borderRadius: 99, background: 'var(--panel)' }}><span style={{ display: 'block', height: '100%', borderRadius: 99, background: 'var(--accent)', width: Math.round((l.filter((c) => c.done).length / l.length) * 100) + '%' }} /></span>}
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      </div>
      <section className="card">
        <button type="button" className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setShowDone(!showDone)}>{showDone ? 'Hide' : 'Show'} published ({videos.filter((v) => v.done).length})</button>
        {showDone && videos.filter((v) => v.done).sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)).map((v) => (
          <div key={v.id} className="task"><button type="button" className="title" onClick={() => setOpenId(v.id)}>{v.title}</button><span className="sub" style={{ fontSize: 12 }}>{v.publishedAt && new Date(v.publishedAt).toLocaleDateString()}</span><button type="button" className="btn ghost small" onClick={() => patch(v.id, { done: false })}>Reopen</button></div>
        ))}
      </section>
      {open && <VideoModal key={open.id} v={open} me={me} onClose={() => setOpenId(null)} />}
    </>
  );
}
