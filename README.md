# Anthropic Basecamp · Partner Edition (PwC)

Static landing page for the Basecamp, available in English, Portuguese and German. It lists every activity and its challenges; participants check challenges off as they complete them.

## Run it

Open `index.html` in a browser. No build step or server is needed, and it can be hosted on any static host (GitHub Pages, Vercel, an internal web server).

- Language: use the EN / PT / DE switcher, or link to it directly with `?lang=pt` or `?lang=de`. Without that, the page uses the browser's language and falls back to English.
- Progress: saved in each participant's browser (`localStorage`). It is not shared with anyone or sent to any server.

## Edit the agenda

All copy is in `content.js`:

- `BASECAMP_ACTIVITIES`: the activities (day, time, title, summary) and their challenges, each written in `en`, `pt` and `de`.
- `BASECAMP_UI`: interface text for each language.

Keep each activity and challenge `id` the same after launch. Progress is stored under those ids, so renaming one clears its saved checkmark.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `styles.css` | PwC-aligned styling: orange accent, black and white base, serif headlines |
| `content.js` | Agenda and translations |
| `app.js` | Rendering, language switching, progress tracking |
