# Exercise Library

The initial exercise catalogue is generated from Free Exercise DB and committed as static app data.

- Runtime data: `src/exercise-library/exercises.ts`
- Import script: `scripts/import-free-exercise-db.mjs`
- Provenance report: `docs/exercise-library-provenance.json`
- Source repository: https://github.com/yuhonas/free-exercise-db
- Source file: dist/exercises.json
- Source license: Unlicense

The app does not query Free Exercise DB at runtime. Re-import by downloading the source JSON to a local path and running:

```sh
node scripts/import-free-exercise-db.mjs .tmp/exercise-import/free-exercise-db.exercises.json
```

The runtime exercise objects intentionally do not include source attribution fields. The generated provenance report keeps source IDs, source names, duplicate removals, and suspicious generic-name warnings separately.
