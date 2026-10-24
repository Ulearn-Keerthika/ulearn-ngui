# CRT Platform — Student Screen Wireframes

**Task ID:** CRT-001
**Status:** Draft — requires product-owner approval
**Scope:** Student screens only
**Purpose:** Define the student CRT screens, navigation, interface elements, and data requirements before frontend implementation.

## 1. Student Navigation Flow

```text
CRT Home — Paths Dashboard
          |
          v
Module List Inside a Path
          |
          v
Timed Practice — MCQ Screen
          |
          v
Submit Confirmation
          |
          v
Result Screen
          |
          +------> Review Answers
          |
          +------> Retry Practice (if permitted)
          |
          +------> Module List
          |
          +------> CRT Home

CRT Home ------> Attempt History + Review
                         |
                         +------> View Result
                         +------> Review Answers
                         +------> Retry (if permitted)
```

## 2. Screen 1 — CRT Home: Paths Dashboard

**Purpose:** Help students view assigned CRT learning paths and resume their preparation.

### Low-fidelity wireframe

```text
+------------------------------------------------------+
| ULearn                         Student Profile       |
+------------------------------------------------------+
| CRT Home                                             |
| Your assigned preparation paths                      |
+------------------------------------------------------+
| [My Paths]                  [Attempt History]         |
|                                                      |
| +--------------------------------------------------+ |
| | Path Title                         [Continue]     | |
| | Short description                                | |
| | Modules: --     Completion: --%                  | |
| | Readiness: Pending approval                      | |
| | Progress: [--------------------]                 | |
| | Last activity: --                                | |
| |                                  [View Path]      | |
| +--------------------------------------------------+ |
|                                                      |
| Loading / Empty / Error message area                 |
+------------------------------------------------------+
```

### Fields and components

- Path title and short description.
- Total module count.
- Completion status and progress indicator.
- Readiness percentage, shown as pending until its calculation is approved.
- Last activity, when available.
- `Continue` and `View Path` actions.
- Navigation to attempt history.

### Actions

- **Continue:** Open the next incomplete module or resume the relevant activity, according to the approved navigation rules.
- **View Path:** Open the selected path's module list.
- **Attempt History:** Open the student's previous practice attempts.

### States

- **Loading:** Display a loading indicator while assigned paths are retrieved.
- **Empty:** Display “No learning paths assigned yet” and explain that assigned paths will appear here.
- **Error:** Display an understandable error message and a retry action.

### Data requirements

Assigned paths, path identifiers, titles, descriptions, module counts, progress information, readiness values if available, and last-activity timestamps.

## 3. Screen 2 — Module List Inside a Path

**Purpose:** Show the modules within a selected path and help students track their progress.

### Low-fidelity wireframe

```text
+------------------------------------------------------+
| [< Back to CRT Home]                                 |
+------------------------------------------------------+
| Path Title                                           |
| Path description                                     |
| Overall progress: [--------------------]             |
+------------------------------------------------------+
| Modules                                              |
|                                                      |
| 01. Module Title              [Start]                |
|     Short description                                |
|     Questions: -- | Status: Not started              |
|                                                      |
| 02. Module Title              [Continue]             |
|     Short description                                |
|     Questions: -- | Status: In progress              |
|                                                      |
| 03. Module Title              [Review]               |
|     Short description                                |
|     Questions: -- | Status: Completed                |
|                                                      |
| Loading / Empty / Error message area                 |
+------------------------------------------------------+
```

### Fields and components

- Path title and description.
- Ordered module list.
- Module title, description, question count, and status.
- Completion indicator for each module.
- Back navigation to CRT Home.

### Actions

- **Start:** Begin practice for a module that has not been attempted.
- **Continue:** Resume an incomplete module if supported.
- **Review:** Revisit a completed module if review is permitted.
- **Back to CRT Home:** Return to the paths dashboard.

### States

- **Loading:** Show a loading indicator while module data is retrieved.
- **Empty:** Display “No modules available in this path yet.”
- **Error:** Display an error message and retry action.

### Data requirements

Selected path details, module identifiers, ordered module records, question counts, module status, and progress information.

### Open decision

