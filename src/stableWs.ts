import {ConnectionState, IWebsocket, WebsocketMsg} from "./IWebsocket";
import websocket from 'we'

type ConnStateListener = (state: ConnectionState) => void;
type MsgListener = (data: WebsocketMsg) => void;

export default class StableWs implements IWebsocket {
    private connectionState: ConnectionState = ConnectionState.Disconnected

    declare private ws_?: any
    private url: string

    private ws(): w3cwebsocket {
        if (this.ws_?.readyState === w3cwebsocket.CLOSING || this.ws_?.readyState === w3cwebsocket.CLOSED) {
            this.terminateWs()
        }

        if (this.ws_ === undefined) {
            this.ws_ = new w3cwebsocket(this.url)
            this.ws_.onmessage = this.handleMessage.bind(this)
        }
        return this.ws_
    }

    begin(url: string): () => void {
        this.url = url
        this.ws()
        return this.terminateWs.bind(this);
    }

    private terminateWs() {
        // @ts-ignore
        this.ws_.onmessage = null;
        this.ws_ = undefined;
        this.updateConnState(ConnectionState.Disconnected)
    }

    getConnectionState(): ConnectionState {
        return this.connectionState
    }


    private connStateListeners: Set<ConnStateListener> = new Set<ConnStateListener>()

    onConnectionStateChanged(callback: ConnStateListener): () => void {
        callback(this.getConnectionState())
        this.connStateListeners.add(callback)
        return () => this.connStateListeners.delete(callback)
    }

    private updateConnState(state: ConnectionState) {
        if (this.connectionState != state) {
            this.connectionState = state
            for (const listener of this.connStateListeners) {
                listener(state)
            }
        }
    }

    private msgListeners: Set<MsgListener> = new Set<MsgListener>();

    onMessage(callback: MsgListener): () => void {
        this.msgListeners.add(callback)
        return () => this.msgListeners.delete(callback)
    }


    send(data: WebsocketMsg): void {
        this.ws().send(data)
    }

    private handleMessage(data: WebsocketMsg) {
        for (const listener of this.msgListeners) {
            listener(data)
        }
    }
}