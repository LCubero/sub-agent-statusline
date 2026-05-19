## Verification Report

**Change**: focus-prompt-after-subagent-return
**Version**: N/A
**Mode**: Standard

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 9 |
| Tasks complete | 8 verified / 9 claimed |
| Tasks incomplete | 1 verification gap: task 3.1 claims ordering coverage that is not present as an automated test |

### Build & Tests Execution
**Build**: ✅ Passed
```text
CI=true pnpm run build
tsup built ESM and DTS outputs for src/index.ts and src/tui.tsx successfully.
```

**Tests**: ✅ 83 passed
```text
CI=true pnpm test
Test Files  6 passed (6)
Tests       83 passed (83)

Note: first verification attempt failed on pnpm ignored-builds approval state. Running pnpm approve-builds --all reported no pending approvals; rerunning tests then passed, and a final post-cleanup test run also passed.
```

**Typecheck**: ✅ Passed
```text
CI=true pnpm run typecheck
tsc --noEmit -p tsconfig.json completed successfully.
```

**Coverage**: ➖ Not available / no coverage threshold configured

### Spec Compliance Matrix
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Parent Prompt Focus On Child Return | Return via Up focuses prompt | `src/tui.test.ts > resolveSidebarReturnFocusAction > returns focus-prompt for remembered child -> parent return`; static route effect evidence in `src/tui.tsx:2095-2103` | ⚠️ PARTIAL |
| Parent Prompt Focus On Child Return | Return path without sidebar origin does not force prompt-focus rule | `src/tui.test.ts > resolveSidebarReturnFocusAction > returns none when no pending sidebar navigation exists` | ✅ COMPLIANT |
| Sidebar Keyboard Focus Is Cleared On Return | Sidebar list is blurred on child return | Static evidence only: `src/tui.tsx:2101-2103` calls `blurVisibleSidebarSubagentList()` before `focusActivePrompt()` | ❌ UNTESTED |
| Sidebar Visual Context And Navigation Controls Remain Unchanged | Visual context is preserved | Static evidence only: return branch clears pending marker and blurs list; it does not clear expansion, selected row, scroll state, or KV preferences | ❌ UNTESTED |
| Sidebar Visual Context And Navigation Controls Remain Unchanged | Explicit sidebar focus toggle remains unaffected | Existing command registration test covers `Alt+B` binding and focus callback; no child-return regression test | ⚠️ PARTIAL |
| Prompt Focus Fallback When Prompt Reference Is Unavailable | Prompt ref unavailable at initial return effect | `src/tui.test.ts > focusPromptWithDeferredRetry > retries once when prompt focus is initially unavailable` | ✅ COMPLIANT |

**Compliance summary**: 2/6 scenarios fully compliant; 2/6 partial; 2/6 untested.

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Parent prompt focus on child return | ✅ Implemented | `resolveSidebarReturnFocusAction()` returns `focus-prompt` for remembered child→parent route transitions; route effect clears marker, blurs sidebar list, and focuses prompt. |
| No forced prompt focus without sidebar origin | ✅ Implemented | Missing pending marker returns `none`; unrelated route transitions only clear pending when leaving remembered child path. |
| Sidebar keyboard focus cleared | ✅ Implemented, ❌ insufficiently tested | `blurVisibleSidebarSubagentList()` clears list focus mode before prompt focus, but no automated test asserts side-effect ordering. |
| Visual context preserved | ✅ Implemented, ❌ insufficiently tested | No selected row, expansion, scroll, or KV reset is present in the return-focus branch. |
| Deferred prompt focus fallback | ✅ Implemented | `focusPromptWithDeferredRetry()` schedules one deferred attempt and one bounded retry. |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Return focus target: blur sidebar list then focus active prompt | ✅ Yes | Implemented in `src/tui.tsx:2100-2103`. |
| Detection seam: small pure helper | ✅ Yes | Implemented in `src/tui-focus.ts` and tested in `src/tui.test.ts`. |
| Deferred prompt focus: existing deferral plus bounded retry | ✅ Yes | Implemented in `focusPromptWithDeferredRetry()`. |
| Visual sidebar context unchanged | ✅ Yes by static inspection | Return branch does not reset visual state. |

### Issues Found
**CRITICAL**:
- `UNTESTED`: the spec scenario “Sidebar list is blurred on child return” has no passing automated test that applies the route-return action and asserts `blurVisibleSidebarSubagentList()` happens before prompt focus. Static code is correct, but SDD verification requires runtime covering evidence.
- `UNTESTED`: the spec scenario “Visual context is preserved” has no passing automated test proving expansion/selected row/scroll/KV visual context remains unchanged after the child-return path.

**WARNING**:
- Task 3.1 is marked complete in OpenSpec, but the current tests do not directly assert the blur-before-prompt-focus side-effect order; only the decision helper and retry seam are tested.
- Engram artifacts are inconsistent with OpenSpec artifacts: the Engram `tasks` artifact still shows unchecked tasks, and the Engram `apply-progress` topic contains an implementation memory summary rather than the full apply-progress markdown. Verification used OpenSpec as source of truth for current task state.
- `Alt+B` unchanged behavior is only partially covered by the existing command-registration test; there is no regression test around the child-return sequence before/after explicit sidebar focus toggling.

**SUGGESTION**:
- Add a small unit seam for applying `SidebarReturnFocusAction` so tests can assert call order: clear pending → blur sidebar list → focus prompt, without importing the OpenTUI runtime.
- Add a state-preservation test for the return branch if a pure seam is introduced, or document this as manual-smoke-only if the project intentionally avoids deeper TUI automation.

### Verdict
FAIL
Implementation and commands pass, but the SDD verification gate fails because two spec scenarios lack passing covering tests.
