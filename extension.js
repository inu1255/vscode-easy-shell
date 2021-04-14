const vscode = require("vscode");
const shell = require("child_process");
const path = require("path");
const iconv = require("iconv-lite");
const isWin = process.platform == "win32";
function streamToBuffer(stream) {
	return new Promise((resolve, reject) => {
		let buffers = [];
		stream.on("error", reject);
		stream.on("data", (data) => buffers.push(data));
		stream.on("end", () => resolve(Buffer.concat(buffers)));
	});
}
function exec(editer, selection) {
	return new Promise((resolve, reject) => {
		let command = editer.document.getText(selection);
		if (!command) {
			let line = editer.document.lineAt(selection.end.line);
			command = line.text;
			let b = command.length - line.text.trimLeft().length;
			selection = new vscode.Selection(
				line.lineNumber,
				b,
				line.lineNumber,
				line.range.end.character
			);
		}
		if (!command) return;
		command = command.trim();
		if (/^\d/.test(command)) {
			let outstr = eval(command) + "\n";
			resolve({selection, outstr});
		} else {
			let cmd = shell.exec(command, {
				cwd: path.dirname(editer.document.fileName),
				encoding: "buffer",
				env: Object.assign({}, process.env, {
					file: editer.document.fileName,
					basename: path.basename(editer.document.fileName),
				}),
			});
			let buffers = [];
			cmd.stdout.on("data", function (data) {
				buffers.push(data);
			});
			cmd.on("exit", function () {
				var data = Buffer.concat(buffers);
				var outstr = "";
				outstr += isWin ? iconv.decode(data, "gbk") : data;
				outstr = outstr.replace(/\r\n/g, "\n");
				resolve({selection, outstr});
			});
			cmd.on("error", function (e) {
				console.log(command, e);
				resolve("");
			});
		}
	});
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
}
exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate;
