# Product Principles

## Status

No persons have been interviewed to gather data. These principles are **synthetic deductions**. They are based on:

* Public fitness and app-usage patterns.
* The product’s current concept: a routine-based strength/workout tracker.
* Practical UX reasoning.
* The assumption that this is an English-first app, with the US as the primary reference market.

This document should guide product and design decisions, but it should not be treated as validated user research. If real user feedback later contradicts any principle here, the feedback should take priority.

---

# 1. Core Product Direction

The app should be a **routine-first strength and workout consistency app**.

It should behave primarily as a fast, frictionless workout logbook. It may
support good decisions through clear history and structure, but it should not
require users to maintain explicit progression targets or behave like a
coaching/programming system.

It should not primarily be:

* A bodybuilding app.
* A weight-loss app.
* A social fitness app.
* A medical or rehabilitation app.
* A generic habit tracker.
* A highly technical programme-builder for advanced athletes only.

The core promise should be:

> Help users know what to do, do it safely, log it quickly, and return next time without friction.

The app should feel calm, capable, practical, and trustworthy.

---

# 2. Primary User Jobs

The personas suggest four major user jobs.

## 2.1 Start and complete a workout

Users want to open the app and begin without having to make many decisions.

This is especially important for casual and consistency-focused users. The moment before a workout is fragile: if the app asks too much, motivation can collapse.

## 2.2 Log performance with minimal friction

During a workout, users are physically active. They may be sweaty, tired, distracted, holding equipment, or moving around a gym.

Logging must therefore be fast, forgiving, and obvious.

The app should assume that active workout use is a low-patience, high-friction context.

## 2.3 Maintain and adjust routines over time

Some users will want to edit routines, change exercise order, add alternatives,
or refine set counts and scheduled timing.

This should be supported without making workout execution feel complicated.

The app should distinguish between planning and doing.

## 2.4 Trust the app with long-term history

Workout data becomes more valuable over time. Users may care about months or years of progress.

The app should treat history, data ownership, export, backup, and readability as trust features rather than technical extras.

---

# 3. Core Conceptual Model

The app should distinguish reusable definitions, routine structure, and
historical execution:

```text
Exercise definition
  → Routine exercise
    → Workout exercise
      → Logged set
```

## 3.1 Exercise

An exercise is a reusable catalogue movement, such as push-up, dumbbell row,
overhead press, squat, plank, or Romanian deadlift.

The same exercise may occur in multiple routines, or more than once in one
routine.

## 3.2 Routine and routine exercise

A routine is the user’s reusable structure. It owns exercise order and default
transition timing.

A routine exercise is one stable occurrence within that structure. It owns its
set count, scheduled rest, optional transition override, and possibly notes. It
does not own rep, weight, or duration targets.

## 3.3 Workout session and workout exercise

A workout session is one execution of a routine.

A workout exercise records what actually happened for one routine-exercise
occurrence. It owns the actual logged sets and preserves the scheduled timing
used for that execution.

Past sessions remain historically accurate even when the routine changes
later.

## 3.4 Logged set and performance

A logged set is one actual unit of work within a workout exercise.

Logged performance may include:

* Reps.
* Weight.
* Duration.
* Bodyweight variant.
* Per-side values.
* Notes.
* Pain/discomfort flag.
* Skipped status.

---

# 4. Routine-First Principle

The app should assume that a workout usually comes from a routine.

Users should not have to build a workout from scratch each time.

## Implications

* Onboarding should help the user arrive at a usable first routine quickly.
* A default routine or starter routine is likely valuable.
* Creating a routine should not feel like filling in a database.
* The user should be able to start with defaults and refine later.
* The app should preserve the idea that repeated sessions create meaningful progress.

## Decision rule

When choosing between “ask the user to configure more” and “provide a sensible default”, prefer the sensible default unless accuracy or safety would suffer.

---

# 5. Separate Planning Mode from Workout Mode

The personas reveal two distinct mental states:

## Planning mode

The user is thinking, editing, reviewing, organising, or refining.

