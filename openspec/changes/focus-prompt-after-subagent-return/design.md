# Design: Focus Prompt After Subagent Return

## Technical Approach

Keep the current sidebar-origin navigation marker in `src/tui.tsx`, but change the child→parent route-return action from “restore sidebar list keyboard focus” to “clear sidebar list keyboard focus, then focus the active prompt.” This satisfies `tui-subagent-navigation-focus` without adding preferences, global keybind interception, or broader sidebar behavior changes.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Return focus target | On detected sidebar-origin child→parent return, call `blurVisibleSidebarSubagentList()` and `focusActivePrompt()` instead of `focusVisibleSidebarSubagentList(childRowID)`. | Keep old list refocus; add configurable behavior. | The spec requires prompt focus and no new preference. Blurring first prevents stale `listFocusModeActive` from trapping keyboard input. |
| Detection seam | Preserve `pendingSidebarRefocus` shape and route transition checks, but extract a tiny pure decision helper for tests. | Test the Solid route effect directly. | Current test strategy avoids deep TUI automation; a pure helper gives deterministic coverage while keeping implementation localized. |
| Deferred prompt focus | Upgrade `focusActivePrompt()` to schedule the existing `setTimeout(..., 0)` attempt and, only if no prompt ref exists at that deferred attempt, schedule one short retry. | Add repeated polling; focus synchronously. | Route/prompt mount timing is the known risk. One bounded retry handles transient unmounts without creating focus loops. |
| Visual sidebar context | Do not clear selected row, expansion state, scroll state, or persisted KV preferences on return. | Reset sidebar state when leaving child. | Requirement changes keyboard focus only; visual context must remain available. |

## Data Flow

```txt
Sidebar row Enter/click
  └─ rememberSidebarChildNavigation(parent, child, row)
      └─ api.route.navigate("session", child)
          └─ OpenCode Up/session_parent changes route child → parent
              └─ route effect detects pending return
                  ├─ clear pending marker
                  ├─ blurVisibleSidebarSubagentList()
                  └─ focusActivePrompt() deferred/retry
```

Non-sidebar route changes keep existing behavior: if the route is not the remembered child→parent transition, the pending marker is cleared only when navigation leaves the remembered child path.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/tui.tsx` | Modify | Replace route-return sidebar refocus with sidebar blur + prompt focus. Add a small exported pure helper for pending navigation decision and a bounded prompt-focus retry. |
| `src/tui.test.ts` | Modify | Add Vitest coverage for helper decisions: child→parent returns `focus-prompt`, unrelated routes do nothing or clear pending, and no sidebar-origin marker does not force prompt focus. |
| `README.md` | Modify if needed | Add/adjust one sentence under keyboard navigation only if implementation documents child return behavior there. |
| `docs/en/07-tui-interface.md` | Modify if needed | Document that after opening a child from the sidebar, returning with `Up` / `session_parent` lands focus in the prompt. |

## Interfaces / Contracts

No public package API changes. The internal test seam can use a narrow type such as:

```ts
type SidebarReturnFocusAction = "none" | "clear-pending" | "focus-prompt";
```

`Alt+B`, `Esc`, command registration, sidebar expansion KV keys, and row navigation contracts remain unchanged.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Pending route-return decision matrix. | Add focused Vitest tests in `src/tui.test.ts` against the extracted pure helper. |
| Unit | Deferred focus fallback. | Use fake timers with a mock prompt ref if helper extraction keeps this deterministic; otherwise cover through manual smoke only. |
| Integration | Full OpenCode/OpenTUI route focus. | Not automated; current project docs defer deep TUI automation. |
| Manual smoke | `Enter/click child → Up/session_parent → type in parent prompt`, plus `Alt+B` still toggles list focus. | Run inside OpenCode after apply. |

## Migration / Rollout

No migration required. Roll out as a normal patch/minor behavior fix. Rollback is to restore the route-return branch to `focusVisibleSidebarSubagentList(childRowID)` and revert matching tests/docs.

## Open Questions

None.
