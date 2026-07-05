# Routine Editing and Prefill Redesign — Implementation Tracker

Status: agreed product direction; implementation work remains unless explicitly
checked below.

## Intended outcome

Repreprep is a fast routine-based workout logbook, not a coaching or
programming app.

- A routine defines reusable structure: exercise order, set count, scheduled
  rest, and preparation time between exercises.
- A routine does not define rep, weight, or duration targets.
- A workout records what actually happened.
- One completed workout may be explicitly selected as the source of starting
  values for the next execution of its routine.
- Routine detail is the main place to understand and manage a routine.
- Routine exercises are edited in a sheet; they do not require a subpage.

## Agreed product decisions

- Keep `Exercise`, `RoutineExercise`, and `WorkoutExerciseEntry` as separate
  concepts.
- Replace persisted planned sets with `RoutineExercise.setCount`.
- Remove explicit targets from the routine model and UI.
- Do not derive starting values from the latest workout automatically.
- A user explicitly selects one completed workout as a routine's prefill
  source, or selects none.
- Declining to use a newly completed workout leaves the previously selected
  source unchanged.
- With no selected source, or no matching source value, the active workout
  receives its current zero-value fallback.
- For the MVP, rep-based sets start at `0` reps and `null` weight when no
  selected source value exists. Do not invent a default weight.
- Prefill matching is routine-specific. The same exercise in another routine
  is not an equivalent source.
- Existing routine edits auto-save at meaningful interaction boundaries.
- New routine creation commits from its explicit Create routine action without
  a second confirmation.
- Do not implement Undo for the MVP.
- Reordering commits immediately on drop.
- Swipe deletion commits immediately when released beyond its armed threshold,
  without confirmation.
- Reordering starts only from an explicit drag handle; do not add long-press
  row dragging.
- Transition overrides belong to the destination routine exercise.
- Set rest remains one shared scheduled value for every set in a routine
  exercise.
- A routine exercise always has at least one set. Zero sets is not a valid
  routine-exercise state; remove the exercise instead.

## Working terminology

- **Exercise:** a reusable catalogue definition such as Push-up or Plank.
- **Routine exercise:** one occurrence of an exercise in a routine. It owns
  routine-specific structure and timing.
- **Workout exercise:** the historical execution of a routine exercise. It owns
  the actual logged sets and values.
- **Prefill source workout:** the one completed workout explicitly selected to
  supply starting values the next time its routine is executed.
- **Routine transition:** scheduled preparation time before the destination
  routine exercise.
- **Set rest:** scheduled rest time shared by all sets of one routine exercise.
- **Gutter:** a visible, data-bearing interval between two sequence rows. It is
  not merely CSS spacing.
- **Swipe decorator:** a wrapper that adds horizontal reveal and commit behavior
  without owning row content or domain mutation.

Avoid using **target**, **planned set**, or **affirmed workout** in user-facing
copy. “Use for next workout” describes the action more directly.

## Conceptual and persisted model

The current development schema can be replaced directly; the destination shape
is:

```ts
interface Routine {
  id: string
  activeVersionId: string
  prefillSourceWorkoutId: string | null
  // identity and lifecycle fields
}

interface RoutineVersion {
  id: string
  routineId: string
  transitionSeconds: number
  exercises: RoutineExercise[]
  // version-history fields
}

interface RoutineExercise {
  id: string
  exerciseId: string
  setCount: number
  restSeconds: number
  transitionBeforeOverrideSeconds: number | null
  notes?: string
}

interface Workout {
  id: string
  routineId?: string
  routineVersionId?: string
  completedAt: string | null
  exercises: WorkoutExerciseEntry[]
  // workout metadata
}

interface WorkoutExerciseEntry {
  id: string
  exerciseId: string
  routineExerciseId?: string
  sets: SetEntry[]
  restSeconds?: number
  transitionBeforeSeconds?: number
  notes: string
}
```

`RoutineExercise.id` is stable across routine versions while that occurrence
continues to represent the same exercise. Reordering does not change it.
Deleting and later re-adding an exercise creates a new occurrence and therefore
a new ID.

`RoutineVersion.transitionSeconds` is the default transition. A destination
exercise override of `null` inherits that default; `0` means no transition.
The first exercise's override is normalised to `null` and is not exposed.

Workout timing fields are scheduled snapshots copied from the routine.
Future actual timing should be added separately—for example per-gap actual rest
intervals—rather than overwriting the scheduled values.

## Prefill-source rules

Persist the selection as a relationship owned by the routine:

```ts
Routine.prefillSourceWorkoutId: string | null
```

