export type TuiCommandDispose = () => void;

type LegacyCommand = {
  title: string;
  value: string;
  description?: string;
  category?: string;
  keybind?: string;
  onSelect?: () => void;
};

type LegacyCommandApi = {
  register?: (commands: () => LegacyCommand[]) => TuiCommandDispose;
};

type KeymapCommand = {
  name: string;
  title: string;
  description?: string;
  category?: string;
  run: () => void;
};

type KeymapBinding = {
  key: string;
  cmd: string;
};

type KeymapLayer = {
  commands: KeymapCommand[];
  bindings: KeymapBinding[];
};

type KeymapApi = {
  registerLayer?: (layer: KeymapLayer) => TuiCommandDispose;
};

type CommandApiShape = {
  keymap?: KeymapApi;
  command?: LegacyCommandApi;
};

type RegisterSubagentCommandsInput = {
  api: CommandApiShape;
  sectionEnabled: () => boolean;
  toggleSection: (enabled: boolean) => void;
  focusSidebarList: () => void;
};

const TOGGLE_SECTION_COMMAND = "subagent-statusline.toggle-sidebar-section";
const FOCUS_SIDEBAR_LIST_COMMAND = "subagent-statusline.focus-sidebar-list";

export function registerSubagentCommands({
  api,
  sectionEnabled,
  toggleSection,
  focusSidebarList,
}: RegisterSubagentCommandsInput): TuiCommandDispose {
  if (api.keymap?.registerLayer) {
    return api.keymap.registerLayer({
      commands: [
        {
          name: TOGGLE_SECTION_COMMAND,
          title: "Subagents: Toggle sidebar section",
          description: "Toggle the entire subagent sidebar section",
          category: "Subagents",
          run: () => toggleSection(!sectionEnabled()),
        },
        {
          name: FOCUS_SIDEBAR_LIST_COMMAND,
          title: "Subagents: Focus sidebar list",
          description: "Focus the subagent sidebar list for keyboard navigation",
          category: "Subagents",
          run: focusSidebarList,
        },
      ],
      bindings: [
        {
          key: "alt+b",
          cmd: FOCUS_SIDEBAR_LIST_COMMAND,
        },
      ],
    });
  }

  return api.command?.register?.(() => [
    {
      title: sectionEnabled()
        ? "Subagents: Disable sidebar section"
        : "Subagents: Enable sidebar section",
      value: TOGGLE_SECTION_COMMAND,
      description: "Toggle the entire subagent sidebar section",
      category: "Subagents",
      onSelect: () => toggleSection(!sectionEnabled()),
    },
    {
      title: "Subagents: Focus sidebar list",
      value: FOCUS_SIDEBAR_LIST_COMMAND,
      description: "Focus the subagent sidebar list for keyboard navigation",
      category: "Subagents",
      keybind: "alt+b",
      onSelect: focusSidebarList,
    },
  ]) ?? (() => undefined);
}
