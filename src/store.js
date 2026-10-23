import { useEffect, useState } from 'react';
import { all, device, onLocalChange } from './db.js';
import { PEOPLE } from './config.js';

// Re-reads one kind of item whenever it changes here or arrives from sync.
export function useItems(kind) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let alive = true;
    const load = () => all(kind).then((rows) => alive && setItems(rows));
    load();
    const off = onLocalChange(load);
    window.addEventListener('le-synced', load);
    return () => { alive = false; off(); window.removeEventListener('le-synced', load); };
  }, [kind]);
  return items;
}

// Which of you is using this device. Set once in Settings.
export function useMe() {
  const [me, setMeState] = useState(() => device.get('me', 'yaru'));
  const setMe = (v) => { device.set('me', v); setMeState(v); window.dispatchEvent(new Event('le-me')); };
  useEffect(() => {
    const h = () => setMeState(device.get('me', 'yaru'));
    window.addEventListener('le-me', h);
    return () => window.removeEventListener('le-me', h);
  }, []);
  return [me, setMe];
}

export const other = (me) => (me === 'yaru' ? 'hannah' : 'yaru');

export function ownerLabel(owner, me) {
  if (owner === 'both') return 'Together';
  return owner === me ? 'Me' : PEOPLE[owner]?.name || owner;
}

export function ownerStyle(owner) {
  const bg = owner === 'both' ? 'var(--hi)' : PEOPLE[owner]?.color || 'var(--muted)';
  return { background: bg, color: 'var(--on-accent)' };
}

export const todayStr = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
