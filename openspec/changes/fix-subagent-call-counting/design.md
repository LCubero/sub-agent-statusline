# Design: fix-subagent-call-counting

## Overview

Execution counting will move to an explicit state-boundary decision: only durable work identities are counted. Synthetic `source: "tool"` rows remain stored as status/evidence rows, but never contribute to `totalExecuted` or `countedChildIDs`. Real sessions count exactly once. `source: "subtask"` rows count only as bounded fallback work, using deterministic correlation keys so a later matching real session does not inflate totals.

The implementation should stay small and reviewable by changing counting helpers in `src/state.ts`, then updating targeted tests in `src/state.test.ts`, with light event/render assertions only where they prove integration behavior.

## Current seams

- `src/events.ts`
  - Emits real children from `session.created`/`session.updated` as `source: "session"`, with `targetSessionID: child.id`.
  - Emits synthetic subtask rows from `message.part.updated` as `source: "subtask"`, with optional `targetSessionID` resolved from explicit event evidence or existing session rows.
  - Emits delegate/task wrappers from `message.part.updated` as `source: "tool"`, with optional `targetSessionID` and terminal status evidence.
- `src/state.ts`
  - `upsertRunningChild()` currently counts only on first insert.
  - `isCountableWorkItem()` currently treats `tool` and `subtask` as countable unconditionally.
  - `countedChildIDs` is an identity set; `totalExecuted` is derived/normalized to be at least the set size.
- `src/render.ts`
  - `collapseSubagentWorkItems()` already treats `tool`/`subtask` as synthetic and may hide generic tool wrappers.
  - Rendering must not own counting semantics.

## Counting model

### Count identities

Use a count identity distinct from row identity:

- `source: "tool"`: no count identity.
- real session (`source: "session"` or `id.startsWith("ses_")`): count identity is the session ID, unless excluded by the existing technical-delegation title filter.
- `source: "subtask"` fallback:
  - if `targetSessionID` is present, count identity is `targetSessionID`;
  - otherwise count identity is the subtask row ID, but only if no deterministically matching counted session is already known.

This keeps `countedChildIDs` compatible with the existing persisted shape while preventing `tool:*` IDs from being added going forward.

### Deterministic matching

Add small state-local helpers in `src/state.ts`:

- `isRealSessionChild(child)` for `source === "session" || id.startsWith("ses_")`.
- `isSyntheticToolWrapper(child)` for `source === "tool"`.
- `isSubtaskFallback(child)` for `source === "subtask"`.
- `findMatchingCountedSessionID(state, subtask)`:
  - prefer `subtask.targetSessionID` when counted;
  - otherwise, if exactly one existing real session shares `parentID` and `messageID` and is counted, return that session ID.
- `findMatchingCountedSubtaskID(state, session)`:
  - prefer an existing counted subtask whose `targetSessionID === session.id`;
  - otherwise, if exactly one counted subtask shares `parentID` and `messageID`, return that subtask ID.

Do not use `elapsedMs`, zero-second duration, or timestamp comparisons for countability.

## State-boundary algorithm

Replace the current boolean `isCountableWorkItem()` usage with an identity resolver that has access to state and deterministic correlation fields.

Suggested shape:

```ts
type CountableInput = Pick<
  ChildSessionState,
  "id" | "title" | "parentID" | "messageID" | "source" | "targetSessionID"
>;

function resolveExecutionCountIdentity(
  state: StatuslineState,
  child: CountableInput,
): string | undefined;
```

Behavior:

1. Return `undefined` for `source: "tool"`.
2. For real sessions:
   - apply the existing technical delegation title exclusion;
   - if a matching counted subtask fallback exists, rekey that existing count from the subtask ID to the session ID without incrementing `totalExecuted`;
   - otherwise return the session ID.
3. For subtasks:
   - if a matching counted session exists, return `undefined`;
   - if `targetSessionID` exists, return `targetSessionID`;
   - otherwise return the subtask ID as fallback.
4. For unknown legacy rows, keep existing conservative behavior: count by row ID unless later narrowed by source checks. This avoids broad behavior changes outside this OpenSpec change.

Update `countChildExecution()` to use the resolved identity instead of always using `child.id`.

### Rekeying fallback counts

Add a narrow helper, e.g. `rekeyCountedExecution(state, fromID, toID)`, used only for current-work correlation:

- If `fromID === toID`, no-op.
- If `fromID` is counted and `toID` is not counted: delete `fromID`, add `toID`, keep `totalExecuted` unchanged.
- If both are counted: delete `fromID` and decrement `totalExecuted` by one, bounded to `Object.keys(countedChildIDs).length` after deletion.

