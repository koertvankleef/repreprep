# Architecture Boundaries

This project uses explicit layers to keep UI, domain logic, and platform concerns decoupled.

## Layers

1. foundation: generic utilities and framework-like helpers.
2. design-system: generic reusable UI primitives and registration.
3. domain: business models and business rules.
4. storage: persistence orchestration and adapters.
5. app/components: composition and feature UI.

## Dependency Direction

1. foundation must not import app, components, domain, or storage.
2. design-system must not import app, components, domain, or storage.
3. domain must not import app or components.
4. storage must not import app or components.
5. app/components may compose all lower layers.

## Enforcement

Run:

```bash
npm run check:architecture
```

The checker is implemented in scripts/check-architecture-boundaries.mjs and validates import directions within src.
