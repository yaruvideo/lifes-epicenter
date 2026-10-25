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

// Macro targets worked out from body stats (Mifflin-St Jeor + activity level).
// These are everyday estimates, not medical advice.
export const ACTIVITY = [['1.2', 'Mostly sitting'], ['1.375', 'Light (1–3 workouts/week)'], ['1.55', 'Moderate (3–5/week)'], ['1.725', 'Very active (6–7/week)']];
export const GOAL_ADJUST = [['-1000', 'Lose faster (about 2 lb/week)'], ['-500', 'Lose (about 1 lb/week)'], ['-250', 'Lose slowly'], ['0', 'Maintain'], ['250', 'Gain slowly'], ['500', 'Gain']];

export function latestWeight(person, weights) {
  return weights.filter((w) => w.person === person).sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at)[0] || null;
}

export function calcTargets(p, weightLb) {
  if (!weightLb || !p.heightIn || !p.age) return null;
  const kg = weightLb * 0.4536, cm = p.heightIn * 2.54;
  const bmr = 10 * kg + 6.25 * cm - 5 * p.age + (p.sex === 'female' ? -161 : 5);
  // Never aim below a common safe floor (1500 men, 1200 women), even on the 2 lb/week goal.
  const floor = p.sex === 'female' ? 1200 : 1500;
  const calories = Math.max(floor, Math.round((bmr * Number(p.activity || 1.375) + Number(p.adjust || 0)) / 10) * 10);
  const protein = Math.round(weightLb * Number(p.proteinPerLb || 0.8));
  const fat = Math.round((calories * Number(p.fatPct || 25)) / 100 / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const water = Math.max(4, Math.round(weightLb / 2 / 8)); // half your weight in ounces, as 8 oz glasses
  return { calories, protein, carbs, fat, water, bmr: Math.round(bmr) };
}

// What Today and Health compare against: formula targets when turned on, otherwise the typed-in goals.
export function goalsFor(person, goalsAll, weights) {
  const g = { ...DEFAULT_GOALS, ...(goalsAll.find((x) => x.id === 'goals-' + person) || {}) };
  if (!g.auto) return g;
  const w = latestWeight(person, weights);
  const t = calcTargets(g, w?.lb);
  return t ? { ...g, ...t } : g;
}