This is not a historical migration. It only reconciles deterministic subtask/session identities observed during the current state update path.

### `upsertRunningChild()` changes

`upsertRunningChild()` remains the central count boundary:

1. Sanitize `targetSessionID` before counting so subtask fallback can count by target session when explicit evidence is already available.
2. Build a count input with `id`, `title`, `parentID`, `messageID`, `source`, and sanitized `targetSessionID`.
3. Count only on first insert, preserving existing update semantics.
4. If an existing child gains a stronger `targetSessionID` via an upsert, run the bounded rekey/merge helper for a counted subtask fallback.

### `upsertChildDetails()` target updates

`events.ts` can add `targetSessionID` later through `upsertChildDetails()` when task-tool evidence maps to an existing subtask. If that target changes a counted subtask fallback, `upsertChildDetails()` should invoke the same state-local reconciliation helper:

- counted `subtask:*` + new `targetSessionID` not counted => move count key to `targetSessionID`, no total change;
- counted `subtask:*` + new `targetSessionID` already counted => remove subtask key and reduce the current total by one;
- uncounted subtask + already-counted target => remain uncounted.

This addresses fallback semantics without expanding event correlation logic.

### `loadState()` behavior

Change load-time child replay so persisted/new `source: "tool"` children are not added to `countedChildIDs`. Do not add broad migration logic to remove old `tool:*` IDs already present in persisted `countedChildIDs`; historical inflated counters remain out of scope.

Practical rule:

- sanitize existing `parsed.countedChildIDs` as today;
- when replaying `children`, add only currently countable non-tool identities;
- do not scan and delete existing historical `tool:*` keys from the sanitized persisted set.

## Event and render impact

- `src/events.ts` should not need broad changes. Existing extraction already classifies wrapper rows as `source: "tool"`, real sessions as `source: "session"`, and subtasks as `source: "subtask"` with best-effort `targetSessionID`.
- Keep tool wrappers stored as children. They remain useful for status evidence, detail merging, and render collapse hints.
- `src/render.ts` should remain a display-only layer. Existing collapse/hide behavior can stay unchanged unless tests expose a direct mismatch.

## Test plan (strict TDD)

Use `pnpm test` for RED/GREEN evidence and `pnpm typecheck` before completion.

### RED tests first

`src/state.test.ts` should cover:

1. `source: "tool"` insert stores the child but leaves `totalExecuted === 0` and does not add the tool ID.
2. Updating/marking a tool wrapper done still leaves counters unchanged.
3. `source: "session"` insert counts once; repeat upsert and terminal status do not double-count.
4. Tool wrapper followed by matching session yields exactly one count for the session ID.
5. Subtask fallback without a matching counted session counts once.
6. Subtask with `targetSessionID` matching an already-counted session does not count additionally.
7. Counted subtask fallback followed by a matching session rekeys/merges to one total execution.
8. Subtask that gains `targetSessionID` via `upsertChildDetails()` rekeys or merges without inflating totals.
9. Countability does not inspect `elapsedMs` or timestamps; include a non-zero-duration tool wrapper case to prevent reintroduction of timing heuristics.

`src/events.test.ts` should add or adjust focused coverage only if needed:

- `message.part.updated` delegate/task wrapper remains `source: "tool"` and uncounted after `applySubagentEvent()`.
- `session.created` still counts as one execution.
- Existing task-tool-to-subtask mapping still updates `targetSessionID` and terminal status.

`src/render.test.ts` should add one compatibility assertion if not already implicit:

- A generic tool wrapper collapsed/hidden with a matching real session renders one visible work item while state total remains one.

## Rollout and review strategy

1. Add failing state tests for the new semantics.
2. Implement state helpers and count identity reconciliation in `src/state.ts`.
3. Adjust event/render tests only as needed to prove integration and avoid broad fixture churn.
4. Run `pnpm test`.
5. Run `pnpm typecheck`.

Expected diff should remain well below the 400-line chained-PR threshold if helper logic stays in `src/state.ts` and tests are targeted.

## Risks and limits

- If a subtask fallback has no `targetSessionID` and no unique `parentID` + `messageID` match to a real session, the state model cannot safely prove correlation. In that case it may retain separate identities rather than guessing. This is an intentional fail-closed limit to avoid timing/title heuristics.
- `countedChildIDs` remains a flat identity set. The bounded rekey approach avoids a schema migration but cannot represent rich work-item aliases. A future schema could add explicit count groups if OpenCode event correlation becomes more complex.
- Existing persisted inflated `tool:*` counters are not repaired. New tool observations are uncounted going forward.
- Decrementing `totalExecuted` should happen only during deterministic current-work identity merges, not during generic normalization/load.
