import { db, save } from './db.js';
import { todayStr } from './store.js';

// Starting meds, created once with fixed ids so two devices never make duplicates.
// Everyone can edit, retire or add meds afterwards on the Health screen.
export const SEED_MEDS = [
  { id: 'med-seed-adderall', name: 'Adderall', schedule: 'Morning · daily or as needed', time: '08:00', person: 'yaru', canSkip: true, active: true, order: 1 },
  { id: 'med-seed-cozaar', name: 'Cozaar', schedule: 'Daily · blood pressure', time: '08:00', person: 'yaru', canSkip: false, active: true, order: 2 },
  { id: 'med-seed-h-morning', name: 'Morning meds', schedule: 'Every morning', time: '08:00', person: 'hannah', canSkip: false, active: true, order: 1 },
  { id: 'med-seed-trelegy', name: 'Trelegy', schedule: 'Daily inhaler', time: '09:00', person: 'hannah', canSkip: false, active: true, order: 2 },
  { id: 'med-seed-h-evening', name: 'Evening meds', schedule: 'Every evening', time: '21:00', person: 'hannah', canSkip: false, active: true, order: 3 }
];

// Seeds are stamped as very old, so any real edit (from any device) always wins over them.
export async function seedMedsIfEmpty(meds) {
  if (meds.length) return;
  for (const m of SEED_MEDS) {
    if (!(await db.items.get(m.id))) await db.items.put({ id: m.id, kind: 'med', data: m, updated_at: 1, deleted: 0, dirty: 1 });
  }
  window.dispatchEvent(new Event('le-synced'));
}

export const medLogId = (medId, date = todayStr()) => 'medlog-' + medId + '-' + date;
export const logMed = (med, state, me) => save('medlog', { medId: med.id, date: todayStr(), state, by: me, at: Date.now() }, medLogId(med.id));

export const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 200, fat: 65, water: 8 };
export const MACROS = [['calories', 'Calories', ''], ['protein', 'Protein', 'g'], ['carbs', 'Carbs', 'g'], ['fat', 'Fat', 'g']];

export function totals(meals) {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const m of meals) for (const k of Object.keys(t)) t[k] += Number(m[k]) || 0;
  return t;
}
