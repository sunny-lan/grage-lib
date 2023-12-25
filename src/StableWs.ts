import {
    ConnectionState,
    ConnStateListener,
    IW3CWebsocket,
    IW3CWebsocketObj,
    IWebsocket,
    MsgListener,
    W3CWebsocketMsg,
    WebsocketMsg
} from "./IWebsocket";
import {w3cwebsocket as _W3CWebSocket} from "websocket";

const w3cwebsocket:IW3CWebsocket=_W3CWebSocket;

const noop=()=>{};

export default class StableWs implements IWebsocket {
    private connectionState: ConnectionState = ConnectionState.Disconnected

    declare private ws_?: IW3CWebsocketObj
    private url: string
    private connStateListeners: Set<ConnStateListener> = new Set<ConnStateListener>()
    private msgListeners: Set<MsgListener> = new Set<MsgListener>();


    begin(url: string): () => void {
        this.url = url
        this.ws()
        return this.terminateWs.bind(this);
    }

    getConnectionState(): ConnectionState {
        return this.connectionState
    }

    onConnectionStateChanged(callback: ConnStateListener): () => void {
        callback(this.getConnectionState())
        this.connStateListeners.add(callback)
        return () => this.connStateListeners.delete(callback)
    }

    onMessage(callback: MsgListener): () => void {
        this.msgListeners.add(callback)
        return () => this.msgListeners.delete(callback)
    }

    send(data: WebsocketMsg): void {
        if(this.connectionState===ConnectionState.Disconnected)
            throw Error('Send called while disconnected')

        this.ws().send(data)
    }


    private updateConnState(state: ConnectionState) {
        if (this.connectionState != state) {
            this.connectionState = state
            for (const listener of this.connStateListeners) {
                listener(state)
            }
        }
    }

    private ws(): IW3CWebsocketObj {
        if (this.ws_?.readyState === w3cwebsocket.CLOSING || this.ws_?.readyState === w3cwebsocket.CLOSED) {
            this.terminateWs()
        }

        if (this.ws_ === undefined) {
            this.ws_ = new w3cwebsocket(this.url)
            this.ws_.onmessage = this.handleMessage.bind(this)
            this.ws_.onopen = ()=>this.updateConnState(ConnectionState.Connected)
            this.ws_.onclose= this.terminateWs.bind(this)
            this.ws_.onerror=(err)=>{
                console.error(err)
                this.terminateWs()
            }
        }
        return this.ws_
    }


    private terminateWs() {
        this.ws_!.onmessage = null;
        this.ws_!.onclose=noop;
        this.ws_!.onopen=noop;
        this.ws_!.onerror=noop;

        this.ws_ = undefined;
        this.updateConnState(ConnectionState.Disconnected)
    }

    private handleMessage(data: W3CWebsocketMsg) {
        for (const listener of this.msgListeners) {
            listener(data.data)
        }
    }
}