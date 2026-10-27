import { useEffect, useState } from 'react';
import { patch, remove, save } from '../db.js';
import { device } from '../db.js';
import { useItems, todayStr } from '../store.js';
import Live from './Live.jsx';
import SectionInbox from './SectionInbox.jsx';
import useDragSort, { sortKeyOf } from './useDragSort.jsx';
import { CLIENT_STAGES, fromTemplate, useTemplates } from '../projects.js';
import { newId } from '../db.js';

const STAGES = CLIENT_STAGES;
const INVOICE = ['Draft', 'Sent', 'Paid'];
const money = (n) => '$' + (Number(n) || 0).toFixed(2).replace(/\.00$/, '');

export default function Client({ me }) {
  const clients = useItems('client').sort((a, b) => a.name.localeCompare(b.name));
  const projects = useItems('cproject');
  const hours = useItems('hours');
  const invoices = useItems('invoice');
  // Projects on hold sit in the Inbox (drag to order) and stay out of the pipeline.
  const live = projects.filter((p) => !p.parked);
  const parked = projects.filter((p) => p.parked).sort((a, b) => sortKeyOf(a) - sortKeyOf(b));
  const { handle, dragClass } = useDragSort(parked);
  const [overview, setOverview] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [cid, setCid] = useState(null);
  const [newClient, setNewClient] = useState('');
  const [newProj, setNewProj] = useState('');
  const [projTpl, setProjTpl] = useState('');
  const [checkText, setCheckText] = useState('');
  const templates = useTemplates('client');
  const [projNote, setProjNote] = useState('');
  const [inv, setInv] = useState({ label: '', amount: '' });
  const [timer, setTimer] = useState(() => device.get('client-timer', null));
  const [, tick] = useState(0);
  useEffect(() => { if (!timer) return; const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, [timer]);

  const client = clients.find((c) => c.id === cid) || clients[0];
  const nameOf = (id) => clients.find((c) => c.id === id)?.name || '—';
  const logHours = (h, note = '') => save('hours', { clientId: client.id, date: todayStr(), hours: h, note, by: me, at: Date.now() });
  const startStop = () => {
    if (timer) {
      const h = Math.max(0.25, Math.round(((Date.now() - timer.start) / 36e5) * 4) / 4);
      save('hours', { clientId: timer.clientId, date: todayStr(), hours: h, note: 'Timer', by: me, at: Date.now() });
      device.set('client-timer', null); setTimer(null);
    } else {
      const t = { clientId: client.id, start: Date.now() };
      device.set('client-timer', t); setTimer(t);
    }
  };
  const elapsed = timer ? Math.floor((Date.now() - timer.start) / 1000) : 0;

  const month = todayStr().slice(0, 7);
  const cHours = client ? hours.filter((h) => h.clientId === client.id) : [];
  const monthHours = cHours.filter((h) => h.date.startsWith(month)).reduce((s, h) => s + h.hours, 0);
  const cProjects = client ? projects.filter((p) => p.clientId === client.id) : [];
  const cInvoices = client ? invoices.filter((i) => i.clientId === client.id).sort((a, b) => b.at - a.at) : [];
  const nextDeadline = cProjects.filter((p) => !p.parked && p.stage !== 'Delivered' && p.deadline).sort((a, b) => a.deadline.localeCompare(b.deadline))[0];

  return (
    <>
      <header><div className="sub row" style={{ gap: 8 }}><span className="dot" style={{ background: '#7FA8F5' }} />Section</div><h1>Client Work</h1></header>

      <section className="card" aria-labelledby="ov-h">
        <div className="row between">
          <h2 id="ov-h">All client projects</h2>
          <button type="button" className="btn ghost small" aria-expanded={overview} onClick={() => setOverview(!overview)}>{overview ? 'Collapse' : 'Expand'}</button>
        </div>
        {overview && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(170px, 1fr))', gap: 10, minWidth: 900 }}>
              {STAGES.map((s, si) => (
                <div key={s} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="sub" style={{ fontWeight: 600 }}>{s} · {live.filter((p) => p.stage === s).length}</div>
                  {live.filter((p) => p.stage === s).map((p) => (
                    <div key={p.id} className="note" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button type="button" onClick={() => setExpanded(expanded === p.id ? null : p.id)} aria-expanded={expanded === p.id} style={{ textAlign: 'left', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
                        <b>{p.title}</b><span className="sub" style={{ display: 'block', fontSize: 12 }}>{nameOf(p.clientId)}{p.deadline ? ' · due ' + p.deadline : ''}</span>
                      </button>
                      {expanded === p.id && (
                        <>
                          {(() => {
                            // This step's checklist (from the template, or added here).
                            const list = p.checklist?.[p.stage] || [];
                            const setList = (l) => patch(p.id, { checklist: { ...(p.checklist || {}), [p.stage]: l } });
                            return (
                              <>
                                {list.map((c) => (
                                  <div key={c.id} className="row" style={{ gap: 6, flexWrap: 'nowrap', fontSize: 13 }}>
                                    <button type="button" className={'check' + (c.done ? ' done' : '')} style={{ width: 22, height: 22, flex: '0 0 22px' }} aria-label={(c.done ? 'Uncheck ' : 'Check ') + c.text} onClick={() => setList(list.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))}>{c.done ? '✓' : ''}</button>
                                    <span style={{ flex: 1, textDecoration: c.done ? 'line-through' : 'none', color: c.done ? 'var(--muted)' : undefined }}>{c.text}</span>
                                    <button type="button" className="btn ghost small" style={{ minHeight: 26, padding: '0 6px' }} aria-label={'Remove ' + c.text} onClick={() => setList(list.filter((x) => x.id !== c.id))}>✕</button>
                                  </div>
                                ))}
                                <form onSubmit={(e) => { e.preventDefault(); if (checkText.trim()) { setList([...list, { id: newId(), text: checkText.trim(), done: false }]); setCheckText(''); } }}>
                                  <input className="field" style={{ minHeight: 36 }} value={checkText} onChange={(e) => setCheckText(e.target.value)} placeholder={'Add to ' + p.stage + ' checklist'} aria-label={'Checklist item for ' + p.title} />
                                </form>
                              </>
                            );
                          })()}
                          {(p.notes || []).map((n, i) => <div key={i} style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>• {n}</div>)}
                          <form onSubmit={(e) => { e.preventDefault(); if (projNote.trim()) { patch(p.id, { notes: [...(p.notes || []), projNote.trim()] }); setProjNote(''); } }}>
                            <input className="field" style={{ minHeight: 36 }} value={projNote} onChange={(e) => setProjNote(e.target.value)} placeholder="Add a note" aria-label={'Note for ' + p.title} />
                          </form>
                          <label className="lbl">Deadline<input type="date" className="field" style={{ minHeight: 36 }} value={p.deadline || ''} onChange={(e) => patch(p.id, { deadline: e.target.value || null })} /></label>
                          <div className="row" style={{ gap: 6 }}>
                            {si < STAGES.length - 1 && <button type="button" className="btn small" onClick={() => patch(p.id, { stage: STAGES[si + 1] })}>→ {STAGES[si + 1]}</button>}
                            <button type="button" className="btn ghost small" onClick={() => patch(p.id, { parked: true, sortKey: Date.now() })}>Move to Inbox</button>
                            <button type="button" className="btn ghost small" onClick={() => { if (confirm('Delete this project?')) remove(p.id); }}>Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="cinbox-h">
        <h2 id="cinbox-h">Inbox <span className="sub" style={{ fontSize: 14, fontWeight: 400 }}>on hold · {parked.length}</span></h2>
        {parked.length === 0 && <div className="empty">Client projects you put on hold land here. Open a project card above and choose "Move to Inbox".</div>}
        {parked.map((p) => (
          <div key={p.id} data-drag-id={p.id} className={'task' + dragClass(p)}>
            {handle(p)}
            <span className="title" style={{ cursor: 'default' }}>{p.title}<span className="sub" style={{ display: 'block', fontSize: 12 }}>{[nameOf(p.clientId), p.stage, p.deadline && 'due ' + p.deadline].filter(Boolean).join(' · ')}</span></span>
            <button type="button" className="btn ghost small" onClick={() => patch(p.id, { parked: false })}>Make active</button>
          </div>
        ))}
      </section>

      <SectionInbox me={me} listId="client" />

      <div className="row between">
        <h2>Per client</h2>
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (newClient.trim()) { save('client', { name: newClient.trim(), rate: 0, notes: '' }).then((c) => setCid(c.id)); setNewClient(''); } }}>
          <input className="field" style={{ width: 220 }} value={newClient} onChange={(e) => setNewClient(e.target.value)} placeholder="New client name" aria-label="New client name" />
          <button className="btn small" type="submit">Add client</button>
        </form>
      </div>
      {!clients.length && <div className="empty">Add your first client to track hours, invoices and projects.</div>}
      {client && (
        <>
          <div className="seg" role="tablist" aria-label="Client">{clients.map((c) => <button key={c.id} type="button" role="tab" aria-selected={c.id === client.id} aria-pressed={c.id === client.id} onClick={() => setCid(c.id)}>{c.name}</button>)}</div>
          <div className="grid">
            <section className="card" aria-label="Hours">
              <h2>Hours</h2>
              <div className="display" style={{ fontSize: 30 }}>{monthHours} h <span className="sub" style={{ fontSize: 14 }}>this month · {money(monthHours * (client.rate || 0))}</span></div>
              <div className="row">
                <button type="button" className="btn ghost small" onClick={() => logHours(0.5)}>+0.5 h</button>
                <button type="button" className="btn ghost small" onClick={() => logHours(1)}>+1 h</button>
                <button type="button" className="btn small" onClick={startStop}>{timer ? 'Stop timer ' + String(Math.floor(elapsed / 3600)).padStart(1, '0') + ':' + String(Math.floor(elapsed / 60) % 60).padStart(2, '0') + ':' + String(elapsed % 60).padStart(2, '0') + (timer.clientId !== client.id ? ' (' + nameOf(timer.clientId) + ')' : '') : 'Start timer'}</button>
              </div>
              <label className="lbl">Hourly rate<Live className="field" type="number" value={String(client.rate || '')} onSave={(v) => patch(client.id, { rate: Number(v) || 0 })} /></label>
              {cHours.sort((a, b) => b.at - a.at).slice(0, 5).map((h) => <div key={h.id} className="row between sub" style={{ fontSize: 13 }}><span>{h.date} · {h.hours} h {h.note && '· ' + h.note}</span><button type="button" className="btn ghost small" style={{ minHeight: 28 }} aria-label="Remove entry" onClick={() => remove(h.id)}>✕</button></div>)}
            </section>
            <section className="card" aria-label="Projects">
              <h2>Projects</h2>
              {nextDeadline && <div className="note">Next deadline: <b>{nextDeadline.title}</b> · {nextDeadline.deadline}</div>}
              {cProjects.map((p) => <div key={p.id} className="task"><span style={{ flex: 1 }}>{p.title}{p.parked && <span className="sub"> · on hold</span>}</span><select className="field" style={{ width: 'auto', minHeight: 34 }} value={p.stage} onChange={(e) => patch(p.id, { stage: e.target.value })} aria-label={'Stage of ' + p.title}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></div>)}
              <form className="row" onSubmit={(e) => { e.preventDefault(); if (newProj.trim()) { const t = templates.find((x) => x.id === projTpl) || null; save('cproject', { clientId: client.id, title: newProj.trim(), stage: STAGES[0], notes: [], deadline: null, template: t?.id || null, templateName: t?.name || 'Custom', checklist: fromTemplate(t, STAGES).checklist }); setNewProj(''); } }}>
                <input className="field" style={{ flex: 1 }} value={newProj} onChange={(e) => setNewProj(e.target.value)} placeholder="New project" aria-label="New project" />
                <select className="field" style={{ width: 'auto' }} value={projTpl} onChange={(e) => setProjTpl(e.target.value)} aria-label="Template for the new project">
                  <option value="">Blank</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button className="btn small" type="submit">Add</button>
              </form>
            </section>
            <section className="card" aria-label="Invoices">
              <h2>Invoices</h2>
              {cInvoices.map((i) => (
                <div key={i.id} className="task">
                  <span style={{ flex: 1 }}>{i.label} · {money(i.amount)}</span>
                  <button type="button" className="chip" style={{ cursor: 'pointer', border: 0, padding: '6px 10px', background: i.status === 'Paid' ? 'var(--hi)' : i.status === 'Sent' ? 'var(--warm)' : 'var(--inner)', color: i.status === 'Draft' ? 'var(--muted)' : 'var(--on-accent)' }} onClick={() => patch(i.id, { status: INVOICE[(INVOICE.indexOf(i.status) + 1) % INVOICE.length] })} title="Click to change status">{i.status}</button>
                  <button type="button" className="btn ghost small" aria-label="Delete invoice" onClick={() => remove(i.id)}>✕</button>
                </div>
              ))}
              <form className="row" onSubmit={(e) => { e.preventDefault(); if (inv.label.trim()) { save('invoice', { clientId: client.id, label: inv.label.trim(), amount: Number(inv.amount) || 0, status: 'Draft', at: Date.now() }); setInv({ label: '', amount: '' }); } }}>
                <input className="field" style={{ flex: '2 1 120px' }} value={inv.label} onChange={(e) => setInv({ ...inv, label: e.target.value })} placeholder="Invoice (e.g. October)" aria-label="Invoice label" />
                <input className="field" type="number" style={{ flex: '1 1 80px' }} value={inv.amount} onChange={(e) => setInv({ ...inv, amount: e.target.value })} placeholder="Amount" aria-label="Amount" />
                <button className="btn small" type="submit">Add</button>
              </form>
            </section>
            <section className="card" aria-label="Meeting notes">
              <h2>Meeting notes</h2>
              <Live as="textarea" key={client.id} className="field" style={{ minHeight: 180 }} value={client.notes || ''} onSave={(v) => patch(client.id, { notes: v })} placeholder="Calls, decisions, what they asked for…" aria-label="Meeting notes" />
              <button type="button" className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => { if (confirm('Delete ' + client.name + '? Their projects, hours and invoices stay in the database.')) { remove(client.id); setCid(null); } }}>Delete client</button>
            </section>
          </div>
        </>
      )}
    </>
  );
}
