# Apply Progress: focus-prompt-after-subagent-return

## Mode

Standard (strict_tdd from preflight: false)

## Completed Tasks

- [x] 1.1 Extracted pure route-return decision helper (`resolveSidebarReturnFocusAction`) with action union type.
- [x] 1.2 Added helper matrix unit tests for focus-prompt / clear-pending / none paths.
- [x] 2.1 Replaced sidebar list refocus on child→parent return with `blurVisibleSidebarSubagentList()` + prompt focus.
- [x] 2.2 Preserved non-sidebar route-change behavior by clearing pending marker only when leaving remembered child route.
- [x] 2.3 Added bounded deferred prompt-focus retry (`focusPromptWithDeferredRetry`) for temporarily missing prompt refs.
- [x] 3.1 Added green assertions covering no forced prompt focus without sidebar-origin marker and action matrix coverage.
- [x] 3.2 Added deterministic deferred retry coverage (first attempt fails, second succeeds).
- [x] 3.3 Ran verification commands and captured results.
- [x] 4.1 Updated README keyboard-navigation section with child-return focus behavior.
- [x] 4.2 Updated TUI docs with the same child-return focus note.

## Verification Evidence

Commands run:

1. `pnpm approve-builds --all`
2. `CI=true pnpm test`
3. `CI=true pnpm run typecheck`
4. `CI=true pnpm run build`

Results:

- ✅ `pnpm approve-builds --all` succeeded.
- ✅ `CI=true pnpm test` passed (`6 passed`, `83 passed`).
- ✅ `CI=true pnpm run typecheck` passed.
- ✅ `CI=true pnpm run build` passed (tsup ESM + DTS outputs).

## Notes

- Initial `pnpm test` attempt failed in this environment before approval due to `ERR_PNPM_IGNORED_BUILDS`; resolved by approving pending build scripts.
- Route-return behavior now changes only keyboard focus target; sidebar visual state and Alt+B command behavior remain intact.
