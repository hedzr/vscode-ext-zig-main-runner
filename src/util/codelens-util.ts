
import * as vscode from 'vscode';
// import path = require('path');
// import * as cp from 'child_process';
// import * as fs from 'fs';
// import Term from '../terminal/term';
// import { AppRunTerminalName } from './consts';
// import * as su from './sbar-util';
import { settings } from './settings-util';
import { Executor } from './exec';

// let context: vscode.ExtensionContext;
// let terminalOperator: Term;


export function install(c: vscode.ExtensionContext) {
    // context = c;
    // terminalOperator = new Term(c);

    // su.install(c); // status bar util wants to holding a context pointer

    c.subscriptions.push(vscode.commands.registerCommand(settings.runAsPackageCmd, () => {
        settings.runAsPackage = true;
    }));
    c.subscriptions.push(vscode.commands.registerCommand(settings.runAsSingleFileCmd, () => {
        settings.runAsPackage = false;
    }));

    let exec = new Executor();

    c.subscriptions.push(vscode.commands.registerCommand(settings.codeLensActionCmd, (src: string, ...args: any[]) => { exec.runBinary(src, args); }));
    c.subscriptions.push(vscode.commands.registerCommand(settings.codeLensActionDebugCmd, (src: string, ...args: any[]) => { exec.debugBinary(src, args); }));
    c.subscriptions.push(vscode.commands.registerCommand(settings.launchSingleTestCmd, (src: string, filter: string, ...args: any[]) => { exec.launchSingleTest(src, filter, null, args); }));
    c.subscriptions.push(vscode.commands.registerCommand(settings.launchSingleTestDebugCmd, (src: string, filter: string, ...args: any[]) => { exec.launchSingleTestDebug(src, filter, null, args); }));
    c.subscriptions.push(vscode.commands.registerCommand(settings.launchFileTestsCmd, (src: string, filter: string, ...args: any[]) => { exec.launchFileTests(src, filter, null, args); }));
    c.subscriptions.push(vscode.commands.registerCommand(settings.launchWorkspaceTestsCmd, (src: string, filter: string, ...args: any[]) => { exec.launchWorkspaceTests(src, filter, null, args); }));
    c.subscriptions.push(vscode.commands.registerCommand(settings.launchWorkspaceBuildCmd, (_src: string, _filter: string, ..._args: any[]) => { exec.buildWorkspace(); }));
}
