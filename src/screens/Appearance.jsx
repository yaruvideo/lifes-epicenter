import { save } from '../db.js';
import { DEFAULT_LOOK, SWATCHES, THEMES } from '../themes.js';
import { PEOPLE } from '../config.js';

// Each person's look is saved (and synced) under their own id, so it follows them to every device.
export default function Appearance({ me, look }) {
  const set = (changes) => save('look', { ...DEFAULT_LOOK, ...look, ...changes }, 'look-' + me);
  const base = THEMES.find((t) => t.id === look.theme) || THEMES[0];
  const accent = look.accent || base.accent;
  const hi = look.hi || base.hi;
  const seg = (label, key, opts) => (
    <div className="row between">
      <b>{label}</b>
      <div className="seg" role="group" aria-label={label}>
        {opts.map(([id, l]) => <button key={id} type="button" aria-pressed={(look[key] || DEFAULT_LOOK[key]) === id} onClick={() => set({ [key]: id })}>{l}</button>)}
      </div>
    </div>
  );
  const picker = (label, hint, cur, key) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="row between"><b>{label}</b><span className="sub">{hint}</span></div>
      <div className="row" role="group" aria-label={label}>
        {SWATCHES.map(([name, c]) => <button key={c} type="button" className="swatch" title={name} aria-label={name} aria-pressed={cur === c} style={{ background: c }} onClick={() => set({ [key]: c })} />)}
      </div>
    </div>
  );
  return (
    <>
      <header>
        <div className="sub">Settings</div>
        <h1>Appearance</h1>
        <p className="sub" style={{ maxWidth: '60ch' }}>This is {PEOPLE[me].name}'s look. It follows you to your other devices and doesn't change anyone else's.</p>
      </header>
      <section className="card" aria-labelledby="th">
        <h2 id="th">Theme</h2>
        <div className="themes">
          {THEMES.map((t) => (
            <button key={t.id} type="button" className="theme" aria-pressed={t.id === base.id} onClick={() => set({ theme: t.id, accent: null, hi: null })}>
              <span className="strip"><span style={{ flex: 2, background: t.bg }} /><span style={{ flex: 2, background: t.accent }} /><span style={{ flex: 1, background: t.hi }} /><span style={{ flex: 1, background: t.warm }} /></span>
              <b>{t.name}</b>
              <span className="sub" style={{ fontSize: 13 }}>{t.desc}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="card" aria-labelledby="ft">
        <h2 id="ft">Fine-tune</h2>
        {picker('Main color', 'Buttons, selected tabs, links', accent, 'accent')}
        {picker('Highlight', 'Checkmarks, the active menu item', hi, 'hi')}
        {seg('Background', 'bg', [['soft', 'Soft'], ['dark', 'Dark'], ['oled', 'Pure black']])}
        {seg('Corners', 'round', [['sharp', 'Sharp'], ['soft', 'Soft'], ['round', 'Round']])}
        {seg('Text size', 'size', [['s', 'Small'], ['m', 'Medium'], ['l', 'Large']])}
        <div><button type="button" className="btn ghost" onClick={() => set({ ...DEFAULT_LOOK, theme: base.id })}>Reset to {base.name}</button></div>
      </section>
    </>
  );
}
