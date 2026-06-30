# Row Patterns Implementation

## Status

Temporary implementation tracker. Remove this document once the migration is
complete and its durable guidance lives in `product-design-principles.md` and
`design-system.md`.

## Goal

Make row hierarchy follow the user's reading task while keeping the visual
grammar and authoring model consistent.

Two semantic patterns are involved:

- **Identity-first rows:** the user first needs to identify an entity, action,
  destination, or choice. The label is primary and supporting information is
  secondary. `rrr-list-row` serves this task.
- **Value-first property rows:** the user knows the predictable property schema
  and primarily scans its values. Native `dl`, `dt`, and `dd` markup serves this
  task.

Shared foundations may encode geometry. Semantic patterns decide hierarchy.
Do not replace these concepts with visual switches such as
`emphasis="value"` or classes such as `heading-emphasis`.

## Decisions

- Retain the `rrr-list-row` custom element and its existing attribute API.
- Remove the `rrr-list-row` shadow root and render its native control in light
  DOM.
- Retain the `slot="leading"`, `slot="body"`, and `slot="trailing"` authoring
  API. The light-DOM implementation must preserve and place those nodes.
- Keep property rows as native semantic HTML rather than introducing a custom
  element.
- Replace the legacy `rrr-detail-row` name with a deliberate property-list
  pattern.
- Use one shared row foundation for surface, inset, dimensions, spacing, and
  divider alignment.
- Prefer one reading task per visual group. Different groups on the same page
  may intentionally use different hierarchy patterns.

## Current Usage Inventory

| Area | Reading task | Target pattern |
| --- | --- | --- |
| Appearance choices | Identify and select a choice | `rrr-list-row` |
| Settings navigation | Identify a destination/action | `rrr-list-row` |
| Routine list | Identify a routine | `rrr-list-row` |
| Routine Details overview | Inspect predictable values | Property list |
| Routine Details exercises | Identify an exercise; sets are supporting information | `rrr-list-row` |
| Exercise Details | Inspect predictable values | Property list |
| Styleguide list/control examples | Demonstrate identity/action rows | `rrr-list-row` |

## Work Stages

### 1. Rationale and contract

- [x] Add the reading-task principle to `product-design-principles.md`.
- [x] Add durable design-system authoring guidance and examples.
- [x] Record the current usage classification.

### 2. Shared light-DOM row foundation

- [x] Extract shared row geometry into a single stylesheet.
- [x] Remove the `rrr-list-row` shadow root.
- [x] Preserve projected leading, body, and trailing content.
- [x] Preserve native link, button, checkbox, switch, and radio semantics.
- [x] Preserve attribute updates, focus forwarding, disabled behavior, and
  radio-card keyboard behavior.

### 3. Property-list pattern

- [x] Replace legacy `rrr-detail-row` CSS with `rrr-property-list` and
  `rrr-property-row`.
- [x] Keep values primary and labels secondary.
- [x] Reuse the shared row foundation without duplicating declarations.
- [x] Verify narrow and wide responsive arrangements.

### 4. Migrations

- [x] Migrate Exercise Details.
- [x] Migrate the Routine Details overview.
- [x] Keep Routine Details exercises as identity-first rows.
- [x] Audit remaining static `rrr-list-row` instances for their reading task.

### 5. Demonstration and verification

- [x] Show both patterns together in the styleguide.
- [x] Update unit and app-level tests.
- [x] Verify native semantics and keyboard behavior.
- [ ] Verify light/dark and normal/high-contrast combinations.
- [ ] Verify narrow widths and enlarged text.
- [ ] Run tests, build, architecture, icon, i18n, and diff checks.

## Completion Criteria

- Row hierarchy can be selected from the reading task without referring to a
  visual layout name.
- Identity-first and value-first groups can coexist naturally on one page.
- Both patterns share one maintainable CSS foundation.
- `rrr-list-row` has no shadow root and retains its concise authored API.
- Property lists use valid and readable `dl`/`dt`/`dd` markup.
- Exercise Details and Routine Details demonstrate the intended distinction.
- Durable documentation and the styleguide are sufficient to remove this
  tracker.

## Latest Verification

Foundation/light-DOM chunk:

- `npm.cmd test -- --run`: passed, 130 tests across 23 files.
- `npm.cmd run build`: passed.
- `npm.cmd run check:architecture`: passed.
- `npm.cmd run icons:check`: passed.
- `git diff --check`: passed.
- Mobile Routine-page visual check: no presentation regression observed.
- `npm.cmd run check:i18n`: still reports the existing hardcoded styleguide
  demonstration labels; this chunk introduced no new findings.

Property-pattern migration chunk:

- `npm.cmd test -- --run`: passed, 132 tests across 24 files.
- `npm.cmd run build`: passed.
- `npm.cmd run check:architecture`: passed.
- `npm.cmd run icons:check`: passed.
- `git diff --check`: passed.
- Exercise Details now uses three semantic property groups.
- Routine Details now uses a value-first overview and an identity-first
  exercise group.
- The styleguide demonstrates both reading tasks together.
- Narrow and wide styleguide checks confirmed stacked and two-column property
  arrangements.
- Visual checking caught and fixed global button styles leaking into light-DOM
  action rows.
