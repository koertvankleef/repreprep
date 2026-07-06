# Design System

This document describes how to choose and author the reusable visual and
interaction patterns in `src/design-system`. Product rationale lives in
`product-design-principles.md`; this document turns that rationale into coding
guidance.

## Sections

Use `rrr-section` to group related page content under the standard section
heading treatment. Supply plain text through `slot="heading"` and, when useful,
`slot="description"`. Use `heading-level` only to represent the document
hierarchy; it does not change the visual treatment.

```html
<rrr-section>
  <span slot="heading">Flow</span>
  <span slot="description">Exercises and preparation time.</span>
  <!-- section content -->
</rrr-section>
```

A need for a visually larger heading usually indicates a page or subpage
boundary, not another section variant. Feature-specific structures that cannot
use `rrr-section`, such as a virtualized catalogue marker, should own clearly
scoped feature styles rather than depend on legacy global section classes.

## Card choice

Use `.rrr-card` on an appropriate native `article`, `section`, or `div` when
arbitrary rich content needs a padded flat surface. Choose the element for its
document semantics; the class supplies presentation.

Use `.rrr-list-card` on a native container whose direct children are
`rrr-list-row` elements and no coordinated group behavior is required. Use the
`rrr-list-card` custom element for the same composition only when radio rows
need coordinated selection and roving keyboard tab stops.

Use `.rrr-property-list` on a native `dl` for predictable value-first
properties. It owns the same grouped surface and dividers as other row cards.
Its dividers begin at the property content inset to reinforce that the rows are
fields describing one object. List cards retain full-width dividers between
peer entities, choices, and actions.

Use a bespoke feature layout when content is not honestly a card or row
collection, or when independent controls would create invalid nested
interactions. Bespoke layouts may still reuse `.rrr-card` when a flat padded
surface is appropriate.

## Sequences and meaningful gutters

Use `rrr-sequence` when identity-first rows form an order and the interval
between adjacent rows carries user-facing meaning. Direct `rrr-list-row` and
`rrr-sequence-gutter` children receive list/listitem semantics while remaining
in light DOM.

```html
<rrr-sequence aria-label="Routine exercise sequence">
  <rrr-list-row
    activation="button"
    label="Push-ups"
    description="3 sets"
  ></rrr-list-row>
  <rrr-sequence-gutter
    activation="button"
    value="45"
    unit="s"
    description="Custom"
    action-label="Edit 45 seconds custom preparation before One-arm dumbbell row"
  ></rrr-sequence-gutter>
  <rrr-list-row
    activation="button"
    label="One-arm dumbbell row"
    description="3 sets"
  ></rrr-list-row>
</rrr-sequence>
```

The visible gutter measurement is always authored through separate `value` and
`unit` attributes, allowing the value to carry stronger emphasis. Omit
`description` for the normal inherited value; use it only to identify an
override. Supply a relational
`aria-label` that identifies what a static interval precedes or separates.
For an editable gutter, set `activation="button"` and provide the full action
through `action-label`.

Do not use a sequence merely to add space between cards. A gutter represents
derived domain information. Routine transition gutters can be interactive.
Scheduled rest between sets is edited as one routine-exercise value rather than
as individually actionable gutters.

Add `sortable` when a sequence controller should reorder direct
`[data-sort-id]` items. A sortable item wraps its identity row and a sibling
native button marked with `data-sort-handle`; never place the handle inside the
row's own button. Supply `data-sort-label` for announcements.

```html
<rrr-sequence sortable aria-label="Routine exercise sequence">
  <div
    class="rrr-sortable-item"
    data-sequence-item
    data-sort-id="routine-exercise-1"
    data-sort-label="Push-ups"
  >
    <rrr-list-row activation="button" label="Push-ups"></rrr-list-row>
    <button
      class="rrr-sort-handle"
      type="button"
      data-sort-handle
      aria-label="Move Push-ups. Press Space or Enter to start reordering."
    >
      <rrr-icon name="arrow-move"></rrr-icon>
    </button>
  </div>
</rrr-sequence>
```

The controller emits `rrr-sequence-sort-status` for lifted, moved, dropped,
and cancelled states, and `rrr-sequence-reorder` with the committed ordered
IDs. Consumers own localized announcements and domain persistence. Gutter
content fades and collapses when reorder mode begins; gutters are re-derived
from domain data after commit.

## Swipe actions

Use `rrr-swipe-action` as progressive enhancement around one identity row.
It recognizes horizontal intent without preventing ordinary vertical
scrolling, uses logical directions for RTL support, and ignores gestures that
begin on drag handles or explicit opt-out controls.

