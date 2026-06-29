# Settings and List Structure Implementation

## Status

The reusable primitives, radio-row behavior, styleguide showcase, settings
migration, and flat-card consolidation are complete. The manual visual and
large-text review has been completed to a sufficient level for this slice.

This document tracks the introduction of reusable section, list-card, row, and
accessory primitives. The settings screen is the first consumer, not the place
where the primitives should be invented.

## Outcome

Structured screens should share one visual and interaction grammar:

```text
Page
  Section
    List card
      Row
        Leading accessory
        Content
        Trailing accessory
```

The row is the central primitive. Navigation, current values, switches, radio
options, checkboxes, actions, and informational content should differ through
semantics and accessories rather than unrelated layouts.

This is a structural direction, not an attempt to copy another product's visual
identity.

## Scope

The first implementation covers:

- a section primitive with a heading and room for a future description;
- a list-card primitive that owns its background, clipping, and dividers;
- a row primitive with leading, content, and trailing regions;
- navigation, value, value-and-chevron, switch, radio, checkbox, and custom
  trailing accessories;
- optional row icons, titles, and subtitles;
- interactive, disabled, selected, and destructive row states;
- a radio group composed from rows, including icon-and-text options;
- styleguide examples and accessibility states;
- migration of settings to the new primitives.

Later reuse in routines, exercises, history, and equipment screens is explicitly
out of the first implementation. Those screens should migrate only after the
settings version is stable.

## Component Contract

Implemented components and shared recipes:

- `rrr-section`: layout and section heading treatment;
- `.rrr-card`: a native-element class for padded rich content;
- `.rrr-list-card`: a native-element class for unpadded row collections;
- `rrr-list-card`: the light-DOM behavioral form of the list-card recipe,
  reserved for coordinated radio-row keyboard behavior;
- `rrr-list-row`: shared row layout and states;
- a small accessory API built into `rrr-list-row`, with `leading` and
  `trailing` slots for icons, genuine controls, and exceptional content.

`rrr-list-row` uses:

- `label` and optional `description` for its content;
- `href` for navigation rows;
- `activation="button"` for action rows;
- `control="radio|checkbox|switch"` with native inputs for selection rows;
- `accessory="chevron|value|value-chevron|badge|custom"` and `value-text` for
  non-control trailing content;
- `checked`, `disabled`, `selected`, and `destructive` for supported states.

Section typography and heading semantics belong to `rrr-section` itself. Slot
content remains plain text, while the component exposes a heading role and an
optional `heading-level`. A need for a larger heading indicates a page or
subpage boundary rather than a larger section-heading variant.

These ownership rules apply:

- Cards share one flat surface recipe: background, border, radius, and clipping.
- Use `.rrr-card` on the most appropriate native element for padded rich
  content. It owns its inset and internal gap.
- Use `.rrr-list-card` for ordinary edge-to-edge row collections.
- Use the `rrr-list-card` custom element only when its coordinated radio-group
  behavior is required. It deliberately has no Shadow DOM and shares the exact
  visual recipe used by `.rrr-list-card`.
- The list card owns separators and rounded clipping.
- The row owns spacing, alignment, minimum hit-target size, and row states.
- The application owns feature data, routing, translations, and preference
  updates.
- Design-system components must not import application or domain code.
- Controls must retain honest HTML semantics. A navigation row is a link, an
  action row is a button, and radio/checkbox/switch rows use real controls.
- A row must not create invalid nested interactions, such as placing a switch
  inside a full-row button.
- Icons supplement labels; they do not replace them for appearance choices.

## Milestones

### 1. Contract and foundation

- ✅ Confirm component names and the minimal attribute/slot/event API.
- ✅ Decide the semantic activation model for link, button, selection-control,
      and non-interactive rows.
- ✅ Define component-scoped tokens for section spacing, row height and
      padding, divider color, accessory spacing, and state colors.
- ✅ Move section-heading typography out of semantic heading defaults and into
      the section primitive.
- ✅ Record the intended large-text and narrow-screen behavior.

Deliverable: agreed component contract with no settings-specific concepts in
the design-system layer.

### 2. Core design-system primitives

- ✅ Implement and register `rrr-section`.
- ✅ Implement and register `rrr-list-card`.
- ✅ Implement and register `rrr-list-row`.
- ✅ Support leading icon/custom content.
- ✅ Support label and optional description.
- ✅ Support no accessory, chevron, value, value-and-chevron, switch, radio,
      checkbox, badge, and custom trailing content.
- ✅ Support interactive, disabled, selected/current, and destructive states.
- ✅ Make the full row target available where its semantics permit.
- ✅ Ensure list cards add exactly one divider between adjacent rows.

Deliverable: primitives can be composed without app-local structural CSS.

### 3. Radio-row behavior

- ✅ Build one-of-many selection from normal list rows.
- ✅ Use native radio semantics and preserve keyboard interaction.
- ✅ Allow optional leading icons while keeping visible text labels.
- ✅ Make selection state legible without relying on color alone.
- ✅ Emit one stable change event for application consumers.

