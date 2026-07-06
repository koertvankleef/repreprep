# Functional specification

This spec:

* Does **not** reference code, types, or config objects
* Describes **what the user sees and can do**
* Describes **what the system guarantees**
* Uses **plain domain language**

> Verification note: Every requirement ID must be referenced by an automated
> test through `specIt`, or carry `[UI-req_test-pending]` on the same line when
> it requires rendered browser/user verification that is not automated yet.
>
> Requirement IDs are stable traceability anchors. Retired IDs are
> intentionally kept and not renumbered.

---

# 1. Sheet overlay system

Sheets are the default surface for temporary tasks within the current page
context. A sheet appears above the page content and is dismissed when the task
is complete or cancelled. Sheets are not routes; opening or dismissing a sheet
does not change navigation history.

## 1.1 Stack

Multiple sheets may be open at the same time. Opening a new sheet does not
close any prior sheet.

Sheets are ordered by opening time. The most recently opened sheet is the
topmost sheet. Each open sheet receives a presentation depth equal to its
position in the stack, starting at one [SHEET-STACK-001]. A sheet's available
height is reduced by one stack step per depth level [SHEET-STACK-001].

When any sheet closes, all remaining sheets immediately recalculate their
depths [SHEET-STACK-002].

Only the topmost sheet responds to dismissal gestures; a covered sheet is
inert until its covering sheet closes [SHEET-DIMISS-001].

## 1.2 Dismissal

A dismissible sheet may be closed by any of the following:

* Pressing Escape [SHEET-DIMISS-001]
* Clicking the backdrop outside the sheet panel [SHEET-DIMISS-002]
* Activating the assistive close control [SHEET-DIMISS-003]
* Dragging the drag handle sufficiently downward [SHEET-DRAG-001]

A non-dismissible sheet suppresses the assistive close control
[SHEET-DIMISS-004] and ignores Escape and backdrop clicks [SHEET-DIMISS-004].

## 1.3 Focus

When a sheet opens, focus moves to the first interactive element within the
sheet body [SHEET-FOCUS-001]. When a sheet closes, focus returns to the
element that was active before the sheet opened [SHEET-FOCUS-002].

## 1.4 Authored content

A sheet accepts three optional authored regions: a heading, a body, and an
actions area [SHEET-AUTH-001]. Authored content is placed into the sheet
without modification or replacement [SHEET-AUTH-002].

## 1.5 Toast placement

While at least one sheet is open, toasts are rendered inside the topmost
sheet's presentation layer, keeping them above the sheet surface
[SHEET-TOAST-001]. When the last sheet closes, the toast container relocates
to the document body [SHEET-TOAST-002].

## 1.6 Field flow

Within a sheet, the Enter key advances focus from one eligible field to the
next [SHEET-FIELD-001]. On the final eligible field, Enter triggers the
primary confirm action [SHEET-FIELD-002]. Enter does not trigger confirm while
the confirm action is disabled [SHEET-FIELD-003].

Selecting a radio option in a radio group advances focus to the next field
[SHEET-FIELD-004]. Enter is not intercepted in multi-line fields or
button-only controls [SHEET-FIELD-005].

---

# 2. Exercise picker

The exercise picker lets the user add one or more exercises to a routine in a
single session. The picker opens as a sheet and stays open until the user
explicitly dismisses it.

## 2.1 Search and display

All active exercises are displayed in alphabetical order [PICKER-SRCH-001].
Typing in the search field immediately narrows the visible list without moving
focus away from the search field [PICKER-SRCH-002]. A live count of matching
exercises is announced to assistive technology [PICKER-SRCH-003]. When no
exercises match the current search, a clear empty state is shown
[PICKER-SRCH-004].

## 2.2 Adding an exercise

The complete exercise row is the add target; there is no separate small button
[PICKER-ADD-001]. Each row carries an accessible action name that includes the
exercise name [PICKER-ADD-002]. A trailing plus icon provides a reinforcing
visual cue [PICKER-ADD-003]. The same exercise may be added more than once to
a routine [PICKER-ADD-004].

## 2.3 Configuration session

Activating an exercise opens a second-level configuration sheet while the
picker remains open underneath it [PICKER-CONFIG-001]. Only one configuration
sheet may be open from the picker at a time [PICKER-CONFIG-002].

The first exercise configured in a picker session starts with one set and 60
seconds rest [PICKER-CONFIG-003]. Confirming the configuration adds a complete
routine exercise and makes those confirmed values the defaults for the next
exercise configured during the same picker session [PICKER-CONFIG-004].
Dismissing configuration adds nothing and does not change the session defaults
[PICKER-CONFIG-005].

Each confirmed addition is committed immediately when editing an existing
routine [PICKER-CONFIG-006]. During new-routine creation, confirmed additions
remain in the local draft until the user creates the routine
[PICKER-CONFIG-007].

After confirmation, the configuration sheet closes before the success message
appears [PICKER-CONFIG-008]. The picker retains its search, list position, and
focus context after configuration is confirmed or dismissed
[PICKER-CONFIG-009].

---

# 3. Data import

## 3.1 Validation

Imported data must match the expected schema to be accepted [DATA-VALID-001].
Data missing required top-level fields is rejected [DATA-VALID-002]. Data with
incorrect field types is rejected [DATA-VALID-003]. A routine exercise with
fewer than one set is rejected [DATA-VALID-004]. A workout entry missing
required persistence fields is rejected [DATA-VALID-005].

Validation is all-or-nothing; partial recovery is not attempted
[DATA-VALID-006].
