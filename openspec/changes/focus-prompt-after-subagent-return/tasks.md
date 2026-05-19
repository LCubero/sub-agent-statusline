# Tasks: Focus Prompt After Subagent Return

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 80-180 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-always (mapped to ask-on-risk guard behavior) |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Implement return-focus behavior + tests + optional docs sync | PR 1 | Base: main; include verification evidence in same unit |

## Phase 1: Foundation / Decision Seams

- [x] 1.1 In `src/tui.tsx`, extract and export a pure helper (e.g. `SidebarReturnFocusAction`) that decides `focus-prompt` vs `clear-pending` vs `none` from pending marker + route transition.
- [x] 1.2 In `src/tui.test.ts`, add RED unit tests for the helper matrix: sidebar child→parent returns `focus-prompt`; unrelated transitions return `none` or `clear-pending`; missing pending marker never forces prompt focus.

## Phase 2: Core Implementation

- [x] 2.1 In `src/tui.tsx`, replace child-return `focusVisibleSidebarSubagentList(childRowID)` behavior with `blurVisibleSidebarSubagentList()` followed by `focusActivePrompt()` when helper returns `focus-prompt`.
- [x] 2.2 In `src/tui.tsx`, keep non-sidebar route-change behavior intact: only clear pending when navigation exits remembered child path.
- [x] 2.3 In `src/tui.tsx`, update `focusActivePrompt()` fallback to keep existing deferred attempt and add one bounded retry when prompt ref is unavailable.

## Phase 3: Testing / Verification

- [x] 3.1 In `src/tui.test.ts`, add GREEN assertions that return path clears sidebar keyboard-focus state before prompt-focus execution (no list-focus trap).
- [x] 3.2 In `src/tui.test.ts`, add fake-timer coverage (or deterministic seam test) for deferred prompt-focus retry path when prompt ref is initially unavailable.
- [x] 3.3 Run `pnpm test` and capture evidence for scenarios: immediate typing after Up/session_parent, no forced focus on non-sidebar origin, `Alt+B` behavior unchanged.

## Phase 4: Documentation / Cleanup

- [x] 4.1 If keyboard navigation docs already mention return behavior, update `README.md` with one sentence clarifying sidebar-opened child → Up/session_parent returns focus to prompt.
- [x] 4.2 If TUI docs section exists, update `docs/en/07-tui-interface.md` with the same behavior note; skip if redundant.
