# Localization Guidelines

This project uses a simple, Fluent-inspired architecture without adopting Fluent syntax yet.

## Core Rules

1. Always use stable message keys (do not use English source text as key).
2. Keep all user-facing text in locale catalogs under `src/i18n/`.
3. Use placeholders for variable data: `{name}`, `{count}`, `{date}`.
4. Never build user-facing text via string concatenation.
5. Keep domain logic and localization logic separate.

## Key Naming

Use this pattern:

`feature.section.intent`

Examples:

- `exercise.form.add`
- `exercise.status.created`
- `workout.validation.dateRequired`
- `dialog.validation.required`

## Message Authoring

1. Prefer complete sentences in the catalog.
2. Put grammar decisions in messages, not code.
3. Keep placeholders semantically named (`name`, `count`, `seconds`).
4. Add comments near complex keys if translator context is not obvious.

Pluralization:
Use the `message.*` namespace for count-driven strings and let the runtime choose variants with `tPlural(baseKey, count)`, e.g. `message.routine.exerciseCount.one` and `message.routine.exerciseCount.other`.

## Runtime Expectations

1. Missing keys must throw.
2. Missing placeholders must throw.
3. Unsupported locales must resolve to `en-US` fallback.
4. Pluralized messages should resolve via locale rules and fall back to `.other` when needed.

## Scaling Path

1. Continue migrating component strings to `t(...)` by feature.
2. Add additional locale catalogs under `src/i18n/` when needed.
3. Keep formatter API stable (`t`, `formatDate`, `formatNumber`) so syntax engines can be swapped later.
