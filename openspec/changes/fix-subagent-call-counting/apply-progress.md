# Apply Progress: fix-subagent-call-counting

## Workload / PR Boundary

- Delivery path: single PR approved by tasks forecast.
- 400-line budget risk: Medium.
- Implementation scope stayed within `src/state.ts` and `src/state.test.ts`; no event/render refactor was needed.
- Pre-existing dirty files preserved: `.gitignore`, `context.md`.

## Completed Tasks

- [x] RED: Added state tests proving `source: "tool"` wrappers are stored but uncounted, including terminal/non-zero-duration cases.
- [x] RED: Added state tests proving real `source: "session"` children count exactly once and wrapper+session yields one count.
- [x] RED: Added state tests for `source: "subtask"` fallback countability and deterministic rekey/merge behavior.
- [x] GREEN: Centralized count identity resolution in `src/state.ts`.
- [x] GREEN: Excluded tool wrappers from `countedChildIDs`/`totalExecuted`.
- [x] GREEN: Preserved real session count-by-session-ID semantics.
- [x] GREEN: Added deterministic subtask fallback reconciliation through upsert and details update boundaries.
- [x] TRIANGULATE: Added load-state tests for new tool rows and historical persisted `tool:*` count non-goal.
- [x] REFACTOR: Kept implementation in state helpers and avoided render/event counting logic.
- [x] Final verification: `pnpm test`, `pnpm typecheck`, and `pnpm build` passed.

## Files Changed

- `src/state.ts`
  - Replaced boolean countability with state-aware execution count identity resolution.
  - Added source-specific helpers for real sessions, synthetic tool wrappers, subtask fallback matching, and count rekeying.
  - Updated `upsertRunningChild()`, `upsertChildDetails()`, and `loadState()` to use the new semantics.
- `src/state.test.ts`
  - Updated old tool-counting expectation.
  - Added regression coverage for tools, real sessions, subtasks, rekey/merge, and load-state compatibility.
- `openspec/changes/fix-subagent-call-counting/tasks.md`
  - Marked apply tasks complete.
- `openspec/changes/fix-subagent-call-counting/apply-progress.md`
  - Recorded this progress and TDD evidence.

## TDD Cycle Evidence

| Task                       | Test File           | Layer | Safety Net                                           | RED                                                             | GREEN                                                   | TRIANGULATE                                                         | REFACTOR                                             |
| -------------------------- | ------------------- | ----- | ---------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| Tool wrappers uncounted    | `src/state.test.ts` | Unit  | ✅ `pnpm test -- src/state.test.ts` passed, 61 tests | ✅ Failed: tool wrappers still incremented `totalExecuted` to 1 | ✅ Passed after source-aware identity resolver          | ✅ Non-zero-duration tool wrapper remains uncounted                 | ✅ Count logic centralized in state helpers          |
| Real sessions exactly once | `src/state.test.ts` | Unit  | ✅ Same baseline                                     | ✅ Covered session update and tool+session one-count scenario   | ✅ Passed after count-by-session-ID behavior            | ✅ Wrapper followed by matching session counts only `ses_child`     | ✅ No render/event logic added                       |
| Subtask fallback/rekey     | `src/state.test.ts` | Unit  | ✅ Same baseline                                     | ✅ Failed: matching subtask/session paths inflated totals       | ✅ Passed after deterministic matching and rekey helper | ✅ Covered details-added `targetSessionID` reconciliation           | ✅ Reused one `reconcileSubtaskTargetCount()` helper |
| Load-state compatibility   | `src/state.test.ts` | Unit  | ✅ State tests green before triangulation            | ✅ Added compatibility scenarios                                | ✅ Passed with load-state count identity replay         | ✅ Covered new uncounted tool rows and historical `tool:*` non-goal | ✅ No schema migration added                         |

## Test Commands Run

- `pnpm test -- src/state.test.ts` baseline before edits: passed, 61 tests.
- `pnpm test -- src/state.test.ts` RED after tests: failed, 7 expected failures in `src/state.test.ts`.
- `pnpm test -- src/state.test.ts` GREEN after implementation: passed, 67 tests.
- `pnpm test -- src/state.test.ts` after load-state triangulation: passed, 68 tests.
- `pnpm test`: passed, 6 test files, 68 tests.
- `pnpm typecheck`: passed.
- `pnpm build`: passed.

## Deviations From Design

- No `src/events.ts` or `src/render.ts` tests were added because focused state tests covered the required semantics and existing full test suite stayed green.
- `loadState()` preserves historical persisted `tool:*` counts exactly as the spec non-goal allows, while avoiding newly adding uncounted tool wrappers.

## Remaining Tasks

- None for apply.
- Recommended next phase: SDD verify / fresh review of the diff.

## Persistence Note

- Engram memory tools were not available in this child apply environment, so significant apply evidence was recorded in this OpenSpec artifact instead.

## Follow-up: synchronous OpenCode task duplication

User testing after apply found async subagents no longer duplicate, but synchronous OpenCode `task` calls still showed duplicate visible rows.

### RED

- Added `src/events.test.ts` coverage for a live sync ordering where `message.part.updated` creates a `source: "tool"` task wrapper before the `session.created` child exists.
- Added parser coverage for task output variants (`Task ID: ses_*` and bare `ses_*`).
- RED command: `pnpm test -- src/events.test.ts` failed with 2 expected failures:
  - output variant parser returned `undefined`;
  - later `session.created` did not backfill `tool:<id>.targetSessionID`.

### GREEN

- Updated `src/events.ts` task output parsing to match session IDs case-insensitively with optional `task_id:` prefix.
- Added live event backfill when a later real session appears and exactly one targetless synthetic `tool`/`subtask` sibling can be correlated safely.
- GREEN command: `pnpm test -- src/events.test.ts` passed, 70 tests.

### Verification

- `pnpm test` passed, 70 tests.
- `pnpm typecheck` passed.
- `pnpm build` passed.

### Notes

- This fixes the screenshot/user-observed sync `task` path without adding render heuristics or timing-based logic.
- Backfill fails closed when multiple targetless synthetic siblings make the target ambiguous.

## Follow-up: remaining visible stacked duplicate after local build

User retested with a local build and still saw duplicate/stacked agents in the UI. The prior live-event backfill fixed target propagation only when state could be updated, but render collapse still showed a targetless generic `task` wrapper beside the only real session sibling when correlation metadata was missing.

### RED

- Added `src/render.test.ts` coverage for a targetless synchronous generic `source: "tool"` task wrapper plus the only `source: "session"` sibling under the same parent.
- RED command: `pnpm test -- src/render.test.ts` failed because `collapseSubagentWorkItems()` returned both `tool:sync-task` and `ses_sync_child`.

### GREEN

- Updated `src/render.ts` collapse matching so a generic `tool` wrapper (`task`/`delegate`) may merge with the only real session sibling for that parent when stronger correlation is absent.
- The rule remains fail-closed for multiple session siblings, avoiding broad parent-only matching in concurrent task cases.
- GREEN command: `pnpm test -- src/render.test.ts` passed, 71 tests.

### Verification

- `pnpm test` passed, 71 tests.
- `pnpm typecheck` passed.
- `pnpm build` passed.
- `git diff --check -- src/events.ts src/events.test.ts src/render.ts src/render.test.ts src/state.ts src/state.test.ts` passed.

### Notes

- This addresses the screenshot/user-observed visible duplication layer, not just counter inflation.
- The collapse rule is intentionally limited to generic wrappers with exactly one session sibling for the same parent.
