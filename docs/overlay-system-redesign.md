# Overlay system redesign

Temporary implementation tracker. Remove this document when the migration is
complete and durable guidance has moved to `docs/design-system.md`.

## Architectural contract

The application has two task-overlay primitives:

- **Sheet** — the default for temporary tasks in the context of the current page.
- **Modal dialog** — an exception for interactions that genuinely do not fit a
  sheet.

Sheets are not routes. Opening or dismissing a sheet does not alter navigation
history. Navigation dismisses any sheets owned by the previous page.

Every sheet is an independent presentation layer with its own native dialog,
backdrop, result promise, focus lifecycle, and dismissal behavior. Independent
instances make stacking a supported capability without requiring every product
flow to use it.

Presentation order is invariant:

1. page content
2. sheet stack, in opening order
3. toasts
4. tooltips

`z-index` cannot place ordinary document content above a native modal top layer.
When a sheet is open, toast and tooltip portals therefore belong inside the
topmost sheet's presentation layer. Tooltips remain above every other surface.

## Phase 1 — foundation and Routine deletion

- [x] Record architecture and phased migration.
- [x] Add an independent, stack-capable `rrr-sheet` primitive.
- [x] Give each sheet its own native backdrop.
- [x] Support backdrop, Escape/close-request, and drag-handle dismissal.
- [x] Restore focus when a sheet is dismissed.
- [x] Respect reduced-motion preferences.
- [x] Keep toasts above the active sheet and tooltips above toasts.
- [x] Migrate Routine deletion to an affirmative-only danger confirmation sheet.
- [x] Test two stacked sheets even though the first production consumer opens one.
- [ ] Manually verify Android Back on a physical device.
- [ ] Manually verify touch dragging, narrow screens, enlarged text, dark theme,
  and both high-contrast variants.

## Phase 2 — interactive task content

- [x] Add a light-DOM authoring API with `heading`, `description`, `body`, and
  `actions` content roles.
- [x] Let authored actions return task-specific string results without teaching
  the sheet primitive about the task.
- [x] Retain `confirmSheet()` as the concise confirmation convenience API.
- [x] Replace Settings' bespoke inline reset panel with one danger action row.
- [x] Move reset warning, date verification, validation feedback, and the
  affirmative action into a task-specific sheet.
- [x] Keep actual data clearing owned by `rrr-app` through the existing
  `rrr-clear-data-request` event.

## Later phases

- [ ] Migrate the Today-page workout deletion confirmation.
- [ ] Migrate import confirmation and prompt-based workflows.
- [ ] Define content-size variants for larger temporary tasks and pickers.
- [ ] Exercise a real nested product flow and refine stacked-sheet visuals.
- [ ] Confirm navigation always clears sheets owned by the previous page.
- [ ] Keep and document modal-dialog use for exceptional cases.
- [ ] Move durable usage guidance to `docs/design-system.md`.
- [ ] Remove the legacy confirmation/prompt dialog host when its final consumer
  has migrated.
- [ ] Remove this tracker.

## Phase 1 decisions

- The sheet is bottom-attached, content-height driven, and capped to a readable
  width on larger viewports.
- A confirmation sheet contains only its affirmative action. Dismissal is the
  cancel path.
- The drag gesture starts on the visible handle, avoiding conflicts with
  scrollable sheet content.
- A short, intentional downward drag or sufficiently fast downward flick
  dismisses; dragging all the way to the screen edge is unnecessary.
- Destructive confirmation uses the shared `danger` tone rather than a
  sheet-specific destructive style.
