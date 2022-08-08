"use strict"
const r = (f) => /in/.test(document.readyState) ? setTimeout('r(' + f + ')', 9) : f();

const getFromStorage = (key, type = 'sync') => new Promise(cb => chrome.storage[type].get(key, res => cb(res)));

function getObjectStack(value, ...keys) {
	for (let i = 0; i < keys.length; i++) {
		let key = keys[i]
		if (value === null || !value.hasOwnProperty(key)) {
			return null
		}

		value = value[key]
	}

	return value
}


function removeObjectStack(value, ...keys) {
	const key = keys.shift() || null

	if (!key || !value.hasOwnProperty(key)) {
		return false
	}

	if (keys.length === 0) {
		delete value[key]
		return true
	}

	return removeObjectStack(value[key], ...keys) // recursive
}

function safeJSON(str) {
	try {
		const json = JSON.parse(str);
		if (typeof json === "object" && json !== null) {
			return json;
		}
	}
	catch(e) {}

	return {};
}

function serialize(obj, prefix) {
	let ret = [];

	for (let p in obj) {
		if (obj.hasOwnProperty(p)) {
			let k = (prefix) ? prefix + "[" + p + "]" : p;
			let v = obj[p];

			ret.push(typeof v === "object"
				? serialize(v, k)
				: encodeURIComponent(k) + "=" + encodeURIComponent(v)
			);
		}
	}

	return ret.join("&");
}

function setObjectStack(...args) {
	let value = args.length ? args.pop() : null
	while (args.length) {
		let tmp = {}
		tmp[args.pop()] = value
		value = tmp
	}

	return value
}
