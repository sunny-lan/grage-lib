"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IWebsocket_1 = require("./IWebsocket");
const websocket_1 = require("websocket");
const w3cwebsocket = websocket_1.w3cwebsocket;
const noop = () => { };
class StableWs {
    constructor() {
        this.connectionState = IWebsocket_1.ConnectionState.Disconnected;
        this.connStateListeners = new Set();
        this.msgListeners = new Set();
    }
    begin(url) {
        this.url = url;
        this.ws();
        return this.terminateWs.bind(this);
    }
    getConnectionState() {
        return this.connectionState;
    }
    onConnectionStateChanged(callback) {
        callback(this.getConnectionState());
        this.connStateListeners.add(callback);
        return () => this.connStateListeners.delete(callback);
    }
    onMessage(callback) {
        this.msgListeners.add(callback);
        return () => this.msgListeners.delete(callback);
    }
    send(data) {
        if (this.connectionState === IWebsocket_1.ConnectionState.Disconnected)
            throw Error('Send called while disconnected');
        this.ws().send(data);
    }
    updateConnState(state) {
        if (this.connectionState != state) {
            this.connectionState = state;
            for (const listener of this.connStateListeners) {
                listener(state);
            }
        }
    }
    ws() {
        var _a, _b;
        if (((_a = this.ws_) === null || _a === void 0 ? void 0 : _a.readyState) === w3cwebsocket.CLOSING || ((_b = this.ws_) === null || _b === void 0 ? void 0 : _b.readyState) === w3cwebsocket.CLOSED) {
            this.terminateWs();
        }
        if (this.ws_ === undefined) {
            this.ws_ = new w3cwebsocket(this.url);
            this.ws_.onmessage = this.handleMessage.bind(this);
            this.ws_.onopen = () => this.updateConnState(IWebsocket_1.ConnectionState.Connected);
            this.ws_.onclose = this.terminateWs.bind(this);
            this.ws_.onerror = (err) => {
                console.error(err);
                this.terminateWs();
            };
        }
        return this.ws_;
    }
    terminateWs() {
        this.ws_.onmessage = null;
        this.ws_.onclose = noop;
        this.ws_.onopen = noop;
        this.ws_.onerror = noop;
        this.ws_ = undefined;
        this.updateConnState(IWebsocket_1.ConnectionState.Disconnected);
    }
    handleMessage(data) {
        for (const listener of this.msgListeners) {
            listener(data.data);
        }
    }
}
exports.default = StableWs;
//# sourceMappingURL=StableWs.js.map