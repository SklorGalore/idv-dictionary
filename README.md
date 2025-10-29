# Command Dictionary

Command Dictionary adds a dockable sidebar that lists reusable snippets/commands you can insert into the active editor with a single click. The view stays in sync with your settings so teams can share a curated library.

## Features

- Tree view rendered in the VS Code activity bar with optional multi-level grouping.
- Click to insert one or more commands into the current editor selection.
- Auto-refresh when `commandDictionary.commands` changes; manual refresh command included.
- Bundled defaults shipped in `resources/defaultCommands.json` so the view is never empty on first install.

## Getting Started

1. Install the extension and open the **Command Dictionary** view from the activity bar.
2. Configure snippets under `commandDictionary.commands` (settings UI or `settings.json`).
3. Click an item to insert its `insertText` into the active editor. Multiple selections are supported.

## Configuration

Each entry under `commandDictionary.commands` is an object with:

- `label` *(required)* – text shown in the tree.
- `insertText` *(required)* – snippet text inserted into the editor.
- `description` *(optional)* – smaller subtitle/tooltip.
- `group` *(optional)* – category path. Use `/` to create subgroups, e.g. `"group": "BAT/Transformers/Tap Changes"`.

Example:

```jsonc
{
  "commandDictionary.commands": [
    {
      "label": "License Header",
      "insertText": "/* (c) 2025 Skylar */",
      "group": "Headers"
    },
    {
      "label": "Switch Device On",
      "insertText": "SWITCH_ON,DEVICE_ID;",
      "description": "Toggles a monitored device",
      "group": "Control/Switching"
    },
    {
      "label": "Scratch Pad",
      "insertText": "// jot notes here"
    }
  ]
}
```

Items without a `group` appear under an **Ungrouped** section when any grouped commands exist. If you prefer a flat list, leave `group` blank for every entry.

### Bundled Defaults

The extension falls back to the JSON bundle at `resources/defaultCommands.json` when no user configuration is set. You can fork the extension and edit this file to ship a custom starter library.

## Commands

- `commandDictionary.insert` – Inserts the selected command’s `insertText` into the active editor. Triggered automatically when clicking an item.
- `commandDictionary.refresh` – Forces the tree to reload. The view also refreshes automatically when `commandDictionary.commands` changes.