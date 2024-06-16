'use strict';

// import sh from 'shelljs';
// import fs from 'fs';
import { homedir } from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
// import { window, workspace, ExtensionContext } from 'vscode';
import commonAncestorPath from 'common-ancestor-path';
import * as osUtil from './os-util';
import { AppDataFileNameSuffix, AppScopeName } from './consts';

export class CodePathConfig {
    exportDirectoryOverride: string = '';
    nodePath: string = '';
}

abstract class Base {

    public static normalize(path: string): string { return path.normalize(path); }
    public static join(...paths: string[]): string { return path.join(...paths); }
    public static resolve(...paths: string[]): string { return path.resolve(...paths); }

    public static isAbsolute(_path: string): boolean { return path.isAbsolute(_path); }

    public static relative(from: string, to: string): string { return path.relative(from, to); }
    public static dirname(_path: string): string { return path.dirname(_path); }
    public static basename(_path: string): string { return path.basename(_path); }
    public static extname(_path: string): string { return path.extname(_path); }

    public readonly sep = path.sep;
    public readonly delimiter = path.delimiter;

    public static parse(_path: string): path.ParsedPath { return path.parse(_path); }
    public static format(pathObject: path.FormatInputPathObject): string { return path.format(pathObject); }
    public static toNamespacedPath(_path: string): string { return path.toNamespacedPath(_path); }

    public readonly posix = path.posix;
    public readonly win32 = path.win32;

    public static exists(file: string): Promise<boolean> {
        return new Promise<boolean>((resolve, _reject) => {
            fs.exists(file, (value) => {
                resolve(value);
            });
        });
    }

    public static existsSync(file: string): boolean { return fs.existsSync(file); }

};

export default abstract class Path extends Base {

    /**
     * 
     */
    public static get nodePath(): string {
        // const hasVolta = !!whichNormalized('volta');
        // if (hasVolta) {
        //   // get the actual Node binary location that is not inside the target directory (i.e. the globally installed version)
        //   const nodePath = await Process.execCaptureOut(`volta which node`, { processOptions: { cwd: __dirname } });
        //   return pathNormalized(nodePath);
        // }
        const p = vscode.workspace.getConfiguration(AppScopeName).get<string>('paths.node');
        return p || 'node';
    }

    /**
     * 
     */
    public static get npmPath(): string {
        const p = vscode.workspace.getConfiguration(AppScopeName).get<string>('paths.npm');
        return p || 'npm';
    }

    /**
     * 
     */
    public static get yarnPath(): string {
        const p = vscode.workspace.getConfiguration(AppScopeName).get<string>('paths.yarn');
        return p || 'yarn';
    }

    public static getSystemPath(what: string): string | undefined {
        const systemPathName = osUtil.isWindows() ? 'paths.windows' : 'paths.posix';
        return vscode.workspace.getConfiguration(AppScopeName).get<string>(`${systemPathName}.${what}`);
    }

    public static get shellPath(): string {
        const p = this.getSystemPath('shell');
        return p || 'bash';
    }

    public static get shellName(): string {
        const p = this.shellPath;
        // https://stackoverflow.com/questions/4250364/how-to-trim-a-file-extension-from-a-string-in-javascript
        return path.parse(p).name;
    }

    static getShellConfig(what: string, shell: string | null = null, dontCheck = false): string {
        if (!shell) {
            // look-up shell
            shell = this.shellName;
        }
        const target = `shells.${shell}.${what}`;
        const val = vscode.workspace.getConfiguration(AppScopeName).get<string>(target);
        if (!dontCheck && !val) {
            throw new Error(`Could not read config value "${target}" - It must not be empty or undefined!`);
        }
        return val!;
    }

    public static get shellInlineFlags(): string {
        return this.getShellConfig('inlineFlags');
    }

    public static get shellPauseCommand(): string {
        return this.getShellConfig('pause');
    }

    public static get shellSep(): string {
        return this.getShellConfig('sep');
    }

    static fixExecutablePath(p: string): string {
        if (p.includes(' ')) {
            return `"${p}"`;
        } else {
            return p;
        }
    }


    /**
     * Get command executable path
     * @param {string} command the command being queried
     * @return {string} the actual path where `command` is
     */
    public static whichNormalized(command: string): string | null {
        // const cp = require('child_process');
        const fpath = cp.execSync(`which "${command}"`);
        // const fpath = await this.executeAndRead(`which "${command}"`);
        return fpath ? this.normalized(fpath.toString().trim()) : null;
    }

    public static realPathSyncNormalized(fpath: string, options: any): string {
        return this.normalized(fs.realpathSync(fpath, options));
    }

    public static resolve(...paths: string[]): string {
        return this.normalized(super.resolve(...paths));
    }

    /**
     * @param  {...string} paths 
     * @returns {string}
     */
    public static join(...paths: string[]): string {
        return this.normalized(super.join(...paths));
    }

    /**
     * @param {*} from Usually the shorter (potential parent/folder) path.
     * @param {*} to The (usually) more concrete file path.
     */
    public static relative(from: string, to: string): string {
        from = this.normalized(from);
        to = this.normalized(to);
        const sep = '/';
        if (!from.endsWith(sep)) { from += '/'; }
        if (!to.endsWith(sep)) { to += '/'; }
        return this.normalized(path.relative(from, to));
    }

