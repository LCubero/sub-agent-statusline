# subagent-execution-counting Specification Delta

## ADDED Requirements

### Requirement: Synthetic tool-call placeholders MUST NOT increment execution counters

Synthetic delegate/task tool-call rows identified with `source: "tool"` MUST be treated as wrapper/status evidence, not as executed subagents. Inserting, updating, completing, hiding, or collapsing a `source: "tool"` child row MUST NOT increment `totalExecuted` and MUST NOT add the tool row ID, including IDs such as `tool:<partID>`, to `countedChildIDs`.

#### Scenario: Delegate tool wrapper is inserted without counting

Given an empty statusline state
When a running child is inserted with `source: "tool"` and an ID beginning with `tool:`
Then `totalExecuted` remains `0`
And `countedChildIDs` does not contain the tool child ID
And the child row may still be stored for status evidence.

#### Scenario: Task tool wrapper completes without counting

Given a statusline state containing an uncounted `source: "tool"` task wrapper
When that wrapper is updated or marked done
Then `totalExecuted` remains unchanged
And `countedChildIDs` still does not contain the wrapper ID.

#### Scenario: Tool-wrapper behavior does not use timing heuristics

Given a `source: "tool"` wrapper with any elapsed duration, including zero seconds or non-zero duration
When countability is evaluated
Then the wrapper is not counted because of its explicit `source: "tool"` classification
And the system MUST NOT use zero-second, elapsed-time, or other timing heuristics to decide whether the wrapper is countable.

### Requirement: Real child sessions MUST count exactly once

Real child sessions identified with `source: "session"` or canonical session IDs beginning with `ses_` MUST increment `totalExecuted` exactly once when first observed, unless excluded by existing technical-delegation filtering. Subsequent updates, terminal status changes, or matching synthetic wrapper rows MUST NOT increment the same real session again.

#### Scenario: Real child session increments once on first observation

Given an empty statusline state
When a running child is inserted with `source: "session"` and ID `ses_child`
Then `totalExecuted` becomes `1`
And `countedChildIDs` contains `ses_child`.

#### Scenario: Real child session updates do not double count

Given a statusline state where `ses_child` has already been counted
When the same `source: "session"` child is updated or marked done
Then `totalExecuted` remains `1`
And `countedChildIDs` contains `ses_child` exactly once.

#### Scenario: Wrapper and matching real session produce one counted execution

Given an empty statusline state
When a `source: "tool"` wrapper for delegated work is inserted
And a matching `source: "session"` child with ID `ses_child` is later inserted
Then `totalExecuted` becomes `1`
And `countedChildIDs` contains `ses_child`
And `countedChildIDs` does not contain the tool wrapper ID.

### Requirement: Subtask rows MUST be counted only as fallback actual work

Rows identified with `source: "subtask"` MUST represent countable fallback work only when no matching real child session has already been counted. A `source: "subtask"` row MUST NOT cause double-counting when it matches an already-counted real session. If a matching real session appears after a subtask fallback was counted, the user-visible execution total MUST remain one execution for that work item.

Matching MUST use explicit correlation evidence available on the rows, such as `targetSessionID`, shared parent/message identifiers, or other deterministic non-timing metadata. Implementations MUST NOT rely on elapsed duration or zero-second heuristics for subtask countability.

#### Scenario: Subtask fallback counts when no real session exists

Given an empty statusline state
When a `source: "subtask"` row representing actual delegated work is inserted and no matching `source: "session"` row has been counted
Then `totalExecuted` becomes `1`
And the state records that the subtask work has contributed one execution.

#### Scenario: Subtask matching an already-counted session does not count

Given a statusline state where matching real session `ses_child` has already been counted
When a `source: "subtask"` row is inserted with `targetSessionID: "ses_child"` or equivalent deterministic correlation to `ses_child`
Then `totalExecuted` remains `1`
And the subtask row ID is not counted as an additional execution.

#### Scenario: Real session appearing after counted subtask does not inflate the total

Given a statusline state where a `source: "subtask"` fallback row has already contributed one execution for work item `W`
When a matching real `source: "session"` child for work item `W` is later observed
Then the user-visible `totalExecuted` remains one execution for `W`
And the system MUST preserve an internally consistent counted identity for future updates without displaying two executed subagents.

### Requirement: Visible work list and counters MUST stay semantically aligned

The renderer MAY continue to display, merge, hide, or collapse wrapper rows for status evidence and compactness. Such visible-list behavior MUST NOT change execution counters, and wrapper rows that are hidden or collapsed MUST NOT leave inflated `totalExecuted` values behind.

#### Scenario: Collapsed generic tool wrapper does not leave inflated counter

Given a visible work list containing a generic `source: "tool"` wrapper such as `delegate` or `task`
And a matching real child session exists
When the renderer collapses or hides the generic wrapper
Then the visible list represents one delegated work item
And `totalExecuted` represents one executed subagent.

#### Scenario: Wrapper-only evidence remains displayable but uncounted

Given a `source: "tool"` wrapper has been observed but no real child session is available yet
When the statusline renders current work evidence
Then the wrapper MAY be shown, merged, or hidden according to existing display rules
And `totalExecuted` remains unchanged because no real or fallback-countable work item has been counted.

### Requirement: Historical inflated counter repair MUST remain out of scope

The change MUST NOT require broad migration or repair of existing persisted counters that already contain historical `tool:*` IDs from older versions. Loading persisted state MAY continue to sanitize structural validity of `countedChildIDs` and `totalExecuted`, but it MUST NOT be required to infer and rewrite old inflated execution history as part of this change.

#### Scenario: Persisted historical tool IDs are not a required migration target

Given a persisted state file created by an older version with `countedChildIDs` containing `tool:<partID>` entries
When the state is loaded after this change
Then implementation is not required to remove those historical IDs or decrement historical totals
And new `source: "tool"` wrapper observations MUST still be uncounted going forward.

## Test Expectations

RED tests for this change SHOULD be added before implementation using `pnpm test` and SHOULD cover at least:

- `source: "tool"` insertion/update/terminal transitions do not increment counters.
- `source: "session"` insertion counts exactly once and updates do not double-count.
- tool wrapper followed by matching real session yields one counted execution.
- `source: "subtask"` fallback semantics: counts only when no matching real session has been counted and does not double-count when a matching session exists or later appears.
- render collapse/hide behavior remains compatible with counter totals.
