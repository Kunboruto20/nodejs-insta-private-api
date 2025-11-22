/// <reference types="node" />
import { IgApiClient, StatusResponse } from 'instagram-private-api';
import { FbnsDeviceAuth } from './fbns.device-auth';
import { ToEventFn } from '../shared';
import { FbnsNotificationUnknown } from './fbns.types';
import { EventEmitter } from 'eventemitter3';
import { FbnsClientEvents } from './fbns.client.events';
import { SocksProxy } from 'socks';
import { ConnectionOptions } from 'tls';
export declare class FbnsClient extends EventEmitter<ToEventFn<FbnsClientEvents & {
    [x: string]: FbnsNotificationUnknown;
}>> {
    private readonly ig;
    get auth(): FbnsDeviceAuth;
    set auth(value: FbnsDeviceAuth);
    private fbnsDebug;
    private client?;
    private conn?;
    private _auth;
    private safeDisconnect;
    constructor(ig: IgApiClient);
    buildConnection(): void;
    connect({ enableTrace, autoReconnect, socksOptions, additionalTlsOptions, }?: {
        enableTrace?: boolean;
        autoReconnect?: boolean;
        socksOptions?: SocksProxy;
        additionalTlsOptions?: ConnectionOptions;
    }): Promise<any>;
    disconnect(): Promise<void>;
    private handleMessage;
    sendPushRegister(token: string): Promise<StatusResponse>;
}
