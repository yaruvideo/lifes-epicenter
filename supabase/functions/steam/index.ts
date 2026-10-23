// Steam helper for Life's Epicenter. The app can't call Steam directly (browsers
// block it), so it asks this function instead.
//   { action: "search", term }      -> store search, no key needed
//   { action: "library", profile }  -> owned games; needs the STEAM_API_KEY secret
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function steamId(profile: string, key: string): Promise<string> {
  const p = profile.trim().replace(/\/+$/, "");
  const id = p.match(/(\d{17})$/);
  if (id) return id[1];
  const vanity = p.split("/").pop() || p;
  const r = await fetch(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(vanity)}`);
  const d = await r.json();
  if (d?.response?.success !== 1) throw new Error("Couldn't find that Steam profile. Paste your profile link or 17-digit Steam ID.");
  return d.response.steamid;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { action, term, profile } = await req.json();
    if (action === "search") {
      const r = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term || "")}&l=english&cc=US`);
      const d = await r.json();
      return json({ results: (d.items || []).slice(0, 10).map((i: any) => ({ appid: i.id, name: i.name, image: i.tiny_image })) });
    }
    if (action === "library") {
      const key = Deno.env.get("STEAM_API_KEY");
      if (!key) return json({ error: "The Steam API key isn't set up yet." }, 400);
      const id = await steamId(profile || "", key);
      const r = await fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${key}&steamid=${id}&include_appinfo=1&include_played_free_games=1`);
      const d = await r.json();
      const games = d?.response?.games;
      if (!games) return json({ error: "Steam didn't share the game list. In Steam, set Profile > Privacy > Game details to Public." }, 400);
      return json({
        steamid: id,
        games: games.map((g: any) => ({
          appid: g.appid,
          name: g.name,
          hours: Math.round((g.playtime_forever || 0) / 6) / 10,
          recentHours: Math.round((g.playtime_2weeks || 0) / 6) / 10,
          lastPlayed: g.rtime_last_played || 0,
        })),
      });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
