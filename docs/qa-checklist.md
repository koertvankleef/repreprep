# QA Checklist

## Smoke

1. Open app and verify default route resolves to Workouts.
2. Navigate all top-level tabs and verify active nav style updates.
3. Create, edit, and delete a workout.
4. Create and edit a routine, then start a workout from it.
5. Create, rename, and archive an exercise.
6. Verify history updates after saving workout data.

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