They may tolerate more information, deeper navigation, and richer controls.

## Workout mode

The user is actively exercising.

They need focus, speed, clarity, and minimal interruption.

## Implications

Planning mode may support:

* Routine editing.
* Exercise management.
* History review.
* Programme adjustment.
* Settings and preferences.
* More detailed information.

Workout mode should prioritise:

* Current exercise.
* Current set.
* Previous performance.
* Logging controls.
* Rest timing.
* Clear next action.
* Completion feedback.

## Decision rule

If a feature is useful for planning but distracting during execution, keep it out of the active workout path or make it secondary.

---

# 6. Friction Is the Main Enemy

The most important behavioural risk is not that users lack information. It is that they stop.

Friction can appear as:

* Too many taps.
* Too much typing.
* Too many choices.
* Unclear next action.
* Confusing navigation.
* Dense screens.
* Punishing missed sessions.
* Requiring setup before use.
* Making users maintain data instead of training.

## Implications

* Common actions should be extremely fast.
* Logging should require minimal manual text input.
* The app should remember previous values where appropriate.
* Returning after absence should feel normal.
* The user should not feel punished for missing workouts.
* Workout continuation should be easier than routine reconfiguration.

## Decision rule

For any active workout interaction, ask:

> Does this help the user complete the workout, or does it ask them to manage the app?

If it mostly asks them to manage the app, move it out of workout mode.

---

# 7. Previous Performance Is Core Information

For strength training, “what did I do last time?” is one of the most important pieces of context.

This applies to both casual and intermediate users.

## Implications

The app should make previous performance visible or easily accessible when logging the current exercise.

Useful examples include:

* Last weight used.
* Last reps completed.
* Last duration.
* Previous set pattern.
* Recent personal best.
* Whether the user skipped or modified the exercise last time.

Previous performance and starting values are related but not identical. The app
must not silently turn every completed workout into the next recommendation.
For each routine, the user may explicitly select one completed workout as the
source of starting values, or select none.

When a source is selected:

* It remains selected until the user replaces or clears it.
* Completing another workout does not replace it automatically.
* The same routine-exercise occurrence receives its corresponding values.
* Missing source values fall back to zero rather than another workout.
* The user can change the selected source later from workout history.

## Decision rule

During workout logging, previous performance should be treated as primary
context, not as a buried history feature. Reusing it as input requires explicit
user intent.

---

# 8. Progress Should Be Calm and Multi-Dimensional

Progress should not be framed only as weight loss, body transformation, or streak preservation.

Different users experience progress differently.

Progress may mean:

* Showing up consistently.
* Completing more workouts.
* Increasing reps.
* Increasing weight.
* Improving form.
* Feeling safer.
* Reducing discomfort.
* Building confidence.
* Returning after missed sessions.
* Maintaining strength over time.

## Implications

The app should support several forms of progress without overwhelming the user.

Early progress views should probably emphasise:

* Consistency.
* Completed workouts.
* Previous performance.
* Gradual strength improvements.

Avoid making body weight, calories, or appearance the default progress frame.

## Decision rule

Prefer progress language that reinforces capability and continuity over shame, urgency, or comparison.

---

# 9. Support Change Without Breaking History

Users will change routines.

They may:

* Add exercises.
* Remove exercises.
* Reorder exercises.
* Change set counts.
* Change scheduled rest or transition timing.
* Substitute exercises.
* Rename routines.
* Return to old routines.
* Adapt around discomfort or equipment.

The app should support this without corrupting historical data.

## Implications

Completed workouts should preserve what happened at that time.

Routine edits should affect future sessions, not rewrite past sessions.

The data model should distinguish between:

* Current routine structure.
* Stable routine-exercise occurrences.
* Historical workout sessions.
* Workout-exercise executions.
* Exercise definitions.
* Logged results.
* The selected prefill-source relationship.

## Decision rule

When a user edits a routine, ask:

> Would this make past workout history misleading?

If yes, preserve historical records separately from the updated routine.

---

