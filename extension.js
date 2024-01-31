const vscode = require("vscode");
const child_process = require("child_process");
const path = require("path");
const fs = require("fs");
const iconv = require("iconv-lite");
const isWin = process.platform == "win32";

function bufs2str(bufs) {
	let data = Buffer.concat(bufs);
	let outstr = isWin ? iconv.decode(data, "gbk") : data;
	return outstr.replace(/\r\n/g, "\n");
}

function execShell(command, options) {
	return new Promise((resolve, reject) => {
		let cmd = child_process.exec(command, options);
		let buffers = [];
		cmd.stdout.on("data", function (data) {
			buffers.push(data);
		});
		let errors = [];
		cmd.stderr.on("data", function (data) {
			errors.push(data);
		});
		cmd.on("exit", function (code) {
			var outstr = bufs2str(buffers);
			if (code) {
				vscode.window.showErrorMessage(bufs2str(errors));
			}
			resolve(outstr);
		});
		cmd.on("error", function (e) {
			console.log(command, e);
			resolve("");
		});
	});
}

let prev = "";
function loades() {
	let espath = require.resolve("./esdemo.js");
	const config = vscode.workspace.getConfiguration();
	let extraModulePath = config.get("easyShell.extraModulePath");
	if (extraModulePath) {
		try {
			espath = require.resolve(extraModulePath);
		} catch (error) {}
	}
	let es;
	try {
		let stat = fs.statSync(espath);
		let key = espath + stat.mtimeMs;
		if (prev != key) {
			delete require.cache[espath];
		}
		es = require(espath);
		prev = key;
	} catch (error) {}
	return es;
}

async function exec(editer, selection) {
	const workspace = vscode.workspace.getWorkspaceFolder(editer.document.uri);
	const config = vscode.workspace.getConfiguration();
	const file = editer.document.fileName;
	const cwd = path.dirname(file) || workspace;
	if (cwd) process.chdir(cwd);
	process.env.WORKSPACE = workspace ? workspace.uri.fsPath : "";
	process.env.CLIPBOARD = await vscode.env.clipboard.readText().catch(() => "");
	process.env.FILE = file;
	let es = loades();
	let command = editer.document.getText(selection);
	if (!command) {
		let line = editer.document.lineAt(selection.end.line);
		command = line.text;
		let b = command.length - line.text.trimLeft().length;
		selection = new vscode.Selection(line.lineNumber, b, line.lineNumber, line.range.end.character);
	}
	if (!command) return;
	command = command.trim();
	if (/^(\d|\(|\w+\.)/.test(command)) {
		let outstr = "";
		try {
			outstr = eval(command);
			if (typeof outstr == "function") outstr = outstr();
			if (outstr && typeof outstr.then == "function") outstr = await outstr;
		} catch (error) {
			vscode.window.showErrorMessage(error.message);
		}
		try {
			if (typeof outstr == "object") outstr = JSON.stringify(outstr, null, "\t");
		} catch (error) {}
		outstr += "\n";
		return {selection, outstr};
	} else {
		let options = {
			encoding: "buffer",
			env: {
				file: file,
				basename: path.basename(file),
			},
		};
		let shellPath = config.get("easyShell.shellPath");
		if (shellPath) {
			options.shell = shellPath;
		}
		let outstr = await execShell(command, options);
		return {selection, outstr};
	}
}

function activate(context) {
	let disposable = vscode.commands.registerCommand("easyShell.run", function () {
		let editer = vscode.window.activeTextEditor;
		Promise.all(editer.selections.map((x) => exec(editer, x))).then((outs) => {
			if (editer.selections.length > 1) {
				editer.edit(function (edit) {
					for (let {selection, outstr} of outs) {
						edit.replace(selection, outstr.trim());
					}
				});
			} else {
				let cloneLine = vscode.workspace.getConfiguration().get("easyShell.cloneLine");
				for (let {selection, outstr} of outs) {
					if (cloneLine && selection.start.line == selection.end.line) {
						let b = selection.start.character;
						let e = selection.end.character;
						let line_num = selection.start.line;
						let line = editer.document.lineAt(line_num);
						let line_end = line.range.end.character;
						let prefix = editer.document
							.getText(new vscode.Selection(line_num, 0, line_num, b))
							.trimLeft();
						let suffix = editer.document.getText(
							new vscode.Selection(line_num, e, line_num, line_end)
						);
						outstr = outstr.replace(/([^\n]*)\n/g, prefix + "$1$$1" + suffix + "\n");
						outstr = outstr.slice(prefix.length, outstr.length - suffix.length - 1);
					} else {
						outstr = outstr.replace(/\n/g, "$1\n");
					}
					if (outstr[outstr.length - 1] === "\n") outstr = outstr.slice(0, outstr.length - 1);
					editer.insertSnippet(new vscode.SnippetString(outstr), selection);
				}
			}
		});
	});

	context.subscriptions.push(disposable);
	vscode.languages.getLanguages().then((languages) => {
		let disposable = vscode.languages.registerCompletionItemProvider(
			languages,
			{
				provideCompletionItems(document, position) {
					const linePrefix = document.lineAt(position).text.slice(0, position.character).trim();
					if (!linePrefix.startsWith("es.")) {
						return undefined;
					}
					let es = loades();
					let list = [];
					for (let k in es) {
						let v = es[k];
						if (typeof v == "function")
							list.push(new vscode.CompletionItem(k, vscode.CompletionItemKind.Method));
						else list.push(new vscode.CompletionItem(k, vscode.CompletionItemKind.Field));
					}
					return list;
				},
			},
			"."
		);
		context.subscriptions.push(disposable);
	});
}
exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate;
