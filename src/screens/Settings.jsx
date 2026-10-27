import { useEffect, useState } from 'react';
import { exportBackup, importBackup } from '../db.js';
import { useMe } from '../store.js';
import { PEOPLE } from '../config.js';
import { enablePush, pushEnabled } from '../push.js';
import { refreshApp } from '../refresh.js';
import { createHousehold, currentUser, getClient, householdId, joinHousehold, keys, onStatus, saveKeys, start, syncNow } from '../sync.js';

export default function Settings() {
  const [me, setMe] = useMe();
  const [status, setStatus] = useState(null);
  const [user, setUser] = useState(null);
  const [k, setK] = useState(keys());
  const [form, setForm] = useState({ url: k.url, key: k.key, email: '', password: '', code: '' });
  const [msg, setMsg] = useState('');
  const [installEvt, setInstallEvt] = useState(null);

  const refresh = () => currentUser().then(setUser).catch(() => setUser(null));
  useEffect(() => onStatus(setStatus), []);
  useEffect(() => { refresh(); }, [k.url]);
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  const f = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });
  const run = async (fn, ok) => {
    setMsg('');
    try { await fn(); if (ok) setMsg(ok); } catch (e) { setMsg('⚠ ' + (e.message || e)); }
    refresh();
  };
  const auth = (mode) => run(async () => {
    const c = getClient();
    if (!c) throw new Error('Sync isn\'t set up in this version. Close the app and open it again to load the latest update.');
    const { error } = mode === 'up'
      ? await c.auth.signUp({ email: form.email.trim(), password: form.password, options: { emailRedirectTo: location.origin + location.pathname } })
      : await c.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
    if (error) throw error;
    start();
  }, mode === 'up' ? 'Account created. If Supabase asks you to confirm your email, click the link, then sign in here.' : 'Signed in.');

  const download = async () => {
    const blob = new Blob([await exportBackup()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lifes-epicenter-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
  };
  const upload = (e) => {
    const file = e.target.files?.[0];
    if (file) run(async () => { const n = await importBackup(await file.text()); setMsg('Restored ' + n + ' items.'); });
  };

  return (
    <>
      <header><div className="sub">Settings</div><h1>Settings &amp; sync</h1><a href="#/appearance">Appearance and themes →</a></header>
      {msg && <div className="note" role="status">{msg}</div>}

      <section className="card" aria-labelledby="who-h">
        <h2 id="who-h">Who uses this device?</h2>
        <div className="seg" role="group" aria-label="This device belongs to">
          {Object.entries(PEOPLE).map(([id, p]) => <button key={id} type="button" aria-pressed={me === id} onClick={() => setMe(id)}>{p.name}</button>)}
        </div>
        <div className="sub">This decides what "Me" means here and which Appearance theme loads.</div>
      </section>

      <section className="card" aria-labelledby="sync-h">
        <h2 id="sync-h">Sync between your devices</h2>
        <div className="note" role="status">{status?.message}</div>
        {!k.baked && (
          <details open={!k.url}>
            <summary style={{ cursor: 'pointer' }}>Supabase connection</summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              <label className="lbl">Project URL<input className="field" {...f('url')} placeholder="https://xxxx.supabase.co" /></label>
              <label className="lbl">Anon public key<input className="field" {...f('key')} placeholder="eyJ…" /></label>
              <div><button type="button" className="btn small" onClick={() => { saveKeys(form.url, form.key); setK(keys()); start(); setMsg('Saved.'); }}>Save connection</button></div>
            </div>
          </details>
        )}
        {k.url && !user && (
          <form className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }} onSubmit={(e) => { e.preventDefault(); auth('in'); }}>
            <label className="lbl">Email<input className="field" type="email" autoComplete="email" {...f('email')} /></label>
            <label className="lbl">Password<input className="field" type="password" autoComplete="current-password" {...f('password')} /></label>
            <div className="row" style={{ alignSelf: 'end' }}>
              <button className="btn" type="submit">Sign in</button>
              <button className="btn ghost" type="button" onClick={() => auth('up')}>Create account</button>
            </div>
          </form>
        )}
        {user && (
          <>
            <div className="row between">
              <span>Signed in as <b>{user.email}</b></span>
              <span className="row">
                <button type="button" className="btn small" onClick={() => syncNow()}>Sync now</button>
                <button type="button" className="btn ghost small" onClick={() => run(() => getClient().auth.signOut(), 'Signed out. Your data stays on this device.')}>Sign out</button>
              </span>
            </div>
            {householdId() ? (
              <div className="note">Your shared space's invite code: <code style={{ userSelect: 'all', wordBreak: 'break-all' }}>{householdId()}</code><br /><span className="sub">The other person signs in on their device, picks "Join" and pastes this.</span></div>
            ) : (
              <div className="row">
                <button type="button" className="btn" onClick={() => run(createHousehold, 'Shared space created. Share the invite code below.')}>Create our shared space</button>
                <span className="sub">or</span>
                <input className="field" style={{ flex: '1 1 220px' }} {...f('code')} placeholder="Paste an invite code" aria-label="Invite code" />
                <button type="button" className="btn ghost" onClick={() => run(() => joinHousehold(form.code), 'Joined. Syncing now.')}>Join</button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="card" aria-labelledby="inst-h">
        <h2 id="inst-h">Install and notifications</h2>
        {installEvt
          ? <div><button type="button" className="btn" onClick={() => { installEvt.prompt(); setInstallEvt(null); }}>Install Life's Epicenter</button></div>
          : <div className="sub">On Windows, open this page in Edge or Chrome and use the install icon at the right end of the address bar. On Android, open it in Chrome and choose "Add to Home screen" (Install app).</div>}
        <div className="row">
          <button type="button" className="btn ghost" onClick={() => run(() => enablePush(me), 'Notifications are on for this device.')}>{pushEnabled() ? 'Re-connect notifications' : 'Turn on notifications'}</button>
          <span className="sub">Med times and task reminders arrive on this device, even when the app is closed. Do this once on each device (and again if you switch who uses it).</span>
        </div>
        <div className="row">
          <button type="button" className="btn ghost" onClick={() => refreshApp()}>⟳ Refresh app</button>
          <span className="sub">Syncs, picks up the newest version of the app, and reloads. On PC the button is also at the bottom of the sidebar, and F5 or Ctrl+R works too.</span>
        </div>
      </section>

      <section className="card" aria-labelledby="bk-h">
        <h2 id="bk-h">Backup</h2>
        <div className="sub">Everything lives on this device first. Download a copy any time, or restore one.</div>
        <div className="row">
          <button type="button" className="btn ghost" onClick={download}>Download backup</button>
          <label className="btn ghost" style={{ display: 'inline-flex', alignItems: 'center' }}>Restore from file<input type="file" accept="application/json" onChange={upload} style={{ display: 'none' }} /></label>
        </div>
      </section>
    </>
  );
}