# 10. Beginner-Friendly Does Not Mean Childish

The app should support beginners without patronising them.

Many users will be intelligent, capable adults who simply have inconsistent fitness experience.

## Implications

Avoid language like:

* “Easy mode.”
* “Beginner mistake.”
* “Weak.”
* “Only.”
* “Just.”

Prefer language like:

* “Alternative.”
* “Bodyweight version.”
* “Lower-intensity option.”
* “Build from here.”
* “Adjust value.”
* “Use this variation.”

## Decision rule

Beginner support should increase confidence without lowering dignity.

---

# 11. Strength Should Be Gender-Neutral

The app should not assume that strength training is primarily male.

It should also avoid overcorrecting into gendered wellness clichés.

## Avoid

* Gym-bro aggression.
* “Shred” language.
* Combat/war metaphors.
* Weight-loss-first framing.
* Pink-coded “female fitness” assumptions.
* Male bodybuilder imagery as the default.
* Transformation shame.

## Prefer

* Strength.
* Consistency.
* Capability.
* Form.
* Progress.
* Recovery.
* Confidence.
* Routine.
* Training.

## Decision rule

If a phrase would feel awkward or exclusionary when read by a woman, older adult, beginner, or non-gym-culture user, rewrite it.

---

# 12. Safety and Confidence Are Product Qualities

The app should not act like a medical authority, but it should support safe general training behaviour.

Users may experience soreness, fatigue, strain, discomfort, or pain. The app should help them think clearly without pretending to diagnose anything.

## Implications

The app should support:

* Exercise instructions.
* Form cues.
* Easier alternatives.
* Discomfort notes.
* Skipped exercises.
* Recovery awareness.
* Clear distinction between general guidance and medical advice.

The app should avoid making risky claims about injury, rehabilitation, or pain treatment.

## Decision rule

Use general safety guidance confidently, but refer persistent, sharp, unusual, or concerning pain to a qualified professional.

---

# 13. Accessibility Is Baseline, Not an Add-On

Accessibility should be treated as core usability.

This matters not only for older users or disabled users, but also for anyone using the app during a workout.

Workout conditions often include:

* Movement.
* Sweat.
* Fatigue.
* Poor lighting.
* One-handed use.
* Time pressure.
* Cognitive load.
* Larger device text settings.
* Reduced precision.

## Implications

The app should support:

* Device text scaling.
* Large tap targets.
* Strong contrast.
* Clear hierarchy.
* Non-colour-only status indicators.
* Visible focus states.
* Reduced clutter.
* Stable layouts at larger text sizes.
* Clear in-app navigation.
* Good readability on mobile.

## Decision rule

If a screen breaks at larger text sizes, the design is not finished.

---

# 14. Data Ownership Builds Trust

Workout data becomes personal history.

Users should feel that their data is safe, readable, and recoverable.

This is especially important for long-term use.

## Implications

The app should eventually support:

* Export.
* Import.
* Backup.
* Restore.
* Clear data location.
* Clear privacy expectations.
* Durable long-term history.

Even if cloud sync is not part of the first version, export/import should be considered an important trust feature.

## Decision rule

Do not treat data export as an obscure advanced setting. Treat it as a sign of respect for the user.

---

# 15. Navigation Should Separate Core Tasks from Utilities

The app has two different kinds of areas.

## Core areas

These support the main fitness loop:

* Start workout.
* Routines.
* Exercises.
* History/progress.

## Utility areas

These support configuration, trust, and support:

* Options.
* Appearance.
* Accessibility.
* Data & Backup.
* Units.
* Privacy.
* Help.

## Implications

Core workout actions should not be buried under settings.

Settings and utilities should not visually compete with workout execution.

The app should avoid mixing active workout controls with general app management.

## Decision rule

When placing a feature, ask:

> Is this part of the user’s training loop, or is it app management?

Training-loop features belong in core navigation. App-management features belong in options/settings.

---

# 16. Mobile-First, Not Mobile-Only

The app should be excellent on phones because workouts are likely to be logged on phones.

