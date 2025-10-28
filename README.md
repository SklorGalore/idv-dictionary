# Command Dictionary

A sidebar tree of custom commands/snippets. Click to insert into the active editor. Supports optional grouping and live updates from Settings.

## Configure

In VS Code settings (UI or JSON), edit `commandDictionary.commands`:

```json
"commandDictionary.commands": [
  { "label": "License Header", "insertText": "/* (c) 2025 Skylar */", "group": "Headers" },
  { "label": "Log Info", "insertText": "logger.info(\"Hello\");", "description": "Logging", "group": "Logging" }
]
