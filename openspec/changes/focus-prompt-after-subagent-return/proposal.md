# Proposal: Focus Prompt After Subagent Return

## Intent

When a user opens a child/subagent session from the sidebar and returns to the parent with OpenCode's `Up` / `session_parent`, keyboard focus currently lands back in the subagent/sidebar TUI. Change this so the parent prompt receives focus immediately, letting the user continue typing without manually escaping the sidebar.

## Scope

### In Scope
- Change child-to-parent route-return focus from sidebar list to active prompt.
- Preserve sidebar visual context: expansion state and selected child row may remain visible.
- Add focused automated coverage for the route-return focus decision/focus calls.
- Update user-facing docs if they describe the return-focus behavior.

### Out of Scope
- New user preference or plugin option for return-focus behavior.
- Global interception of OpenCode keybinds or `session_parent` outside this plugin seam.
- Broader sidebar navigation, rendering, or statusline behavior changes.

## Capabilities

### New Capabilities
- `tui-subagent-navigation-focus`: TUI focus behavior when navigating between parent and child/subagent sessions from the plugin sidebar.

### Modified Capabilities
- None; no existing `openspec/specs/` capabilities are present.

## Expected User-Visible Behavior

- After selecting/clicking a child subagent session from the sidebar, `Up` / `session_parent` returns to the parent session with focus in the prompt.
- The user can type in the parent prompt immediately after return.
- The sidebar remains available and may keep visual row context, but it MUST NOT retain keyboard focus after this return path.
- Existing explicit sidebar focus toggles, including `Alt+B` behavior, remain unchanged.

## Approach

Use the existing focus-management seam in `src/tui.tsx`: keep `pendingSidebarRefocus` detection, clear it on child-to-parent route return, blur any visible sidebar list focus, then call the existing deferred `focusActivePrompt()` instead of `focusVisibleSidebarSubagentList(childRowID)`. Extract a small helper or internal seam if needed for Vitest coverage.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/tui.tsx` | Modified | Route-return focus branch changes from sidebar list focus to prompt focus. |
| `src/tui.test.ts` | Modified | Add focused coverage for return-focus behavior or helper seam. |
| `docs/en/07-tui-interface.md`, `README.md` | Modified | Update only if current docs promise sidebar focus on return. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Prompt ref not mounted when route effect runs | Medium | Preserve deferred focus; add a second deferral only if smoke testing proves necessary. |
| Sidebar list focus mode remains stale | Medium | Explicitly blur visible sidebar list before focusing prompt. |
| Users relying on old return-to-list focus | Low | Document changed behavior; keep explicit sidebar focus command unchanged. |

## Rollback Plan

Revert the route-return branch in `src/tui.tsx` to call `focusVisibleSidebarSubagentList(childRowID)` and revert matching tests/docs.

## Dependencies

- Existing prompt ref capture via `composePromptRef()` and `focusActivePrompt()`.
- Existing sidebar list focus registration/blur APIs.

## Success Criteria

- [ ] Returning from child to parent via `Up` / `session_parent` focuses the active prompt.
- [ ] Sidebar list keyboard focus is cleared on that return path.
- [ ] Sidebar expansion/visual context is not unnecessarily reset.
- [ ] Automated tests cover the route-return focus decision or extracted seam.
- [ ] Manual OpenCode smoke test confirms `child -> Up/session_parent -> type` works without extra focus keys.