The selected state can be presented on the referenced workout as “Used for next
workout.” A pointer on the routine guarantees one source or none without
mutating historical performance values.

When starting a routine:

1. Resolve the selected workout only when it belongs to that routine.
2. Match current and source workout exercises by stable
   `routineExerciseId`.
3. Copy actual set values by ordinal position up to the current `setCount`.
4. Create zero-value sets where the source has no matching exercise or set.
5. Ignore source exercises and sets no longer present in the routine.
6. Never fall back to a different completed workout.
7. Generate fresh workout-entry and set IDs; do not reuse historical IDs.

After the MVP, exercise definitions may provide a sane default rep count for
the no-source case. This is an exercise-level fallback, not a routine target.
Weight remains empty because a safe or useful default load cannot be inferred
generically.

Selecting another completed workout replaces the pointer. Clearing the choice
sets it to `null`. Deleting the selected workout also clears it.

## Pre-release data policy

There are no users and no production data to preserve. This redesign does not
require backward compatibility with the target/planned-set schema.

- [x] Replace the development schema directly.
- [x] Reset incompatible local development data instead of migrating it.
- [x] Update default data, fixtures, import/export validation, and tests to the
      new shape.
- [x] Do not support importing exports from the discarded development schema.
- [x] Remove obsolete migration code when it exists only for unreleased schema
      versions.
- [x] Start every routine with `prefillSourceWorkoutId: null`.
- [x] Create `routineExerciseId` links for newly created workouts; do not build
      inference machinery solely for old development workouts.

Once real users or an explicitly supported release exist, schema changes must
adopt a compatibility and migration policy before shipping.

## Information architecture

### Routine detail

The routine page is the management hub.

- Overview shows routine-level summary information.
- A padded Flow card contains the default transition timing card and ordered
  routine-exercise sequence.
- Transition gutters remain visible between exercise rows.
- Tapping an exercise row opens its editor sheet; it does not navigate and does
  not use a chevron.
- The page provides add, reorder, swipe-delete, rename, start, and delete
  actions.
- The route remains `/routines/:routineId`.
- Existing routines have no separate edit mode or `/edit` route; routine
  detail applies edits at their confirmed interaction boundaries.

The current routine-exercise route and page are obsolete and should be removed.

### Routine-exercise sheet

The sheet edits one occurrence, not the catalogue exercise.

- Exercise name in the heading.
- Number of sets.
- Rest between sets.
- Notes, if routine-exercise notes remain in the MVP.
- A discoverable Delete exercise action.
- Confirm commits one routine edit/version.
- Normal sheet dismissal preserves the original values.

Transition timing remains edited through the gutter because it describes the
relationship between two exercises, not the destination row alone.

### Related workouts

Routine detail may become the jump pad for executions of that routine.

- Show recent workouts belonging to the routine.
- Identify the selected prefill source.
- Navigate to an individual workout's detail/edit page.
- Offer “View all” when the recent list is intentionally limited.
- Allow a completed workout to become or stop being the prefill source.

This section can follow the core model and routine editing replacement; it does
not block removal of targets.

### Workout completion

The eventual completion/review experience provides an explicit “Use these
values next time” choice, selected by default. Until the active-workout
redesign, two separate actions expose that decision directly.

- Selecting it replaces the routine's current prefill source with this workout.
- Leaving it unselected preserves the existing source.
- Both choices mark the workout as completed.
- Completion and prefill selection must not rewrite historical results or the
  routine version.

## Derived routine flow

Persist the constrained exercise array and derive transition gutters:

```ts
type RoutineFlowItem =
  | { kind: 'exercise'; exercise: RoutineExercise }
  | { kind: 'transition'; seconds: number; beforeExerciseId: string }
```

Do not persist alternating flow nodes for the MVP. Reconsider that only if
transitions become independent steps or the app gains warm-up blocks,
instruction cards, circuits, cooldowns, or conditional flows.

## Sequence and gutter design-system work

Continue composing existing identity-first rows:

- `rrr-sequence` owns ordered layout and row/gutter relationships.
- `rrr-sequence-gutter` presents interval duration, inherited/overridden state,
  and optional activation.
- `rrr-list-row` owns row identity and native activation.
- A sorting controller owns reorder interaction without owning row markup.
- A swipe decorator owns gesture presentation without deleting domain data.

Current reusable foundations:

- [x] Static sequence and list semantics.
- [x] Static and interactive transition gutters.
- [x] Separate measurement value/unit presentation.
- [x] Localized relational accessible labels.
- [x] Routine-transition Styleguide examples.
- [x] Update or remove obsolete planned-set/rest-gutter Styleguide examples.

Only navigational rows receive chevrons. Sheet-opening routine-exercise rows use
native button activation without a navigation accessory.

