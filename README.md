# Pulse Planner (Zero‑build PWA)

A single‑folder, zero‑build Progressive Web App (PWA) for a **Pulse‑style daily planner**. Works on GitHub Pages and iPad Safari. No `/assets` folder; all required files live in the repository root.

## Features
- Daily planner with add/delete and toggle‑to‑complete
- LocalStorage persistence per day
- Completion progress bar & simple streak counter
- **Easter egg**: shows when all tasks are done (once a day) or via a secret triple‑tap on the header. Includes cooldown.
- Installable PWA + offline support via service worker

## Files
```
index.html
styles.css
app.js
sw.js
manifest.webmanifest
favicon.ico
icon-192.png
icon-512.png
apple-touch-icon.png
README.md
```
> No external build tools or frameworks required.

## Deploy to GitHub Pages
1. Create a new public repo (or use an existing one).
2. Upload these files to the **repository root** (no subfolders).
3. In **Settings → Pages**, set Source to `Deploy from a branch`, Branch: `main` (or `master`), Folder: `/ (root)`.
4. Wait for Pages to publish, then open the site URL.
5. The PWA service worker activates on the **first reload**. After that the app works offline.

## iPad Safari Tips
- If you only see a background with no UI, ensure **all files** above are present at the repo root and cached (reload once).
- Add to Home Screen for a full‑screen experience.

## Customization
- Edit seed tasks in `app.js` (`loadTasks()`).
- Tweak colors in `styles.css` (CSS variables at the top).

## License
MIT
