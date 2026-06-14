# Component Token Audit

## Result

Component styles now follow the toast pattern: component internals consume component-scoped tokens, and those component tokens are defined in the connected stylesheet for each component.

## Remaining Direct Design-System Token Usage

### Shared shadow helper styles

File: src/design-system/shadow-styles.ts

Reason: this file is a shared style-string helper layer rather than a component-specific stylesheet. It still reads base design-system tokens directly for typography, layout spacing, and card helpers.

Components currently pulling this shared helper in:
- src/app/rrr-app.ts
- src/app/components/rrr-exercise-entry.ts
- src/app/components/rrr-set-entry.ts

### Global document styles

File: src/design-system/global.css

Reason: this is the global design-system layer for document-wide element styling and shared primitives, not a single component skin. It intentionally consumes base design-system tokens directly.

## Notes

- src/design-system/toast.css now defines and consumes dedicated toast tokens for the toast root as well.
- The remaining items above are not per-component stylesheet leaks; they are shared/global layers that would need their own refactor if you want every style entry-point to avoid direct base-token usage.