## Reordering routine exercises

Reordering is a transient editing mode, enabled by a `Reorder exercises`
switch above the exercise sequence. The mode is off by default and is not
persisted.
Normal mode keeps exercise rows available for sheet activation and future
horizontal swipe deletion; reorder mode disables those interactions and shows
dedicated handles at logical inline-start. Add exercise is disabled while the
mode is active.

Pointer behavior:

- [x] Require the explicit reorder-mode switch before exposing handles.
- [x] Place handles at logical inline-start.
- [x] Disable exercise and gutter activation while reordering.
- [x] Hide exercise configuration descriptions while reordering.
- [x] Disable Add exercise while reordering.
- [x] Begin sorting only from the drag handle.
- [x] Use Pointer Events rather than native HTML drag-and-drop.
- [ ] Preserve vertical scrolling until handle drag intent is established.
- [x] Animate neighboring rows into prospective positions.
- [x] Fade and collapse gutters when reorder mode starts, then re-derive them
      for the committed order.
- [x] Emit ordered routine-exercise IDs and commit immediately on drop.

The first pointer implementation reserves touch gestures that begin on the
explicit handle. Validate whether a later touch refinement can hand short,
uncommitted handle gestures back to page scrolling without making sorting
unreliable.

Keyboard behavior:

- [x] Give the handle an accessible name containing the exercise name.
- [x] Support lift, arrow-key movement, drop, and cancel.
- [x] Announce pickup, new position, drop, and cancellation.
- [x] Restore focus to the moved row's handle after rendering.

Presentation:

- [x] Animate gutters to zero opacity and height on entering reorder mode.
- [x] Reveal gutters again on leaving reorder mode and on initial page layout.
- [x] Run mode-entry motion once so saving a reorder does not replay it.
- [x] Use the same positional movement at first/last without special drop
      affordances for the MVP.

There is no planned-set reordering: a routine exercise owns only a set count.

## Swipe deletion

Status note: the non-gesture Delete exercise action is now shipped for sheet and
desktop paths, but it does not replace this gesture track. Swipe deletion
remains a required follow-up for this redesign.

Treat swipe as progressive enhancement around a routine-exercise row:

```html
<rrr-swipe-action
  direction="end-to-start"
  action="delete"
  action-label="Delete Squat"
  tone="danger"
>
  <rrr-list-row activation="button" label="Squat"></rrr-list-row>
</rrr-swipe-action>
```

The proposed component emits a semantic commit event and does not mutate domain
data itself.

Gesture states:

1. **Closed:** the row covers the action surface.
2. **Revealing:** movement exposes a neutral surface and delete icon.
3. **Armed:** crossing the threshold applies danger color.
4. **Commit:** releasing while armed deletes immediately and completes exit.
5. **Cancel:** releasing before the threshold closes the row.

Interaction requirements:

- [ ] Lock horizontally only after intent exceeds vertical movement.
- [ ] Do not suppress normal vertical scrolling before lock.
- [ ] Disable swipe initiation from drag handles and interactive descendants.
- [ ] Use pointer capture after horizontal intent is established.
- [ ] Respect logical direction for LTR and RTL.
- [ ] Close a revealed row when another row begins interaction.
- [ ] Keep the action backed by a real localized button.
- [ ] Provide sheet and desktop deletion paths that require no gesture.
- [ ] Commit without confirmation or Undo.
- [ ] Preserve state feedback in reduced-motion mode.

Deferred:

- [ ] Optionally teach swipe with one subtle partial reveal.
- [ ] Consider configurable actions only after a second real action exists.

## Save and versioning

Existing routine edits auto-save at meaningful interaction boundaries:

- rename/default duration/routine-exercise sheet: Confirm;
- transition override sheet: Confirm;
- reorder: drop;
- swipe delete: armed release;
- add exercise: completion of its selection flow.

There is no cross-page routine draft or page-level Save/Cancel interaction.
New routine creation uses its explicit Create routine action as the final
commit boundary; it does not ask for the same decision again in a sheet.

The internal immutable routine-version model may append one version per
completed interaction. Selecting a prefill source is routine metadata, not a
structural routine version.

## Suggested implementation order

### Phase 0 — Documentation and decision reset

- [x] Remove the target/planned-set direction from this tracker.
- [x] Agree on routine structure versus workout execution responsibilities.
- [x] Agree on one explicitly selected prefill source or none.
- [x] Replace the routine-exercise subpage direction with a sheet.
- [x] Retain routine-exercise reorder and swipe deletion.

### Phase 1 — Domain model reset

