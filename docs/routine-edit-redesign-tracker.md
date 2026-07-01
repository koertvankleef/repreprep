# Routine Editing Redesign — Draft Implementation Tracker

Status: draft for review and discussion. No item in this document is an
implementation commitment until its open decisions are resolved.

## Intended outcome

Replace the single dense routine editor with a sequence-oriented experience:

- Routine detail becomes the main place to understand and manage a routine.
- Exercise rows navigate to a deeper routine-exercise editor.
- Routine exercises and planned sets can be reordered.
- Time between exercises and time between sets are visible as gutters.
- Rows support an end-to-start swipe gesture for deletion on touch layouts.
- Pointer, keyboard, screen-reader, and reduced-motion experiences retain all
  essential functionality.

## Working terminology

- **Routine transition:** preparation time between two routine exercises.
- **Set rest:** rest time between planned sets of one routine exercise.
- **Gutter:** a visible, data-bearing interval between two sequence rows. It is
  not merely CSS spacing.
- **Sequence row:** an exercise or planned set that can be navigated, reordered,
  or deleted.
- **Swipe decorator:** a wrapper around a row that adds horizontal reveal and
  commit behavior without taking ownership of the row's content or domain
  mutation.

## Proposed information architecture

### Routine detail

- Shows the routine overview and ordered exercise sequence.
- Shows the routine's default transition duration.
- Renders a transition gutter between adjacent exercise rows.
- Exercise rows use a chevron and navigate to the routine-exercise editor.
- Provides the add-exercise entry point.
- Provides reordering and deletion of routine exercises.
- Keeps rename in the app header.

Proposed route:

```text
/routines/:routineId
```

### Routine-exercise editor

- Edits one occurrence of an exercise within a routine, not the global exercise
  catalogue entry.
- Shows the ordered planned-set sequence.
- Shows the shared rest duration between adjacent set rows.
- Provides a page-level place to edit that shared rest duration.
- Provides add, reorder, and delete behavior for planned sets.
- May provide a secondary link to the global exercise detail page.

Proposed routes:

```text
/routines/:routineId/exercises/:routineExerciseId
/routines/:routineId/exercises/new
```

## Proposed persisted model

Keep the routine exercise collection as the constrained source of truth for
order and transition placement:

```ts
interface RoutineVersion {
  transitionSeconds: number
  exercises: RoutineExercise[]
}

interface RoutineExercise {
  id: string
  exerciseId: string
  transitionBeforeSeconds: number | null
  restSeconds: number
  plannedSets: PlannedSet[]
}
```

`RoutineVersion.transitionSeconds` is the default. A
`transitionBeforeSeconds` value of `null` inherits that default. An explicit
`0` means no transition.

The override belongs to the destination exercise because the motivating
question is how much preparation that exercise needs. When an exercise is
reordered, its preparation time moves with it. The first exercise's transition
is ignored in presentation and execution.

The resulting persisted array remains difficult to corrupt, while a derived
flow makes the actual workout sequence explicit to renderers and the logging
workflow:

```ts
type RoutineFlowItem =
  | { kind: 'exercise'; exercise: RoutineExercise }
  | { kind: 'transition'; seconds: number; beforeExerciseId: string }
```

Example derived flow:

```text
exercise A
transition 20 seconds
exercise B
transition 45 seconds
exercise C
```

### Alternative: persist alternating flow nodes

Persisting exercise and transition nodes in one array would make the flow
literal in storage, but would also permit invalid states such as two adjacent
transitions or a trailing transition. Keep this alternative open for review;
the current recommendation is to persist the constrained exercise array and
derive the alternating flow.

### Planned-set identity

Planned sets currently have no stable IDs. Reordering, swipe deletion, focus
restoration, and motion all require identity independent of array index.

- [ ] Add an `id` to every planned-set variant.
- [ ] Increment the storage schema version.
- [ ] Migrate existing planned sets by assigning IDs while preserving order and
      values.
- [ ] Stop using array indexes as interaction identity.

### Set-rest model

For the first iteration, `RoutineExercise.restSeconds` remains one shared value
for every gap between planned sets. Set-rest gutters are derived and do not
store individual overrides.