The product owner must decide whether modules must be completed sequentially or whether students may open any available module.

## 4. Screen 3 — Timed Practice: MCQ Screen

**Purpose:** Allow students to answer multiple-choice questions within an allocated time.

### Low-fidelity wireframe

```text
+------------------------------------------------------+
| Path Title / Module Title             Time: 09:45     |
+------------------------------------------------------+
| Question 2 of 10                                     |
| Progress: [--------............]                     |
+------------------------------------------------------+
| Question text appears here                           |
|                                                      |
| ( ) A. Option A                                      |
| ( ) B. Option B                                      |
| ( ) C. Option C                                      |
| ( ) D. Option D                                      |
|                                                      |
| Answer status: Answered / Unanswered                 |
+------------------------------------------------------+
| [Previous]                     [Next]                |
|                                                      |
|                         [Submit Practice]             |
+------------------------------------------------------+
```

### Fields and components

- Path and module names.
- Current question number and total question count.
- Question text and four options labelled A, B, C, and D.
- Countdown timer.
- Question progress indicator.
- Selected-answer state and unanswered status.
- Previous, Next, and Submit controls.

### Actions

- **Previous:** Return to the previous question if navigation is allowed.
- **Next:** Save the selected answer and move to the next question.
- **Submit Practice:** Open a confirmation dialog before final submission.

### Submission confirmation

```text
+--------------------------------------+
| Submit this practice?                |
|                                      |
| Answered: --                         |
| Unanswered: --                       |
|                                      |
| [Continue Practising] [Confirm Submit]|
+--------------------------------------+
```

### Required behaviour

- Preserve answers when navigating between questions.
- Clearly distinguish selected and unanswered questions.
- Prevent duplicate submissions.
- Define the behaviour when the timer reaches zero.
- Do not reveal correct answers or explanations during an active attempt unless approved.
- Handle unanswered questions according to the approved submission policy.

### States

- **Loading:** Show a loading indicator while questions are retrieved.
- **Empty:** Display “Practice is not available for this module yet” and a route back to the module list.
- **Error:** Explain that the practice could not be loaded or saved and provide an appropriate recovery action.

### Data requirements

Attempt identifier, module identifier, question identifiers, question text, four options, timer duration, selected answers, question order, and submission status.

### Open decisions

The product owner must approve timer-expiry behaviour, unanswered-question handling, previous-question navigation, answer persistence, and submission rules.

## 5. Screen 4 — Result Screen

**Purpose:** Present the student's performance after a practice attempt is submitted and evaluated.

### Low-fidelity wireframe

```text
+------------------------------------------------------+
| Practice Result                                      |
+------------------------------------------------------+
| Score: -- / --                  Percentage: --%       |
|                                                      |
| Correct: --     Incorrect: --     Unanswered: --      |
| Total time: --                                         |
+------------------------------------------------------+
| Performance Summary                                  |
| [Progress / Summary Area]                            |
+------------------------------------------------------+
| Question-wise review, when permitted                 |
|                                                      |
| Question 1                                           |
| Your answer: --                                      |
| Correct answer: --                                   |
| Explanation: --                                      |
+------------------------------------------------------+
| [Review Answers]             [Retry Practice]         |
| [Back to Modules]            [Back to CRT Home]       |
+------------------------------------------------------+
```

### Fields and components

- Total score and percentage.
- Correct, incorrect, and unanswered counts.
- Total number of questions and time taken.
- Question-wise answers and explanations, subject to the approved review policy.

### Actions

- **Review Answers:** Open the question-wise review.
- **Retry Practice:** Start a new attempt if retries are permitted.
- **Back to Modules:** Return to the current path's module list.
- **Back to CRT Home:** Return to the paths dashboard.

### States

- **Processing:** Indicate that results are being evaluated.
- **Unavailable:** Explain when results cannot be retrieved; do not display fabricated scores.
- **Error:** Show a useful message and a recovery action.

### Data requirements

Attempt identifier, evaluation status, score, percentage, answer counts, duration, and question-level review data where authorized.

### Open decisions

The product owner must approve the scoring formula, treatment of unanswered questions, retry policy, and when correct answers and explanations become visible.

