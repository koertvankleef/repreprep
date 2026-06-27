# TODO

Use this file to capture product and prototype follow-up tasks that should not be forgotten.

- [ ] [top priority] In active workout logging, always show the current exercise load/weight prominently so the user can execute sets without guessing.
- [ ] [top priority] During transition between exercises in an active workout, show the upcoming exercise load/weight so the user can prepare equipment in time.
- [ ] During a workout, use the Screen Wake Lock API so the phone does not lock.
- [ ] Non-MVP follow-up: let the user toggle the wake lock feature on or off.
- [ ] Add a user-facing toggle for auto-advance / auto-continue in workout flow, separate from the actual auto-advance behavior design.
- [ ] Refine timed-exercise IxD: current grace/Edit behavior can restart the timed set, which feels wrong and needs a cleaner interaction model.
- [ ] Bottom main navigation on mobile; left side of screen navigation on desktop; minimised variant on tablet.
- [ ] Routine detail page after creation/editing: routine name as title, small edit affordance, exercise list, add-exercise action, and start button.
- [ ] Prefill routine names automatically; do not require the user to invent one from scratch.
- [ ] [low priority] Use NATO/geographic-style routine naming and consider whether the natural 26-routine cap is acceptable.
- [ ] Settings/options as right-hand side sidepanel that pops over the current page, with instant toggles and buttons that navigate to deeper sections when needed.
- [ ] When the app loads incompatible local storage data, show a toast error message with a close button and proceed with a blank slate.
- [ ] Non-MVP follow-up: allow the user one chance to download the data after having cleared it from storage.
- [ ] Expand trust/history surfaces around existing import/export and history features so users can clearly review progress and feel ownership of their data.
- [ ] Enrich exercise definitions with metadata such as description and materials used. This is to help users choose the right exercise. This is not an instruction on how to do the exercise, we expect the user to look this info up elsewhere. It's purpose is simply that the user is able to choose the right exercise (like if they forgot the name).
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
- [ ] Move the intended section-heading typography onto `.rrr-section-title` in the design system so its appearance does not depend on the semantic heading level used.

