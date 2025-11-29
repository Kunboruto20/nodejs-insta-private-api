"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = exports.debugChannel = exports.tryUnzipAsync = exports.compressDeflate = exports.prepareLogString = void 0;

const pako = require('pako');
const debug = require('debug');

function prepareLogString(str) {
    return str.length > 100 ? str.substring(0, 100) + '...' : str;
}
exports.prepareLogString = prepareLogString;

function compressDeflate(data) {
    return Buffer.from(pako.deflate(data));
}
exports.compressDeflate = compressDeflate;

async function tryUnzipAsync(data) {
    try {
        return Buffer.from(pako.inflate(data));
    } catch (e) {
        return data;
    }
}
exports.tryUnzipAsync = tryUnzipAsync;

function debugChannel(channel) {
    return debug(`ig:mqtt:${channel}`);
}
exports.debugChannel = debugChannel;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.delay = delay;