    /**
     * It appears, VSCode is now not normalizing or normalizing to lower-case drive letter (e.g. in Uri.fspath!!!):
     * @see https://code.visualstudio.com/api/references/vscode-api#Uri 
     * @see https://github.com/microsoft/vscode/issues/45760#issuecomment-373417966
     * @see https://github.com/microsoft/vscode/blob/94c9ea46838a9a619aeafb7e8afd1170c967bb55/test/unit/coverage.js#L81
     * 
     * Before that (in 2016), they decided for upper-case drive letters:
     * @see https://github.com/microsoft/vscode/issues/9448
     * @see https://github.com/microsoft/vscode/commit/a6c845baf7fed4a186e3b744c5c14c0be53494fe
     */
    public static normalizeDriveLetter(fpath: string): string {
        if (fpath && fpath[1] === ':') {
            fpath = fpath[0].toUpperCase() + fpath.substr(1);
        }
        return fpath;
    }

    public static normalized(fpath: string): string {
        return fpath.replace(/\\/g, '/');
    }

    /**
     * In addition to standard normalization, also enforces upper-case drive letter.
     */
    public static normalizedForce(fpath: string): string {
        return this.normalizeDriveLetter(this.normalized(fpath));
    }

    public static getPathRelativeToCommonAncestor(fpath: string, ...otherPaths: string[]): string {
        const common = this.getCommonAncestorPath(fpath, ...otherPaths);
        return this.normalizedForce(
            common &&
            this.relative(common, fpath) ||
            fpath
        );
    }

    /**
     * @see https://github.com/isaacs/common-ancestor-path#readme
     */
    public static getCommonAncestorPath(...paths: string[]): string {
        // NOTE: the library requires OS-specific separators
        if (paths.length === 0) {
            return '';
        }
        paths = paths.map(p => path.resolve(p));
        const result = commonAncestorPath(...paths);
        return this.normalized(result || '');
    }

    public static isFileInPath(parent: string, file: string): boolean {
        const relative = this.relative(parent, file);
        return (!!relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
    }

    public static renderPath(fpath: string): string {
        const home = homedir();
        if (fpath.startsWith(home)) {
            fpath = '~' + fpath.substring(home.length);
        }
        return fpath;
    }

}

export class PathHolder {
    cfg?: CodePathConfig;
    context?: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext | null = null, _cfg: CodePathConfig | null = null) {
        if (context) {
            this.context = context;
        }
        if (_cfg) {
            this.cfg = _cfg; // this.setCodePathConfig(_cfg);
        }
    }

    public setCodePathConfig(_cfg: CodePathConfig) {
        this.cfg = _cfg;
    }

    public getDefaultExportDirectory() {
        const dir = Path.resolve(this.userDataDirectory, 'exports');
        return this.cfg?.exportDirectoryOverride || dir;
    }

    public getApplicationDataPath(basePath: string, zip = true): string {
        let exportPath = Path.join(
            this.getDefaultExportDirectory(),
            `${basePath}${AppDataFileNameSuffix}`
        );
        if (zip) {
            exportPath += '.zip';
        }
        return exportPath;
    }

    //

    public get userDataDirectory(): string {
        return this.asAbsolutePath('userdata');
    }

    public get logsDirectory(): string {
        return Path.resolve(this.userDataDirectory, 'logs');
    }

    public get extensionPath(): string {
        if (this.context) {
            return Path.normalizedForce(this.context.extensionPath);
        }
        return '';
    }

    public get gitPath(): string {
        const p = vscode.workspace.getConfiguration(AppScopeName).get<string>('paths.git');
        return p || 'git';
    }

    /**
     * @returns normalized, absolute path to the dbux-code extension directory.
     */
    public get codeDirectory(): string {
        return this.asAbsolutePath('.');
    }

    public getResourcePath(...relativePathSegments: string[]): string {
        return this.asAbsolutePath(Path.join('resources', ...relativePathSegments));
    }

    public getThemeResourcePath(...relativePathSegments: string[]) {
        return {
            light: this.getResourcePath('light', ...relativePathSegments),
            dark: this.getResourcePath('dark', ...relativePathSegments)
        };
    }

    public getThemeResourcePathUri(...relativePathSegments: string[]) {
        return {
            light: vscode.Uri.file(this.getResourcePath('light', ...relativePathSegments)),
            dark: vscode.Uri.file(this.getResourcePath('dark', ...relativePathSegments))
        };
    }

    public asAbsolutePath(fpath: string): string {
        if (this.context) {
            return Path.normalizedForce(this.context.asAbsolutePath(fpath));
        }
        return '';
    }

} // class PathHolder

export const execPaths = {
    pathHolder: new PathHolder(),

    get git(): string {
        return this.pathHolder.gitPath;
    },
    get node(): string {
        return Path.nodePath;
    },
    get npm(): string {
        return Path.npmPath;
    },
    get yarn(): string {
        return Path.yarnPath;
    },
    shell: {
        get path(): string {
            return Path.shellPath;
        },
        get name(): string {
            return Path.shellName;
        },
        get inlineFlags(): string {
            return Path.shellInlineFlags;
        },
        get pauseCommand(): string {
            return Path.shellPauseCommand;
        },
        get sep(): string {
            return Path.shellSep;
        },
    },
    /**
     * Put shell executable paths in quotation marks, plus -
     * 
     * hackfix: work-around volta bug for yarn and npm.
     * @see https://github.com/volta-cli/volta/issues/1199
     */
    inShell: {
        get yarn() {
            const { yarn } = execPaths;
            return Path.fixExecutablePath(yarn);
        },
        get npm() {
            const { npm } = execPaths;
            return Path.fixExecutablePath(npm);
        }
    }
};