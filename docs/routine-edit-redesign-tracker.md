# Routine Editing Redesign — Draft Implementation Tracker

Status: draft implementation tracker. The MVP product decisions below are
agreed; unchecked implementation details remain open for review.

## Intended outcome

Replace the single dense routine editor with a sequence-oriented experience:

- Routine detail becomes the main place to understand and manage a routine.
- Exercise rows navigate to a deeper routine-exercise editor.
- Routine exercises and planned sets can be reordered.
- Time between exercises and time between sets are visible as gutters.
- Rows support an end-to-start swipe gesture for deletion on touch layouts.
- Pointer, keyboard, screen-reader, and reduced-motion experiences retain all
  essential functionality.

## Agreed MVP decisions

- Persist an ordered exercise array and derive transition/rest gutters.
- Existing routine edits auto-save at meaningful interaction boundaries.
- New routine creation retains a distinct confirmation interaction.
- Do not show page-level Save/Cancel actions for existing routine editing.
- Do not implement Undo for the MVP.
- Swipe deletion commits immediately when released beyond its armed threshold,
  without confirmation.
- Reordering commits immediately on drop.
- Transition overrides belong to the destination exercise.
- Changing the routine transition default immediately updates every gutter that
  still inherits it.
- Set rest remains one shared value for all sets in a routine exercise.
- Reordering starts only from an explicit drag handle; do not add long-press
  row dragging.
