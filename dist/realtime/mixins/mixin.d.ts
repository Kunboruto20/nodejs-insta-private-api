import { RealtimeClient } from '../realtime.client';
import { IgApiClient } from 'instagram-private-api';
export declare abstract class Mixin {
    abstract apply(client: RealtimeClient, ig: IgApiClient): void;
    abstract get name(): string;
}
export declare function applyMixins(mixins: Mixin[], client: RealtimeClient, ig: IgApiClient): void;
export declare function hook<K extends string, Fn extends (...args: any[]) => any>(target: {
    [x in K]: Fn;
}, key: K, hooks: {
    pre?: (...args: Parameters<Fn>) => void | {
        returnValue: ReturnType<Fn>;
        overrideReturn: boolean;
    };
    post?: (returnValue: ReturnType<Fn>, ...args: Parameters<Fn>) => void | {
        returnValue: ReturnType<Fn>;
        overrideReturn: boolean;
    };
}): void;