## 6. Screen 5 — Attempt History + Review

**Purpose:** Let students inspect previous practice attempts and track their preparation history.

### Low-fidelity wireframe

```text
+------------------------------------------------------+
| Attempt History                                      |
| [< Back to CRT Home]                                 |
+------------------------------------------------------+
| Filters: [Path v] [Module v]                         |
|                                                      |
| +--------------------------------------------------+ |
| | Date / Time | Path / Module | Score | Status      | |
| | ------------|---------------|-------|-------------| |
| | --          | --            | --    | Completed   | |
| | --          | --            | --    | In progress | |
| +--------------------------------------------------+ |
|                                                      |
| Selected attempt actions:                            |
| [View Result] [Review Answers] [Retry]               |
|                                                      |
| Loading / Empty / Error message area                 |
+------------------------------------------------------+
```

### Fields and components

- Attempt date and time.
- Path and module names.
- Score and percentage.
- Correct, incorrect, and unanswered counts.
- Attempt status and duration when available.
- Optional path and module filters, subject to product approval.

### Actions

- **View Result:** Open the result for the selected attempt.
- **Review Answers:** Inspect answers and explanations where permitted.
- **Retry:** Start a new attempt if retries are permitted.
- **Back to CRT Home:** Return to the paths dashboard.

### States

- **Loading:** Show a loading indicator while attempt history is retrieved.
- **Empty:** Display “You haven't attempted any practice sessions yet” with an action to browse available paths.
- **Error:** Display an error message and retry action.

### Data requirements

Attempt identifiers, timestamps, path/module references, scores, answer counts, status, duration, and permissions for result review.

### Open decisions

The product owner must decide whether students can view all past attempts or only the latest attempt, whether filters are required, and what historical answer details remain available.

## 7. Shared UI and Interaction Requirements

- Reuse the application's existing header, navigation, typography, spacing, and component conventions.
- Keep labels and button names consistent across student screens.
- Show loading, empty, success, and error states wherever relevant.
- Confirm final submission before sending an attempt for evaluation.
- Prevent accidental duplicate submissions.
- Distinguish unavailable data from zero-valued results.
- Follow existing authentication and CRT permission requirements.
- Do not expose answers, explanations, or attempt data beyond the approved access policy.
- Use responsive layouts suitable for desktop and mobile screens.

## 8. Student Route and Navigation Considerations

The existing application includes a `/crt` route protected by authentication and the `crt.access` feature permission.

Proposed screen destinations for discussion:

- `/crt` — CRT Home.
- A path-specific destination — Module List.
- An attempt-specific destination — Timed Practice.
- An attempt result destination — Result Screen.
- `/crt/history` — Attempt History.

These are proposed destinations, not implemented routes. Confirm route names and parameters against the existing Angular routing conventions before implementation.

## 9. Open Decisions for Product-Owner Approval

1. How is readiness percentage calculated?
2. Must modules be completed sequentially?
3. Are previous questions accessible during timed practice?
4. What happens when the timer reaches zero?
5. Can students submit unanswered questions?
6. What is the scoring formula?
7. When are correct answers and explanations shown?
8. Are retries allowed, and are there retry limits?
9. Can students access every historical attempt?
10. Which attempt and result data are available through the existing backend?

## 10. Backend and Frontend Dependencies

**Frontend team**

- Confirm existing route conventions and shared UI components.
- Agree on component responsibilities and screen transitions.
- Define the loading, empty, and error presentations.
- Implement the approved wireframes only after approval.

**Backend team**

- Confirm available learning-path, module, question, attempt, answer, and result data.
- Identify required API operations and response fields.
- Confirm attempt persistence, submission behaviour, permissions, and result-review rules.

**Product owner**

- Resolve the open decisions above.
- Review the student navigation flow and screen specifications.
- Explicitly approve the wireframes before feature implementation begins.

## 11. Approval Status

**Current status: Draft — Pending review.**

This document describes the proposed student-screen layouts and interactions. It does not implement frontend screens, APIs, database migrations, scoring logic, or readiness calculations. Those activities must follow the approved specification and the team's development process.
