"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hook = exports.applyMixins = exports.Mixin = void 0;
class Mixin {
}
exports.Mixin = Mixin;
function applyMixins(mixins, client, ig) {
    for (const mixin of mixins)
        mixin.apply(client, ig);
}
exports.applyMixins = applyMixins;
function hook(target, key, hooks) {
    const base = target[key];
    const wrapper = (...args) => {
        let returnValue;
        let overrideReturn = false;
        if (hooks.pre) {
            const res = hooks.pre.apply(target, args);
            if (typeof res === 'object' && res.overrideReturn) {
                overrideReturn = true;
                returnValue = res.returnValue;
            }
        }
        const actualReturn = base.apply(target, args);
        if (!overrideReturn)
            returnValue = actualReturn;
        if (hooks.post) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- it's always defined
            const res = hooks.post.apply(target, [returnValue, ...args]);
            if (typeof res === 'object' && res.overrideReturn) {
                returnValue = res.returnValue;
            }
        }
        // @ts-expect-error -- return value will be set [if pre sets it, else overrideReturn is false and it will be set by the actual function
        return returnValue;
    };
    // @ts-expect-error -- any[] vs Parameters<Fn>
    target[key] = wrapper.bind(target);
}
exports.hook = hook;
//# sourceMappingURL=mixin.js.map