import { useState } from 'react';
import { newId } from '../db.js';
import { CLIENT_STAGES, DEFAULT_TEMPLATES, VIDEO_STAGES, saveTemplates, useTemplates } from '../projects.js';

// Settings card: add, edit and remove the templates new Video Projects and Client Work projects start from.
export default function ProjectTemplates() {
  const [section, setSection] = useState('video');
  const templates = useTemplates(section);
  const [openId, setOpenId] = useState(null);
  const fixedSteps = section === 'client';
  const put = (list) => saveTemplates(section, list);
  const update = (id, changes) => put(templates.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  const add = () => {
    const t = { id: newId(), name: 'New template', desc: '', outline: '', steps: (section === 'client' ? CLIENT_STAGES : VIDEO_STAGES).map((name) => ({ name, items: [] })) };
    put([...templates, t]);
    setOpenId(t.id);
  };

  return (
    <section className="card" aria-labelledby="tpl-h">
      <div className="row between">
        <h2 id="tpl-h">Project templates</h2>
        <div className="seg" role="group" aria-label="Section">
          {[['video', 'Video Projects'], ['client', 'Client Work']].map(([id, l]) => <button key={id} type="button" aria-pressed={section === id} onClick={() => { setSection(id); setOpenId(null); }}>{l}</button>)}
        </div>
      </div>
      <div className="sub" style={{ fontSize: 13 }}>New projects start from one of these (or blank). Changing a template doesn't change projects already made from it.{fixedSteps && ' Client steps match the pipeline columns, so here you set the checklist for each one.'}</div>
      {templates.map((t) => (
        <div key={t.id} className="task subtask">
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <button type="button" className="title" aria-expanded={openId === t.id} onClick={() => setOpenId(openId === t.id ? null : t.id)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 0, padding: '4px 0', cursor: 'pointer' }}>
              <b>{t.name}</b>
              <span className="sub" style={{ display: 'block', fontSize: 12 }}>{[t.desc, t.steps.length + ' steps', t.steps.reduce((n, s) => n + s.items.length, 0) + ' checklist items'].filter(Boolean).join(' · ')}</span>
            </button>
            <button type="button" className="btn ghost small" onClick={() => setOpenId(openId === t.id ? null : t.id)}>{openId === t.id ? '▾' : '▸'}</button>
          </div>
          {openId === t.id && <Editor t={t} fixedSteps={fixedSteps} showOutline={section === 'video'} onChange={(c) => update(t.id, c)}
            onRemove={() => { if (confirm('Remove the "' + t.name + '" template?')) { put(templates.filter((x) => x.id !== t.id)); setOpenId(null); } }}
            onCopy={() => { const c = { ...t, id: newId(), name: t.name + ' (copy)' }; put([...templates, c]); setOpenId(c.id); }} />}
        </div>
      ))}
      <div className="row between">
        <button type="button" className="btn small" onClick={add}>+ New template</button>
        <button type="button" className="btn ghost small" onClick={() => confirm('Put back the original templates? Your edited and added templates for this section will be replaced.') && put(DEFAULT_TEMPLATES[section])}>Restore originals</button>
      </div>
    </section>
  );
}

function Editor({ t, fixedSteps, showOutline, onChange, onRemove, onCopy }) {
  const setStep = (i, c) => onChange({ steps: t.steps.map((s, j) => (j === i ? { ...s, ...c } : s)) });
  const move = (i, d) => { const s = [...t.steps]; const j = i + d; if (j < 0 || j >= s.length) return; [s[i], s[j]] = [s[j], s[i]]; onChange({ steps: s }); };
  return (
    <div className="subdetails" style={{ paddingLeft: 0 }}>
      <div className="row subdates" style={{ paddingLeft: 0 }}>
        <label className="lbl">Name<input className="field" defaultValue={t.name} onBlur={(e) => onChange({ name: e.target.value.trim() || 'Untitled template' })} /></label>
        <label className="lbl" style={{ flex: '2 1 300px' }}>Description<input className="field" defaultValue={t.desc} onBlur={(e) => onChange({ desc: e.target.value })} /></label>
      </div>
      {showOutline && <label className="lbl">Script outline (fills "Script &amp; notes")<textarea className="field" defaultValue={t.outline} onBlur={(e) => onChange({ outline: e.target.value })} /></label>}
      <div className="lbl">Steps and their checklists (one item per line)</div>
      {t.steps.map((s, i) => (
        <div key={i + s.name} className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
          <div style={{ flex: '0 0 170px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {fixedSteps ? <b style={{ padding: '10px 0' }}>{s.name}</b>
              : <input className="field" defaultValue={s.name} aria-label={'Step ' + (i + 1) + ' name'} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== s.name && !t.steps.some((x) => x.name === v)) setStep(i, { name: v }); else e.target.value = s.name; }} />}
            {!fixedSteps && (
              <span className="row" style={{ gap: 4 }}>
                <button type="button" className="btn ghost small" disabled={i === 0} aria-label={'Move ' + s.name + ' earlier'} onClick={() => move(i, -1)}>↑</button>
                <button type="button" className="btn ghost small" disabled={i === t.steps.length - 1} aria-label={'Move ' + s.name + ' later'} onClick={() => move(i, 1)}>↓</button>
                <button type="button" className="btn ghost small" disabled={t.steps.length < 2} aria-label={'Remove step ' + s.name} onClick={() => onChange({ steps: t.steps.filter((_, j) => j !== i) })}>✕</button>
              </span>
            )}
          </div>
          <textarea className="field" style={{ flex: 1, minHeight: 70 }} defaultValue={s.items.join('\n')} aria-label={'Checklist for ' + s.name}
            onBlur={(e) => setStep(i, { items: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} />
        </div>
      ))}
      <div className="row between">
        {!fixedSteps ? <button type="button" className="btn ghost small" onClick={() => { let n = 'New step', k = 2; while (t.steps.some((s) => s.name === n)) n = 'New step ' + k++; onChange({ steps: [...t.steps, { name: n, items: [] }] }); }}>+ Add step</button> : <span />}
        <span className="row">
          <button type="button" className="btn ghost small" onClick={onCopy}>Duplicate</button>
          <button type="button" className="btn ghost small" onClick={onRemove}>Remove template</button>
        </span>
      </div>
    </div>
  );
}
