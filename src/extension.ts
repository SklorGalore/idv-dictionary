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
    this.tooltip = cmd.insertText;
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
  constructor(public readonly labelText: string) {
    super(labelText, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon('list-unordered');
  }
}

class CommandTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
    const cfg = vscode.workspace.getConfiguration('commandDictionary');
    const items = (cfg.get<CommandConfig[]>('commands') ?? []).slice();

    // If no groups exist, just flat-list items.
    const groups = new Map<string, CommandConfig[]>();
    let hasGroup = false;
    for (const c of items) {
      const g = c.group?.trim();
      if (g) {
        hasGroup = true;
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g)!.push(c);
      }
    }

    if (!element) {
      if (!hasGroup) {
        return items.map(i => new CommandNode(i));
      } else {
        const groupNames = Array.from(groups.keys()).sort();
        const ungrouped = items.filter(i => !i.group?.trim());
        const nodes: vscode.TreeItem[] = groupNames.map(name => new GroupNode(name));
        if (ungrouped.length) {
          nodes.unshift(new GroupNode('Ungrouped'));
          groups.set('Ungrouped', ungrouped);
        }
        return nodes;
      }
    } else if (element instanceof GroupNode) {
      const cfg = vscode.workspace.getConfiguration('commandDictionary');
      const items = (cfg.get<CommandConfig[]>('commands') ?? []).slice();
      const inGroup = items.filter(i => (i.group?.trim() || 'Ungrouped') === element.label);
      return inGroup.map(i => new CommandNode(i));
    } else {
      return [];
    }
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new CommandTreeProvider();
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

export function deactivate() {}
