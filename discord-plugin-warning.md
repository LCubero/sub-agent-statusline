🚨 Aviso sobre `opencode-subagent-statusline`

Ahora mismo el plugin no está funcionando correctamente cuando se instala como dependencia desde `tui.json`, por ejemplo:

```json
{
  "plugin": ["opencode-subagent-statusline"]
}
```

⚠️ El problema parece venir del lado de OpenCode/OpenTUI al resolver dependencias TUI instaladas en el cache de OpenCode. En los logs aparece un error intentando cargar `@opentui/core/types.js`, pero la dependencia instalada expone `types.d.ts`, no `types.js`.

🛠️ Por ahora, la alternativa es clonar el repo, buildearlo localmente y apuntar `tui.json` directamente al archivo `dist/tui.js`.

⏳ Si no querés usarlo localmente, lo mejor es esperar una actualización de OpenCode que corrija este problema de carga de plugins TUI desde dependencias.
