# Workout Rep Logging Flow Specification

## Status

This document is the product and behavior specification for the core workout logging flow.

It is intentionally implementation-translatable, but it is not implementation code.

## Purpose

The workout logging flow must support a real-world constraint:

- The user is physically training, not operating an app.

The primary objective is to reduce interaction burden while preserving data certainty.

The flow must optimize for:

- Minimal required touches per workout.
- Minimal required decisions per workout.
- Clear moments where user input is required.
- Safe automation only after certainty.

The flow must not optimize for:

- Time spent in app.
- Over-detailed timing data that increases workout friction.

## Core Principle

The system may automate the next step only after receiving the minimum reliable user signal.

Minimum reliable signals by context:

- Rep-based set: confirmed rep result.
- Timed set: explicit start, then elapsed or manual stop.
- Rest: previous set result confirmed.
- Next item focus: rest completed or user explicitly skips/ends rest.

Important distinction:

- Showing the next exercise is not the same as starting the next exercise.

## Definitions

- Suggested value: app-provided default (not yet logged).
- Confirmed value: user-accepted value (logged result).
- Grace period: short post-confirmation window before auto-rest.
- Auto-advance: move visual focus to next relevant item, without implying it has started.

## Logging-Type Rule

Each exercise has a logging type:

- `reps`
- `time`

The logging type controls interaction model and state machine.

## Interaction Contracts

### Rep-Based Contract

The app records outcome after the set is done.

Minimal expected user interaction:

1. Perform set in real world.
2. Confirm rep result.

Default control model:

- `-` decrease reps.
- Current value display.
- `+` increase reps.
- `check` confirm value.

Rep confirmation is mandatory because unchanged suggested values do not generate edit events.

### Timed Contract

The app participates in the activity by running a timer.

Minimal expected user interaction:

1. Exercise becomes ready.
2. User taps Start.
3. Timer runs to target or user stops.

Timed sets require explicit start. Auto-start is not allowed.

### Rest Contract

Rest starts automatically after post-confirmation grace unless interrupted.

Default:

1. Set result confirmed.
2. Grace period (5 seconds).
3. Rest timer starts automatically.

User interventions are optional, never required.

## Why Rep Sets Have No Start Button

For rep-based exercises, useful MVP result is usually:

- exercise
- set number
- reps
- weight (if relevant)
- confirmation timestamp

Useful MVP result does not require exact set start time.

Adding Start/Done controls for rep sets increases friction and touches with low MVP value.

## Suggested vs Confirmed Value

A suggested value is recommendation state.

A confirmed value is logging state.

This distinction is mandatory for reliability:

- Suggested `12`, user performs `12`, no edits made.
- Without explicit confirm action, system has no certainty trigger.

Therefore, confirmation must be represented by an explicit user action.

## Rep Flow

Canonical flow:

1. Set is ready and visible.
2. User performs set.
3. User checks/edits reps.
4. User confirms reps.
5. Result is logged.
6. Grace period runs.
7. Rest starts automatically.
8. Rest completes.
9. Next set or exercise is focused.

Happy path requirement:

- Suggested value is correct.
- User performs one tap (`confirm`) after set.

Adjusted path requirement:

- User can edit value before confirm.
- Editing alone does not log.

## Timed Flow

Canonical flow:

1. Timed set becomes ready.
2. User taps Start.
3. Timer runs.
4. Target reached or user stops early.
5. Timed result is logged.
6. Grace period runs.
7. Rest starts automatically.

Rule:

- Ready is not started.

## Grace Period (Post-Confirmation Delay)

The grace period is a control and clarity window, not a debounce mechanism.

Default value:

- 5 seconds.

Purpose:

- Let user verify logged result.
- Allow immediate correction.
- Avoid rushed transitions.
- Preserve auto-rest convenience.

MVP controls during grace:

- Edit.
- Start rest now.

Behavior:

- Edit: cancel grace and return to editable set state.
- Start now: cancel grace and start rest immediately.
- No interaction: rest auto-starts when grace reaches zero.

## Rest and Auto-Advance

Rest requirements:

- Rest starts automatically after grace.
- User can intervene but is never forced to.

Useful rest interventions:

- Skip rest.
- Add time.

Auto-advance requirements:

- On rest completion, focus next relevant item.
- Never imply timed set has started.

If next item is timed:

- Show Start control.
- Do not auto-start timer.

## State Model

