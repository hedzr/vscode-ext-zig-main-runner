
import * as vscode from 'vscode';
// import path = require('path');
// import * as cp from 'child_process';
// import * as fs from 'fs';
// import Term from '../terminal/term';
// import { AppRunTerminalName } from './consts';
import * as su from './sbar-util';
import { launchMainProg, settings } from './settings-util';

// let context: vscode.ExtensionContext;
// let terminalOperator: Term;

export function install(c: vscode.ExtensionContext) {
    // context = c;
    // terminalOperator = new Term(c);

    su.install(c); // status bar util wants to holding a context pointer

    c.subscriptions.push(vscode.commands.registerCommand(settings.runAsPackageCmd, () => {
        settings.runAsPackage = true;
    }));
    c.subscriptions.push(vscode.commands.registerCommand(settings.runAsSingleFileCmd, () => {
        settings.runAsPackage = false;
    }));

    c.subscriptions.push(vscode.commands.registerCommand(settings.codeLensActionCmd, launchMainProg));
}

// export function findGoMod(fromPath: string): string {
//     const dir = path.dirname(fromPath);
//     const gomodfile = path.join(dir, "go.mod");
//     if (fs.existsSync(gomodfile)) {
//         return gomodfile;
//     }
//     if (dir) {
//         return findGoMod(dir);
//     }
//     return '';
// }

// // see: https://stackoverflow.com/questions/43007267/how-to-run-a-system-command-from-vscode-extension
// export function launchMainProg(src: string, ...args: any[]) {
//     // const currFile = focusedEditingFilePath();
//     // console.log("codelensAction.args:", args, 'file path:', currFile, 'src file:', src);
//     const gomod = findGoMod(src);
//     if (gomod) {
//         const workDir = path.dirname(gomod);
//         const mainGo = src;
//         const mainGoDir = path.dirname(mainGo);
//         var buildTags = vscode.workspace.getConfiguration('go').get("buildTags", 'vscode');
//         var tags: string[] = [];
//         buildTags.split(/[ ,]/).forEach((v, i, a) => {
//             if (v !== '' && v !== 'vscode' && tags.indexOf(v) === -1) { tags.push(v); }
//         });
//         if (settings.enableVerboseBuildTag && tags.indexOf('verbose') === -1) { tags.push('verbose'); }
//         if (settings.enableDelveBuildTag && tags.indexOf('delve') === -1) { tags.push('delve'); }
//         settings.runBuildTags.split(/[ ,]/).forEach((v, i, a) => {
//             if (v !== '' && tags.indexOf(v) === -1) { tags.push(v); }
//         });
//         if (settings.enableVscodeBuildTag && tags.indexOf('vscode') === -1) { tags.push('vscode'); }
//         buildTags = tags.join(',');
//         // if (!/[ ,]?vscode[ ,]?/.test(buildTags)) {
//         //     buildTags = `${buildTags.replace(/[ ,]+$/, '')},vscode`.replace(/^[ ,]+/, '');
//         // }
//         const cmd = settings.runAsPackage ? `go run -tags '${buildTags}' ${mainGoDir}` : `go run -tags '${buildTags}' ${mainGo}`;
//         console.log(`Sending command to terminal '${AppRunTerminalName}': ${cmd}`);

//         // const execShell = (cmd: string) =>
//         // 	new Promise<string>((resolve, reject) => {
//         // 		cp.exec(cmd, (err, out) => {
//         // 			if (err) {
//         // 				console.log('stderr: ' + err);
//         // 				return reject(err);
//         // 			}
//         // 			console.log('stdout: ' + out);
//         // 			return resolve(out);
//         // 		});
//         // 	});
//         // const cp = require('child_process')
//         // execShell(cmd);

//         // const terminal = new Term();
//         terminalOperator.sendCommandToDefaultTerminal(workDir, cmd);
//     }
// }