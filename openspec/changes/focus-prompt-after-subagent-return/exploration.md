## Exploration: focus-prompt-after-subagent-return

### Current State
The TUI plugin wraps both `home_prompt` and `session_prompt` slots and captures the latest prompt ref via `composePromptRef()`. `focusActivePrompt()` already defers `activePromptRef?.focus()` with `setTimeout(..., 0)`, and the sidebar list uses it when leaving list focus through `Alt+B` or `Esc`.

When a user opens a child session from the sidebar, `SidebarSubagents` calls `onNavigateToChild()` before `api.route.navigate("session", { sessionID })`. `initializeTui()` stores that as `pendingSidebarRefocus`. On a later route change from the remembered child session back to the remembered parent session, the route effect currently refocuses the sidebar list with `focusVisibleSidebarSubagentList(childRowID)`. That preserves list context, but it leaves keyboard focus in the subagent/sidebar TUI after OpenCode's `Up` / `session_parent` navigation returns to the parent.

OpenCode supports user TUI keybind configuration in `tui.json`, but there is no documented public plugin API found here to globally force route focus beyond available TUI prompt refs and renderable focus/blur calls. This change can therefore stay within the plugin's existing focus-management seam.

### Affected Areas
- `src/tui.tsx` — contains prompt ref capture, sidebar list focus registrations, pending child navigation tracking, and the route-refocus effect that currently returns focus to the sidebar list.
- `src/tui.test.ts` — existing TUI tests cover command registration only; focused coverage for route-return focus would need a new small seam or helper extraction because `initializeTui()` and `focusActivePrompt()` are not exported.
- `docs/en/07-tui-interface.md` and `README.md` — document current list focus behavior and may need a brief update if the proposal includes user-visible navigation semantics.

### Approaches
1. **Replace route-return sidebar refocus with prompt focus** — Keep `pendingSidebarRefocus` detection, but on child -> parent route change blur any focused sidebar list and call `focusActivePrompt()` instead of `focusVisibleSidebarSubagentList(childRowID)`.
   - Pros: Minimal change; uses the existing prompt-ref seam; preserves existing child navigation tracking and pending-clear logic; matches the requested behavior directly.
   - Cons: The selected child row context remains visual state only, not keyboard focus; route-return focus relies on the active prompt ref being mounted when the deferred focus fires.
   - Effort: Low

2. **Add configurable return focus behavior** — Introduce a plugin option or persisted preference for `prompt` vs `sidebar` after child -> parent navigation.
   - Pros: Preserves old behavior for users who prefer keyboard list workflows.
   - Cons: More surface area and documentation for a narrow behavior; plugin option shape may need OpenCode TUI plugin API confirmation; unnecessary unless backward compatibility is a real requirement.
   - Effort: Medium

3. **Rely on OpenCode keybind/navigation configuration** — Document a `tui.json` keybind workaround or attempt to intercept `session_parent` globally.
   - Pros: Avoids plugin code if OpenCode exposes the right behavior externally.
   - Cons: No documented public plugin API was identified to force global navigation focus; keybinds do not solve focus after route transition inside the plugin sidebar.
   - Effort: Medium/High and uncertain

### Recommendation
Use approach 1. Update the existing child -> parent route-return branch in `src/tui.tsx` so it clears pending navigation, blurs any sidebar list focus, and focuses the active prompt. Keep the sidebar section expanded and the selected child row state intact where possible; the change should alter keyboard focus, not erase sidebar context.

For testability, the proposal/design phase should consider extracting the route-return decision into a small pure/helper function or adding a narrow exported internal seam, then add focused Vitest coverage before changing behavior. Manual smoke testing in OpenCode remains important because full OpenTUI focus behavior is not deeply automated in this repository.

### Risks
- Prompt ref timing: after route navigation, `activePromptRef` may briefly point to the previous prompt or be undefined; the existing `setTimeout` deferral likely helps, but implementation should keep it and consider a second deferred attempt only if manual testing proves necessary.
- Sidebar focus state: calling prompt focus without blurring the sidebar could leave `listFocusModeActive` stale, so the implementation should explicitly blur the sidebar list before focusing the prompt.
- Behavior change: users who expected `Up` to restore keyboard focus to the subagent list will now land in the prompt; this appears aligned with the requested behavior but should be noted in release/docs.
- Test coverage: current tests do not exercise route effects or prompt refs, so implementation should not rely only on manual verification.

### Ready for Proposal
Yes — propose a small TUI focus behavior change scoped to `src/tui.tsx`, with tests around the route-return decision/focus calls and a manual OpenCode smoke test for `Enter/click child -> Up/session_parent -> prompt receives focus`.
