"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IWebsocket_1 = require("./IWebsocket");
const websocket_1 = require("websocket");
const w3cwebsocket = websocket_1.w3cwebsocket;
class StableWs {
    constructor() {
        this.connectionState = IWebsocket_1.ConnectionState.Disconnected;
        this.connStateListeners = new Set();
        this.msgListeners = new Set();
    }
    ws() {
        var _a, _b;
        if (((_a = this.ws_) === null || _a === void 0 ? void 0 : _a.readyState) === w3cwebsocket.CLOSING || ((_b = this.ws_) === null || _b === void 0 ? void 0 : _b.readyState) === w3cwebsocket.CLOSED) {
            this.terminateWs();
        }
        if (this.ws_ === undefined) {
            this.ws_ = new w3cwebsocket(this.url);
            this.ws_.onmessage = this.handleMessage.bind(this);
        }
        return this.ws_;
    }
    begin(url) {
        this.url = url;
        this.ws();
        return this.terminateWs.bind(this);
    }
    terminateWs() {
        // @ts-ignore
        this.ws_.onmessage = null;
        this.ws_ = undefined;
        this.updateConnState(IWebsocket_1.ConnectionState.Disconnected);
    }
    getConnectionState() {
        return this.connectionState;
    }
    onConnectionStateChanged(callback) {
        callback(this.getConnectionState());
        this.connStateListeners.add(callback);
        return () => this.connStateListeners.delete(callback);
    }
    updateConnState(state) {
        if (this.connectionState != state) {
            this.connectionState = state;
            for (const listener of this.connStateListeners) {
                listener(state);
            }
        }
    }
    onMessage(callback) {
        this.msgListeners.add(callback);
        return () => this.msgListeners.delete(callback);
    }
    send(data) {
        this.ws().send(data);
    }
    handleMessage(data) {
        for (const listener of this.msgListeners) {
            listener(data);
        }
    }
}
exports.default = StableWs;
//# sourceMappingURL=StableWs.js.map