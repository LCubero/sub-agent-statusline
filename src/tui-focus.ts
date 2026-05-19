export type SidebarReturnFocusAction = "none" | "clear-pending" | "focus-prompt";

export function resolveSidebarReturnFocusAction(input: {
  pendingSidebarRefocus?: {
    parentSessionID: string;
    childSessionID: string;
    childRowID: string;
  };
  previousRouteSessionID?: string;
  routeSessionID?: string;
}): SidebarReturnFocusAction {
  const { pendingSidebarRefocus, previousRouteSessionID, routeSessionID } = input;
  if (!pendingSidebarRefocus || previousRouteSessionID === routeSessionID) {
    return "none";
  }

  if (
    previousRouteSessionID === pendingSidebarRefocus.childSessionID &&
    routeSessionID === pendingSidebarRefocus.parentSessionID
  ) {
    return "focus-prompt";
  }

  if (routeSessionID !== pendingSidebarRefocus.childSessionID) {
    return "clear-pending";
  }

  return "none";
}

export function focusPromptWithDeferredRetry(
  tryFocusPrompt: () => boolean,
  schedule: (callback: () => void) => void = (callback) => {
    setTimeout(callback, 0);
  },
): void {
  schedule(() => {
    if (tryFocusPrompt()) return;
    schedule(() => {
      void tryFocusPrompt();
    });
  });
}
