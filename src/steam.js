import { getClient } from './sync.js';
import { db, save } from './db.js';

// Talks to the "steam" function on Supabase (needs you to be signed in).
async function call(body) {
  const c = getClient();
  if (!c) throw new Error('Sign in under Settings & sync to use Steam.');
  const { data, error } = await c.functions.invoke('steam', { body });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch { /* keep message */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export const steamImage = (appid) => 'https://cdn.akamai.steamstatic.com/steam/apps/' + appid + '/header.jpg';
export const searchSteam = (term) => call({ action: 'search', term }).then((d) => d.results || []);

export async function importSteamLibrary(profile, me) {
  const { games } = await call({ action: 'library', profile });
  const twoWeeks = Date.now() / 1000 - 14 * 86400;
  let added = 0, updated = 0;
  for (const g of games) {
    const id = 'steam-' + g.appid;
    const cur = await db.items.get(id);
    if (cur && !cur.deleted) {
      if (cur.data.hours !== g.hours) { await save('media', { ...cur.data, hours: g.hours }, id); updated++; }
      continue;
    }
    await save('media', {
      title: g.name, type: 'game', steamAppId: g.appid, image: steamImage(g.appid), hours: g.hours, platform: 'Steam',
      status: g.recentHours > 0 || g.lastPlayed > twoWeeks ? 'active' : 'planned',
      added: Date.now(), touched: (g.lastPlayed || 0) * 1000, owner: me
    }, id);
    added++;
  }
  return { added, updated, total: games.length };
}
