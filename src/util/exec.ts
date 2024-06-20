'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as cp from 'child_process';
// import fs from 'fs';
// import path from 'path';
import * as tool from './tool';
import { activeWorkspaceFolder, findModDefFile, focusedEditingFileLangId, focusedEditingFilePath, MainRunMode, settings, ZigRunTaskDefinition } from './settings-util';
import { ZigOutputParser } from './parser';
import { AppRunTerminalName, AppScopeName, AppTitleName, ZigLangId } from './consts';
import Path from './path-util';


// const defaultTestBinaryPath = "./zig-out/debug/test";

export class Executor {
    diagnosticCollection: vscode.DiagnosticCollection;
    output: vscode.OutputChannel;


    constructor() {
        // context = c;
        this.output = vscode.window.createOutputChannel(AppTitleName);
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection(AppTitleName);
    }



    get zigBinPath(): string {
        const zigConfig = vscode.workspace.getConfiguration('zig');
        const zigPath = zigConfig.get<string>("path") || "zig";
        return zigPath;
    }

    // run zig binary with args
    private runZig(args: string[], cwd: string, successCallback?: () => void) {
        this.diagnosticCollection.clear();

        const zigPath = this.zigBinPath;

        if (args[0] === "test") {
            if (settings.testArgs) {
                args = [args[0], settings.testArgs.split(" "), args.splice(1)].flat();
            }
        }

        // show running command in output (so can be analyzed or copied to terminal)
        this.output.appendLine(`Running: ${zigPath} ` + tool.quote(args).join(' '));

        cp.execFile(zigPath, args, { cwd }, (err, _stdout, stderr) => {
            if (stderr.trim().length > 0) {
                this.output.appendLine(""); // empty line
                this.output.appendLine(stderr);
            } else {
                if (!err) { this.output.appendLine("OK"); }
            }
            if (err) {
                const parser = new ZigOutputParser(cwd, stderr);
                if (parser.problemsCount() > 0) {
                    // parser problems to vscode diagnostics
                    const map = parser.groupByFile();
                    for (let file in map) {
                        let problems = map[file];
                        const diagnostics = problems.map((problem) => {
                            let range = new vscode.Range(problem.line, problem.column, problem.line, Infinity);
                            return new vscode.Diagnostic(range, problem.message, problem.severity.valueOf());
                        });
                        this.diagnosticCollection.set(vscode.Uri.file(file), diagnostics);
                    }
                }
            } else {
                if (successCallback) {
                    successCallback();
                }
            }
        });
    }

    recreateTask(src: string): vscode.Task | undefined {
        const env = this.makeEnv(src);
        if (!env) { return; }

        const sources = src || env.fileName;
        const relName = `${Path.relative(env.cwd, sources)}`;
        const kind: ZigRunTaskDefinition = {
            task: `${AppScopeName} ${relName}`,
            type: AppScopeName,
        };
        const cmdline = this.makeCmdline(sources, env);
        const task = this.makeTask(cmdline, kind, env.workspaceFolder, relName);

        this.output.appendLine(`To be run: ${env.fileNameRelative}`);
        this.output.show(true);
        return task;
    }

    private runAsTask(mainFile: string, env: any) {
        // const workspaceFolders = vscode.workspace.workspaceFolders;
        // if (!workspaceFolders || workspaceFolders.length === 0) {
        //     return;
        // }

        // for (const workspaceFolder of workspaceFolders) {
        //     const folderString = workspaceFolder.uri.fsPath;
        //     if (!folderString || !mainFile.startsWith(folderString)) {
        //         continue;
        //     }

        //     const sources = settings.runAsPackage ? Path.dirname(mainFile) : mainFile;
        //     const relName = `./${Path.relative(workDir, sources)}`;
        //     const kind: ZigRunTaskDefinition = {
        //         type: AppScopeName,
        //         task: `${AppScopeName} ${relName}`
        //     };
        //     const zigPath = this.zigBinPath;
        //     const whichCmd = 'run';
        //     const srcf = mainFile === '' ? '' : relName;
        //     const filterArg = ''; // filter === '' ? '' : `--test-filter '${filter}'`;
        //     const moduleConfigFile = findModDefFile(mainFile, 'build.zig');
        //     const cmdline = moduleConfigFile && mainFile === '' ? `${zigPath} build ${whichCmd}` : `${zigPath} ${whichCmd} ${filterArg} ${srcf}`;
        //     const task = this.makeTask(cmdline, kind, workspaceFolder, relName);
        //     if (task) {
        //         vscode.tasks.executeTask(task);
        //     }

        //     // vscode.commands.executeCommand("workbench.action.tasks.runTask", ``);

        //     return;
        // }

        // const sources = settings.runAsPackage ? Path.dirname(mainFile) : mainFile;
        const sources = mainFile || env.fileName;
        const relName = `./${Path.relative(env.cwd, sources)}`;
        const kind: ZigRunTaskDefinition = {
            type: AppScopeName,
            task: `${AppScopeName} ${relName}`
        };
        const cmdline = this.makeCmdline(mainFile, env);
        const task = this.makeTask(cmdline, kind, env.workspaceFolder, relName);
        if (task) {
            vscode.tasks.executeTask(task);
        }
    }

