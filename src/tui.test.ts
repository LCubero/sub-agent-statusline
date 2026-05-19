import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { readOpenCodeLogFileIfSmall } from "./logs.js";
import {
  focusPromptWithDeferredRetry,
  resolveSidebarReturnFocusAction,
} from "./tui-focus.js";
import { registerSubagentCommands } from "./tui-commands.js";

describe("registerSubagentCommands", () => {
  it("uses the supported keymap layer API when available", () => {
    const dispose = vi.fn();
    const registerLayer = vi.fn(() => dispose);
    const commandRegister = vi.fn();
    const toggleSection = vi.fn();
    const focusSidebarList = vi.fn();

    const result = registerSubagentCommands({
      api: {
        keymap: { registerLayer },
        command: { register: commandRegister },
      },
      sectionEnabled: () => true,
      toggleSection,
      focusSidebarList,
    });

    expect(commandRegister).not.toHaveBeenCalled();
    expect(registerLayer).toHaveBeenCalledOnce();
    expect(registerLayer).toHaveBeenCalledWith({
      commands: [
        expect.objectContaining({
          name: "subagent-statusline.toggle-sidebar-section",
          title: expect.stringContaining("Subagents"),
          run: expect.any(Function),
        }),
        expect.objectContaining({
          name: "subagent-statusline.focus-sidebar-list",
          title: "Subagents: Focus sidebar list",
          run: expect.any(Function),
        }),
      ],
      bindings: [
        {
          key: "alt+b",
          cmd: "subagent-statusline.focus-sidebar-list",
        },
      ],
    });

    const layer = registerLayer.mock.calls[0]?.[0];
    layer?.commands?.[0]?.run();
    layer?.commands?.[1]?.run();

    expect(toggleSection).toHaveBeenCalledWith(false);
    expect(focusSidebarList).toHaveBeenCalledOnce();

    result();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("falls back to the legacy command API only when keymap is unavailable", () => {
    const dispose = vi.fn();
    const register = vi.fn(() => dispose);

    const result = registerSubagentCommands({
      api: { command: { register } },
      sectionEnabled: () => false,
      toggleSection: vi.fn(),
      focusSidebarList: vi.fn(),
    });

    expect(register).toHaveBeenCalledOnce();
    result();
    expect(dispose).toHaveBeenCalledOnce();
  });
});

describe("readOpenCodeLogFileIfSmall", () => {
  it("skips oversized OpenCode logs before reading them synchronously", async () => {
    const dir = await mkdtemp(join(tmpdir(), "subagent-statusline-logs-"));
    const smallLog = join(dir, "small.log");
    const hugeLog = join(dir, "huge.log");

    await writeFile(smallLog, "small log", "utf8");
    await writeFile(hugeLog, `${"x".repeat(1024 * 1024)}x`, "utf8");

    expect(readOpenCodeLogFileIfSmall(smallLog)).toBe("small log");
    expect(readOpenCodeLogFileIfSmall(hugeLog)).toBeUndefined();
  });
});

describe("resolveSidebarReturnFocusAction", () => {
  const pendingSidebarRefocus = {
    parentSessionID: "parent",
    childSessionID: "child",
    childRowID: "row-1",
  };

  it("returns focus-prompt for remembered child -> parent return", () => {
    expect(
      resolveSidebarReturnFocusAction({
        pendingSidebarRefocus,
        previousRouteSessionID: "child",
        routeSessionID: "parent",
      }),
    ).toBe("focus-prompt");
  });

  it("returns clear-pending when route leaves remembered child path", () => {
    expect(
      resolveSidebarReturnFocusAction({
        pendingSidebarRefocus,
        previousRouteSessionID: "child",
        routeSessionID: "another",
      }),
    ).toBe("clear-pending");
  });

  it("returns none for unrelated transitions while still on child", () => {
    expect(
      resolveSidebarReturnFocusAction({
        pendingSidebarRefocus,
        previousRouteSessionID: "parent",
        routeSessionID: "child",
      }),
    ).toBe("none");
  });

  it("returns none when no pending sidebar navigation exists", () => {
    expect(
      resolveSidebarReturnFocusAction({
        previousRouteSessionID: "child",
        routeSessionID: "parent",
      }),
    ).toBe("none");
  });
});

describe("focusPromptWithDeferredRetry", () => {
  it("retries once when prompt focus is initially unavailable", () => {
    const queue: Array<() => void> = [];
    const schedule = (callback: () => void): void => {
      queue.push(callback);
    };
    let hasPromptRef = false;
    const focus = vi.fn(() => {
      if (!hasPromptRef) {
        hasPromptRef = true;
        return false;
      }
      return true;
    });

    focusPromptWithDeferredRetry(focus, schedule);
    expect(queue).toHaveLength(1);
    queue.shift()?.();
    expect(focus).toHaveBeenCalledTimes(1);
    expect(queue).toHaveLength(1);
    queue.shift()?.();
    expect(focus).toHaveBeenCalledTimes(2);
  });
});
