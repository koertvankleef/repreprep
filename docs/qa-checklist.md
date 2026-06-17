# QA Checklist

## Smoke

1. Open app and verify default route resolves to Workouts.
2. Navigate all top-level tabs and verify active nav style updates.
3. Create, edit, and delete a workout.
4. Create and edit a routine, then start a workout from it.
5. Create, rename, and archive an exercise.
6. Verify history updates after saving workout data.

## Workout Logging Regressions

1. Create a new routine with at least one `time` exercise and one `reps` exercise.
2. In routine editor, add a new set to the `time` exercise and verify only seconds input is shown.
3. Start a workout from that routine and verify newly started session shows "new workout" context copy, not edit context copy.
4. Open an already updated workout and verify edit-context copy is shown.
5. Create a workout shortly after local midnight and verify workout list date and history date show the local calendar day.
6. Verify export/import still works with current schema and no compatibility fallback is required.

## Localization

1. Verify English copy with browser locale `en-*`.
2. Verify Dutch copy with browser locale `nl-*`.
3. Verify pluralized routine exercise count for 1 and 2+ items.
4. Run `npm run check:i18n` and confirm pass.

## Accessibility

1. Navigate primary actions with keyboard only.
2. Confirm dialog focus lands on first actionable element.
3. Confirm validation errors are announced via live regions.
4. Confirm `aria-label` values for edit/delete controls include context.

## Architecture

1. Run `npm run check:architecture` and confirm pass.
2. Run `npm run build` and `npm test` after structural changes.
3. Confirm no direct imports from forbidden layers.
