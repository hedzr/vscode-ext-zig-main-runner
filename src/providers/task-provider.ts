// import * as path from 'path';
// import * as fs from 'fs';
import * as cp from 'child_process';
import * as vscode from 'vscode';
import { error } from 'console';
import Path from '../util/path-util';
import { GoRunTaskDefinition, launchableObj } from '../util/settings-util';
import { AppScopeName, AppTitleName } from '../util/consts';

const typeName = AppScopeName;
const panelName = AppTitleName;

export function install(_: vscode.ExtensionContext): vscode.Disposable | undefined {
    const workspaceRoot = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
        ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
    if (!workspaceRoot) {
        return;
    }

    const taskProvider = vscode.tasks.registerTaskProvider(typeName, new GoRunTaskProvider(workspaceRoot));
    return taskProvider;
}

export class GoRunTaskProvider implements vscode.TaskProvider {
    private gorunPromise: Thenable<vscode.Task[]> | undefined = undefined;
    launchable: launchableObj | undefined = undefined;

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
            this.gorunPromise = this.getGoRunTasks();
        }
        return this.gorunPromise;
    }

    public resolveTask(_task: vscode.Task): vscode.Task | undefined {
        return this.launchable?.asTask(_task, typeName);
    }

    async getGoRunTasks(): Promise<vscode.Task[]> {
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
        const out = getOutputChannel();
        for (const workspaceFolder of workspaceFolders) {
            const folderString = workspaceFolder.uri.fsPath;
            if (!folderString || !focusedFile.startsWith(folderString)) {
                continue;
            }

            const gomodFile = Path.join(folderString, 'go.mod');
            if (!await Path.exists(gomodFile)) {
                continue;
            }

            // const dir = Path.dirname(focusedFile);
            const relName = `./${Path.relative(folderString, focusedFile)}`;
            this.launchable = new launchableObj(focusedFile);
            const kind: GoRunTaskDefinition = {
                type: typeName,
                task: `go-main-run ${relName}`
            };
            const task = this.launchable.makeTask(kind, workspaceFolder, relName);
            if (task) {
                result.push(task);
            }
            out.appendLine(`To be run: ${relName}`);
            out.show(true);
        }

        // for (const workspaceFolder of workspaceFolders) {
        //     const folderString = workspaceFolder.uri.fsPath;
        //     if (!folderString) {
        //         continue;
        //     }
        //     const gomodFile = Path.join(folderString, 'go.mod');
        //     if (!await Path.exists(gomodFile)) {
        //         continue;
        //     }
        //
        //     const commandLine = `go run`;
        //     try {
        //         const { stdout, stderr } = await exec(commandLine, { cwd: folderString });
        //         if (stdout) {
        //             if (stdout.length > 0) {
        //                 getOutputChannel().appendLine(stderr);
        //                 getOutputChannel().show(true);
        //             }
        //             const lines = stdout.split(/\r{0,1}\n/);
        //             for (const line of lines) {
        //                 if (line.length === 0) {
        //                     continue;
        //                 }
        //                 const regExp = /rake\s(.*)#/;
        //                 const matches = regExp.exec(line);
        //                 if (matches && matches.length === 2) {
        //                     const taskName = matches[1].trim();
        //                     const kind: GoRunTaskDefinition = {
        //                         type: typeName,
        //                         task: taskName
        //                     };
        //                     const task = new vscode.Task(kind, workspaceFolder, taskName, typeName,
        //                         new vscode.ShellExecution(`go run ${taskName}`));
        //                     result.push(task);
        //                     const lowerCaseLine = line.toLowerCase();
        //                     if (isBuildTask(lowerCaseLine)) {
        //                         task.group = vscode.TaskGroup.Build;
        //                     } else if (isTestTask(lowerCaseLine)) {
        //                         task.group = vscode.TaskGroup.Test;
        //                     }
        //                 }
        //             }
        //         }
        //         if (stderr && stderr.length > 0) {
        //             // getOutputChannel().appendLine(stderr);
        //             const lines = stdout.split(/\r{0,1}\n/);
        //             for (const line of lines) {
        //                 getOutputChannel().appendLine('ERR> ' + line);
        //             }
        //             getOutputChannel().show(true);
        //         }
        //     } catch (err: any) {
        //         const channel = getOutputChannel();
        //         if (err.stderr) {
        //             channel.appendLine(err.stderr);
        //         }
        //         if (err.stdout) {
        //             channel.appendLine(err.stdout);
        //         }
        //         channel.appendLine('Auto detecting go-run tasks failed.');
        //         channel.show(true);
        //     }
        // }
        return result;
    }
}

function exec(command: string, options: cp.ExecOptions): Promise<{ stdout: string; stderr: string }> {
    return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        cp.exec(command, options, (err, stdout, stderr) => {
            if (err) {
                error('something\'s wrong', err);
                reject({ err, stdout, stderr });
            }
            resolve({ stdout, stderr });
        });
    });
}

let _channel: vscode.OutputChannel;

function getOutputChannel(): vscode.OutputChannel {
    if (!_channel) {
        _channel = vscode.window.createOutputChannel(panelName);
    }
    return _channel;
}

const buildNames: string[] = ['build', 'compile', 'watch'];
function isBuildTask(name: string): boolean {
    for (const buildName of buildNames) {
        if (name.indexOf(buildName) !== -1) {
            return true;
        }
    }
    return false;
}

const testNames: string[] = ['test'];
function isTestTask(name: string): boolean {
    for (const testName of testNames) {
        if (name.indexOf(testName) !== -1) {
            return true;
        }
    }
    return false;
}
