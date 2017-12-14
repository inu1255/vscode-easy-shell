const vscode = require('vscode');
const shell = require("child_process")
const path = require("path")

function activate(context) {
    let disposable = vscode.commands.registerCommand('easyShell.run', function() {
        let editer = vscode.window.activeTextEditor
        let command = editer.document.getText(editer.selection)
        if (!command) {
            let line = editer.document.lineAt(editer.selection.end.line)
            command = line.text
            let b = command.length - line.text.trimLeft().length
            editer.selection = new vscode.Selection(line.lineNumber, b, line.lineNumber, line.range.end.character)
        }
        if (!command) return
        let cmd = shell.exec(command, {
            cwd: path.dirname(editer.document.fileName),
            env: Object.assign({}, process.env, {
                file: editer.document.fileName,
                basename: path.basename(editer.document.fileName)
            })
        })
        var outstr = ""
        cmd.stdout.on("data", function(data) {
            outstr += data
        })
        cmd.on("exit", function() {
            let cloneLine = vscode.workspace.getConfiguration().get('easyShell.cloneLine')
            if (cloneLine && editer.selection.start.line == editer.selection.end.line) {
                let b = editer.selection.start.character
                let e = editer.selection.end.character
                let line_num = editer.selection.start.line;
                let line = editer.document.lineAt(line_num)
                let line_end = line.range.end.character
                let prefix = editer.document.getText(new vscode.Selection(line_num, 0, line_num, b)).trimLeft()
                let suffix = editer.document.getText(new vscode.Selection(line_num, e, line_num, line_end))
                outstr = outstr.replace(/([^\n]*)\n/g, prefix + "$1$$1" + suffix + "\n")
                outstr = outstr.slice(prefix.length, outstr.length - suffix.length - 1)
            } else {
                outstr = outstr.replace(/\n/g, "$1\n")
            }
            if (outstr[outstr.length - 1] === "\n")
                outstr = outstr.slice(0, outstr.length - 1)
            editer.insertSnippet(new vscode.SnippetString(outstr), editer.selection)
            // editer.edit(function(edit){
            //     edit.replace(editer.selection, s);
            // })
        })
    });

    context.subscriptions.push(disposable);
}
exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate;