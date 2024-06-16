'use strict';

// import sh from 'shelljs';
// import fs from 'fs';
// import { homedir } from 'os';
// import * as path from 'path';
import * as vscode from 'vscode';
// import * as cp from 'child_process';
import * as fs from 'fs';
import Path, * as pu from '../util/path-util';
import { AppRunTerminalName, AppScopeName } from '../util/consts';
// import { Z_UNKNOWN } from 'zlib';
// import { window, workspace, ExtensionContext } from 'vscode';
// import commonAncestorPath from 'common-ancestor-path';


export async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export default class Term {
	_disposable: Disposable[] = [];
	NEXT_TERM_ID = 1;
	ph: pu.PathHolder;


	constructor(context: vscode.ExtensionContext, _cfg: pu.CodePathConfig = new pu.CodePathConfig()) {
		this.ph = new pu.PathHolder(context, _cfg);
		this.installListeners(context);
	}

	//

	// used by extension.actuvate(context)
	public installListeners(context: vscode.ExtensionContext) {
		// let NEXT_TERM_ID = 1;

		console.log("Terminals: " + (<any>vscode.window).terminals.length);

		// vscode.window.onDidOpenTerminal
		vscode.window.onDidOpenTerminal((term: vscode.Terminal) => {
			// vscode.window.showInformationMessage(`onDidOpenTerminal, name: ${term.name}`);
			console.log(`Terminal ${term.name} opened. Total count: ${(<any>vscode.window).terminals.length}`);
		});
		// vscode.window.onDidOpenTerminal((term: vscode.Terminal) => {
		// 	vscode.window.showInformationMessage(`onDidOpenTerminal, name: ${term.name}`);
		// });

		// vscode.window.onDidChangeActiveTerminal
		vscode.window.onDidChangeActiveTerminal(e => {
			console.log(`Active terminal changed, name=${e ? e.name : 'undefined'}`);
		});

		// vscode.window.createTerminal
		context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.createTerminal`, () => {
			// vscode.window.createTerminal(`Ext Terminal #${NEXT_TERM_ID++}`);
			// vscode.window.showInformationMessage('Hello World 2!');
			this.createTerminal();
		}));
		context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.createTerminalHideFromUser`, () => {
			// vscode.window.createTerminal({
			// 	name: `Ext Terminal #${NEXT_TERM_ID++}`,
			// 	hideFromUser: true
			// } as any);
			this.createTerminalForUser();
		}));
		context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.createAndSend`, () => {
			// const terminal = vscode.window.createTerminal(`Ext Terminal #${NEXT_TERM_ID++}`);
			// terminal.sendText("echo 'Sent text immediately after creating'");
			this.createAndSend("echo 'Sent text immediately after creating'");
		}));
		context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.createZshLoginShell`, () => {
			// vscode.window.createTerminal(`Ext Terminal #${NEXT_TERM_ID++}`, '/bin/zsh', ['-l']);
			this.createZshLoginShell();
		}));

		// Terminal.hide
		context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.hide`, () => {
			this.hide();
		}));

		// Terminal.show
		context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.show`, () => {
			this.show();
		}));
		context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.showPreserveFocus`, () => {
			this.showPreserveFocus();
		}));

		// Terminal.sendText
		context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.sendText`, () => {
			this.sendText("echo 'Hello world!'");
		}));
		context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.sendTextNoNewLine`, () => {
			this.sendTextNoNewLine("echo 'Hello world!'");
		}));

		// Terminal.dispose
		context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.dispose`, () => {
			this.destroy();
		}));

		// Terminal.processId
		context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.processId`, () => {
			// this.selectTerminal().then(terminal => {
			// 	if (!terminal) {
			// 		return;
			// 	}
			// 	terminal.processId.then((processId) => {
			// 		if (processId) {
			// 			vscode.window.showInformationMessage(`Terminal.processId: ${processId}`);
			// 		} else {
			// 			vscode.window.showInformationMessage('Terminal does not have a process ID');
			// 		}
			// 	});
			// });
			this.processId().then(id => {
				if (id) {
					vscode.window.showInformationMessage(`Terminal.processId: ${id}`);
				} else {
					vscode.window.showInformationMessage('Terminal does not have a process ID');
				}
			});
		}));

		// vscode.window.onDidCloseTerminal
		vscode.window.onDidCloseTerminal((terminal) => {
			// vscode.window.showInformationMessage(`onDidCloseTerminal, name: ${terminal.name}`);
			console.log(`onDidCloseTerminal, name: ${terminal.name}`);
		});

		// vscode.window.terminals
		context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.terminals`, () => {
			this.selectTerminal();
		}));

		// ExtensionContext.environmentVariableCollection
		context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.updateEnvironment`, () => {
			const collection = context.environmentVariableCollection;
			collection.replace('FOO', 'BAR');
			collection.append('PATH', '/test/path');
		}));

		context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.clearEnvironment`, () => {
			context.environmentVariableCollection.clear();
		}));

		// vvv Proposed APIs below vvv

		// vscode.window.onDidWriteTerminalData
		context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.onDidWriteTerminalData`, () => {
			(<any>vscode.window).onDidWriteTerminalData((e: any) => {
				// vscode.window.showInformationMessage(`onDidWriteTerminalData listener attached, check the devtools console to see events`);
				console.log(`onDidWriteTerminalData listener attached, check the devtools console to see events`, e);
			});
		}));

		// vscode.window.onDidChangeTerminalDimensions
		context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.onDidChangeTerminalDimensions`, () => {
			vscode.window.showInformationMessage(`Listening to onDidChangeTerminalDimensions, check the devtools console to see events`);
			(<any>vscode.window).onDidChangeTerminalDimensions((event: any) => {
				console.log(`onDidChangeTerminalDimensions: terminal:${event.terminal.name}, columns=${event.dimensions.columns}, rows=${event.dimensions.rows}`);
			});
		}));

		// // vscode.window.registerTerminalLinkProvider
		// context.subscriptions.push(vscode.commands.registerCommand(`${AppScopeName}.registerTerminalLinkProvider`, () => {
		// 	(<any>vscode.window).registerTerminalLinkProvider({
		// 		provideTerminalLinks: (context: any, token: vscode.CancellationToken) => {
		// 			// Detect the first instance of the word "link" if it exists and linkify it
		// 			const startIndex = (context.line as string).indexOf('link');
		// 			if (startIndex === -1) {
		// 				return [];
		// 			}
		// 			return [
		// 				{
		// 					startIndex,
		// 					length: 'link'.length,
		// 					tooltip: 'Show a notification',
		// 					// You can return data in this object to access inside handleTerminalLink
		// 					data: 'Example data'
		// 				}
		// 			];
		// 		},
		// 		handleTerminalLink: (link: any) => {
		// 			vscode.window.showInformationMessage(`Link activated (data = ${link.data})`);
		// 		}
		// 	});
		// }));

		// determine the file location and number if it starts with a hash folder (e.g., '~work/rust.work/src/a.rs:996'),
		// and jump to it in vscode editor.
		(<any>vscode.window).registerTerminalLinkProvider({
			provideTerminalLinks: (context: any, token: vscode.CancellationToken) => {
				// Detect the first instance of the word "link" if it exists and linkify it
				const re = /(~[^:]+)\:(\d+)/ig; // only match on tilde folders, normal `file:line` are ignored here.
				const arr = re.exec(context.line as string);
				if (arr === null) {
					return [];
				}
				const startIndex = arr.index;
				return [{
					startIndex,
					length: re.lastIndex,
					tooltip: 'Code position',
					// You can return data in this object to access inside handleTerminalLink
					data: arr
				}];
			},
			handleTerminalLink: (link: any) => {
				// vscode.window.showInformationMessage(`Link activated (data = ${link.data})`);
				// console.log('link data:', link.data);
				// this.exec(`code --goto ${link.data[0]}`);

				let file = link.data[1];
				const line = link.data[2];
				if (/^~[^/]+\//.test(file)) {
					// resolve a tlide folder
					this.execForText(`zsh -i -c 'hash -d'`, (err: Error, stdout: string | Buffer, stderr: string | Buffer) => {
						let lines = stdout.toString().split('\n');
						let l: string;
						let res: RegExpExecArray | null;
						for (l of lines) {
							if ((res = /(.+)=(.+)/i.exec(l)) !== null) {
								const re = new RegExp(`^~${res[1]}`, 'i');
								if (re.test(file)) {
									file = file.replace(re, res[2]);
									console.log(`replaced. file: ${file}`);
									this.goto(file, line);
									break;
								}
							}
						}
					});
				} else {
					this.goto(file, line);
				}
			}
		});

		context.subscriptions.push(vscode.window.registerTerminalProfileProvider(`${AppScopeName}.terminal-profile`, {
			provideTerminalProfile(token: vscode.CancellationToken): vscode.ProviderResult<vscode.TerminalProfile> {
				return {
					options: {
						name: 'Terminal API',
						shellPath: process.title || 'C:/Windows/System32/cmd.exe'
					}
				};
			}
		}));
	}

	cursorPlacement() {
		// release the selection caused by inserting
		vscode.commands.executeCommand('cursorMove', {
			to: 'right',
			by: 'line',
			value: 1
		});
		// position the cursor inside the parenthesis
		vscode.commands.executeCommand('cursorMove', {
			to: 'left',
			by: 'line',
			value: 1
		});
	}

	// isNumber(n: string | number): boolean { return !isNaN(parseFloat(n as string)) && !isNaN(n as number - 0); }
	// if (this.isNumber(line)) { ln = line as number; } else { ln = parseInt(line as string); }
	asNumber(n: string | number): number {
		if (typeof n === 'string') { return parseInt(n as string); }
		return n as number;
	}

	async goto(file: string, line: string | number) {
		let openPath = vscode.Uri.file(file);
		console.log(`goto: ${file} : ${line}`);

		let ln: number = this.asNumber(line);
		console.log('line: ', ln);

		let pos = new vscode.Position(ln - 1, 0);
		let doc = await vscode.workspace.openTextDocument(openPath);
		await vscode.window.showTextDocument(doc,
			{ selection: new vscode.Range(pos, pos) }
			// vscode.ViewColumn.One
		);
	}

	//

	public DefaultTerminalName = AppRunTerminalName || 'demo-lang-run';

	public createDefaultTerminal(cwd: string): vscode.Terminal | undefined {
		return this.create(this.DefaultTerminalName, cwd);
	}

	public recreateTerminal(terminalOptions: any): vscode.Terminal | undefined {
		terminalOptions.cwd = pu.default.normalizeDriveLetter(terminalOptions.cwd);
		this.closeTerminal(terminalOptions.name);
		return vscode.window.createTerminal(terminalOptions);
	}

	public create(name: string, cwd: string): vscode.Terminal | undefined {
		cwd = pu.default.normalizeDriveLetter(cwd);

		this.closeTerminal(name);

		const terminalOptions = {
			name,
			cwd
		};
		return vscode.window.createTerminal(terminalOptions);
	}

	public sendCommandToDefaultTerminal(cwd: string, command: string) {
		const term = this.createDefaultTerminal(cwd);
		if (term) {
			term.sendText(command, true);
			term.show(false);
		}
		return term;
	}

	public findTerminal(name: string): vscode.Terminal | undefined {
		return vscode.window.terminals.find(t => t.name === name);
	}

	public closeDefaultTerminal() {
		this.closeTerminal(this.DefaultTerminalName);
	}

	public closeTerminal(name: string) {
		const term = this.findTerminal(name);
		term?.dispose();
	}

	public getOrCreateTerminal(terminalOptions: any): vscode.Terminal | undefined {
		const { name } = terminalOptions;
		let terminal = this.findTerminal(name);
		if (!terminal || !!terminal.exitStatus) {
			terminal = this.recreateTerminal(terminalOptions);
		}
		return terminal;
	}

	public exec(cmd: string) {
		const cp = require('child_process');
		const execShell = (cmd: string) =>
			new Promise<string>((resolve, reject) => {
				cp.exec(cmd, (err: string, out: string) => {
					if (err) {
						console.log('stderr: ' + err);
						return reject(err);
					}
					// console.log('stdout: ' + out);
					return resolve(out);
				});
			});
		execShell(cmd);
	}

	public execForText(cmd: string, callback: (err: Error, stdout: string | Buffer, stderr: string | Buffer) => any) {
		const cp = require('child_process');
		return cp.exec(cmd, callback);
	}

	public async runInTerminal(cwd: string, command: string): Promise<vscode.Terminal | undefined> {
		cwd = pu.default.normalizeDriveLetter(cwd);

		const name = this.DefaultTerminalName;
		this.closeTerminal(name);

		// const shellPath = whichNormalized(getShellPath());
		const shellPath = pu.execPaths.shell.path;
		const shellName = pu.execPaths.shell.name;
		const inlineFlags = pu.execPaths.shell.inlineFlags;
		const pause = pu.execPaths.shell.pauseCommand;
		const sep = pu.execPaths.shell.sep;

		// WARNING: terminal is not properly initialized when running the command. cwd is not set when executing `command`.
		const wrappedCommand = `cd "${cwd}" && ${command} ${sep} ${pause}`;
		// const wrappedCommand = await window.showInputBox({ 
		//   placeHolder: 'input a command',
		//   value: '/k echo hello world!'
		// });

		let shellArgs;
		shellArgs = [wrappedCommand];
		if (inlineFlags) {
			shellArgs.unshift(...inlineFlags);
		}

		if (shellName === 'cmd') {
			// hackfix: Terminal API behavior of cmd does not work like bash. Instead, the VSCode Terminal API added a hack-ish solution to take a string on Windows (which it does not support on other systems).
			shellArgs = shellArgs.join(' ');
		}

		/**
		 * @see https://code.visualstudio.com/api/references/vscode-api#TerminalOptions
		 */
		const terminalOptions = {
			name: this.DefaultTerminalName,
			cwd,
			shellPath: shellPath,
			shellArgs,
		};

		// debug(`[execCommandInTerminal] ${cwd}$ ${command}`);

		const terminal = vscode.window.createTerminal(terminalOptions);
		terminal.show();

		// terminal.sendText(wrappedCommand);

		return terminal;
	}


	public async runInTerminalInteractive(cwd: string, command: string, createNew = false): Promise<vscode.Terminal | undefined> {
		if (!command) {
			throw new Error('command for runInTerminalInteractive is empty: ' + command);
		}

		const terminalName = this.DefaultTerminalName;
		const shellPath = Path.whichNormalized(pu.execPaths.shell.path);
		const terminalOptions = {
			name: terminalName,
			cwd,
			shellPath: shellPath
		};

		// hackfix: when running multiple commands in serial, subsequent terminal access might fail, if too fast
		await sleep(300);

		const term = createNew ?
			this.recreateTerminal(terminalOptions) :
			this.getOrCreateTerminal(terminalOptions);

		if (term) {
			// hackfix: sometimes, the terminal needs a tick before it can receive text
			await sleep(1);

			term.sendText(command, true);
			term.show(false);
		}
		return term;
	}

	//

	//

	//

	//

	public colorText(text: string): string {
		let output = '';
		let colorIndex = 1;
		for (let i = 0; i < text.length; i++) {
			const char = text.charAt(i);
			if (char === ' ' || char === '\r' || char === '\n') {
				output += char;
			} else {
				output += `\x1b[3${colorIndex++}m${text.charAt(i)}\x1b[0m`;
				if (colorIndex > 6) {
					colorIndex = 1;
				}
			}
		}
		return output;
	}

	public async selectTerminal(): Promise<vscode.Terminal | undefined> {
		interface TerminalQuickPickItem extends vscode.QuickPickItem {
			terminal: vscode.Terminal;
		}
		const terminals = <vscode.Terminal[]>(<any>vscode.window).terminals;
		const items: TerminalQuickPickItem[] = terminals.map(t => {
			return {
				label: `name: ${t.name}`,
				terminal: t
			};
		});
		const item = await vscode.window.showQuickPick(items);
		return item ? item.terminal : undefined;
	}

	// public selectTerminal(): Thenable<vscode.Terminal | undefined> {
	// 	interface TerminalQuickPickItem extends vscode.QuickPickItem {
	// 		terminal: vscode.Terminal;
	// 	}
	// 	const terminals = <vscode.Terminal[]>(<any>vscode.window).terminals;
	// 	const items: TerminalQuickPickItem[] = terminals.map(t => {
	// 		return {
	// 			label: `name: ${t.name}`,
	// 			terminal: t
	// 		};
	// 	});
	// 	return vscode.window.showQuickPick(items).then(item => {
	// 		return item ? item.terminal : undefined;
	// 	});
	// }

	public ensureTerminalExists(): boolean {
		if ((<any>vscode.window).terminals.length === 0) {
			vscode.window.showErrorMessage('No active terminals');
			return false;
		}
		return true;
	}

	public createTerminal() {
		vscode.window.createTerminal(`Ext Terminal #${this.NEXT_TERM_ID++}`);
		// vscode.window.showInformationMessage('Hello World 2!');
		console.log(`createTerminal #${this.NEXT_TERM_ID}`);
	}

	public createTerminalForUser() {
		vscode.window.createTerminal({
			name: `Ext Terminal #${this.NEXT_TERM_ID++}`,
			hideFromUser: true
		} as any);
	}

	public createAndSend(cmd: string) {
		const terminal = vscode.window.createTerminal(`Ext Terminal #${this.NEXT_TERM_ID++}`);
		// terminal.sendText("echo 'Sent text immediately after creating'");
		terminal.sendText(cmd);
	}

	public createZshLoginShell() {
		vscode.window.createTerminal(`Ext Terminal #${this.NEXT_TERM_ID++}`, '/bin/zsh', ['-l']);
	}

	public hide() {
		if (this.ensureTerminalExists()) {
			this.selectTerminal().then(terminal => {
				if (terminal) {
					terminal.hide();
				}
			});
		}
	}

	public show() {
		if (this.ensureTerminalExists()) {
			this.selectTerminal().then(terminal => {
				if (terminal) {
					terminal.show();
				}
			});
		}
	}

	public showPreserveFocus() {
		if (this.ensureTerminalExists()) {
			this.selectTerminal().then(terminal => {
				if (terminal) {
					terminal.show(true);
				}
			});
		}
	}

	public sendText(text: string) {
		if (this.ensureTerminalExists()) {
			this.selectTerminal().then(terminal => {
				if (terminal) {
					terminal.sendText(text);
				}
			});
		}
	}

	public sendTextNoNewLine(text: string) {
		if (this.ensureTerminalExists()) {
			this.selectTerminal().then(terminal => {
				if (terminal) {
					terminal.sendText(text, false);
				}
			});
		}
	}

	public destroy() {
		if (this.ensureTerminalExists()) {
			this.selectTerminal().then(terminal => {
				if (terminal) {
					terminal.dispose();
				}
			});
		}
	}

	public async processId(): Promise<number | undefined> {
		this.ensureTerminalExists();
		const terminal = await this.selectTerminal();
		if (terminal) {
			return terminal.processId;
		}
		return Promise.reject('Could not select terminal');
	}

	//

	public async executeAndRead(command: string, outputFile: string, triggerFile: string): Promise<string> {
		this.ensureTerminalExists();
		const terminal = await this.selectTerminal();
		if (terminal) {
			terminal.sendText(command + ` > ${outputFile} || pwd > ${triggerFile}`);
			return this.waitForFileUpdate(outputFile, triggerFile);
		}
		return Promise.reject('Could not select terminal');
	}

	public async waitForFileUpdate(outputFile: string, triggerFile: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			const watcher = fs.watch(triggerFile);
			watcher.on('change', () => {
				watcher.close();
				fs.readFile(outputFile, 'utf8', (err, data) => {
					if (err) {
						reject(err);
					} else {
						resolve(data);
					}
				});
			});
			watcher.on('error', reject);
		});
	}


}


//
