import * as vscode from 'vscode';
import { AppRunTerminalName, AppScopeName, AppTitleName, ZigLangId } from './consts';
import Term from '../terminal/term';
import path from 'path';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import Path from './path-util';
import * as tool from './tool';

export function listExtensions(predicate: (value: vscode.Extension<any>, index: number, array: readonly vscode.Extension<any>[]) => unknown, thisArg?: any) {
    let extensions = vscode.extensions.all;
    // extensions = extensions.filter(extension => !extension.id.startsWith('vscode.'));
    extensions = extensions.filter(predicate, thisArg);
    console.log(extensions);
}

export function listVscodeExtensions() {
    listExtensions(extension => extension.id.startsWith('vscode.'));
}

export function listNonVscodeExtensions() {
    listExtensions(extension => !extension.id.startsWith('vscode.'));
}

export function listAllCommands() {
    // vscode.QuickPicks.
}

export function focusedEditingFilePath(): string {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        // for getting file path
        const filePath = activeEditor.document.uri.path;
        return filePath;
    }
    return '';
}

export function focusedEditingFileLangId(): string {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        // for getting file path
        const x = activeEditor.document.languageId;
        return x;
    }
    return '';
}

export async function openVscodeSettings(jsonDirectly: boolean = false, filter = '') {
    if (jsonDirectly) {
        await vscode.commands.executeCommand(
            'workbench.action.openSettingsJson',
            // { revealSetting: { key: 'decorateFiles.filePaths', edit: true } }
            filter // 'editor.formatOnSaveTimeout'
        );
        return;
    }
    await vscode.commands.executeCommand('workbench.action.openSettings', filter);
}

export function settingsActionSearch(...args: any[]) {
    vscode.commands.executeCommand('settings.action.search', ...args);
}

export function findModDefFile(fromPath: string, what: string = 'go.mod'): string {
    let wd = activeWorkspaceDir();
    if (!wd) {
        const dir = path.dirname(fromPath);
        if (dir === fromPath) { return ''; }
        const moddeffile = path.join(dir, what);
        if (fs.existsSync(moddeffile)) {
            return moddeffile;
        }
        return findModDefFile(dir);
    }

    const moddeffile = path.join(wd, what);
    if (fs.existsSync(moddeffile)) {
        return moddeffile;
    }
    return '';
}

export function toInt(a: any) {
    return parseInt(a);
}

export function isWorkspaceFolder(dir: string) {
    // vscode.workspace.workspaceFile
    // return vscode.workspace.getWorkspaceFolder(dir);
    // return vscode.workspace.asRelativePath(dir);

    if (vscode.workspace.workspaceFolders) {
        for (let w of vscode.workspace.workspaceFolders) {
            let f = w.uri.path;
            if (dir === w.uri.path) {
                return dir;
            }
        }
    }
}

export function isUnderWorkspaceFolder(dir: string) {
    if (vscode.workspace.workspaceFolders) {
        for (let w of vscode.workspace.workspaceFolders) {
            let f = vscode.workspace.workspaceFolders[toInt(w)].uri.path;
            if (dir === f || dir.startsWith(f)) {
                return f;
            }
        }
    }
    // return false;
}

export function activeWorkspaceDir(): string | undefined {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        const filePath = activeEditor.document.uri.path;
        let relPath = vscode.workspace.asRelativePath(filePath);
        if (relPath && vscode.workspace.workspaceFolders) {
            for (let w of vscode.workspace.workspaceFolders) {
                let f = w.uri.path;
                if (filePath === f || filePath.startsWith(f)) {
                    return f;
                }
            }
        }
    }
    // return false;
}

export function activeWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        const filePath = activeEditor.document.uri.path;
        let relPath = vscode.workspace.asRelativePath(filePath);
        if (relPath && vscode.workspace.workspaceFolders) {
            for (let w of vscode.workspace.workspaceFolders) {
                let f = w.uri.path;
                if (filePath === f || filePath.startsWith(f)) {
                    return w;
                }
            }
        }
    }
    // return false;
}

//


export enum LaunchMode {
    RunInTerminal = 'runInTerminal',
    Run = 'run',
    Debug = 'debug',
}

export enum MainRunMode {
    RunInTerminal = 'runInTerminal',
    RunAsTask = 'asTask',
}

