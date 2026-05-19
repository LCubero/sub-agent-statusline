# tui-subagent-navigation-focus Specification

## Purpose

Define focus behavior when returning from a child/subagent session to its parent via OpenCode `Up` / `session_parent` after navigation started from the plugin sidebar.

## Requirements

### Requirement: Parent Prompt Focus On Child Return

The system MUST move keyboard focus to the active parent prompt when the user returns from a child/subagent session to the parent using `Up` / `session_parent` after entering the child from the sidebar.

#### Scenario: Return via Up focuses prompt

- GIVEN the user opened a child/subagent session from the sidebar
- WHEN the user triggers `Up` / `session_parent` to return to the parent session
- THEN keyboard focus MUST be set to the active parent prompt
- AND the user MAY type immediately without an extra focus command

#### Scenario: Return path without sidebar origin does not force prompt-focus rule

- GIVEN navigation did not originate from sidebar child selection
- WHEN a route change occurs
- THEN the system MUST NOT apply this child-return prompt-focus requirement

### Requirement: Sidebar Keyboard Focus Is Cleared On Return

On the same child-to-parent return path, the system MUST clear sidebar list keyboard focus state before applying prompt focus.

#### Scenario: Sidebar list is blurred on child return

- GIVEN the sidebar list currently has focusable state for the selected child row
- WHEN the user returns to the parent through `Up` / `session_parent`
- THEN the sidebar list focus state MUST be blurred/cleared
- AND keyboard focus MUST NOT remain on the sidebar list

### Requirement: Sidebar Visual Context And Navigation Controls Remain Unchanged

The system SHALL preserve existing sidebar visual context and MUST NOT change explicit sidebar navigation controls as part of this return-focus behavior.

#### Scenario: Visual context is preserved

- GIVEN a sidebar expansion state and selected child row are visible
- WHEN the user returns to the parent via `Up` / `session_parent`
- THEN visible expansion and row context SHOULD remain available
- AND only keyboard focus target changes to the prompt

#### Scenario: Explicit sidebar focus toggle remains unaffected

- GIVEN existing explicit sidebar focus commands (including `Alt+B`)
- WHEN the user invokes those commands before or after child return
- THEN command behavior MUST remain unchanged by this feature

### Requirement: Prompt Focus Fallback When Prompt Reference Is Unavailable

If the parent prompt reference is not available at the first return-focus attempt, the system MUST use deferred retry behavior already available for prompt focus and MUST avoid trapping focus in the sidebar.

#### Scenario: Prompt ref unavailable at initial return effect

- GIVEN child-to-parent return is detected and prompt reference is temporarily unavailable
- WHEN initial prompt-focus execution cannot target the prompt element
- THEN the system MUST schedule deferred prompt focus using existing deferral behavior
- AND sidebar keyboard focus MUST remain cleared during fallback