Changing the page-level rest duration updates every rendered set gutter. If a
gutter itself is interactive, its accessible name must make the shared scope
clear: “Edit rest between all sets,” not “Edit this rest.”

## Sequence and gutter design-system work

The sequence should compose existing identity-first rows rather than turn
`.rrr-list-card` into a domain-aware workout component.

Candidate responsibilities:

- `rrr-sequence` owns ordered layout and the relationship between rows and
  gutters.
- `rrr-sequence-gutter` presents an interval, duration, inherited/overridden
  state, and optional activation.
- `rrr-list-row` continues to own row identity, navigation, and content.
- A sorting controller owns reorder interaction without owning row markup.
- A swipe decorator owns horizontal gesture presentation without deleting
  domain data itself.

Initial gutter requirements:

- [ ] Display a localized duration such as “20 seconds.”
- [ ] Distinguish an inherited routine default from a per-exercise override
      without adding visual noise.
- [ ] Support static and interactive variants.
- [ ] Provide an accessible label that identifies the relationship, for
      example “20 seconds preparation before Squat.”
- [ ] Collapse or reposition predictably while an adjacent row is dragged.
- [ ] Add static routine and set examples to the Styleguide before product
      integration.

## Reordering

Use a dedicated drag handle. The row itself remains available for navigation,
and the rest of the row remains available for horizontal swipe.

Pointer behavior:

- [ ] Begin sorting only from the drag handle.
- [ ] Use Pointer Events rather than native HTML drag-and-drop so touch behavior
      is supported consistently.
- [ ] Preserve vertical page scrolling until the handle starts a drag.
- [ ] Animate neighboring rows into their prospective positions.
- [ ] Keep the dragged row and its stable ID as the reorder unit.
- [ ] Recalculate derived gutters from the prospective order.
- [ ] Emit the final ordered IDs; let the containing page update domain data.

Keyboard behavior:

- [ ] Give the drag handle an accessible name containing the row label.
- [ ] Support lift, arrow-key movement, drop, and cancel.
- [ ] Announce the picked-up item, new position, drop, and cancellation through
      a polite live region.
- [ ] Restore focus to the moved row's handle after rendering.

Open reorder questions:

- [ ] Should reordering save immediately on drop or mark the page dirty?
- [ ] Should gutters remain visible during a drag or temporarily collapse?
- [ ] Should the first and last positions expose special drop affordances?

## Swipe decorator

Treat swipe as progressive enhancement around a row:

```html
<rrr-swipe-action
  direction="end-to-start"
  action="delete"
  action-label="Delete Squat"
  tone="danger"
>
  <rrr-list-row><!-- row content --></rrr-list-row>
</rrr-swipe-action>
```

The proposed component owns gesture state and emits a semantic commit event. It
does not remove the row or mutate routine data.

### Gesture states

1. **Closed:** the row covers the action surface.
2. **Revealing:** horizontal movement exposes a neutral surface and neutral
   delete icon.
3. **Armed:** crossing the commit threshold changes the icon and background to
   the danger treatment.
4. **Commit:** releasing while armed emits the action event and completes the
   row exit.
5. **Cancel:** releasing before the threshold returns the row to its closed
   position.

This follows the supplied Outlook reference: color communicates that releasing
has changed from previewing an action to committing it.

### Gesture arbitration

- [ ] Lock to horizontal swipe only after horizontal intent exceeds vertical
      intent and a small movement threshold.
- [ ] Do not suppress ordinary vertical scrolling before that lock.
- [ ] Disable swipe initiation from the drag handle and interactive descendants.
- [ ] Use pointer capture after horizontal intent is established.
- [ ] Apply resistance beyond the commit threshold.
- [ ] Respect logical direction so end-to-start works in both LTR and RTL.
- [ ] Close any previously revealed row when another row begins interaction.

### Action API

Build the state machine generically enough to avoid hard-coding deletion, while
shipping only the required delete configuration initially:

- direction
- localized action label
- icon
- semantic tone
- reveal distance
- commit threshold
- emitted action identifier

Avoid a broad multi-action API until a second real action is identified.

### Desktop and accessibility behavior

The visible delete button may be restricted to the desktop layout, but swipe
cannot be the only way to delete:

