const crypto = require("crypto");

function md5(data) {
	return crypto.createHash("md5").update(data).digest("hex");
}

function hello() {
	return "hello world";
}
exports.hello = hello;

function pasteAll() {
	let s = "";
	s += `WORKSPACE=${process.env.WORKSPACE}\n`;
	s += `FILE=${process.env.FILE}\n`;
	s += `CLIPBOARD_MD5=${md5(process.env.CLIPBOARD)}\n`;
	s += `CLIPBOARD=${process.env.CLIPBOARD}\n`;
	s += `PWD=${process.cwd()}\n`;
	return s;
}
exports.pasteAll = pasteAll;