However, planning and review may benefit from larger screens.

## Implications

Mobile should prioritise:

* Fast start.
* Simple navigation.
* Clear workout flow.
* Thumb-friendly controls.
* Minimal screen density.

Larger layouts may support:

* More visible routine structure.
* Side-by-side planning.
* Easier editing.
* More detailed history.
* Sidebar or rail navigation.

## Decision rule

Optimise workout execution for mobile first. Allow planning and review to become richer on larger screens.

---

# 17. The App Should Reduce Decision Load

Users should not have to make too many choices before they can train.

## Implications

The app should provide:

* Sensible defaults.
* Starter routines.
* Pre-filled names where helpful.
* Simple routine structure with editable set counts and timing.
* Explicit reuse of values from a completed workout.
* Easy later editing.
* Clear next actions.

Avoid presenting too many configuration choices during onboarding.

## Decision rule

The first successful workout matters more than the perfect first routine.

---

# 18. Tone of Voice

The app’s tone should be:

* Calm.
* Direct.
* Practical.
* Respectful.
* Encouraging without hype.
* Capable without arrogance.
* Neutral across sex, gender, age, and fitness identity.

## Avoid

* “Crush it.”
* “No excuses.”
* “Destroy this workout.”
* “Burn fat fast.”
* “Get shredded.”
* “Punish yourself.”
* “Don’t break the streak.”
* “Summer body.”
* “Beast mode.”

## Prefer

* “Start workout.”
* “Continue routine.”
* “Last time.”
* “Next set.”
* “Adjust value.”
* “Use these values next time.”
* “Logged.”
* “Build consistency.”
* “Good form.”
* “Take a rest.”
* “Ready when you are.”

## Decision rule

The app should sound like a competent training companion, not a drill sergeant or influencer.

---

# 19. Visual Identity Principles

The visual identity should support strength, calm, focus, and trust.

The current palette is well aligned because it avoids two common traps:

## Trap 1: Aggressive fitness branding

Examples:

* Black/red palettes.
* Neon intensity.
* Combat styling.
* Hyper-masculine visual language.

## Trap 2: Vague wellness branding

Examples:

* Overly soft pastels.
* Decorative calmness without strength.
* Spa-like visuals.
* Weak hierarchy.

## Desired identity

The app should feel:

* Focused.
* Modern.
* Clear.
* Calm.
* Gender-neutral.
* Progress-oriented.
* Slightly technical.
* Not sterile.

## Decision rule

Visual design should help users feel capable and oriented, not hyped or soothed into vagueness.

## 19.1 Visual Hierarchy Should Follow the Reading Task

Consistency does not require every row to give its label and value the same
emphasis. The hierarchy should reflect what the user needs to find first.

When rows represent entities, destinations, actions, or choices, their labels
are primary because users must first identify what each row is. Descriptions,
values, and metadata provide supporting context.

When rows present a predictable set of properties, their values are primary.
The labels mainly help users locate those values, particularly after the layout
becomes familiar.

## Implications

* Prefer one reading task per visual group.
* Allow different hierarchy patterns in separate groups on the same page.
* Base hierarchy on semantic purpose, not on whether a row happens to be
  interactive.
* Keep shared geometry and visual grammar consistent without erasing meaningful
  differences in emphasis.
* Avoid APIs named after visual outcomes when a semantic pattern can express
  why that hierarchy exists.

## Decision rule

Ask:

> Is the user trying to identify what this row represents, or inspect the value
> of a property they already expect?

Emphasise the identity in the first case and the value in the second.

---

# 20. MVP Product Scope

The MVP should be narrow enough to build well.

A strong first version should probably include:

* Create or accept a starter routine.
* View routine.
* Edit routine basics.
* Start workout from routine.
* Log sets, reps, and weight.
* See previous performance.
* Complete workout.
* Choose whether a completed workout supplies next time’s starting values.
* Review simple workout history.
* Handle skipped or adjusted exercises.
* Basic exercise guidance.
* Accessible layouts.
* Data export/import, if feasible.

