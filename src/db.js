import Dexie from 'dexie';

// Everything is stored on the device first (IndexedDB), so the app works offline.
// Each record is { id, kind, data, updated_at, deleted, dirty }. "dirty" means it
// changed here and still needs to go up to the cloud.
export const db = new Dexie('lifes-epicenter');
db.version(1).stores({ items: 'id, kind, updated_at, dirty' });

const listeners = new Set();
export const onLocalChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export const newId = () => crypto.randomUUID();

export async function save(kind, data, id = data.id || newId()) {
  const row = { id, kind, data: { ...data, id }, updated_at: Date.now(), deleted: 0, dirty: 1 };
  await db.items.put(row);
  listeners.forEach((fn) => fn());
  return row.data;
}

export async function patch(id, changes) {
  const row = await db.items.get(id);
  if (!row) return;
  return save(row.kind, { ...row.data, ...changes }, id);
}

export async function remove(id) {
  const row = await db.items.get(id);
  if (!row) return;
  await db.items.put({ ...row, deleted: 1, updated_at: Date.now(), dirty: 1 });
  listeners.forEach((fn) => fn());
}

export async function all(kind) {
  const rows = await db.items.where('kind').equals(kind).toArray();
  return rows.filter((r) => !r.deleted).map((r) => r.data);
}

// Device-only preferences (who is using this device, sync keys). Never synced.
export const device = {
  get(key, fallback) {
    try { const v = localStorage.getItem('le:' + key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('le:' + key, JSON.stringify(value)); } catch { /* private mode */ }
  }
};

export async function exportBackup() {
  const rows = await db.items.toArray();
  return JSON.stringify({ app: 'lifes-epicenter', exported: new Date().toISOString(), rows }, null, 1);
}

export async function importBackup(text) {
  const parsed = JSON.parse(text);
  if (parsed.app !== 'lifes-epicenter' || !Array.isArray(parsed.rows)) throw new Error('That file is not a Life\'s Epicenter backup.');
  await db.transaction('rw', db.items, async () => {
    for (const r of parsed.rows) {
      const cur = await db.items.get(r.id);
      if (!cur || cur.updated_at < r.updated_at) await db.items.put({ ...r, dirty: 1 });
    }
  });
  listeners.forEach((fn) => fn());
  return parsed.rows.length;
}
