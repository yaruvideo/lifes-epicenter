---
name: lifes-epicenter
description: Read and update the user's Life's Epicenter app (tasks, Game Dev board, notes, journal, media library) from any project via the Supabase connector.
---

# Life's Epicenter

Life's Epicenter is the user's (Yaru) shared life app with their wife Hannah: https://yaruvideo.github.io/lifes-epicenter/ (code: github.com/yaruvideo/lifes-epicenter). Its data lives in Supabase and syncs to the app within about 30 seconds of a change.

Use it when the user mentions their app, their board, their to-dos, Game Dev cards, journal, or wants this project's progress reflected there.

## How to reach it

Use the Supabase connector tool `execute_sql` with `project_id` = `xlxhmgqfwuzhjfgkxuob`. If no Supabase tool is available, tell the user to turn on the Supabase connector for this project (claude.ai Settings > Connectors) and stop.

Always go through these four helper functions. Never write to the `items` table directly, and never run DELETE, DROP, TRUNCATE or migrations: approval prompts for those may not reach the user, and the session will hang.

- `select * from le_list('<kind>', '<match json>')` returns each item's data as json, newest first. `match` is optional and filters with jsonb containment, e.g. `'{"section":"gamedev"}'`.
- `select le_save('<kind>', '<json>')` adds an item, or, when the json has the `id` of an existing item, changes only the fields given (everything else is kept). Returns the full item.
- `select le_remove('<id>')` hides an item in the app (soft delete). `select le_restore('<id>')` brings it back.

Escape single quotes in text by doubling them (`'It''s done'`). Use one statement per call when you need the result (only the last result is returned).

## People

Owner / by values: `yaru` (the user), `hannah`, `both`. Default to `yaru` unless told otherwise.

## Game Dev section

- **Board cards**: kind `card`, `section: "gamedev"`. Fields: `title`, `column` (`todo` | `doing` | `review` | `done`), `notes`, `order` (number; lower shows higher; use epoch ms for "bottom"), optional `start` and `due` (`YYYY-MM-DD`), `tag` (e.g. Art, Code, Audio), `milestone` (true shows on the Timeline).
  - Add: `select le_save('card', '{"section":"gamedev","column":"todo","title":"Boss AI","notes":"","order":1793100000000}')`
  - Move: `select le_save('card', '{"id":"<id>","column":"doing"}')`
- **Game Dev to-dos** (task list): kind `task` with `list: "gamedev"` (see Tasks below).
- **Section notes**: kind `secnote`, `{"section":"gamedev","text":"...","at":<epoch ms>,"by":"yaru"}`.
- **Docs**: kind `doc`, `{"section":"gamedev","title":"Game design doc","body":"markdown text","touched":<epoch ms>}`.
- **Links**: kind `link`, `{"section":"gamedev","name":"Repo","url":"https://..."}`.

Other sections use the same shapes with `section` `video` or `client`.

## Tasks

Kind `task`. Fields: `title`, `owner`, `list` (`inbox`, `health`, `client`, `video`, `gamedev`, `home`, or custom ones listed in `le_list('tasklists')`), `due` (`YYYY-MM-DD` or null), `priority` (`Urgent`, `High`, `Medium`, `Low`, `Long-Term`, or null), `repeat` (null, `daily`, `weekdays`, `weekly`, `monthly`), `notes`, `subtasks` (array of `{id,title,done,due,notes,subtasks}` up to 3 levels), `done`, `myDay`, `created` (epoch ms), optional `waitingOn` (another task id).

- Add: `select le_save('task', '{"title":"...","owner":"yaru","list":"gamedev","due":null,"priority":null,"repeat":null,"notes":"","subtasks":[],"done":false,"myDay":false,"created":<epoch ms>}')`
- Complete: `le_save('task', '{"id":"<id>","done":true,"doneAt":<ms>,"doneBy":"yaru","outcome":"what got done"}')`, then add the matching journal entry: `le_save('journal', '{"type":"task","text":"what got done","title":"<task title>","list":"<list>","taskId":"<id>","by":"yaru","at":<ms>}')`. Don't complete repeating tasks this way; ask the user to tick those in the app.

## Other kinds (read freely, write only when asked)

`journal` (`type`, `text`, `by`, `at`), `media` (games/books/shows: `title`, `type`, `status`, `platform`...), `medianote` (session notes on a media item), `event` (calendar), `claudenote` (Claude's note on Today), `video`, `client`, `cproject`, `hours`, `invoice`, health kinds (`med`, `medlog`, `meal`, `water`, `exercise`, `weight`, `goals`, `recipe`). Inspect a few rows with `le_list` before writing a kind not described above, and copy their field shape.

## Etiquette

- Before changing or hiding anything, say what you'll change. Adding cards or to-dos the user asked for needs no extra check.
- Tell the user what you changed in plain words (they don't code); it shows in the app within about 30 seconds while it's open.
- Get epoch ms with `select (extract(epoch from now())*1000)::bigint`.
