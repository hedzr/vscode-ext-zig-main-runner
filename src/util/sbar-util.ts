import * as vscode from 'vscode';
import { LaunchMode, Store, focusedEditingFilePath, launchMainProg, runWithConfig, settings, showLaunchConfigsAndStartDebug } from './settings-util';
import { AppScopeName } from './consts';

let launchConfigsStatusBarItem: vscode.StatusBarItem;
let store: Store;

// export function install({ subscriptions }: vscode.ExtensionContext) {
export function install(context: vscode.ExtensionContext) {
    store = new Store(context);

    context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.launchConfigs.showPicker`, () => {
        showLaunchConfigsAndStartDebug();
    }));

    // register a command that is invoked when the status bar
    // item is selected
    // const myCommandId = `${AppScopeName}.runWithLaunchConfigs`;
    context.subscriptions.push(vscode.commands.registerCommand(settings.launchWithConfigsCmd, () => {
        // const n = getNumberOfSelectedLines(vscode.window.activeTextEditor);
        // vscode.window.showInformationMessage(`Yeah, ${n} line(s) selected... Keep going!`);
        showQuickPickLaunchConfigsAndRun(context);
    }));

    // create a new status bar item that we can now manage
    launchConfigsStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0); // 100
    launchConfigsStatusBarItem.command = settings.runStatusItemCmd;
    launchConfigsStatusBarItem.tooltip = 'Run with Launch Configs...';
    context.subscriptions.push(launchConfigsStatusBarItem);

    // register some listener that make sure the status bar 
    // item always up-to-date
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
        updateStatusBarItems(context);
    }));
    // subscriptions.push(vscode.window.onDidChangeTextEditorSelection(updateStatusBarItem));

    // context.subscriptions.push(vscode.commands.registerCommand(settings.enableRunModeCmd, () => {
    //     settings.enableRunOrDebug = true;
    // }));

    // context.subscriptions.push(vscode.commands.registerCommand(settings.enableDebugModeCmd, () => {
    //     settings.enableRunOrDebug = false;
    // }));

    context.subscriptions.push(vscode.commands.registerCommand(settings.enableStatusItemCmd, () => {
        settings.statusItemVisible = true;
        doUpdateStatusBarItems(true);
    }));

    context.subscriptions.push(vscode.commands.registerCommand(settings.disableStatusItemCmd, () => {
        settings.statusItemVisible = false;
        doUpdateStatusBarItems(false);
    }));

    // update status bar item once at start
    updateStatusBarItems(context);

    // context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.quickInput`, async () => {
    //     const options: { [key: string]: (context: vscode.ExtensionContext) => Promise<void> } = {
    //         showQuickPick,
    //         showInputBox,
    //         // multiStepInput,
    //         // quickOpen,
    //     };
    //     const quickPick = vscode.window.createQuickPick();
    //     quickPick.items = Object.keys(options).map(label => ({ label }));
    //     quickPick.onDidChangeSelection(selection => {
    //         if (selection[0]) {
    //             options[selection[0].label](context)
    //                 .catch(console.error);
    //         }
    //     });
    //     quickPick.onDidHide(() => quickPick.dispose());
    //     quickPick.show();
    // }));
}

/**
 * Shows a pick list using window.showQuickPick().
 */
export async function showQuickPickLaunchConfigsAndRun(_: vscode.ExtensionContext) {
    // await openVscodeSettings(true, 'editor.formatOnSave');
    // await openVscodeSettings(false, `${AppScopeName}.launch.enableRunOrDebug`);

    const launches = settings.launches;
    const ws = vscode.workspace;
    const focusedFileAbs = focusedEditingFilePath();
    const focusedFile = ws.asRelativePath(focusedFileAbs);
    function wrapToString(l: any): vscode.QuickPickItem {
        return {
            ...l,
            toString(): string { return l.name; },
            label: l.name,
            kind: vscode.QuickPickItemKind.Default,
            description: `(${ws.name}) ${(l.name === store.selectedLaunchConfigName ? '(default)' : '')}`,
            detail: `${focusedFile}`
        };
    }
    const items = launches.map(it => wrapToString(it));
    const result = await vscode.window.showQuickPick(items, {
        placeHolder: 'Pick a launch config to run...',
        // onDidSelectItem: item => vscode.window.showInformationMessage(`Focus ${++i}: ${it}`)
    });

    // vscode.window.showInformationMessage(`To Be Run: ${result}`);
    if (result) {
        const config = result;
        const name = config.label;
        store.selectedLaunchConfigName = name;

        // let launchConfig = {
        //     "name": "Test",
        //     "type": "node",
        //     "request": "launch",
        //     "program": "${workspaceRoot}/test.js",
        //     "cwd": "${workspaceRoot}",
        //     "stopOnEntry": true
        // };

        // https://github.com/microsoft/vscode/issues/4615
        // const debugCmd = 'vscode.startDebug';
        const debugCmd = 'workbench.action.debug.start';
        const runCmd = 'workbench.action.debug.run';
        const callback = () => {
            if (settings.statusItemVisibleOnce) {
                if (settings.picked) {
                    launchConfigsStatusBarItem.hide();
                }
            }
        };
        switch (settings.launchMode) {
            case LaunchMode.RunInTerminal:
                launchMainProg(focusedFileAbs, config);
                break;
            case LaunchMode.Run:
                runWithConfig(runCmd, config, callback);
                break;
            case LaunchMode.Debug:
                runWithConfig(debugCmd, config, callback);
                break;
        }
        // runWithConfig(settings.enableRunOrDebug ? runCmd : debugCmd, file);
    }
}

export async function updateStatusBarItems(_: vscode.ExtensionContext) {
    let vis = settings.statusItemVisible;
    if (settings.statusItemVisibleOnce && settings.picked) {
        vis = false;
    }
    console.log('vis:', vis, 'once:', settings.statusItemVisibleOnce, "picked:", settings.picked);
    doUpdateStatusBarItems(vis, store.selectedLaunchConfigName);
}

function doUpdateStatusBarItems(vis: boolean, selected?: string) {
    if (vis) {
        const n = settings.launches.length;
        if (n > 0) {
            const name = selected ? selected : settings.launches[0].name;
            launchConfigsStatusBarItem.text = `$(debug-start) ${name}`;
            launchConfigsStatusBarItem.show();
            return;
        }
    }

    launchConfigsStatusBarItem.hide();

    // const nx = getNumberOfSelectedLines(vscode.window.activeTextEditor);
    // if (nx > 0) {
    //     myStatusBarItem.text = `$(megaphone) ${nx} line(s) selected`;
    //     myStatusBarItem.show();
    // } else {
    //     myStatusBarItem.hide();
    // }
}

// function getNumberOfSelectedLines(editor: vscode.TextEditor | undefined): number {
//     let lines = 0;
//     if (editor) {
//         lines = editor.selections.reduce((prev, curr) => prev + (curr.end.line - curr.start.line), 0);
//     }
//     return lines;
// }

// /**
//  * Shows a pick list using window.showQuickPick().
//  */
// export async function showQuickPick() {
//     let i = 0;
//     const result = await vscode.window.showQuickPick(['one', 'two', 'three'], {
//         placeHolder: 'one, two or three',
//         onDidSelectItem: item => vscode.window.showInformationMessage(`Focus ${++i}: ${item}`)
//     });
//     vscode.window.showInformationMessage(`Got: ${result}`);
// }

// /**
//  * Shows an input box using window.showInputBox().
//  */
// export async function showInputBox() {
//     const result = await vscode.window.showInputBox({
//         value: 'abcdef',
//         valueSelection: [2, 4],
//         placeHolder: 'For example: fedcba. But not: 123',
//         validateInput: text => {
//             vscode.window.showInformationMessage(`Validating: ${text}`);
//             return text === '123' ? 'Not 123!' : null;
//         }
//     });
//     vscode.window.showInformationMessage(`Got: ${result}`);
// }