```html
<rrr-swipe-action
  direction="end-to-start"
  action="delete"
  action-label="Delete Push-ups"
  icon="delete"
  tone="danger"
>
  <rrr-list-row activation="button" label="Push-ups"></rrr-list-row>
</rrr-swipe-action>
```

The action surface remains neutral while revealing and changes to its semantic
tone only after the commit threshold. Releasing earlier closes the row.
Releasing while armed emits `rrr-swipe-action-commit` with an `action` detail;
the component never deletes domain data itself. This separation also leaves a
clean integration point for a future Undo coordinator.

Swipe must not be the only path to an action. Keep a discoverable non-gesture
alternative in the relevant sheet or desktop interface.

Use the same value/unit treatment outside a gutter with `rrr-measurement`:

```html
<rrr-measurement value="10" unit="reps"></rrr-measurement>
```

The value is semibold and the unit medium; surrounding content controls the
measurement's size and color.

## Row hierarchy follows the reading task

Choose a row pattern by asking what the user needs to find first. Do not choose
one by matching its visual layout.

### Identity-first rows

Use `rrr-list-row` when the user must first identify an entity, destination,
action, or choice. Its label is visually primary. Descriptions, values, and
other metadata support that identity.

```html
<div class="rrr-list-card">
  <rrr-list-row
    activation="button"
    data-action="navigate"
    data-href="#/routines/full-body"
    label="Full Body"
    description="6 exercises"
    accessory="chevron"
  >
    <span slot="body">Chest, shoulders, legs</span>
  </rrr-list-row>
</div>
```

Settings choices, navigation entries, routines, and exercises within a routine
are identity-first even when some of them are not interactive.

Internal app navigation uses a native button with the app shell's delegated
`data-action="navigate"` behavior. Reserve the row's `href` mode for genuine
links where browser link behavior is desirable.

Use a chevron only when a row navigates to another page. A row that opens a
sheet uses `activation="button"` without a chevron; the native button behavior,
interactive color, and focus treatment communicate activation without implying
navigation.

Navigation and action rows use the icon accent color for their primary label to
reinforce that they activate something. Checkbox and switch rows receive the
same treatment because their full row toggles the control. Radio choices and
static rows keep the normal text color.

Action rows accept the same semantic tones as buttons: `primary` (the default),
`neutral`, `accent`, `info`, `success`, `warning`, and `danger`. A tone colors
the row's primary label and leading icon and supplies a subtle matching
hover/active tint; it does not turn the row into a solid button:

```html
<rrr-list-row
  activation="button"
  tone="danger"
  label="Delete routine"
></rrr-list-row>
```

“Informational” is not itself a reason to use a property row. A static entity
still uses `rrr-list-row` when its name is what users need to identify first.

Use `activation="button"` for state-changing actions that belong in a list
flow. This preserves native button semantics while using the same identity-first
presentation:

```html
<div class="rrr-list-card">
  <rrr-list-row
    activation="button"
    label="Start workout"
  ></rrr-list-row>
</div>
```

Use `activation="file"` when choosing a local file is itself the row action.
The row owns a visually hidden native file input, so label activation, keyboard
focus, and the platform file picker remain native:

```html
<rrr-list-row
  activation="file"
  name="import-file"
  accept="application/json,.json"
  label="Import"
  description="Choose a JSON export file"
></rrr-list-row>
```

Listen for the row's bubbling `change` event and read its `files` property.
Call `clearFileSelection()` after capturing the file when selecting the same
file again should trigger another change. The `accept`, `name`, `multiple`, and
`disabled` attributes are forwarded to the native input.

Author ordinary labels and descriptions through the element's `label` and
`description` attributes. When a label needs structured content, provide a
single element with `slot="label"`; it takes visual precedence over the
`label` attribute without changing existing rows:

```html
<rrr-list-row
  activation="button"
>
  <span slot="label">
    <span class="sr-only">Edit logged set: 10 reps, 6 kilograms</span>
    <span aria-hidden="true">
      <rrr-measurement value="10" unit="reps"></rrr-measurement>
      <span>·</span>
      <rrr-measurement value="6" unit="kg"></rrr-measurement>
    </span>
  </span>
</rrr-list-row>
```

This structured example represents actual workout data, not values persisted as
routine targets.

Classes such as `.rrr-list-row__label` and
`.rrr-list-row__description` belong to generated internals and are not an
authoring API.

## Sheets

Present sheets through `presentSheet()` or `confirmSheet()` so they receive the
localized dismiss label and are mounted in the active presentation layer.
Dismissible sheets include a native Close button for assistive technology. It
is visually hidden during pointer interaction and becomes visible when it
receives keyboard focus, like a skip link. Do not add a duplicate Cancel action
when dismissing and canceling have the same result.

