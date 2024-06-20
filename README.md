# zig-main-runner README

"zig-main-runner": Run or Debug zig main function in-place.

## Features

This extension adds few [commands](https://code.visualstudio.com/api/extension-guides/command) for Zig development:

- Run/Debug main()
- Run/Debug a Single Test
- Run tests in a file
- Run tests in the workspace
- Build workspace
- Zig Main Runner: Debug test
- Zig Main Runner: Debug binary

We add some codelens links at the top of function main(), tests, and first line of a zig file, like the following![image-20240620081753359](https://cdn.jsdelivr.net/gh/hzimg/blog-pics@master/upgit/2024/06/20240620_1718845604.png)

Our inspiration is from [go-main-runner](https://marketplace.visualstudio.com/items?itemName=hedzr.go-main-runner), and [zig-language-extras](https://marketplace.visualstudio.com/items?itemName=ianic.zig-language-extras).

## Requirements

- Visual Studio Code 1.79 or newer (or editors compatible with VS Code 1.79+ APIs)
- Zig ~~0.10 or newer~~ any version and Zls
- Visual Studio Code Extensions:
  - [VS Code Zig Language extension](https://marketplace.visualstudio.com/items?itemName=ziglang.vscode-zig)

## Extension Settings

### Enable Code Lens

You may disable or enable vscode codelens totally.

![image-20240620082658751](https://cdn.jsdelivr.net/gh/hzimg/blog-pics@master/upgit/2024/06/20240620_1718845606.png)

With settings:

```json
  "zig-main-runner.main.enableCodeLens": false,
```

Default is true.

### Enable Code Lens

You may enable or disable vscode codelen for test cases.

![image-20240620082835992](https://cdn.jsdelivr.net/gh/hzimg/blog-pics@master/upgit/2024/06/20240620_1718845607.png)

With settings:

```json
  "zig-main-runner.main.enableCodeLensForTests": true,
```

Default is false(disabled).

### Test Args

You may add additional test command arguments.

![image-20240620084819639](https://cdn.jsdelivr.net/gh/hzimg/blog-pics@master/upgit/2024/06/20240620_1718845608.png)

With settings

```json 
{
    "zig-main-runner.test.args": "--deps zlib=zlib --mod zlib::../zig-zlib/src/main.zig --library z",
}
```

But why?

## Guide

The launching of main() function will be emitted to a Terminal window (as a vscode Task or a normal terminal session). By default, launching it as a Task allows you reinvoke it easily (by using vscode command `Tasks: Rerun Last Task`)

> **TIP**  
>
> Requesting a keybinding to it is a good hit. Our private `keybindings.json` is a reference:
>
> ```json
> [
>     {
>       "key": "cmd+; cmd+;",
>       "command": "workbench.action.tasks.reRunTask"
>     }
> ]
> ```
>
> It is useful while you are invoking `main.zig` again and again.

When you're using Zig build.zig, only one main() can be supported because we have no plan to analysis `build.zig` for multiple executables.

### Build the Workspace

This works by running `zig build`.

### Test the Workspace

This works by running `zig build test`.

### Debugging

We assume the debugger is in your `PATH` to debug main() function or test cases.

To avoid unnecessary dependencies, our extension has only one dep to `zig laguage`. Here's some extensions for debugging:

- [Native Debug](https://marketplace.visualstudio.com/items?itemName=webfreak.debug) for debugging on Linux
- [CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb) for debugging on MacOS
- [C/C++](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb) for debugging on Windows

But, you could manage the debuggers with OS package managers.

The default debugger types for each platform are as follows:

- "lldb" for darwin platform
- "cppvsdbg" for win32 platform
- "gdb" for other platforms

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.1

First public release

---

## REFs

- <https://code.visualstudio.com/api/working-with-extensions/publishing-extension>
* [VS Code Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
