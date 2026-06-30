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
  <span slot="heading">Exercises</span>
  <span slot="description">Exercises included in this routine.</span>
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

Use a bespoke feature layout when content is not honestly a card or row
collection, or when independent controls would create invalid nested
interactions. Bespoke layouts may still reuse `.rrr-card` when a flat padded
surface is appropriate.

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
    href="#/routines/full-body"
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

Author labels and descriptions through the element's `label` and `description`
attributes. Classes such as `.rrr-list-row__label` and
`.rrr-list-row__description` belong to generated internals and are not an
authoring API.

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