## Defer

* AI coaching.
* Social sharing.
* Leaderboards.
* Public routine marketplace.
* Wearable sync.
* Complex periodisation.
* Calorie tracking.
* Body transformation tracking.
* Advanced analytics.
* Medical or rehabilitation features.

## Decision rule

Build the core loop before building the ecosystem.

The core loop is:

```text
Choose routine
  → Start workout
    → Log performance
      → Complete workout
        → Optionally use these values next time
          → Review progress
            → Return next time
```

---

# 21. Anti-Goals

The app should deliberately avoid becoming:

## A fitness social network

Social sharing can distort the product toward comparison, performance, and image.

## A shame-based habit app

Streaks can motivate some users, but can also make returning harder after failure.

## A calorie or weight-loss app

This would shift the product away from strength, capability, and routine.

## A medical app

The app can support safe general exercise behaviour, but should not diagnose, treat, or prescribe.

## A database maintenance tool

The user should not feel like they need to manage a complex library before they can train.

## An advanced-only lifting platform

Intermediate users should be supported, but not at the cost of mainstream clarity.

---

# 22. Product Decision Checklist

Use this checklist when evaluating a feature, screen, or flow.

## User value

* Does this help the user train more consistently?
* Does this help the user know what to do next?
* Does this reduce friction?
* Does this support long-term trust?
* Does this help without shaming?

## Workout mode

* Is this needed during active exercise?
* Can it be done with minimal taps?
* Is the next action obvious?
* Is previous performance visible enough?
* Does it avoid unnecessary navigation?

## Planning mode

* Does this help users maintain routines?
* Does it preserve historical accuracy?
* Does it support routine changes cleanly?
* Does it avoid leaking complexity into workout mode?

## Accessibility

* Does it work with larger text?
* Are tap targets large enough?
* Is colour not the only signal?
* Is the hierarchy clear?
* Is the screen usable when tired or distracted?

## Trust

* Is user data safe?
* Can the user recover or export meaningful history?
* Is the app transparent about what it stores?
* Does the app avoid overclaiming?

## Tone

* Is the language calm and respectful?
* Does it avoid gender-coded assumptions?
* Does it avoid shame and hype?
* Does it make the user feel capable?

---

# 23. Open Assumptions

Because this is a non-commercial amateur project, not all assumptions will be validated through interviews.

These assumptions should remain visible:

1. Users want routine-based workout tracking more than freeform workout creation.
2. Most early users will log workouts on mobile.
3. Previous performance is essential during active logging.
4. Users prefer calm strength language over aggressive fitness language.
5. Accessibility and text scaling matter from the start.
6. Export/import is enough for initial trust if cloud sync is not available.
7. Users benefit from default routines rather than blank-state setup.
8. Routine editing and workout logging should be separate UX contexts.
9. Progress should be framed around consistency and performance before body metrics.
10. Users understand and value explicitly selecting a previous workout as
    future starting values.
11. The app should be inclusive by default, not by adding separate gendered modes.

---

# 24. Lightweight Validation Without Formal Interviews

Since this is an amateur project, formal interviews are optional.

Instead, use lightweight validation when possible:

* Ask one real person to create a routine.
* Ask one real person to log a fake workout.
* Test the app at large text size.
* Try using the app one-handed.
* Try using it while standing, not at a desk.
* Try returning after skipping several days.
* Try editing a routine after several completed workouts.
* Try exporting and restoring data.
* Watch where confusion appears.

Even one observation can reveal problems that planning will miss.

---

# 25. Summary

The app should be built around a simple but strong idea:

> A user has a routine, performs it repeatedly, logs what happened, sees enough progress to continue, and trusts the app to support that loop over time.

The most important product qualities are:

* Clarity.
* Low friction.
* Routine continuity.
* Fast logging.
* Previous-performance awareness.
* Accessibility.
* Trustworthy data handling.
* Calm, inclusive strength language.

The product should help users become consistent without making fitness feel like administration.