export function debug(...args: any[]) {
    vscode.commands.executeCommand('workbench.action.debug.start', ...args);
}

export function run(...args: any[]) {
    vscode.commands.executeCommand('workbench.action.debug.run', ...args);
}

export function debugFromConfig(...args: any[]) {
    vscode.commands.executeCommand('workbench.action.debug.selectandstart', ...args);
}

export function showLaunchConfigsAndStartDebug() {
    // debugFromConfig();
    showLaunchConfigsAndStart();
}

export function showLaunchConfigsAndStart() {
    showQuickOpen('debug ');
}

export function showQuickOpen(...args: any[]) {
    vscode.commands.executeCommand('workbench.action.quickOpen', ...args);
}

export function showCommands(...args: any[]) {
    // if (!args) {
    //     args = ['>'];
    // }
    vscode.commands.executeCommand('workbench.action.showCommands', ...args);
}

export function selectConfigAndRun(...args: any[]) {
    vscode.commands.executeCommand('debug.startFromConfig', ...args);
    // Error: 'launch.json' does not exist for passed workspace folder
}

export interface ZigRunTaskDefinition extends vscode.TaskDefinition {
    /**
     * The task name
     */
    task: string;

    /**
     * The rake file containing the task
     */
    file?: string;
}

// ------

let privates = {
    picked: false,
    pickedConfigName: '',
};

const defaultTestBinaryPath = "./zig-out/debug/test";

let _terminalOperator: Term;