- [x] Add `Routine.prefillSourceWorkoutId`.
- [x] Replace `RoutineExercise.plannedSets` with `setCount`.
- [x] Add source `routineExerciseId` linkage to workout exercises.
- [x] Replace the development schema and reset incompatible local data.
- [x] Update import/export fixtures and validators.
- [x] Update default data and domain service tests.

### Phase 2 — Workout creation and prefill selection

- [x] Build zero-value workout sets from `setCount`.
- [x] Copy values only from the selected source workout.
- [x] Match by routine-exercise identity and set ordinal.
- [x] Implement select, replace, clear, and source-deletion behavior.
- [x] Verify workouts remain independent historical snapshots.

### Phase 3 — Routine-detail editing

- [x] Convert exercise links to sheet-opening button rows without chevrons.
- [x] Implement set-count/rest routine-exercise sheet.
- [x] Use a localized, button-only number stepper for set count and rest.
- [x] Include the non-gesture Delete exercise action.
- [x] Remove routine-exercise routes, page, translations, and tests.
- [x] Update add-exercise behavior for the new model.
- [x] Retire target/planned-set controls from the legacy editor.
- [x] Make the explicit Create routine action the single creation confirmation.
- [x] Remove the dedicated existing-routine edit page and route.

### Phase 5 — Routine-exercise reordering

- [x] Add a transient reorder-mode switch to create and detail flows.
- [x] Hide handles and preserve normal row/gutter activation outside the mode.
- [x] Place active reorder handles at logical inline-start.
- [x] Collapse and reveal gutters at reorder-mode boundaries.
- [x] Disable Add exercise while the mode is active.
- [x] Implement pointer sorting from an explicit handle.
- [x] Implement keyboard sorting and announcements.
- [x] Integrate persistence and derived-gutter movement.
- [ ] Validate touch scrolling and handle drag intent on physical touch input.

### Phase 6 — Routine-exercise swipe deletion

- [x] Keep swipe gesture deletion as a required milestone after shipping
  non-gesture deletion.
- [ ] Implement the swipe decorator and Outlook-like state progression.
- [ ] Integrate immediate exercise deletion.
- [x] Add explicit desktop and sheet deletion actions.
- [ ] Test touch scrolling, hybrid input, pointer cancellation, and reduced
      motion.

### Deferred Phase 4 — Workout completion and history

Workout-detail/history work stays below the routine interaction milestones
until editing historical logged values receives a separate product review.

- [x] Persist workout completion state so only completed workouts can be
      offered as prefill sources.
- [x] Temporarily expose separate “Finish + use” and “Finish don't use”
      actions at the end of active workout logging.
- [ ] Replace the temporary actions during the active-workout redesign with a
      refined completion choice that defaults to using the finished values.
- [x] Show the selected source and open its selector from routine detail.
- [ ] Show selected-source state on workout detail/edit.
- [x] Allow selecting any completed workout belonging to the routine.
- [x] Add a clear/no-prefill action.
- [ ] Add recent related workouts to routine detail when its design is ready.

### Phase 7 — Cleanup

- [x] Remove obsolete planned-set components, helpers, styles, and tests.
- [x] Remove obsolete target language from all locales and documentation.
- [x] Update Styleguide examples.
- [ ] Re-run architecture, accessibility, import/export, and schema audits.

### Deferred — Exercise-level starting defaults

- [ ] Define and validate a default rep count for every rep-based exercise.
- [ ] Use that value only when the selected source workout has no matching
      value.
- [ ] Keep weight empty unless the user or a selected workout supplies it.
- [ ] Keep these defaults on exercise definitions, not routine exercises.
- [ ] Decide timed-exercise fallback behavior separately.

## Verification matrix

- [x] Fresh/default data uses set counts and contains no routine targets.
- [x] Incompatible unreleased data resets predictably.
- [x] Newly created workouts retain every logged result.
- [x] No-source MVP workouts use `0` reps and `null` weight.
- [x] No selected source produces zero-value starting sets.
- [x] Selected source values copy only within the same routine occurrence.
- [x] New, removed, reordered, and duplicate exercises match safely.
- [x] Changing or clearing the source affects only future workouts.
- [x] Selecting a source does not create a routine version.
- [ ] Narrow touch viewport: scroll, sheet edit, swipe preview/commit, drag.
- [ ] Desktop pointer: sheet edit, explicit delete, drag handle.
- [ ] Keyboard: edit, reorder, select source, clear source, and delete.
- [ ] Screen reader: exercise identity, timing relationships, source state,
      drag announcements, and deletion are understandable.
- [ ] Reduced motion preserves all interaction states without travel animation.
- [ ] RTL uses logical swipe and sequence directions.
