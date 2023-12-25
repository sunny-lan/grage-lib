export type WebsocketMsg = ArrayBufferView | ArrayBuffer | string;
export declare enum ConnectionState {
    Connected = 0,
    Disconnected = 1
}
export type ConnStateListener = (state: ConnectionState) => void;
export type MsgListener = (data: WebsocketMsg) => void;
export interface IWebsocket {
    begin(url: string): () => void;
    send(data: WebsocketMsg): void;
    onMessage(callback: MsgListener): () => void;
    getConnectionState(): ConnectionState;
    onConnectionStateChanged(callback: ConnStateListener): () => void;
}
export interface W3CWebsocketMsg {
    readonly data: any;
}
export type W3CMsgListener = (data: W3CWebsocketMsg) => void;
export interface IW3CWebsocketObj {
    send(data: WebsocketMsg): void;
    readyState: number;
    onopen: () => void;
    onmessage: W3CMsgListener | null;
    onerror: (error: Error) => void;
    onclose: (event: IW3CCloseEvent) => void;
}
export interface IW3CCloseEvent {
    code: number;
    reason: string;
    wasClean: boolean;
}
export interface IW3CWebsocket {
    CLOSING: number;
    CLOSED: number;
    new (url: string): IW3CWebsocketObj;
}