export const settings = {
    get picked() { return privates.picked; },
    set picked(b: boolean) { privates.picked = b; },
    get pickedConfigName() { return privates.pickedConfigName; },
    set pickedConfigName(v: string) { privates.pickedConfigName = v; },


    install(c: vscode.ExtensionContext) {
        // context = c;
        _terminalOperator = new Term(c);
    },

    get terminalOperator(): Term { return _terminalOperator; },

    get launches(): any[] {
        if (vscode.workspace.workspaceFolders) {
            const workspace = vscode.workspace.workspaceFolders[0];
            const conf = vscode.workspace.getConfiguration("launch", workspace.uri);
            const configurations = conf.get<any[]>("configurations");

            //     if(!configurations) {
            //         return;
            //     }

            // configurations.forEach((config) => {
            //         // read or modify the config
            //     })

            if (configurations) {
                return configurations;
            }
        }
        return [];
    },
    get launchConfigs(): any[] { return this.launches; },

    get enableStatusItemCmd(): string { return `${AppScopeName}.launchConfigs.enableStatusItem`; },
    get disableStatusItemCmd(): string { return `${AppScopeName}.launchConfigs.disableStatusItem`; },
    get runStatusItemCmd(): string { return `${AppScopeName}.launchConfigs.runOrDebug`; },
    get launchWithConfigsCmd(): string { return this.runStatusItemCmd; },
    get statusItemVisible(): boolean {
        return vscode.workspace.getConfiguration(AppScopeName).get<boolean>("launch.enableStatusItem", true);
    },
    set statusItemVisible(b: boolean) {
        vscode.workspace.getConfiguration(AppScopeName).update("launch.enableStatusItem", b, true);
    },
    get statusItemVisibleOnce(): boolean {
        return vscode.workspace.getConfiguration(AppScopeName).get<boolean>("launch.enableStatusItemOnce", true);
    },
    set statusItemVisibleOnce(b: boolean) {
        vscode.workspace.getConfiguration(AppScopeName).update("launch.enableStatusItemOnce", b, true);
    },
    // get enableRunModeCmd(): string { return `${AppScopeName}.launchConfigs.pickForRun`; },
    // get enableDebugModeCmd(): string { return `${AppScopeName}.launchConfigs.pickForDebug`; },
    // get enableRunOrDebug(): boolean {
    //     return vscode.workspace.getConfiguration(AppScopeName).get<boolean>("launch.enableRunOrDebug", true);
    // },
    // set enableRunOrDebug(b: boolean) {
    //     vscode.workspace.getConfiguration(AppScopeName).update("launch.enableRunOrDebug", b, true);
    // },
    get launchMode(): LaunchMode {
        return vscode.workspace.getConfiguration(AppScopeName).get<LaunchMode>("launch.mode", LaunchMode.RunInTerminal);
    },
    set launchMode(b: LaunchMode) {
        vscode.workspace.getConfiguration(AppScopeName).update("launch.mode", b, true);
    },

    get mainRunMode(): MainRunMode {
        return vscode.workspace.getConfiguration(AppScopeName).get<MainRunMode>("main.run.mode", MainRunMode.RunAsTask);
    },
    set mainRunMode(b: MainRunMode) {
        vscode.workspace.getConfiguration(AppScopeName).update("main.run.mode", b, true);
    },

    get enableCodeLensCmd(): string { return `${AppScopeName}.codeLens.enable`; },
    get disableCodeLensCmd(): string { return `${AppScopeName}.codeLens.disable`; },
    get codeLensActionCmd(): string { return `${AppScopeName}.codeLens.runOrDebug`; },
    get codeLensActionDebugCmd(): string { return `${AppScopeName}.codeLens.debugBinary`; },
    get launchMainFuncCmd(): string { return this.codeLensActionCmd; },
    get launchSingleTestCmd(): string { return `${AppScopeName}.codeLens.runSingleTest`; },
    get launchSingleTestDebugCmd(): string { return `${AppScopeName}.codeLens.debugSingleTest`; },
    get launchFileTestsCmd(): string { return `${AppScopeName}.codeLens.runFileTests`; },
    get launchWorkspaceTestsCmd(): string { return `${AppScopeName}.codeLens.runWorkspaceTests`; },
    get launchWorkspaceBuildCmd(): string { return `${AppScopeName}.codeLens.buildWorkspace`; },

    get testArgs() {
        const config = vscode.workspace.getConfiguration(AppScopeName);
        return config.get<string>("test.args") || undefined;
    },
    get debugType(): string {
        const config = vscode.workspace.getConfiguration(AppScopeName);
        return config.get<string>("debug.type") || this.debugTypeForPlatform(os.platform());
    },
    debugTypeForPlatform(platform: NodeJS.Platform): string {
        switch (platform) {
            case "darwin":
                return "lldb";
            case "win32":
                return "cppvsdbg";
            default:
                return "gdb";
        }
    },
    get debugEnv() {
        const config = vscode.workspace.getConfiguration(AppScopeName);
        return {
            testBinaryPath: config.get<string>("test.binary-path") || defaultTestBinaryPath,
        };
    },

    get enableCodeLens(): boolean { return vscode.workspace.getConfiguration(AppScopeName).get<boolean>("main.enableCodeLens", true); },
    set enableCodeLens(b: boolean) { vscode.workspace.getConfiguration(AppScopeName).update("main.enableCodeLens", b, true); },

    get enableTestsCodeLens(): boolean { return vscode.workspace.getConfiguration(AppScopeName).get<boolean>("main.enableCodeLensForTests", false); },
    set enableTestsCodeLens(b: boolean) { vscode.workspace.getConfiguration(AppScopeName).update("main.enableCodeLensForTests", b, true); },

    get runAsPackageCmd(): string { return `${AppScopeName}.codeLens.runAsPackage`; },
    get runAsSingleFileCmd(): string { return `${AppScopeName}.codeLens.runAsSingleFile`; },
    get runAsPackage(): boolean { return vscode.workspace.getConfiguration(AppScopeName).get<boolean>("main.run.asPackage", true); },
    set runAsPackage(b: boolean) { vscode.workspace.getConfiguration(AppScopeName).update("main.run.asPackage", b, true); },

    // get enableVerboseBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.enableVerbose`; },
    // get disableVerboseBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.disableVerbose`; },
    // get toggleVerboseBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.toggleVerbose`; },

    // get enableDelveBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.enableDelve`; },
    // get disableDelveBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.disableDelve`; },
    // get toggleDelveBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.toggleDelve`; },

    // get enableDockerBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.enableDocker`; },
    // get disableDockerBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.disableDocker`; },
    // get toggleDockerBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.toggleDocker`; },

    // get enableK8sBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.enableK8s`; },
    // get disableK8sBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.disableK8s`; },
    // get toggleK8sBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.toggleK8s`; },

    // get enableIstioBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.enableIstio`; },
    // get disableIstioBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.disableIstio`; },
    // get toggleIstioBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.toggleIstio`; },

    // get enableVscodeBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.enableVscode`; },
    // get disableVscodeBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.disableVscode`; },
    // get toggleVscodeBuildTagCmd(): string { return `${AppScopeName}.codeLens.buildTags.toggleVscode`; },

    // get enableVerboseBuildTag(): boolean { return vscode.workspace.getConfiguration(AppScopeName).get<boolean>("main.run.tags.verbose", false); },
    // set enableVerboseBuildTag(b: boolean) { vscode.workspace.getConfiguration(AppScopeName).update("main.run.tags.verbose", b, true); },
    // get enableDelveBuildTag(): boolean { return vscode.workspace.getConfiguration(AppScopeName).get<boolean>("main.run.tags.delve", false); },
    // set enableDelveBuildTag(b: boolean) { vscode.workspace.getConfiguration(AppScopeName).update("main.run.tags.delve", b, true); },
    // get enableDockerBuildTag(): boolean { return vscode.workspace.getConfiguration(AppScopeName).get<boolean>("main.run.tags.docker", false); },
    // set enableDockerBuildTag(b: boolean) { vscode.workspace.getConfiguration(AppScopeName).update("main.run.tags.docker", b, true); },
    // get enableK8sBuildTag(): boolean { return vscode.workspace.getConfiguration(AppScopeName).get<boolean>("main.run.tags.k8s", false); },
    // set enableK8sBuildTag(b: boolean) { vscode.workspace.getConfiguration(AppScopeName).update("main.run.tags.k8s", b, true); },
    // get enableIstioBuildTag(): boolean { return vscode.workspace.getConfiguration(AppScopeName).get<boolean>("main.run.tags.istio", false); },
    // set enableIstioBuildTag(b: boolean) { vscode.workspace.getConfiguration(AppScopeName).update("main.run.tags.istio", b, true); },
    // get enableVscodeBuildTag(): boolean { return vscode.workspace.getConfiguration(AppScopeName).get<boolean>("main.run.tags.vscode", true); },
    // set enableVscodeBuildTag(b: boolean) { vscode.workspace.getConfiguration(AppScopeName).update("main.run.tags.vscode", b, true); },

    // get runBuildTagsCmd(): string { return `${AppScopeName}.build-tags`; },
    // get runBuildTags(): string { return vscode.workspace.getConfiguration(AppScopeName).get<string>("main.run.tags.more", ''); },
    // set runBuildTags(b: string) { vscode.workspace.getConfiguration(AppScopeName).update("main.run.tags.more", b, true); },
    // get runConfigs(): any[] { return vscode.workspace.getConfiguration(AppScopeName).get<any[]>("main.run.configs", []); },
    // set runConfigs(b: any[]) { vscode.workspace.getConfiguration(AppScopeName).update("main.run.configs", b, true); },

    // get gorunVerbose(): boolean { return vscode.workspace.getConfiguration(AppScopeName).get<boolean>("main.run.verbose", false); },
    // set gorunVerbose(b: boolean) { vscode.workspace.getConfiguration(AppScopeName).update("main.run.verbose", b, true); },
    // get gorunMinSize(): boolean { return vscode.workspace.getConfiguration(AppScopeName).get<boolean>("main.run.min-size", true); },
    // set gorunMinSize(b: boolean) { vscode.workspace.getConfiguration(AppScopeName).update("main.run.min-size", b, true); },
    // get disableLocalInlineOptimizations(): boolean { return vscode.workspace.getConfiguration(AppScopeName).get<boolean>("main.run.no-optimize", false); },
    // set disableLocalInlineOptimizations(b: boolean) { vscode.workspace.getConfiguration(AppScopeName).update("main.run.no-optimize", b, true); },

} as const;

export type TSettings = keyof typeof settings;

export class Store {
    context?: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext | null = null) {
        if (context) {
            this.context = context;
        }
    }

    public get selectedLaunchConfigName(): string {
        return this.context?.workspaceState.get<string>(`${AppScopeName}.selectedLaunchConfig`, '') || '';
    }
    public set selectedLaunchConfigName(s: string) {
        this.context?.workspaceState.update(`${AppScopeName}.selectedLaunchConfig`, s);
    }
};

