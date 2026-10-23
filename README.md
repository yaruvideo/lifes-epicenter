# Life's Epicenter

A shared life hub for two: tasks, journal, health, media and projects. It installs on Windows and Android as an app, works offline, and syncs through a free Supabase database.

## What works now

- Today, Tasks (sub-tasks, priorities, due dates, repeats, wrap-up notes), Journal, Appearance (13 themes plus fine-tuning), Settings.
- Everything saves on the device first, so it works with no internet.
- Sync between devices once Supabase is connected.
- Backup download and restore.

## One-time setup

1. **GitHub Pages:** in the repository, open Settings > Pages and set "Source" to "GitHub Actions". Every push to `main` then publishes the app at `https://<your-username>.github.io/<repo-name>/`.
2. **Supabase:** create a free project at supabase.com. Open SQL Editor > New query, paste all of `supabase/setup.sql`, and press Run.
3. In Supabase, open Authentication > URL Configuration and set Site URL to your GitHub Pages address.
4. In Supabase, open Project Settings > API and copy the Project URL and the `anon` `public` key. Put them in `src/config.js`, or paste them in the app under Settings & sync.
5. In the app, each of you picks your name under "Who uses this device?" and creates an account. One of you presses "Create our shared space" and sends the invite code; the other presses "Join".

## For developers

```
npm install
npm run dev
```

Data model: every record is a row in `items` (`kind` + JSON `data`). Local storage is IndexedDB via Dexie (`src/db.js`); sync is in `src/sync.js` and uses newest-edit-wins per item.
