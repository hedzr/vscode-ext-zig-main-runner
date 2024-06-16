// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
// import { ExtensionContext, languages, commands, Disposable, workspace } from 'vscode';
import { CodelensProvider } from './providers/codelens-provider';
import * as taskProvider from './providers/task-provider';
// import * as cu from './util/codelens-util';
// import * as sbar from './util/sbar-util';
// import { config } from './util/settings-util';
// import { AppScopeName, GolangId } from './util/consts';

// let disposables: Disposable[] = [];
let zigRunTaskProvider: vscode.Disposable | undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "zig-main-runner" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	// const disposable = vscode.commands.registerCommand('zig-main-runner.helloWorld', () => {
	// 	// The code you place here will be executed every time your command is executed
	// 	// Display a message box to the user
	// 	vscode.window.showInformationMessage('Hello World from zig main runner!');
	// });
	// 
	// context.subscriptions.push(disposable);

	// --- our main activators ---

	// cu.install(context);    // codelens helper wants a saved context to locate workspace folder
	// sbar.install(context);

	const codelensProvider = new CodelensProvider();
	codelensProvider.install(context);
	zigRunTaskProvider = taskProvider.install(context);

	// console.log(context.storageUri);
	// console.log(config.launches);
	// console.log(config.launches[0].args);
}

// This method is called when your extension is deactivated
export function deactivate() {
	// if (disposables) {
	// 	disposables.forEach(item => item.dispose());
	// }
	// disposables = [];
	if (zigRunTaskProvider) {
		zigRunTaskProvider.dispose();
	}
}
