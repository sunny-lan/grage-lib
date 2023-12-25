import { ConnectionState, ConnStateListener, IWebsocket, MsgListener, WebsocketMsg } from "./IWebsocket";
export default class StableWs implements IWebsocket {
    private connectionState;
    private ws_?;
    private url;
    private connStateListeners;
    private msgListeners;
    begin(url: string): () => void;
    getConnectionState(): ConnectionState;
    onConnectionStateChanged(callback: ConnStateListener): () => void;
    onMessage(callback: MsgListener): () => void;
    send(data: WebsocketMsg): void;
    private updateConnState;
    private ws;
    private terminateWs;
    private handleMessage;
}