### Rep State Machine

Core states:

- `rep-ready`
- `rep-editing`
- `rep-confirmed`
- `grace`
- `resting`
- `completed`

Allowed transitions:

- `rep-ready -> rep-editing` on value change.
- `rep-ready -> rep-confirmed` on confirm.
- `rep-editing -> rep-confirmed` on confirm.
- `rep-confirmed -> grace` immediately.
- `grace -> rep-editing` on Edit.
- `grace -> resting` on grace completion or Start rest now.
- `resting -> completed` on rest completion.

### Timed State Machine

Core states:

- `timed-ready`
- `timed-active`
- `timed-completed`
- `grace`
- `resting`
- `completed`

Allowed transitions:

- `timed-ready -> timed-active` on Start.
- `timed-active -> timed-completed` on target reached or Stop early.
- `timed-completed -> grace` immediately.
- `grace -> resting` on grace completion or Start rest now.
- `resting -> completed` on rest completion.

## Event Model

Key principle:

- `repValueChanged` is an editing event.
- `repResultConfirmed` is the logging event.

Recommended event set:

- `repValueChanged`
- `repResultConfirmed`
- `setResultEditRequested`
- `gracePeriodStarted`
- `gracePeriodCancelled`
- `restStarted`
- `restSkipped`
- `restCompleted`
- `timedSetStarted`
- `timedSetCompleted`

## Data Model Guidance

### Rep Result

```ts
type RepSetResult = {
  exerciseId: string
  setIndex: number
  reps: number
  weight?: number
  loggedAt: string
  source: 'confirmed-suggested' | 'adjusted-confirmed'
}
```

`loggedAt` means confirmation time, not guaranteed physical set end time.

### Timed Result

```ts
type TimedSetResult = {
  exerciseId: string
  setIndex: number
  targetDurationSeconds: number
  actualDurationSeconds: number
  startedAt: string
  completedAt: string
  completionType: 'target-reached' | 'stopped-early' | 'manual-complete'
}
```

### Rest Period

```ts
type RestPeriod = {
  afterExerciseId: string
  afterSetIndex: number
  targetDurationSeconds: number
  startedAt: string
  completedAt?: string
  completionType: 'completed' | 'skipped' | 'extended' | 'manual'
}
```

### Session

```ts
type WorkoutSession = {
  routineId: string
  startedAt: string
  completedAt?: string
  setResults: unknown[]
}
```

## Non-Data Decision (Important)

Do not track rep-set start/end duration in MVP unless a concrete feature requires it.

Decision gate before adding rep-set duration:

- Which specific screen or behavior is impossible without it?
- Is the additional interaction burden justified?

If justification is unclear, do not add it.

## Editing Rules

Two edit modes are required:

- Immediate edit during grace: affects workflow state and can cancel pending rest start.
- Historical edit after flow moved on: updates logged data only and does not rewind workflow.

## Accessibility Requirements

Rep control minimum requirements:

- Decrease button name: Decrease reps.
- Increase button name: Increase reps.
- Value announced as rep count (for example, 12 reps).
- Confirm button name includes current value (for example, Log 10 reps).

Post-confirmation announcement requirement:

- Announce logged result and near-term automation intent.

Avoid noisy announcements:

- Grace/rest second-by-second announcements should not spam assistive tech.

Input ergonomics requirement:

- Large touch targets suitable for in-workout use.

## Error Prevention and Recovery

Required safeguards:

- Rep value floor at 0.
- Reasonable rep value cap (for example, 99).
- Confirm action always reflects current displayed value.
- Grace-period correction path always available.
- Completed sets remain editable.

## MVP Boundary

MVP includes:

- Rep logging with suggested value, adjust, confirm.
- Timed logging with Start and running timer.
- 5-second grace after set completion.
- Automatic rest start.
- Next-item focus on rest completion.

MVP may include (recommended):

- Edit during grace.
- Start rest now.
- Skip rest.

Post-MVP candidates:

- Advanced rest analytics and charts.
- Pause/resume/restart rest variants.
- Per-set rest customization UX.
- Rep-set duration tracking.

## Product Summary

The operating rule is:

- Automate after certainty.
- Ask only when necessary.
- Keep user control available.
- Minimize interaction burden during physical activity.

Rep sets:

- Do set, then confirm result.

Timed sets:

- Explicitly start timer, then complete result.

Grace period is the bridge between certainty and automation.