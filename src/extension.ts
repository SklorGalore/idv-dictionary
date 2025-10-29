import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

type CommandConfig = {
  label: string;
  insertText: string;
  description?: string;
  group?: string;
};

class CommandNode extends vscode.TreeItem {
  constructor(
    public readonly cmd: CommandConfig
  ) {
    super(cmd.label, vscode.TreeItemCollapsibleState.None);
    this.description = cmd.description;
    this.tooltip = cmd.description;
    this.command = {
      command: 'commandDictionary.insert',
      title: 'Insert Command',
      arguments: [cmd.insertText]
    };
    this.contextValue = 'commandItem';
    this.iconPath = new vscode.ThemeIcon('symbol-variable');
  }
}

class GroupNode extends vscode.TreeItem {
  constructor(
    public readonly labelText: string,
    public readonly segments: string[],
    public readonly isUngrouped = false
  ) {
    super(labelText, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon('list-unordered');
    this.id = isUngrouped ? '__commandDictionaryUngrouped__' : segments.join('/') || labelText;
  }
}

const UNGROUPED_LABEL = 'Ungrouped';

type CommandGroupTree = {
  label: string;
  segments: string[];
  subgroups: Map<string, CommandGroupTree>;
  commands: CommandConfig[];
};

class CommandTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  constructor(private readonly defaultCommands: CommandConfig[]) {}

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
    const items = this.getConfiguredCommands();
    const tree = this.buildGroupTree(items);
    if (!element) {
      if (tree.subgroups.size === 0) {
        return tree.commands.map(cmd => new CommandNode(cmd));
      }
      const rootGroups = this.createGroupNodes(tree.subgroups);
      if (tree.commands.length) {
        rootGroups.unshift(new GroupNode(UNGROUPED_LABEL, [], true));
      }
      return rootGroups;
    } else if (element instanceof GroupNode) {
      if (element.isUngrouped) {
        return tree.commands.map(cmd => new CommandNode(cmd));
      }
      const group = this.findGroup(tree, element.segments);
      if (!group) {
        return [];
      }
      const subgroups = this.createGroupNodes(group.subgroups);
      const commands = group.commands.map(cmd => new CommandNode(cmd));
      return [...subgroups, ...commands];
    } else {
      return [];
    }
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  private buildGroupTree(items: CommandConfig[]): CommandGroupTree {
    const root: CommandGroupTree = {
      label: '',
      segments: [],
      subgroups: new Map(),
      commands: []
    };

    for (const cmd of items) {
      const pathSegments = this.parseGroupSegments(cmd.group);
      if (pathSegments.length === 0) {
        root.commands.push(cmd);
        continue;
      }

      let node = root;
      const currentPath: string[] = [];
      for (const segment of pathSegments) {
        currentPath.push(segment);
        let next = node.subgroups.get(segment);
        if (!next) {
          next = {
            label: segment,
            segments: currentPath.slice(),
            subgroups: new Map(),
            commands: []
          };
          node.subgroups.set(segment, next);
        }
        node = next;
      }
      node.commands.push(cmd);
    }

    return root;
  }

  private createGroupNodes(groups: Map<string, CommandGroupTree>): GroupNode[] {
    return Array.from(groups.values())
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
      .map(group => new GroupNode(group.label, group.segments));
  }

  private findGroup(tree: CommandGroupTree, segments: string[]): CommandGroupTree | undefined {
    let node: CommandGroupTree | undefined = tree;
    for (const segment of segments) {
      node = node?.subgroups.get(segment);
      if (!node) {
        return undefined;
      }
    }
    return node;
  }

  private parseGroupSegments(group?: string): string[] {
    if (!group) {
      return [];
    }
    return group
      .split('/')
      .map(part => part.trim())
      .filter(part => part.length > 0);
  }

  private getConfiguredCommands(): CommandConfig[] {
    const cfg = vscode.workspace.getConfiguration('commandDictionary');
    const inspected = cfg.inspect<CommandConfig[]>('commands');
    if (!inspected) {
      return this.defaultCommands.slice();
    }

    const candidates = [
      inspected.workspaceFolderLanguageValue,
      inspected.workspaceLanguageValue,
      inspected.globalLanguageValue,
      inspected.workspaceFolderValue,
      inspected.workspaceValue,
      inspected.globalValue
    ];

    for (const candidate of candidates) {
      if (candidate !== undefined) {
        return Array.isArray(candidate) ? candidate.slice() : this.defaultCommands.slice();
      }
    }

    return this.defaultCommands.slice();
  }
}

export function activate(context: vscode.ExtensionContext) {
  const defaultCommands = loadDefaultCommands(context.extensionPath);
  const provider = new CommandTreeProvider(defaultCommands);
  const view = vscode.window.createTreeView('commandDictionaryView', {
    treeDataProvider: provider,
    showCollapseAll: true
  });
  context.subscriptions.push(view);

  context.subscriptions.push(
    vscode.commands.registerCommand('commandDictionary.insert', async (text: string) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('Open a text editor to insert the command.');
        return;
      }
      await editor.edit(edit => {
        const { selections } = editor;
        for (const sel of selections) {
          const insertAt = sel.start;
          if (!sel.isEmpty) {
            edit.replace(sel, text);
          } else {
            edit.insert(insertAt, text);
          }
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('commandDictionary.refresh', () => provider.refresh())
  );

  // Auto-refresh when settings change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('commandDictionary.commands')) {
        provider.refresh();
      }
    })
  );
}

function loadDefaultCommands(extensionPath: string): CommandConfig[] {
  const defaultsPath = path.join(extensionPath, 'resources', 'defaultCommands.json');
  try {
    const raw = fs.readFileSync(defaultsPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(isCommandConfig);
    }
  } catch (error) {
    console.error('commandDictionary: failed to load default commands', error);
  }
  return [];
}

function isCommandConfig(value: unknown): value is CommandConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.label === 'string' && typeof candidate.insertText === 'string';
}

export function deactivate() {}
