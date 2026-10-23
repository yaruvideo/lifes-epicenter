// Sends phone/PC notifications for meds and task reminders, even when the app is
// closed. A database timer (pg_cron) calls this every few minutes.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const TZ = "America/New_York";

function nowLocal() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}`;
  return { date, time, stamp: `${date}T${time}` };
}
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

Deno.serve(async () => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: keys } = await db.from("app_secrets").select("name,value").in("name", ["vapid_public", "vapid_private"]);
  const k = Object.fromEntries((keys || []).map((r: any) => [r.name, r.value]));
  webpush.setVapidDetails("mailto:noreply@example.com", k.vapid_public, k.vapid_private);

  const { date, time, stamp } = nowLocal();
  const { data: rows } = await db.from("items").select("id,kind,data").eq("deleted", false).in("kind", ["med", "medlog", "task", "pushsub"]);
  const items = rows || [];
  const subs = items.filter((r: any) => r.kind === "pushsub");
  if (!subs.length) return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }));
  const logged = new Set(items.filter((r: any) => r.kind === "medlog").map((r: any) => r.id));

  const due: { key: string; people: string[]; title: string; body: string }[] = [];
  for (const r of items.filter((r: any) => r.kind === "med")) {
    const m = r.data;
    if (m.active === false || !m.time || m.time > time) continue;
    if (minutes(time) - minutes(m.time) > 180) continue; // don't ping hours late
    if (logged.has(`medlog-${r.id}-${date}`)) continue;
    due.push({ key: `med-${r.id}-${date}`, people: [m.person], title: `Time for ${m.name}`, body: m.canSkip ? "Tap Taken or Skip today in Health." : "Mark it taken in Health." });
  }
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 16);
  for (const r of items.filter((r: any) => r.kind === "task")) {
    const t = r.data;
    if (t.done) continue;
    const people = t.owner === "both" ? ["yaru", "hannah"] : [t.owner];
    if (t.remindAt && t.remindAt <= stamp && t.remindAt > yesterday) due.push({ key: `task-${r.id}-${t.remindAt}`, people, title: t.title, body: t.due ? `Due ${t.due}` : "Task reminder" });
    for (const s of t.subtasks || []) {
      if (!s.done && s.remindAt && s.remindAt <= stamp && s.remindAt > yesterday) due.push({ key: `sub-${s.id}-${s.remindAt}`, people, title: s.title, body: `Part of: ${t.title}` });
    }
  }

  let sent = 0;
  for (const d of due) {
    const { error } = await db.from("push_sent").insert({ key: d.key });
    if (error) continue; // already sent
    for (const s of subs.filter((s: any) => d.people.includes(s.data.person))) {
      try {
        await webpush.sendNotification(s.data.sub, JSON.stringify({ title: d.title, body: d.body, tag: d.key }));
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) await db.from("items").update({ deleted: true, updated_at: Date.now() }).eq("id", s.id);
      }
    }
  }
  return new Response(JSON.stringify({ sent, checked: due.length, at: stamp }), { headers: { "Content-Type": "application/json" } });
});
