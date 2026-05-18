# Tasks: fix-subagent-call-counting

## Review Workload Forecast

| Field                   | Value                  |
| ----------------------- | ---------------------- |
| Estimated changed lines | ~250-380 changed lines |
| 400-line budget risk    | Medium                 |
| Chained PRs recommended | No                     |
| Suggested split         | single PR              |
| Delivery strategy       | single-pr              |
| Chain strategy          | pending                |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

## Safety Notes

- STRICT TDD MODE IS ACTIVE. Test runner: `pnpm test`. Apply must record RED, GREEN, TRIANGULATE, and REFACTOR evidence.
- Pre-existing dirty files to avoid accidental modification: `.gitignore`, `context.md`.
- Keep counting semantics centralized in `src/state.ts`; do not move execution-count decisions into `src/render.ts`.
- Do not use elapsed time, zero-second duration, timestamps, or render-collapse behavior to decide countability.

## Implementation Tasks

### [x] 1. RED — prove synthetic `source: "tool"` wrappers are uncounted

- File: `src/state.test.ts`
- Add/update focused failing tests for:
  - inserting a `source: "tool"` child with ID like `tool:<partID>` stores the row but leaves `totalExecuted === 0`;
  - `countedChildIDs` does not contain the tool row ID;
  - updating or marking that tool wrapper done still leaves counters unchanged;
  - a non-zero-duration tool wrapper is still uncounted, proving no timing heuristic is used.
- Update any existing assertion that currently expects `source: "tool"` insertion to increment `totalExecuted`.
- Verification boundary: run `pnpm test -- src/state.test.ts` or `pnpm test` and capture failing RED evidence.

### [x] 2. RED — prove real sessions still count exactly once

- File: `src/state.test.ts`
- Add failing tests for:
  - inserting `source: "session"` with ID `ses_child` increments `totalExecuted` to `1` and records `ses_child`;
  - repeated upsert/status updates for the same real session do not increment again;
  - a `source: "tool"` wrapper followed by a matching real `source: "session"` child yields exactly one counted execution, with only the session ID counted.
- Verification boundary: run `pnpm test -- src/state.test.ts` or `pnpm test` and confirm failures are due to current counting behavior.

### [x] 3. RED — prove subtask fallback and reconciliation semantics

- File: `src/state.test.ts`
- Add failing tests for:
  - `source: "subtask"` fallback with no matching counted real session counts once;
  - subtask with `targetSessionID: "ses_child"` does not count when `ses_child` is already counted;
  - counted subtask fallback followed by matching real session rekeys/merges to one total execution;
  - subtask gaining `targetSessionID` through `upsertChildDetails()` rekeys or merges without inflating `totalExecuted`.
- Use deterministic correlation fields from the design (`targetSessionID`, and where useful shared `parentID` + `messageID`).
- Verification boundary: run `pnpm test -- src/state.test.ts` or `pnpm test` and keep RED evidence.

### [x] 4. GREEN — centralize execution count identity in `src/state.ts`

- File: `src/state.ts`
- Implement small state-local helpers from the design:
  - `isRealSessionChild(child)`;
  - `isSyntheticToolWrapper(child)`;
  - `isSubtaskFallback(child)`;
  - `findMatchingCountedSessionID(state, subtask)`;
  - `findMatchingCountedSubtaskID(state, session)`;
  - `rekeyCountedExecution(state, fromID, toID)`.
- Replace boolean countability usage with a state-aware identity resolver, e.g. `resolveExecutionCountIdentity(state, child)`.
- Required behavior:
  - `source: "tool"` returns no count identity;
  - real sessions count by session ID unless excluded by the existing technical-delegation filter;
  - subtask fallback counts by `targetSessionID` when present, otherwise by subtask row ID only when no deterministic counted session match exists;
  - unknown legacy rows keep conservative existing count-by-row-ID behavior.
- Keep `countedChildIDs` shape compatible; do not introduce a persisted schema migration.
- Verification boundary: run `pnpm test -- src/state.test.ts` until the RED state tests pass.

### [x] 5. GREEN — reconcile count identities at state update boundaries

- File: `src/state.ts`
- Update `upsertRunningChild()` so counting happens only on first insert through the centralized identity resolver.
- Sanitize/carry `targetSessionID` before counting so subtasks can resolve explicit session targets.
- When an existing subtask gains stronger deterministic target evidence during upsert, rekey/merge counted identity without inflating `totalExecuted`.
- Update `upsertChildDetails()` so later `targetSessionID` updates reconcile counted subtask fallback IDs with real session IDs.
- Review `loadState()` replay behavior so newly replayed child rows do not add `source: "tool"` IDs to `countedChildIDs`, while avoiding broad historical migration of previously persisted `tool:*` keys.
- Verification boundary: run `pnpm test -- src/state.test.ts`.

### [x] 6. TRIANGULATE — add integration coverage only where gaps remain

- Discovery targets: `src/events.test.ts`, `src/render.test.ts`, existing fixtures under `test/` if relevant.
- Add focused tests only if state tests do not already prove the spec seams:
  - `src/events.test.ts`: `message.part.updated` delegate/task wrapper remains `source: "tool"` and does not inflate counts after event application;
  - `src/events.test.ts`: `session.created` still counts as exactly one execution;
  - `src/render.test.ts`: a generic tool wrapper collapsed/hidden with a matching real session renders as one visible work item while state `totalExecuted` remains one.
- Avoid broad fixture churn or TUI/e2e expansion unless an existing seam requires it.
- Verification boundary: run targeted tests, then `pnpm test`.

### [x] 7. REFACTOR — keep the implementation small and reviewable

- Files: `src/state.ts`, touched tests only.
- Refactor for clarity after tests are green:
  - keep helper names explicit and source-based;
  - remove duplicate countability logic;
  - keep render code display-only unless a compatibility test exposes a real mismatch;
  - avoid changing `src/events.ts` unless event classification or target propagation is demonstrably broken.
- Verification boundary: rerun `pnpm test` after refactor.

### [x] 8. Final verification and reviewer handoff

- Run required commands from repository root:
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm build`
- Confirm no unintended edits to pre-existing dirty files:
  - `.gitignore`
  - `context.md`
- Inspect changed files and ensure expected scope is limited primarily to:
  - `src/state.ts`
  - `src/state.test.ts`
  - optionally `src/events.test.ts` / `src/render.test.ts` if triangulation required them.
- Record strict-TDD evidence in the apply result: RED failures, GREEN pass, TRIANGULATE additions, REFACTOR pass, and final verification output.

## Rollback Boundaries

- If state helper changes fail, revert only `src/state.ts` and related state tests.
- If event/render triangulation becomes noisy or broad, defer those tests and keep the core PR focused on `src/state.ts` + `src/state.test.ts`.
- No data migration is planned; rollback should not require persisted-state repair.
