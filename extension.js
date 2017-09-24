const vscode = require('vscode');
const shell = require("child_process")
const path = require("path")

function activate(context) {
    let disposable = vscode.commands.registerCommand('easyShell.run', function () {
        let editer = vscode.window.activeTextEditor
        let command = editer.document.getText(editer.selection)
        let cmd = shell.exec(command,{cwd:path.dirname(editer.document.fileName)})
        var outstr = ""
        cmd.stdout.on("data", function (data) {
            outstr += data
        })
        cmd.on("exit", function () {
            outstr = outstr.replace(/\n/g, "$1\n")
            if(outstr[outstr.length-1]==="\n")
                outstr = outstr.slice(0, outstr.length-1)
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