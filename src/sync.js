import { createClient } from '@supabase/supabase-js';
import { db, device, onLocalChange } from './db.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Two-way sync with Supabase. Local changes are pushed, then anything newer on the
// server is pulled down. When both sides changed the same item, the newest edit wins.
let client = null;
let household = null;
let timer = null;
const statusListeners = new Set();
let status = { state: 'off', message: 'Not connected. Everything is saved on this device.' };

function setStatus(s) { status = { ...status, ...s }; statusListeners.forEach((fn) => fn(status)); }
export const onStatus = (fn) => { statusListeners.add(fn); fn(status); return () => statusListeners.delete(fn); };

export function keys() {
  return { url: SUPABASE_URL || device.get('sb-url', ''), key: SUPABASE_ANON_KEY || device.get('sb-key', ''), baked: !!SUPABASE_URL };
}

export function getClient() {
  const { url, key } = keys();
  if (!url || !key) return null;
  if (!client) client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

export function saveKeys(url, key) {
  device.set('sb-url', url.trim());
  device.set('sb-key', key.trim());
  client = null;
}

export async function currentUser() {
  const c = getClient();
  if (!c) return null;
  const { data } = await c.auth.getUser();
  return data.user || null;
}

async function loadHousehold() {
  const c = getClient();
  const { data, error } = await c.from('household_members').select('household_id').limit(1);
  if (error) throw error;
  household = data[0]?.household_id || null;
  return household;
}

export async function createHousehold() {
  const { data, error } = await getClient().rpc('create_household');
  if (error) throw error;
  household = data;
  start();
  return data;
}

export async function joinHousehold(code) {
  const { data, error } = await getClient().rpc('join_household', { code: code.trim() });
  if (error) throw error;
  household = data;
  device.set('sync-cursor', null);
  start();
  return data;
}

export const householdId = () => household;

let running = false;
export async function syncNow() {
  const c = getClient();
  if (!c || running) return;
  if (!navigator.onLine) { setStatus({ state: 'offline', message: 'Offline. Changes are saved here and will sync when you\'re back online.' }); return; }
  running = true;
  try {
    const user = await currentUser();
    if (!user) { setStatus({ state: 'signed-out', message: 'Sign in under Settings to sync.' }); return; }
    if (!household && !(await loadHousehold())) { setStatus({ state: 'no-household', message: 'Signed in. Create or join your shared space under Settings.' }); return; }
    setStatus({ state: 'syncing', message: 'Syncing…' });

    const dirty = await db.items.where('dirty').equals(1).toArray();
    if (dirty.length) {
      const rows = dirty.map((r) => ({ id: r.id, household_id: household, kind: r.kind, data: r.data, updated_at: r.updated_at, deleted: !!r.deleted }));
      const { error } = await c.from('items').upsert(rows);
      if (error) throw error;
      await db.transaction('rw', db.items, async () => {
        for (const r of dirty) {
          const cur = await db.items.get(r.id);
          if (cur && cur.updated_at === r.updated_at) await db.items.update(r.id, { dirty: 0 });
        }
      });
    }

    let cursor = device.get('sync-cursor', null);
    for (;;) {
      let q = c.from('items').select('*').eq('household_id', household).order('synced_at').limit(500);
      if (cursor) q = q.gt('synced_at', cursor);
      const { data, error } = await q;
      if (error) throw error;
      if (!data.length) break;
      await db.transaction('rw', db.items, async () => {
        for (const r of data) {
          const cur = await db.items.get(r.id);
          if (!cur || r.updated_at > cur.updated_at) {
            await db.items.put({ id: r.id, kind: r.kind, data: r.data, updated_at: r.updated_at, deleted: r.deleted ? 1 : 0, dirty: 0 });
          }
        }
      });
      cursor = data[data.length - 1].synced_at;
      device.set('sync-cursor', cursor);
      if (data.length < 500) break;
    }
    window.dispatchEvent(new Event('le-synced'));
    setStatus({ state: 'ok', message: 'Synced ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '.' });
  } catch (e) {
    setStatus({ state: 'error', message: 'Sync problem: ' + (e.message || e) + '. Your changes are still safe on this device.' });
  } finally {
    running = false;
  }
}

let debounce = null;
export function start() {
  if (!getClient()) return;
  syncNow();
  clearInterval(timer);
  timer = setInterval(syncNow, 30000);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => syncNow());
  window.addEventListener('focus', () => syncNow());
  onLocalChange(() => { clearTimeout(debounce); debounce = setTimeout(syncNow, 1500); });
}
