# Routine Exercise Picker — Implementation Tracker

Status: Batches 1–3 are complete; live filters and interaction/device
verification remain.

## Intended outcome

Replace the routine editor's exercise `<select>` with a focused, sheet-based
picker that scales to the full exercise catalogue and supports adding several
configured routine exercises without repeatedly leaving and reopening the
flow.

The picker is a routine-editing tool, not a second copy of the Exercises page.
It should optimise finding and adding exercises while reusing shared exercise
search and filter semantics.

## Agreed interaction contract

```text
Routine page or new-routine editor
└─ Add exercise picker
   ├─ Filter exercises
   └─ Configure exercise
```

- Add exercise opens a tall first-level picker with search, a filter entry
  point, and an alphabetical exercise list.
- The picker remains mounted while a second-level sheet is open.
- Filter and Configure are sibling second-level sheets. They never stack on
  each other.
- Search, active filters, list position, focus context, and inherited
  configuration defaults belong to one picker session.
- Filter changes apply immediately. Dismissing Filter reveals the updated
  picker without a separate Apply action.
- Activating an exercise opens Configure with set count and rest time.
- Confirming Configure adds one complete routine exercise, returns to the
  intact picker, and then shows a confirmation toast.
- Dismissing Configure adds nothing and returns to the intact picker.
- The user finishes adding exercises by dismissing the picker.
- The same catalogue exercise may be added more than once to a routine.

## Stacked-sheet geometry

Sheets remain bottom-attached and content-height driven. Presentation depth
only reduces the maximum available height:

```text
level 1 maximum = viewport − 1 × stack step
level 2 maximum = viewport − 2 × stack step
level 3 maximum = viewport − 3 × stack step
```

Do not translate or lift covered sheets. Do not force a child to fill its
maximum height.

A visible stack also depends on authoring: a sheet that opens another sheet
must be taller than its child. The exercise picker satisfies this naturally
because its long result list fills the first-level allowance. If another flow
cannot satisfy that relationship, it should use in-place progression or
another presentation rather than relying on an invisible sheet stack.

## Picker result rows

- Exercise identity is the primary reading task.
- The complete row activates Add; use a trailing plus icon as a reinforcing
  cue rather than a separate small hit target.
- Give the row an accessible action name such as `Add Bench Press`.
- Do not disable an exercise after adding it; duplicate occurrences are valid.
- Keep the initial row content to the exercise name unless testing establishes
  that another attribute materially improves selection.

## Configuration defaults

- The first addition in a picker session uses the existing routine-exercise
  defaults: one set and 60 seconds rest.
- After a confirmed addition, its set count and rest time become the defaults
  for the next addition in that picker session.
- Cancelled configuration never changes the inherited defaults.
- Do not persist these transient defaults across unrelated picker sessions.

Changing the initial product defaults later should be a deliberate domain
decision rather than a picker-only exception.

## Implementation batches

### Batch 1 — Stacked-sheet depth foundation

- [x] Assign one-based presentation depth to every open sheet.
- [x] Reduce each sheet's maximum height by one stack step per depth.
- [x] Recalculate depth when a presentation closes.
- [x] Keep natural content height and internal scrolling behavior.
- [x] Document the taller-parent authoring responsibility in the design system.
- [x] Cover depth assignment and cleanup with focused tests.

### Batch 2 — Searchable picker session

- [x] Introduce a feature-level routine exercise picker shared by routine
      creation and routine detail.
- [x] Replace both current select-based Add exercise sheets.
- [x] Render active exercises alphabetically.
- [x] Add live search using the shared exercise search semantics.
- [x] Make the list body consume the first-level allowance and scroll
      internally.
- [x] Preserve query, scroll position, and focus while the picker remains open.
- [x] Add accessible full-row Add actions with a plus cue.
- [x] Preserve duplicate-exercise support.
- [x] Cover empty results, keyboard operation, and both routine entry points.

### Batch 3 — Nested configuration and repeated addition

- [x] Open Configure as a second-level sheet without dismissing the picker.
- [x] Reuse the established set-count and rest-time controls.
- [x] Separate add-mode configuration from edit-mode deletion behavior.
- [x] Seed the first configuration from domain defaults.
- [x] Carry the latest confirmed values to the next configuration.
- [x] Leave defaults unchanged after cancellation.
- [x] Commit each confirmed addition immediately on existing routine detail.
- [x] Keep additions local in new-routine creation until Create routine.
- [x] Show the localized confirmation toast after Configure has closed.
- [x] Restore picker focus and list position after confirm and dismissal.

### Batch 4 — Nested live filters

- [ ] Add the Filter entry point and active-filter indication.
- [ ] Extract reusable filter controls/state instead of copying app-header
      behavior.
- [ ] Open Filter as a second-level sheet.
- [ ] Apply category and equipment changes immediately.
- [ ] Provide a deliberate Clear filters action.
- [ ] Preserve filters for the picker session and combine them with live search.
- [ ] Verify that dismissing Filter returns focus to its trigger.

### Batch 5 — Interaction and device verification

- [ ] Verify the first-level sheet remains visibly taller than both children.
- [ ] Verify narrow viewport, enlarged text, safe-area, and virtual-keyboard
      behavior.
- [ ] Verify pointer, touch, keyboard, screen-reader, reduced-motion, and RTL
      behavior.
- [ ] Verify rapid repeated activation cannot open duplicate Configure sheets.
- [ ] Run architecture, accessibility, test, and build gates.

## Deferred improvements

- Recently used exercises.
- Frequency-based suggestions.
- Grouped zero-query sections.
- Richer result metadata when it demonstrably improves finding an exercise.
- Persisted personal defaults across picker sessions.
