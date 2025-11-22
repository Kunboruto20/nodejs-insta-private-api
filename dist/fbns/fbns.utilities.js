"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotificationFromJson = void 0;
const shared_1 = require("../shared");
const querystring = require("querystring");
const URL = require("url");
function createNotificationFromJson(json) {
    const data = JSON.parse(json);
    const notification = Object.defineProperty({}, 'description', {
        enumerable: false,
        value: data,
    });
    if ((0, shared_1.notUndefined)(data.t)) {
        notification.title = data.t;
    }
    if ((0, shared_1.notUndefined)(data.m)) {
        notification.message = data.m;
    }
    if ((0, shared_1.notUndefined)(data.tt)) {
        notification.tickerText = data.tt;
    }
    if ((0, shared_1.notUndefined)(data.ig)) {
        notification.igAction = data.ig;
        const url = URL.parse(data.ig);
        if (url.pathname) {
            notification.actionPath = url.pathname;
        }
        if (url.query) {
            notification.actionParams = querystring.decode(url.query);
        }
    }
    if ((0, shared_1.notUndefined)(data.collapse_key)) {
        notification.collapseKey = data.collapse_key;
    }
    if ((0, shared_1.notUndefined)(data.i)) {
        notification.optionalImage = data.i;
    }
    if ((0, shared_1.notUndefined)(data.a)) {
        notification.optionalAvatarUrl = data.a;
    }
    if ((0, shared_1.notUndefined)(data.sound)) {
        notification.sound = data.sound;
    }
    if ((0, shared_1.notUndefined)(data.pi)) {
        notification.pushId = data.pi;
    }
    if ((0, shared_1.notUndefined)(data.c)) {
        notification.pushCategory = data.c;
    }
    if ((0, shared_1.notUndefined)(data.u)) {
        notification.intendedRecipientUserId = data.u;
    }
    if ((0, shared_1.notUndefined)(data.s) && data.s !== 'None') {
        notification.sourceUserId = data.s;
    }
    if ((0, shared_1.notUndefined)(data.igo)) {
        notification.igActionOverride = data.igo;
    }
    if ((0, shared_1.notUndefined)(data.bc)) {
        const badgeCount = {};
        const parsed = JSON.parse(data.bc);
        if ((0, shared_1.notUndefined)(parsed.di)) {
            badgeCount.direct = parsed.di;
        }
        if ((0, shared_1.notUndefined)(parsed.ds)) {
            badgeCount.ds = parsed.ds;
        }
        if ((0, shared_1.notUndefined)(parsed.ac)) {
            badgeCount.activities = parsed.ac;
        }
        notification.badgeCount = badgeCount;
    }
    if ((0, shared_1.notUndefined)(data.ia)) {
        notification.inAppActors = data.ia;
    }
    return notification;
}
exports.createNotificationFromJson = createNotificationFromJson;
//# sourceMappingURL=fbns.utilities.js.map