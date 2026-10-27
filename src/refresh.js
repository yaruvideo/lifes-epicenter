import { syncNow } from './sync.js';

// The Refresh button: sync first, fetch the newest version of the app if there is one, then reload.
export async function refreshApp() {
  try { await syncNow(); } catch { /* offline or signed out: still reload */ }
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => null);
  if (reg) {
    await reg.update().catch(() => {});
    const next = reg.installing || reg.waiting;
    if (next) {
      // main.jsx reloads by itself when the new version takes over; this is the fallback.
      await new Promise((done) => {
        next.addEventListener('statechange', () => next.state === 'activated' && done());
        setTimeout(done, 8000);
      });
    }
  }
  location.reload();
}