    private makeTask(cmdline: string,
        _def: ZigRunTaskDefinition,
        scope?: vscode.TaskScope.Global | vscode.TaskScope.Workspace | vscode.WorkspaceFolder,
        source?: string): vscode.Task | undefined {
        const task = _def.task;
        // A Rake task consists of a task and an optional file as specified in RakeTaskDefinition
        // Make sure that this looks like a Rake task by checking that there is a task.
        if (task) {
            // resolveTask requires that the same definition object be used.
            return this.getShellExecTask(
                _def,
                scope ?? vscode.TaskScope.Workspace,
                source ?? '',
                cmdline,
                undefined,
                []
            );
        }
        return undefined;
    }

    private commandLine?: string;

    private makeCmdline(mainFile?: string, env?: any): string {
        const sources = mainFile || env?.fileName;
        const relName = `./${Path.relative(env.cwd, sources)}`;
        const zigPath = this.zigBinPath;
        const whichCmd = 'run';
        const srcf = mainFile === '' ? '' : relName;
        const filterArg = ''; // filter === '' ? '' : `--test-filter '${filter}'`;
        const moduleConfigFile = findModDefFile(sources, 'build.zig');
        const cmdline = moduleConfigFile && mainFile === '' ?
            `'${zigPath}' build ${whichCmd}` :
            `'${zigPath}' ${whichCmd} ${filterArg} ${srcf}`;
        this.commandLine = cmdline;
        return cmdline;
    }

    public asTask(_task?: vscode.Task, source?: string): vscode.Task | undefined {
        const task = _task?.definition.task;
        // A Rake task consists of a task and an optional file as specified in RakeTaskDefinition
        // Make sure that this looks like a Rake task by checking that there is a task.
        if (task) {
            // resolveTask requires that the same definition object be used.
            const definition: ZigRunTaskDefinition = <any>_task.definition;
            return this.getShellExecTask(
                definition,
                _task.scope ?? vscode.TaskScope.Workspace,
                source ?? '',
                this.commandLine ?? '');
        }
        return undefined;
    }

    private getShellExecTask(
        taskDefinition: vscode.TaskDefinition,
        scope: vscode.WorkspaceFolder | vscode.TaskScope.Global | vscode.TaskScope.Workspace = vscode.TaskScope.Workspace,
        source: string,
        commandLine: string,
        shellExecOptions?: vscode.ShellExecutionOptions,
        problemMatchers?: string | string[]
    ): vscode.Task {
        return new vscode.Task(
            taskDefinition,
            scope, // workspace folder
            taskDefinition.task, // task name
            source, // shows up as 'source: task-name'
            new vscode.ShellExecution(commandLine, shellExecOptions),
            problemMatchers
        );
    }

    private runInTerminal(mainFile: string, env: any) {
        const cmdline = this.makeCmdline(mainFile, env);
        console.log(`built command for terminal '${AppRunTerminalName}': ${cmdline}`);
        settings.terminalOperator.sendCommandToDefaultTerminal(env.cwd, mainFile);

        // if (focusedEditingFileLangId() === ZigLangId) {
        //     let moduleConfigFile = findModDefFile(mainFile, 'build.zig');
        //     // let debug = '';
        //     // let lead = 'zig';
        //     // if (whichCmd === 'debug test') {
        //     //     debug = 'lldb';
        //     //     whichCmd = 'test';
        //     // }
        //     // if (moduleConfigFile) {
        //     //     this.workDir = path.dirname(this.moduleConfigFile);
        //     //     if (src === '') { lead = 'zig build'; }
        //     // } else {
        //     //     this.workDir = path.dirname(this.mainFile);
        //     // }
        //     // const sources = this.mainFile===''?'':this.mainFile; // settings.runAsPackage ? path.dirname(this.mainGo) : this.mainGo;
        //     const zigPath = this.zigBinPath;
        //     const whichCmd = 'run';
        //     const srcf = mainFile === '' ? '' : `./${Path.relative(workDir, mainFile)}`;
        //     const filterArg = ''; // filter === '' ? '' : `--test-filter '${filter}'`;
        //     const cmdline = moduleConfigFile && mainFile === '' ? `${zigPath} build ${whichCmd}` : `${zigPath} ${whichCmd} ${filterArg} ${srcf}`;
        //     console.log(`built command for terminal '${AppRunTerminalName}': ${cmdline}`);
        //     settings.terminalOperator.sendCommandToDefaultTerminal(workDir, mainFile);
        //     return;
        // }

        // console.log(`sending command for terminal '${AppRunTerminalName}': ${this.cmdline} | workDir = ${this.workDir}`);
        // terminalOperator.sendCommandToDefaultTerminal(workDir, mainFile);
    }


