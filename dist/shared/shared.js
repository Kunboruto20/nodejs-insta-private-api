"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareLogString = exports.listenOnce = exports.notUndefined = exports.debugChannel = exports.isJson = exports.tryUnzipAsync = exports.unzipAsync = exports.compressDeflate = exports.createFbnsUserAgent = void 0;
const zlib_1 = require("zlib");
const debug_1 = require("debug");
const util_1 = require("util");
const deflatePromise = (0, util_1.promisify)(zlib_1.deflate);
const unzipPromise = (0, util_1.promisify)(zlib_1.unzip);
// TODO: map
function createFbnsUserAgent(ig) {
    const [androidVersion, , resolution, manufacturer, deviceName] = ig.state.deviceString.split('; ');
    const [width, height] = resolution.split('x');
    const params = {
        FBAN: 'MQTT',
        FBAV: ig.state.appVersion,
        FBBV: ig.state.appVersionCode,
        FBDM: `{density=4.0,width=${width},height=${height}`,
        FBLC: ig.state.language,
        FBCR: 'Android',
        FBMF: manufacturer.trim(),
        FBBD: 'Android',
        FBPN: 'com.instagram.android',
        FBDV: deviceName.trim(),
        FBSV: androidVersion.split('/')[1],
        FBLR: '0',
        FBBK: '1',
        FBCA: 'x86:armeabi-v7a',
    };
    return `[${Object.entries(params)
        .map(p => p.join('/'))
        .join(';')}]`;
}
exports.createFbnsUserAgent = createFbnsUserAgent;
function compressDeflate(data) {
    return deflatePromise(data, { level: 9 });
}
exports.compressDeflate = compressDeflate;
function unzipAsync(data) {
    return unzipPromise(data);
}
exports.unzipAsync = unzipAsync;
async function tryUnzipAsync(data) {
    try {
        if (data.readInt8(0) !== 0x78)
            return data;
        return unzipAsync(data);
    }
    catch (e) {
        return data;
    }
}
exports.tryUnzipAsync = tryUnzipAsync;
function isJson(buffer) {
    return !!String.fromCharCode(buffer[0]).match(/[{[]/);
}
exports.isJson = isJson;
/**
 * Returns a debug function with a path starting with ig:mqtt
 * @param {string} path
 * @returns {(msg: string, ...additionalData: any) => void}
 */
const debugChannel = (...path) => (0, debug_1.default)(['ig', 'mqtt', ...path].join(':'));
exports.debugChannel = debugChannel;
function notUndefined(a) {
    return typeof a !== 'undefined';
}
exports.notUndefined = notUndefined;
function listenOnce(client, topic) {
    return new Promise(resolve => {
        const removeFn = client.listen(topic, msg => {
            removeFn();
            resolve(msg);
        });
    });
}
exports.listenOnce = listenOnce;
const MAX_STRING_LENGTH = 128;
const ACTUAL_MAX_LEN = MAX_STRING_LENGTH - `"[${MAX_STRING_LENGTH}...]"`.length;
function prepareLogString(value) {
    if (value.length > ACTUAL_MAX_LEN) {
        value = `${value.substring(0, ACTUAL_MAX_LEN)}[${MAX_STRING_LENGTH}...]`;
    }
    return `"${value}"`;
}
exports.prepareLogString = prepareLogString;
//# sourceMappingURL=shared.js.map