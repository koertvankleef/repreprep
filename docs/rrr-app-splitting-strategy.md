# rrr-app splitting strategy

`rrr-app.ts` currently acts as the app shell, route orchestrator, header renderer,
preference coordinator, install prompt owner, exercise-filter controller, and
data-reset bridge. Splitting it should be incremental: each step should extract
one responsibility behind a narrow contract and keep the app shell as the place
where route state is coordinated until enough surrounding pieces exist to move
that state safely.

## Target boundaries

- App shell: owns the Shadow DOM shell, route lifecycle, view mounting, and
  route-transition orchestration.
- Route view factory: maps `AppRoute` to the route component and injects the
  small amount of route-specific state that component needs.
- Header/navigation shell: renders persistent navigation and route headers,
  including header transitions and header-height measurement.
- Exercise catalogue header controller: owns search/filter state, filter rail
  rendering, filter overflow measurement, and catalogue state sync.
- Preferences controller: owns theme/language load, apply, persist, and system
  preference watching, then exposes current values to settings routes.
- Install prompt controller: owns `beforeinstallprompt`, `appinstalled`, and the
  install action.
- App reset handler: handles `rrr-clear-data-request`, clears persisted
  preferences/data, and returns to Today.

## Suggested order

1. Extract pure route helpers first: route equality and transition selection.
   This gives the route lifecycle tests a stable seam before larger shell work.
2. Extract the route view factory. Keep dependencies explicit: route,
   preferences, styleguide availability, and exercise catalogue state callbacks.
3. Extract exercise catalogue header/search/filter behavior as one controller.
   This is the densest route-specific state currently embedded in the shell.
4. Extract persistent navigation and standard route-header rendering. Leave the
   animation/mounting mechanics in the app shell until rendering is stable.
5. Extract preferences and install prompt coordination after settings routes no
   longer need direct `rrr-app` state mutation.
6. Revisit the reset event once the app shell has fewer unrelated side effects.

## Guardrails

- Keep each extraction behavior-preserving and verified with full test, build,
  architecture, and i18n gates when user-facing strings are touched.
- Do not redesign navigation, settings, or headers during the split unless the
  current task explicitly asks for it.
- Prefer pure modules before new custom elements when the behavior does not need
  DOM ownership.
- Keep route state changes in one place until route view mounting and header
  mounting have their own tests.

## Progress

- Done: pure route equality and transition selection live in
  `src/app/app-route-transitions.ts`.
- Done: route-to-element creation lives in `src/app/app-route-view-factory.ts`.
- Done: exercise catalogue header rendering and filter rail overflow helpers live
  in `src/app/exercise-catalogue-header.ts`.
- Done: display/language preference coordination lives in
  `src/app/app-preferences-controller.ts`.
- Done: install prompt event/prompt lifecycle lives in
  `src/app/app-install-prompt-controller.ts`.
- Next: decide whether the remaining exercise catalogue search/filter state and
  event binding is still worth extracting, or whether reset coordination is the
  cleaner next split.