    // -------

    private testWorkspace() {
        const env = this.makeEnv();
        if (!env) { return; }

        const args: string[] = ["build", "test"];
        this.runZig(args, env.cwd);
    }

    buildWorkspace() {
        const env = this.makeEnv();
        if (!env) { return; }

        const args: string[] = ["build"];
        this.runZig(args, env.cwd);
    }

    private debugTest(src: string, testName: string | undefined) {
        const env = this.makeEnv(src, testName);
        if (!env) { return; }
        if (!env) { return; }
        testName = testName || env.testName;
        if (!testName) { return; };

        const debugEnv = settings.debugEnv;
        const binPath = debugEnv.testBinaryPath;
        tool.mkdirp(Path.resolve(env.cwd, binPath)); // ensure that output directory exists

        const args: string[] = ["test", "--test-filter", testName, env.fileNameRelative, "-femit-bin=" + binPath, "--test-no-exec"];
        const debugType = settings.debugType;
        this.runZig(args, env.cwd, () => {
            this.output.appendLine(`Debugging binary ${binPath} with type=${debugType}`);
            this.startDebugging(env.workspaceFolder, binPath, debugType);
        });
    }

    runBinary(src: string, ..._args: any[]) {
        const env = this.makeEnv(src);
        if (!env) { return; }
        switch (settings.mainRunMode) {
            case MainRunMode.RunAsTask:
                this.runAsTask(src, env);
                break;
            case MainRunMode.RunInTerminal:
                this.runInTerminal(src, env.cwd);
                break;
        }
    }

    debugBinary(src: string, ..._args: any[]) {
        const env = this.makeEnv(src);
        if (!env) { return; }

        const binPath = Path.join("zig-out", "bin", env.binName);

        const args: string[] = ["build"];
        const debugType = settings.debugType;
        this.runZig(args, env.cwd, () => {
            this.output.appendLine(`Debugging binary ${binPath} with type=${debugType}`);
            this.startDebugging(env.workspaceFolder, binPath, debugType);
        });
    }

    private startDebugging(wf: vscode.WorkspaceFolder, binPath: string, debugType: string) {
        let launchConfig = {
            "name": "ZigDebugBinary",
            "type": debugType,
            "request": "launch",
            "target": binPath,
            "program": binPath,
            "cwd": "${workspaceRoot}",
        };

        vscode.debug.startDebugging(wf, launchConfig);
    }

    private runSingleTest(src: string, testName: string | undefined) {
        const env = this.makeEnv(src, testName);
        if (!env) { return; }
        testName = testName || env.testName;
        if (!testName) { return; };

        const args: string[] = ["test", "--test-filter", testName, env.fileNameRelative];
        this.runZig(args, env.cwd);
    }

    private runFileTests(src: string) {
        const env = this.makeEnv(src);
        if (!env) { return; }

        const args: string[] = ["test", env.fileNameRelative];
        this.runZig(args, env.cwd);
    }

    launchSingleTest(src: string, filter: string, _config?: any, ..._extraArgs: any[]) {
        // const launchable = new launchableObj('test', filter, src, config);
        // launchable.run();
        this.runSingleTest(src, filter);
    }

    launchSingleTestDebug(src: string, filter: string, _config?: any, ..._extraArgs: any[]) {
        // const launchable = new launchableObj('debug test', filter, src, config);
        // launchable.run();
        this.debugTest(src, filter);
    }

    launchFileTests(src: string, _filter: string, _config?: any, ..._extraArgs: any[]) {
        // const launchable = new launchableObj('test', filter, src, config);
        // launchable.run();
        this.runFileTests(src);
    }

    launchWorkspaceTests(src: string, _filter: string, _config?: any, ..._extraArgs: any[]) {
        // const launchable = new launchableObj('test', filter, src, config);
        // launchable.run();
        this.testWorkspace();
    }

    private makeEnv(src: string = '', testName: string = '', _findCurrentTest: boolean = false) {
        this.output.clear();
        this.output.show(true);

        const wf = activeWorkspaceFolder();
        if (!wf) {
            return undefined;
        }
        const cwd = wf.uri.path;

        let fileName = src || focusedEditingFilePath();
        const fileNameRelative = Path.relative(cwd, fileName);

        // binary name from the current file
        let binName = Path.parse(fileNameRelative).name;
        if (binName === "main") {
            // for main.zig use name of the directory in the file path excluding src
            const dirs = Path.dirname(fileName).split(Path.sep);
            binName = dirs.reverse().find((dir) => {
                return ["src"].includes(dir) ? null : dir;
            }) || binName;
        }

        return {
            editor: vscode.window.activeTextEditor,
            workspaceFolder: wf,
            cwd: cwd,
            fileName: fileName,
            fileNameRelative: fileNameRelative,
            testName: testName,
            binName: binName,
        };
    }
};
