# zig-main-runner README

This is the README for your extension "zig-main-runner". After writing up a brief description, we recommend including the following sections.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

## Initial

```bash
npm install --global yo generator-code

yo code
```

## How to package and publish

First, install `vsce`:

```bash
npm install -g @vscode/vsce
```

And,

```bash
$ cd myExtension
$ vsce package
# myExtension.vsix generated
$ vsce publish
# <publisher id>.myExtension published to VS Code Marketplace
```

### Got errors when packaging or publishing

See also: <https://stackoverflow.com/questions/59798905/vsce-publish-fails-vs-code-extension-using-pnpm-yarn>

This happens because the extension's linker fails to resolve the dependencies.

To fix it do the following depending on which node package manager your repo uses:

- `yarn` repo:

  ```bash
  vsce publish --yarn -p $my_token
  ```

- `pnpm` repo:

  1. if you have no runtime dependencies you can keep it simple, just add this to your `package.json`

     ```json
     "scripts": {
         "package": "pnpm vsce package --no-dependencies",
         "publish": "pnpm vsce publish --no-dependencies"
     }
     ```

     or run the command `vsce publish patch --no-dependencies` (use `minor` or `major` instead of `patch` as needed, see [semver](https://semver.org/))

  2. if you have runtime dependencies you need to bundle them first, so additionally to (1) also add this to your `package.json`

     ```json
     "scripts": {
         "vscode:prepublish": "npm run esbuild-base -- --minify",
         "esbuild-base": "esbuild ./src/extension.ts --bundle --outfile=out/main.js --external:vscode --format=cjs --platform=node"
     }
     ```

For either case you'll obviously need to install vsce with

```bash
pnpm i -D vsce # or `yarn add -D vsce`
```

and in the 2nd pnpm case you'll also need esbuild too

```bash
pnpm i -D esbuild
```

See more info in the [related Github issue](https://github.com/microsoft/vscode-vsce/issues/421#issuecomment-1038911725).

## REFs

- <https://code.visualstudio.com/api/working-with-extensions/publishing-extension>

**Enjoy!**
