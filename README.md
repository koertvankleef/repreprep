# Repreprep

RepRepRep is a lightweight, local-first workout tracker. Log workouts, track progress, and focus on consistency—rep after rep after rep.

## What is Repreprep?

Repreprep is a personal workout logger that runs entirely in your browser. It helps you:
- Log workouts by date
- Track exercises with sets, reps, and weight
- Track duration-based exercises like planks
- View your exercise history over time
- Export and import your data as JSON

No accounts, no cloud, no tracking. Your data stays in your browser.

## Feature List

See docs/features.md for the current user-facing feature inventory.

## Running Locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## Offline Development Notes

- The app now vendors its Google font assets locally under `public/fonts` and loads them via `src/design-system/fonts.css`.
- UI typography works without internet access once dependencies are installed.
- To work fully offline, run `npm install` before traveling so `node_modules` is already present.
- Installed app usage offline is supported after at least one successful online load, because the service worker caches app shell assets.

## Running Tests

```bash
npm test
```

## Architecture Checks

```bash
npm run check:architecture
```

Layer boundaries are documented in docs/architecture-boundaries.md.

## Manual QA

Use docs/qa-checklist.md for repeatable smoke, localization, accessibility, and architecture checks.

## How localStorage Works

All workout data is stored in your browser's localStorage under the key `repreprep:data`. Data persists between sessions on the same browser/device. Clearing browser data will erase your workouts—use the export feature regularly to back up your data.

## Data Compatibility Note

The workout kind model was hard-renamed from legacy values to canonical values (`reps` and `time`) without backward-compatibility or migration.

If you used a build from before this change, clear local browser data for this app before using the updated build.

## Import/Export

- **Export**: Click "Export Data" on the Import/Export page to download a `.json` file containing all your workout data.
- **Import**: Click "Import Data" and select a previously exported JSON file. You will be asked to confirm before your current data is replaced.
- The export format is human-readable JSON and can be opened in any text editor.

## Deploying to GitHub Pages

This project already builds with a relative Vite base, so it can be hosted from a GitHub Pages project site without changing `vite.config.ts`.

### One-time GitHub setup

1. Push this repository to GitHub.
2. In the repository settings, open `Settings > Pages`.
3. Under `Build and deployment`, choose `GitHub Actions` as the source.

### Automatic deployment

A workflow is included at [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).

- Every push to `main` will:
	- install dependencies
	- run the test suite
	- build the app
	- deploy `dist/` to GitHub Pages

### Preview URL

For this repository, the deployed preview will be published at:

`https://koertvankleef.github.io/repreprep/`

You can also trigger the deploy manually from the `Actions` tab with `workflow_dispatch`.