- [ ] Show an explicit delete control where the desktop layout has room.
- [ ] Keep the swipe action backed by a real button.
- [ ] Reveal that action when it receives keyboard focus.
- [ ] Expose the same localized action to screen readers on touch layouts.
- [ ] Provide a keyboard-operable deletion path without requiring a gesture.
- [ ] Decide whether committed deletion is followed by Undo, confirmation, or
      immediate persistence.
- [ ] Ensure reduced-motion mode removes simulated physics without removing
      state feedback.

### Deferred swipe work

- [ ] On first render, optionally demonstrate a subtle partial reveal and return
      to teach discoverability.
- [ ] Persist whether that hint has already been shown.
- [ ] Evaluate configurable leading and trailing actions only after the delete
      interaction is stable.

## Save and versioning decision

The current immutable routine-version model creates a new version when a
routine is saved. Gesture-driven editing raises a product and storage decision:

- Immediate reorder/delete commits can create many routine versions.
- A page-level draft avoids version churn but requires draft state to survive
  navigation into the routine-exercise editor.
- A temporary in-memory draft is lost on reload.
- A persisted draft requires its own lifecycle, migration, and recovery UX.

- [ ] Decide the save boundary before wiring gestures to storage.
- [ ] Decide whether an Undo operation restores data by creating another
      version or by replacing an uncommitted draft.
- [ ] Document what happens when the app closes with a dirty routine draft.

## Suggested implementation order

### Phase 0 — Resolve model and interaction contracts

- [ ] Choose constrained exercise-array versus explicit alternating-flow
      persistence.
- [ ] Choose immediate commits versus a cross-page routine draft.
- [ ] Agree on destination-owned transition overrides.
- [ ] Define the swipe commit and deletion recovery behavior.
- [ ] Define stable planned-set IDs and migration.

### Phase 1 — Static sequence primitives

- [ ] Implement and document static sequence and gutter presentation.
- [ ] Add routine-transition and set-rest Styleguide examples.
- [ ] Add localization and accessibility tests.

### Phase 2 — Routine detail sequence

- [ ] Render existing routine exercises as navigable sequence rows.
- [ ] Render default and overridden transition gutters.
- [ ] Add the page-level default transition editor.
- [ ] Add the per-gutter transition override editor.
- [ ] Add routine-exercise routes and back-navigation behavior.

### Phase 3 — Routine-exercise editor

- [ ] Render planned sets as sequence rows.
- [ ] Render shared rest gutters.
- [ ] Add the page-level shared rest editor.
- [ ] Add and edit planned sets.
- [ ] Confirm the routine-exercise edit according to the chosen save boundary.

### Phase 4 — Reordering

- [ ] Add stable set IDs and migration first.
- [ ] Implement handle-based pointer sorting.
- [ ] Implement keyboard sorting and announcements.
- [ ] Integrate exercise reordering.
- [ ] Integrate planned-set reordering.

### Phase 5 — Swipe deletion

- [ ] Implement the decorator and Outlook-like state progression.
- [ ] Add explicit desktop actions and non-gesture accessible actions.
- [ ] Integrate routine-exercise deletion.
- [ ] Integrate planned-set deletion.
- [ ] Test touch scrolling, hybrid devices, pointer cancellation, and reduced
      motion.

### Phase 6 — Retire the legacy routine editor

- [ ] Move remaining routine-edit responsibilities to routine detail or the
      routine-exercise editor.
- [ ] Remove obsolete routes, markup, styles, translations, and tests.
- [ ] Preserve creation of a new routine as a coherent flow.

## Verification matrix

- [ ] Narrow touch viewport: scroll, swipe preview, swipe commit, drag, cancel.
- [ ] Desktop pointer: visible actions, drag handle, row navigation.
- [ ] Hybrid device: touch and mouse behavior coexist.
- [ ] Keyboard only: navigate, edit, reorder, delete, cancel, and recover.
- [ ] Screen reader: sequence position, gutter meaning, drag announcements, and
      deletion action are understandable.
- [ ] Reduced motion: all operations remain legible without travel animations.
- [ ] RTL: logical swipe direction and sequence layout remain correct.
- [ ] Data migration: existing routines and planned sets preserve values and
      order.
- [ ] Workout logging: derived routine flow produces the intended transition
      and rest timing.
