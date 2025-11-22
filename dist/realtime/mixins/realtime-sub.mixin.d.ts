import { Mixin } from './mixin';
import { RealtimeClient } from '../realtime.client';
export declare class RealtimeSubMixin extends Mixin {
    apply(client: RealtimeClient): void;
    private handleRealtimeSub;
    private emitDirectEvent;
    get name(): string;
}
