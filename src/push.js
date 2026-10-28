import { save, device } from './db.js';
import { PREVIEW, VAPID_PUBLIC_KEY } from './config.js';

const toBytes = (b64) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

// Asks permission, subscribes this device, and stores the subscription so the
// server can send reminders here even when the app is closed.
export async function enablePush(me) {
  if (PREVIEW) throw new Error('Turn notifications on from your real app. The preview copy can\'t receive them.');
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('This browser can\'t receive notifications while closed.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser\'s site settings.');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(VAPID_PUBLIC_KEY) }));
  const json = sub.toJSON();
  const id = 'pushsub-' + json.endpoint.slice(-32).replace(/[^a-zA-Z0-9]/g, '');
  await save('pushsub', { person: me, sub: json, device: navigator.userAgent.slice(0, 80), at: Date.now() }, id);
  device.set('push-id', id);
  reg.showNotification("Life's Epicenter", { body: 'Notifications are on. Reminders will reach this device even when the app is closed.', icon: 'icon-192.png' });
  return id;
}

export const pushEnabled = () => !!device.get('push-id', null) && typeof Notification !== 'undefined' && Notification.permission === 'granted';