Non-dismissible sheets omit the Close control and must provide an explicit
action that completes the workflow.

Within a sheet, Enter in `rrr-input`, a text-entry native input, or the editable
input of `rrr-number-stepper` advances to the next enabled field. For a number
stepper, this applies only when Enter originates from its editable text input;
its step buttons and a read-only value input do not imply that adjustment is
complete. Enter on a radio chooses that option; Enter on a checkbox or switch
toggles it. These choice controls then advance as one completed field, with a
radio group counting as one field. Enter in the final field activates the
enabled `data-sheet-result="confirm"` action. The sheet also supplies
`enterkeyhint="next"` and `"done"` to editable inputs. Textareas, selects, date
pickers, buttons, and other controls keep their own behavior. Add
`data-sheet-enter-ignore` to an otherwise eligible field when Enter has a
different, field-specific meaning.

## Number steppers

Use `rrr-number-stepper` when a numeric value is most naturally adjusted in
small increments. It remains intrinsically sized so its decrement and increment
buttons stay close to the value, including inside otherwise full-width sheet
forms.

The component stores its `value`, `min`, `max`, and `step` attributes as
locale-independent numbers with a dot decimal separator. Its visible value and
direct input follow the supplied `locale` (or the document language). It is a
form-associated custom element: `name`, `required`, constraints, form reset,
and disabled fieldsets use native form behavior.

```html
<rrr-number-stepper
  label="Number of sets"
  name="set-count"
  value="3"
  min="1"
  step="1"
  size="2"
  locale="en-US"
  button-only
  decrement-label="Decrease number of sets"
  increment-label="Increase number of sets"
></rrr-number-stepper>
```

`button-only` prevents direct typing while keeping the numeric value focusable
and available to assistive technology. Without it, localized floating-point
input is supported. `size` controls visible character capacity without imposing
a validation maximum. When omitted, a finite `max` determines the capacity;
otherwise the component uses a small fallback.

Supply localized decrement and increment labels. Use `helper-text` for normal
guidance and `invalid` with `error-text` when a workflow needs to report an
invalid value.

## Date fields

Use `rrr-date-field` instead of a native `input[type="date"]` when date
selection should use the shared sheet presentation. Its `value` remains an ISO
calendar date (`YYYY-MM-DD`), while the visible value, month names, and wheel
order follow its `locale`.

The field opens an `rrr-date-picker` with separate day, month, and year
spinbuttons. Arrow keys and pointer scrolling adjust one wheel at a time. The
temporary selection is committed and emitted through `input` and `change` only
when the sheet's Confirm action is used; normal sheet dismissal preserves the
original value.

Supply localized `picker-title`, `confirm-label`, `dismiss-label`,
`day-label`, `month-label`, and `year-label` attributes. Use `min` and `max`
when a workflow needs bounds; otherwise the picker supports years 1900–2100.

## Motion

Motion curves are named for their behavior rather than ranked as primary or
secondary:

- `--rrr-easing-decelerate` settles smoothly without overshoot. Use it for
  exits, position corrections, and spatial movement that should stop quietly.
- `--rrr-easing-overshoot-subtle` passes its destination slightly before
  settling. Reserve it for deliberate entrances where the added presence helps
  communicate arrival.

Components should expose role-based aliases instead of consuming these
primitives anonymously. For example, sheets use
`--rrr-sheet-motion-enter-easing` and `--rrr-sheet-motion-exit-easing`. Sheet
entry uses subtle overshoot; dismissal retains deceleration so it never bounces
back into view.

### Value-first property rows

Use a property list when the property schema is predictable and the user
primarily needs to inspect its values. Use native definition-list semantics;
the value is visually primary and its label is an orientation aid.

```html
<dl class="rrr-property-list">
  <div class="rrr-property-row">
    <dt>Last started</dt>
    <dd>28 June 2026</dd>
  </div>
</dl>
```

Exercise attributes and a routine's overview statistics are value-first.

### Combining the patterns

Prefer one reading task per visual group. A page may contain both patterns when
separate groups serve separate tasks. Routine Details is the canonical example:
its overview is a property list, while its exercise list is identity-first.

Interactivity is relevant but not decisive. A property may link to deeper
information and remain value-first; an entity row may be static and remain
identity-first.

## Shared row foundation

Identity-first and value-first rows share their surface, inset, dimensions,
spacing rhythm, and divider alignment. Their semantic markup and typographic
hierarchy remain distinct.

Shared foundations may encode geometry. Semantic patterns decide hierarchy.
Do not introduce visual APIs such as `emphasis="value"` or
`.heading-emphasis`; they hide the reason for the hierarchy and make future
usage harder to classify.