- Planned sets require stable IDs before reorder, delete, motion, or focus work.

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
  transitionBeforeOverrideSeconds: number | null
  restSeconds: number
  plannedSets: PlannedSet[]
}
```

`RoutineVersion.transitionSeconds` is the default. A
`transitionBeforeOverrideSeconds` value of `null` inherits that default. An
explicit `0` means no transition.

The override belongs to the destination exercise because the motivating
question is how much preparation that exercise needs. When an exercise is
reordered, its preparation time moves with it. The first exercise's transition
is normalised to `null` and is not exposed in presentation or execution.

The persisted values must preserve the distinction between inherited (`null`),
none (`0`), and custom duration. The UI does not need to present those as three
permanent choice rows. The exact compact editor remains a design detail, but it
must allow a user to restore the routine default and enter zero or a custom
duration.

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
transitions or a trailing transition. This is outside the MVP. Reconsider it
only if the app later supports genuinely independent flow nodes such as
warm-ups, instruction cards, circuits, cooldowns, or conditional steps.

### Planned-set identity

Planned sets currently have no stable IDs. Reordering, swipe deletion, focus
restoration, and motion all require identity independent of array index.

- [x] Add an `id` to every planned-set variant.
- [x] Increment the storage schema version.
- [x] Migrate existing planned sets by assigning IDs while preserving order and
      values.
- [x] Stop using array indexes as persisted identity. Positional labels may
      continue to use indexes.

### Set-rest model

For the first iteration, `RoutineExercise.restSeconds` remains one shared value
for every gap between planned sets. Set-rest gutters are derived and do not
store individual overrides.

Changing the page-level rest duration updates every rendered set gutter. If a
set-rest gutter becomes interactive in a later iteration, its accessible name
must make the shared scope clear: “Edit rest between all sets,” not “Edit this
rest.” For the MVP, set-rest gutters are display-only and editing happens at
page level.

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

- [x] Display a localized duration such as “20 seconds.”
- [x] Distinguish an inherited routine default from a per-exercise override
      without adding visual noise.
- [ ] Support static and interactive variants.
- [x] Provide an accessible label that identifies the relationship, for
      example “20 seconds preparation before Squat.”
- [ ] Collapse or reposition predictably while an adjacent row is dragged.
- [x] Add static routine and set examples to the Styleguide before product
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
- [ ] Emit the final ordered IDs and commit the new order immediately on drop.

Keyboard behavior:

- [ ] Give the drag handle an accessible name containing the row label.
- [ ] Support lift, arrow-key movement, drop, and cancel.
- [ ] Announce the picked-up item, new position, drop, and cancellation through
      a polite live region.
- [ ] Restore focus to the moved row's handle after rendering.

Open reorder presentation questions:

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
4. **Commit:** releasing while armed emits the action event, immediately
   deletes the item, and completes the row exit.
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
- [ ] Commit deletion immediately without confirmation or Undo.
- [ ] Ensure reduced-motion mode removes simulated physics without removing
      state feedback.

### Deferred swipe work

- [ ] On first render, optionally demonstrate a subtle partial reveal and return
      to teach discoverability.
- [ ] Persist whether that hint has already been shown.
- [ ] Evaluate configurable leading and trailing actions only after the delete
      interaction is stable.

## Save and versioning decision

Existing routine editing auto-saves. There is no cross-page draft and no
page-level Save/Cancel interaction. “Immediate” means committing at a meaningful
interaction boundary, not persisting every keystroke:

- rename or duration sheet: Confirm;
- reorder: drop;
- swipe delete: armed release;
- ordinary field: change/blur, unless the field uses a sheet;
- add exercise or set: completion of its add interaction.

New routine creation is different: it retains a confirmation interaction that
creates the routine.

For the MVP, the existing immutable version model may append one internal
routine version per completed interaction. This keeps workout-history
references correct and is acceptable at the expected data scale. Versioning
remains an implementation detail and is not exposed as edit management.

Undo is intentionally outside the MVP. Reorder and swipe deletion are
low-stakes operations; the swipe interaction warns before commitment by
revealing a neutral action and changing to the danger treatment only after the
commit threshold is crossed.

Because edits are committed at interaction boundaries, closing the app does not
leave a dirty routine draft.

## Suggested implementation order

### Phase 0 — Resolve model and interaction contracts

- [x] Choose constrained exercise-array rather than explicit alternating-flow
      persistence.
- [x] Choose immediate commits rather than a cross-page routine draft.
- [x] Agree on destination-owned transition overrides.
- [x] Define swipe deletion as threshold-committed, immediate, and without Undo
      or confirmation.
- [x] Require stable planned-set IDs and migration before sequence interaction
      work.

### Phase 1 — Static sequence primitives

- [x] Implement and document static sequence and gutter presentation.
- [x] Add routine-transition and set-rest Styleguide examples.
- [x] Add localization and accessibility tests.

### Phase 2 — Routine detail sequence

- [x] Render existing routine exercises as navigable sequence rows.
- [x] Render default and overridden transition gutters.
- [ ] Add the page-level default transition editor.
- [ ] Add the per-gutter transition override editor.
- [x] Add routine-exercise routes and back-navigation behavior.

### Phase 3 — Routine-exercise editor

- [x] Render planned sets as sequence rows.
- [x] Render shared rest gutters.
- [ ] Add the page-level shared rest editor.
- [ ] Add and edit planned sets.
- [ ] Auto-save routine-exercise changes at their interaction boundaries.

### Phase 4 — Reordering

- [x] Add stable set IDs and migration first.
- [ ] Implement handle-based pointer sorting.
- [ ] Implement keyboard sorting and announcements.
- [ ] Integrate exercise reordering.
- [ ] Integrate planned-set reordering.

### Phase 5 — Swipe deletion

- [ ] Implement the decorator and Outlook-like state progression.
- [ ] Add explicit desktop actions and non-gesture accessible actions.
- [ ] Integrate routine-exercise deletion.
- [ ] Integrate planned-set deletion.
- [ ] Verify armed release deletes immediately without confirmation or Undo.
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
- [ ] Keyboard only: navigate, edit, reorder, delete, and cancel gestures.
- [ ] Screen reader: sequence position, gutter meaning, drag announcements, and
      deletion action are understandable.
- [ ] Reduced motion: all operations remain legible without travel animations.
- [ ] RTL: logical swipe direction and sequence layout remain correct.
- [x] Data migration: existing routines and planned sets preserve values and
      order.
- [x] Workout logging: derived routine flow produces the intended transition
      and rest timing.
