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

## Running Locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

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

## Import/Export

- **Export**: Click "Export Data" on the Import/Export page to download a `.json` file containing all your workout data.
- **Import**: Click "Import Data" and select a previously exported JSON file. You will be asked to confirm before your current data is replaced.
- The export format is human-readable JSON and can be opened in any text editor.

## Deploying to GitHub Pages

1. Update `vite.config.ts` to set the correct base path: `base: '/repreprep/'`
2. Run `npm run build`
3. Deploy the `dist/` folder to GitHub Pages

Or use the GitHub Actions workflow for automated deployment.
