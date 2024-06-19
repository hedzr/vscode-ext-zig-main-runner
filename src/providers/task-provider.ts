import * as vscode from 'vscode';
import Path from '../util/path-util';
import { AppScopeName, AppTitleName } from '../util/consts';
import { Executor } from '../util/exec';

const typeName = AppScopeName;
const panelName = AppTitleName;

export function install(_: vscode.ExtensionContext): vscode.Disposable | undefined {
    const workspaceRoot = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
        ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
    if (!workspaceRoot) {
        return;
    }

    const taskProvider = vscode.tasks.registerTaskProvider(typeName, new ZigRunTaskProvider(workspaceRoot));
    return taskProvider;
}

export class ZigRunTaskProvider implements vscode.TaskProvider {
    private gorunPromise: Thenable<vscode.Task[]> | undefined = undefined;
    // launchable: launchableObj | undefined = undefined;
    private executor: Executor | undefined = undefined;
    private task: vscode.Task | undefined = undefined;

    constructor(workspaceRoot: string) {
        const pattern = Path.join(workspaceRoot, 'go.mod');
        if (Path.existsSync(pattern)) {
            const fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
            fileWatcher.onDidChange(() => this.gorunPromise = undefined);
            fileWatcher.onDidCreate(() => this.gorunPromise = undefined);
            fileWatcher.onDidDelete(() => this.gorunPromise = undefined);
        }
    }

    public provideTasks(): Thenable<vscode.Task[]> | undefined {
        if (!this.gorunPromise) {
            this.gorunPromise = this.getRunTasks();
        }
        return this.gorunPromise;
    }

    public resolveTask(_task: vscode.Task): vscode.Task | undefined {
        return this.executor?.asTask(_task, typeName) || this.task;
    }

    async getRunTasks(): Promise<vscode.Task[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const result: vscode.Task[] = [];
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return result;
        }

        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return result;
        }

        // for getting file path
        const focusedFile = activeEditor.document.uri.path;
        this.executor = new Executor();
        this.task = this.executor.recreateTask(focusedFile);
        if (this.task) {
            result.push(this.task);
        }

        return result;
    }
}
