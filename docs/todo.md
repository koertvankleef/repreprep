# TODO

Use this file to capture product and prototype follow-up tasks that should not be forgotten.

- [ ] [top priority — architecture] Continue splitting `rrr-app.ts` before it becomes unmaintainable. It currently owns several distinct responsibilities in a single Shadow DOM class, especially app shell routing and route/header mounting orchestration. The splitting strategy lives in `docs/rrr-app-splitting-strategy.md`; pure route equality/transition selection now lives in `src/app/app-route-transitions.ts`, route-to-element creation now lives in `src/app/app-route-view-factory.ts`, standard header/navigation rendering now lives in `src/app/app-shell-navigation.ts`, app-shell action dispatch now lives in `src/app/app-shell-action-dispatch.ts`, exercise catalogue header rendering now lives in `src/app/exercise-catalogue-header.ts`, exercise catalogue search/filter state now lives in `src/app/exercise-catalogue-controller.ts`, theme/language preference coordination now lives in `src/app/app-preferences-controller.ts`, install prompt lifecycle now lives in `src/app/app-install-prompt-controller.ts`, and reset coordination now lives in `src/app/app-reset-controller.ts`. Any split carries real regression risk and must be done with full test and build verification.

- [ ] [top priority — audit] Re-run architecture, accessibility, import/export, and schema audits with fresh eyes before the tracked redesign work drifts further. Prior Copilot-assisted review is useful input, but this should be treated as a release-hardening pass rather than assumed complete.

- [ ] [top priority] Redesign active workout logging, mostly bring the design language in line with the newer Discord-like approach. But absolutely keep the smooth flow from each section to the next as this is a crucial product feature.
- [ ] In active workout logging, always show the current exercise load/weight prominently so the user can execute sets without guessing.
- [ ] During transition between exercises in an active workout, show the upcoming exercise load/weight so the user can prepare equipment in time.
- [ ] During a workout, use the Screen Wake Lock API so the phone does not lock.
- [ ] Non-MVP follow-up: let the user toggle the wake lock feature on or off.
- [ ] Add a user-facing toggle for auto-advance / auto-continue in workout flow, separate from the actual auto-advance behavior design.
- [ ] Refine timed-exercise IxD: current grace/Edit behavior can restart the timed set, which feels wrong and needs a cleaner interaction model.
- [ ] Refine the responsive desktop layout: keep the working bottom navigation
      on mobile and left navigation rail on desktop, add a minimised tablet
      variant, and consider constraining ordinary page content (route-view) and interactive rows to a
      readable width instead of stretching them across the available viewport. Many list rows currently always put description below label, in a wide/desktop screen layout those two should behave like the property lists already do: side by side.
- [x] Add a read-only Routine Details page after creation/editing with the routine name as title, a header Edit affordance, exercise list, and Start Workout action.
- [ ] Define a trustworthy routine-duration estimation policy before adding estimated duration to routine summaries.
- [x] Prefill routine names automatically; do not require the user to invent one from scratch.
- [x] [low priority] Use NATO/geographic-style routine naming and consider whether the natural 26-routine cap is acceptable.
- [ ] When the app loads incompatible local storage data, show a toast error message with a close button and proceed with a blank slate.
- [ ] Non-MVP follow-up: allow the user one chance to download the data after having cleared it from storage.
- [ ] Expand trust/history surfaces around existing import/export and history features so users can clearly review progress and feel ownership of their data.
- [ ] Make routine detail a jump-off point for workouts executed from that
      routine. Show a limited list of recent completed workouts, identify the
      selected prefill source, allow navigation to an individual workout, and
      offer “View all”. Consider allowing the user to select or clear the
      prefill source from this context. Design this after reviewing workout
      history/detail IxD, especially whether historical logs should be editable.
- [ ] Enrich exercise definitions with metadata such as description and materials used. This is to help users choose the right exercise. This is not an instruction on how to do the exercise, we expect the user to look this info up elsewhere. It's purpose is simply that the user is able to choose the right exercise (like if they forgot the name).
- [ ] Redesign the Exercises library page before adding custom-exercise creation to routine creation/editing. The routine picker needs an eventual "create custom exercise" path, but the exercise creation/editing surface should likely be shared with the library instead of being designed only inside the routine flow.
- [ ] Revisit workout progress rail UX: prefer article-scroll style position indicator with a marker over filled progress to improve glance readability and reduce visual distraction.
- [ ] Prototype segmented workout rail where section ranges are encoded as mint/indigo zones that reflect workout structure.
- [ ] Prototype marker color/state changes based on active workout segment while keeping the underlying rail visually subtle.
- [ ] remind user via an app level warning after a certain time (days?) that the app stores in browser cache by default and that they should save the JSON as backup intermittently. Perhaps even store in the cache when they last exported so that the reminder comes up based on that.
- [ ] [in progress] Introduce layered messaging and error reporting with clear severity semantics.
- [ ] Add app-level banner messaging for truly global states: internal app failure, stale client warning, and local-only storage backup reminder. Look at how VMware Clarity design system differentiates visually between levels of messages.
- [ ] Add user-facing route-mismatch messaging when a stale or removed path is opened (for example an old tab to a retired route) so fallback to home is explicit.
- [ ] Add toast-level messaging rules for non-blocking issues that may have consequences.
- [ ] Keep inline feedback for local form or import/export validation issues and field-level corrections.
- [ ] In places with item lists like the History page: use swipe right/left actions for things like delete (with an undo toast with grace period!). This also requires that we hint at this functionality the first time the user sees an item in this list (by letting the swipe movement show for a second as a 'peek')

