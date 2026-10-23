# Life's Epicenter

A shared life hub for two: tasks, journal, health, media and projects. It installs on Windows and Android as an app, works offline, and syncs through a free Supabase database.

## What works now

- **Today:** tasks for today, meds due, macros for both of you.
- **Tasks:** lists you can rearrange, sub-tasks (with their own due dates and reminders, or turned into tasks), priorities, repeats, "waiting on" another task, wrap-up notes that go to the Journal.
- **Journal:** thoughts, finished tasks, media notes and exercise as one timeline.
- **Calendar:** week view of events and due tasks.
- **Health:** meds (with "Skip today" where allowed), macros, meals, water, exercise, for each person.
- **Shared:** notes to each other, grocery list, the week together, shared tasks.
- **Library:** games (session notes, Play journal template), books/manga/webtoons/comics (batch chapter logging), shows (seasons/parts, next episode) and movies.
- **Sections:** Game Dev (board, list, notes, docs, links), Video Projects (stages and templates), Client Work (projects overview, hours and timer, invoices, notes).
- **Appearance:** 13 themes plus fine-tuning, per person. Reminders appear while the app is open or minimized.
- Everything saves on the device first and syncs through Supabase.

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
