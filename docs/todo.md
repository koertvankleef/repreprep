# TODO

Use this file to capture product and prototype follow-up tasks that should not be forgotten.

- [ ] During a workout, use the Screen Wake Lock API so the phone does not lock.
- [ ] Non-MVP follow-up: let the user toggle the wake lock feature on or off.
- [ ] Add a user-facing toggle for auto-advance / auto-continue in workout flow, separate from the actual auto-advance behavior design.
- [ ] [in progress] Bottom main navigation on mobile; left side of screen navigation on desktop; minimised variant on tablet.
- [ ] [in progress] Routine detail page after creation/editing: routine name as title, small edit affordance, exercise list, add-exercise action, and start button.
- [ ] Prefill routine names automatically; do not require the user to invent one from scratch.
- [ ] [low priority] Use NATO/geographic-style routine naming and consider whether the natural 26-routine cap is acceptable.
- [ ] Settings/options as right-hand side sidepanel that pops over the current page, with instant toggles and buttons that navigate to deeper sections when needed.
- [ ] When the app loads incompatible local storage data, show a toast error message with a close button and proceed with a blank slate.
- [ ] Non-MVP follow-up: allow the user one chance to download the data after having cleared it from storage.
- [ ] [in progress] Expand trust/history surfaces around existing import/export and history features so users can clearly review progress and feel ownership of their data.
- [ ] [in progress] Enrich exercise definitions with reusable metadata such as equipment, exercise kind (reps vs time), default targets, and substitution/setup notes.
- [ ] [low priority] Add a custom Fluent-compatible next-exercise icon (two exercise blocks/cards with an arrow between them).
- [ ] Revisit workout progress rail UX: prefer article-scroll style position indicator with a marker over filled progress to improve glance readability and reduce visual distraction.
- [ ] Prototype segmented workout rail where section ranges are encoded as mint/indigo zones that reflect workout structure.
- [ ] Prototype marker color/state changes based on active workout segment while keeping the underlying rail visually subtle.
- [ ] remind user via an app level warning after a certain time (days?) that the app stores in browser cache by default and that they should save the JSON as backup intermittently. Perhaps even store in the cache when they last exported so that the reminder comes up based on that.

## Workout Rep Logging Flow Thread

Reference specification: `docs/workout-rep-logging-flow-spec.md`

- [x] Phase 0: review and lock terminology/state names from the spec (`suggested` vs `confirmed`, `grace`, `resting`, `timed-ready`, `timed-active`).
- [x] Phase 0a: lock canonical event boundary (`repResultConfirmed` logs, `repValueChanged` edits only).
- [x] Phase 0b: lock big-bang rename policy for stage/state names (no migration layer).
- [x] Phase 0c: lock model rule that weight/load is orthogonal to set measurement mode (`reps` or `time`).
- [x] Phase 0d: document extension seam for future measurement modes (for example, distance) without implementing it yet.
- [x] Phase 1: align domain models for exercise logging type (`reps` vs `time`) and result payloads (rep result, timed result, rest period runtime state).
- [x] Phase 1a: hard-rename persisted enum values from `reps-weight`/`duration` to canonical `reps`/`time` (no migration layer).
- [x] Phase 1b: apply same canonical rename in runtime state names and workflow branches in one big-bang change.
- [x] Phase 1c: execute regression-only validation (tests + manual QA), and explicitly skip backward-compat checks.
- [x] Phase 1d: add release note that existing local data must be cleared for this rollout.
- [x] Phase 2: implement rep-set confirmation pipeline (`editable value -> confirm -> grace -> auto-rest`) with explicit `repResultConfirmed` as logging trigger.
- [x] Phase 3: implement timed-set pipeline (`ready -> Start -> active -> complete -> grace -> auto-rest`) with explicit start semantics.
- [ ] Phase 4: implement grace-period interruption controls (`Edit`, `Start rest now`) and required cancellation behavior.
- [ ] Phase 5: wire rest lifecycle and auto-focus/auto-advance behavior without implying timed-set auto-start.
- [ ] Phase 6: add edit-mode split (`during grace` affects flow, `historical edit` affects data only).
- [ ] Phase 7: accessibility pass for rep control names, dynamic confirm labels, and confirmation announcements.
- [ ] Phase 8: tests for state transitions, event emission order, and edge cases (unchanged suggested value confirm, edit during grace, timed stop early).
- [ ] Phase 9: integrate workout logging flow from prototype into main product surfaces (start workout, active logging UI, and saved workout editing boundaries).
- [ ] Phase 10: retire prototype-only path after parity QA, keeping the prototype only as optional dev playground if still useful.