Deliverable: text-only and icon-and-text radio cards work with pointer,
keyboard, and assistive technology.

### 4. Styleguide proving ground

- ✅ Add a dedicated "Sections and list rows" styleguide section.
- ✅ Show one-row and multi-row cards.
- ✅ Show navigation, current-value, switch, radio, checkbox, action,
      informational, disabled, selected, and destructive examples.
- ✅ Show titles with subtitles and long/localized content.
- ✅ Show icon-and-text appearance choices.
- ✅ Check narrow mobile width, wrapping, zoom, and large text.
- ✅ Check light, dark, normal-contrast, and high-contrast modes.

Deliverable: all supported compositions can be reviewed without visiting a
feature screen.

### 5. Settings migration

- ✅ Replace settings' `.rrr-section-*` structure with the new primitives.
- ✅ Render Import / Export and the optional styleguide link as navigation
      rows.
- ✅ Present Appearance as a value-and-chevron row on the settings overview.
- ✅ Place Automatic, Light, and Dark theme radio rows on a dedicated
      Appearance subpage, including icon and text.
- ✅ Present contrast as a clearly named section on the Appearance subpage; do
      not conflate it with theme.
- ✅ Show current values on overview/navigation rows where a subpage is used.
- ✅ Preserve the richer reset-data warning and confirmation as a deliberate
      card-content exception.
- ✅ Remove settings-local row/control-group CSS made obsolete by the
      primitives.
- ✅ Keep preference persistence and existing reset behavior unchanged.

Deliverable: settings is composed from the shared grammar and no longer uses a
segmented icon control as the default choice pattern.

### 6. Consolidation and follow-up

- [ ] Remove or reduce obsolete global `.rrr-section-*` helpers after all
      current consumers are inventoried.
- ✅ Replace the presentation-only `rrr-card` custom element with the shared
      `.rrr-card` recipe and native semantic elements.
- ✅ Document when to use `.rrr-card`, `.rrr-list-card`, `rrr-list-card`, and a
      bespoke layout.
- [ ] Identify the next single list-heavy screen to migrate.
- [ ] Create separate follow-up work for routines, exercise catalogue, history,
      equipment, and data-management surfaces.
- ✅ Reassess the prominent app-level theme controls after settings stands on
      its own; the duplicate controls have been removed.

Deliverable: one stable pattern, documented migration guidance, and no
accidental redesign of every list screen at once.

## Acceptance Checklist

- ✅ A radio group renders as a card of standard rows.
- ✅ Radio rows support optional leading icons and visible text.
- ✅ Navigation and setting rows share the same base row.
- ✅ Rows have consistent alignment, spacing, and minimum hit targets.
- ✅ Cards consistently clip corners and render dividers.
- ✅ Top-level settings can communicate current values.
- ✅ Interactive rows expose correct link, button, or form-control semantics.
- ✅ Keyboard focus is visible and keyboard operation is complete.
- ✅ Disabled and selected states are programmatically exposed.
- ✅ No state depends on color or an icon alone.
- ✅ Long labels, subtitles, and translated values wrap without overlap.
- ✅ The settings screen has no primary segmented icon choice control.
- ✅ Existing settings behavior and stored preferences still work.

## Verification

For each implementation milestone, run the focused component tests and:

```powershell
npm.cmd test -- --run
npm.cmd run build
npm.cmd run check:architecture
npm.cmd run check:i18n
npm.cmd run icons:check
```

Also perform a manual pass at mobile width and increased browser text size,
using keyboard-only navigation in every supported theme/contrast combination.

Latest automated result:

- `npm.cmd test -- --run`: 120 tests passed;
- `npm.cmd run build`: passed;
- `npm.cmd run check:architecture`: passed;
- `npm.cmd run icons:check`: passed with the existing unused-icon inventory;
- `npm.cmd run check:i18n`: still reports older hardcoded technical labels in
  the styleguide; copy introduced by this implementation is localized.

## Non-goals

- Redesigning all list-heavy application screens in the first pass.
- Copying Discord styling.
- Removing the options/theme surface before settings is complete.
- Forcing warning panels, forms, or other rich content into a single row.
- Encoding application-specific settings behavior inside the design system.

## Card choice guidance

Use `.rrr-card` on a native `article`, `section`, or `div` when arbitrary rich
content needs a padded flat surface. Choose the element for its document
semantics; the class supplies presentation only.

Use `.rrr-list-card` on a native container when its direct children are
`rrr-list-row` elements and no group behavior is required. Use
`<rrr-list-card>` for the same composition only when radio rows need coordinated
selection and roving keyboard tab stops.

Use a bespoke feature layout when the content is not honestly a card or row
collection, or when independent interactive controls would create nested
interaction inside a full-row target. Bespoke layouts may reuse the shared card
class without becoming design-system components.
