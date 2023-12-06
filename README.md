# easy-shell

run select text as shell command and replace the select text with the stdout

## Features

![](https://github.com/inu1255/vscode-easy-shell/blob/master/screenshot/feature.gif?raw=true)

default keymaps `cmd+. cmd+e`

1. exec shell command such as `ls -l`(it will be replaced by the stdout)
2. exec js code such as `1+2`(it will be replaced by the result `3`)
3. you can define your own scripts in `somefile.js` and config `easyShell.extraModulePath` in vscode settings
4. you can switch shell by config `easyShell.shellPath` in vscode settings
5. you can use `$FILE`,`$WORKSPACE`,`$CLIPBOARD` in shell command, in windows you can use `%FILE%`,`%WORKSPACE%`,`%CLIPBOARD%`

## Extra Module

create `somefile.js` in some path such as `/home/xxx/somefile.js`

```js
// /home/xxx/somefile.js
module.exports = {
  hello: () => "world",
};
```

config `easyShell.extraModulePath` in vscode settings

```json
{
  "easyShell.extraModulePath": "/home/xxx/somefile.js"
}
```

then you can use `es.hello` or `es.hello()`


![](https://github.com/inu1255/vscode-easy-shell/blob/master/screenshot/extra.gif?raw=true)

more usage see [esdemo.js](esdemo.js)