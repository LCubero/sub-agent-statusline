# Change Proposal: fix-subagent-call-counting

## Intent

Separate synthetic subagent invocation placeholders from real subagent executions so execution counters represent actual subagent work, not wrapper/tool-call artifacts.

Users currently see counters inflated because each delegated subagent can create both:

- a synthetic tool-call wrapper from `message.part.updated` (`source: "tool"`, `id: "tool:<partID>"`), and
- the real child session from `session.created` (`source: "session"`, `id: "ses_*"`, with `parentID`).

The UI later hides or collapses generic tool wrappers, but the state counter has already counted them. This makes the visible list and `totalExecuted` disagree.

## Problem Statement

`src/state.ts` currently treats `source: "tool"` and `source: "subtask"` as countable work items unconditionally in `isCountableWorkItem()`. `upsertRunningChild()` calls the counter when a new child is inserted, so synthetic wrapper rows increment `totalExecuted` as soon as they appear.

`src/render.ts` later collapses or hides generic tool wrappers, which removes the wrapper from the visible work list but does not undo the count. As a result, users observe zero-second wrapper entries disappearing while counters remain inflated.

## Evidence

- `src/events.ts` extracts tool wrappers from `message.part.updated` when `part.type === "tool"` and the tool is `"delegate"` or `"task"`, producing IDs like `tool:<partID>` with `source: "tool"`.
- Real child sessions are represented by `session.created` events with `source: "session"`, `ses_*` IDs, and `parentID`.
- Subtask rows use `source: "subtask"` and IDs like `subtask:<partID>`.
- `src/state.ts` `isCountableWorkItem()` currently counts `source === "tool"` and `source === "subtask"` unconditionally.
- `src/state.ts` `upsertRunningChild()` invokes counting on new child insertion.
- `src/render.ts` collapses/hides generic tool wrappers after state counting has already happened.
- `src/state.test.ts` currently asserts that inserting a `source: "tool"` child increments `totalExecuted` to `1`; this test must be intentionally updated to the new behavior.

## Scope

### In scope

- Update counting semantics so generic tool-call placeholders are not counted as executed subagents.
- Preserve counting for real child sessions (`source: "session"` / `ses_*`) that represent actual subagent execution.
- Decide and codify how `source: "subtask"` participates in execution counting based on whether it represents actual work versus a synthetic placeholder.
- Update unit tests for state counting behavior, including the existing `source: "tool"` assertion.
- Keep visible list behavior and counter behavior aligned: hidden/collapsed wrapper artifacts must not inflate execution totals.

### Out of scope

- Redesigning the renderer collapse algorithm.
- Changing OpenCode event payload formats.
- Using elapsed-time, zero-second, or timing-based heuristics to infer whether an item is countable.
- Reworking token/context accounting unless directly required by the counting fix.
- Broad TUI/e2e automation beyond targeted tests for event/state/render seams.

## Affected Areas

- `src/state.ts`
  - `isCountableWorkItem()` countability rules.
  - `upsertRunningChild()` behavior for first insertions.
  - Counter normalization interactions with `countedChildIDs` and `totalExecuted`.
- `src/events.ts`
  - Event-source classification may be referenced by tests to ensure tool wrappers remain explicitly marked as `source: "tool"`.
- `src/render.ts`
  - Existing collapse behavior is evidence and should remain compatible with the new count semantics.
- `src/state.test.ts`
  - Existing test that counts `source: "tool"` must change.
  - Add/adjust tests proving real sessions count and synthetic placeholders do not.
- Potential event/render tests if existing coverage needs to prove end-to-end classification.

## Expected Behavior

- A synthetic `source: "tool"` wrapper from delegate/task tool-call events does not increment `totalExecuted` merely by being inserted.
- A real child session (`source: "session"` or `ses_*`) increments `totalExecuted` exactly once when first observed, unless excluded by existing technical-delegation filtering.
- Counters remain stable when synthetic wrappers are later collapsed or hidden by render logic.
- Behavior is based on explicit source/type discrimination, not elapsed-time or zero-second heuristics.

## Risks

- Some existing tests or consumers may have assumed all `source: "tool"` entries are countable; those expectations must be migrated deliberately.
- `source: "subtask"` may represent either synthetic work metadata or a meaningful fallback when no real child session is emitted. The spec/design phase must clarify this without reintroducing wrapper double-counting.
- Existing persisted state may already contain inflated `countedChildIDs`; this proposal does not automatically rewrite historical counters unless later phases explicitly include migration/normalization.
- Over-filtering could undercount environments where only synthetic events are available and no real `session.created` child arrives.

## Rollback Plan

- Revert the countability rule change and associated test updates.
- Restore prior behavior where `source: "tool"` and `source: "subtask"` insertions are counted immediately.
- No destructive data migration is proposed, so rollback should be limited to code/tests unless later phases add state repair behavior.

## Success Criteria

- Unit tests demonstrate that `source: "tool"` delegate/task wrappers do not increment `totalExecuted`.
- Unit tests demonstrate that real child sessions still increment `totalExecuted` exactly once.
- Tests cover or explicitly decide `source: "subtask"` semantics.
- Existing visible collapse behavior remains compatible: hidden generic wrappers do not leave inflated counters behind.
- Strict TDD evidence is recorded during implementation using `pnpm test`; verification also runs `pnpm typecheck` and `pnpm build` unless scope is narrowed later.
- No timing/zero-second heuristics define the behavior.
- Pre-existing dirty files (`.gitignore`, `context.md`) are not modified by this change.
