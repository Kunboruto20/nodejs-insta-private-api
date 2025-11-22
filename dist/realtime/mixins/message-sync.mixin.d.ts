import { Mixin } from './mixin';
import { RealtimeClient } from '../realtime.client';
export declare class MessageSyncMixin extends Mixin {
    apply(client: RealtimeClient): void;
    private handleMessageSync;
    private static getThreadIdFromPath;
    get name(): string;
}
