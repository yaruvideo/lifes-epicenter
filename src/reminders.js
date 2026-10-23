import { all, device } from './db.js';
import { todayStr } from './store.js';
import { medLogId } from './health.js';

// Checks every 30 seconds while the app is open (or minimized) and shows a
// Windows/Android notification for meds and task reminders that are due.
async function notify(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body, tag, icon: 'icon-192.png', badge: 'icon-192.png' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return reg.showNotification(title, opts);
  } catch { /* fall through */ }
  new Notification(title, opts);
}

const nowLocal = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return { date: todayStr(), time: p(d.getHours()) + ':' + p(d.getMinutes()), stamp: todayStr() + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) };
};

async function check(me) {
  const sent = device.get('notified', {});
  const { date, time, stamp } = nowLocal();
  const fire = (key, title, body) => {
    if (sent[key]) return;
    sent[key] = Date.now();
    notify(title, body, key);
  };

  const [meds, logs, tasks] = await Promise.all([all('med'), all('medlog'), all('task')]);
  const logged = new Set(logs.map((l) => l.id));
  for (const m of meds) {
    if (m.person !== me || m.active === false || !m.time || m.time > time) continue;
    if (logged.has(medLogId(m.id, date))) continue;
    fire('med-' + m.id + '-' + date, 'Time for ' + m.name, m.canSkip ? 'Tap Taken or Skip today in Health.' : 'Mark it taken in Health.');
  }
  for (const t of tasks) {
    if (t.done || (t.owner !== me && t.owner !== 'both')) continue;
    if (t.remindAt && t.remindAt <= stamp) fire('task-' + t.id + '-' + t.remindAt, t.title, t.due ? 'Due ' + t.due : 'Task reminder');
    for (const s of t.subtasks || []) {
      if (!s.done && s.remindAt && s.remindAt <= stamp) fire('sub-' + s.id + '-' + s.remindAt, s.title, 'Part of: ' + t.title);
    }
  }
  // Forget keys older than two days so the list stays small.
  const cutoff = Date.now() - 2 * 864e5;
  for (const k of Object.keys(sent)) if (sent[k] < cutoff) delete sent[k];
  device.set('notified', sent);
}

let timer = null;
export function startReminders(getMe) {
  clearInterval(timer);
  const run = () => check(getMe()).catch(() => {});
  run();
  timer = setInterval(run, 30000);
  return () => clearInterval(timer);
}
