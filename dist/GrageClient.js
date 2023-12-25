"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GrageAPI_1 = require("./GrageAPI");
const IWebsocket_1 = require("./IWebsocket");
const StableWs_1 = require("./StableWs");
function isRequestPing(m) {
    return m.type === 'rping';
}
function isPingMessage(m) {
    return m.type === 'ping';
}
function isChannelMessage(m) {
    return isDataMessage(m) || isRequestPing(m) || isPingMessage(m);
}
function isDataMessage(m) {
    return m.type === 'data';
}
class GrageClient {
    constructor() {
        this.channels = {};
        this.ws = new StableWs_1.default();
        this.options = {
            timeout: 10000, pingPeriod: 4500, checkPeriod: 1000, debug: false
        };
    }
    begin(url) {
        const a = this.ws.begin(url);
        const d = this.ws.onConnectionStateChanged(this.handleWsStateChanged.bind(this));
        const b = this.ws.onMessage(this.handleMsg.bind(this));
        const c = setInterval(this.checkChannelTimeouts.bind(this), this.options.checkPeriod);
        return function () {
            a();
            d();
            b();
            clearInterval(c);
        };
    }
    sendImpl(m) {
        this.debug('[Send]', m);
        let o = JSON.stringify(m);
        this.ws.send(o);
    }
    send(id, data, fromDevice = false) {
        const m = {
            type: "data",
            data,
            id,
            fromDevice,
        };
        this.sendImpl(m);
    }
    requestPing(id) {
        this.ensureChannelExists(id);
        //send ping
        const m = {
            type: "rping",
            id,
            fromDevice: false
        };
        this.sendImpl(m);
        this.channels[id].lastPingTime = Date.now();
        this.channels[id].pingInFlight = true;
    }
    subscribe(id, callback) {
        this.ensureChannelExists(id);
        this.checkChannelConnected(id);
        this.channels[id].dataListeners.add(callback);
        return () => this.channels[id].dataListeners.delete(callback);
    }
    onStatusChanged(id, callback) {
        this.ensureChannelExists(id);
        this.checkChannelConnected(id);
        callback(this.channels[id].curStatus);
        this.channels[id].deviceStatusListeners.add(callback);
        return () => {
            this.channels[id].deviceStatusListeners.delete(callback);
        };
    }
    checkChannelConnected(id) {
        if (this.ws.getConnectionState() === IWebsocket_1.ConnectionState.Connected) {
            if (!this.channels[id].isConnected) {
                this.subscribeToIDImpl(id);
            }
        }
        else {
            this.channels[id].isConnected = false;
            this.setDeviceState(id, GrageAPI_1.GrageDeviceStatus.NETWORK_DISCONNECTED);
        }
    }
    handleMsg(evt) {
        this.debug('[WS Recv]', evt);
        let m;
        try {
            m = JSON.parse(evt);
        }
        catch (e) {
            console.error('Failed to parse message ', e, evt);
            return;
        }
        //ignore messages from other browsers, ignore non subscribed messages
        if (isChannelMessage(m)) {
            if (m.fromDevice && this.channels.hasOwnProperty(m.id)) {
                const channel = this.channels[m.id];
                //since this device just sent a message,
                //it must be alive
                this.setDeviceState(m.id, GrageAPI_1.GrageDeviceStatus.ALIVE);
                if (isDataMessage(m)) {
                    //send to every listener in the proper channel
                    for (const listener of channel.dataListeners) {
                        listener(m.data);
                    }
                }
            }
        }
        else {
            console.warn('[Unknown message type]', m);
        }
    }
    checkChannelTimeouts() {
        const now = Date.now();
        for (const [id, channel] of Object.entries(this.channels)) {
            if (this.ws.getConnectionState() === IWebsocket_1.ConnectionState.Connected) {
                const timeSincePing = now - channel.lastPingTime;
                const timeSinceAlive = now - channel.lastAliveTime;
                if (Math.max(timeSincePing, timeSinceAlive) >= this.options.pingPeriod) {
                    this.requestPing(id);
                }
                // If the last known alive was more than timeout ago and we did ping
                // then the device must be dead
                if (timeSinceAlive > this.options.timeout) {
                    if (channel.pingInFlight) {
                        this.setDeviceState(id, GrageAPI_1.GrageDeviceStatus.DEAD);
                    }
                }
            }
            else {
                this.setDeviceState(id, GrageAPI_1.GrageDeviceStatus.NETWORK_DISCONNECTED);
            }
        }
    }
    subscribeToIDImpl(id) {
        //send channel connect message
        const m = {
            type: "connect",
            id,
        };
        this.sendImpl(m);
        this.channels[id].isConnected = true;
    }
    ensureChannelExists(id) {
        if (!this.channels.hasOwnProperty(id)) {
            //initialize channelListeners
            this.channels[id] = {
                dataListeners: new Set(),
                deviceStatusListeners: new Set(),
                curStatus: GrageAPI_1.GrageDeviceStatus.NETWORK_DISCONNECTED,
                isConnected: false,
                lastPingTime: 0,
                lastAliveTime: 0,
                pingInFlight: false
            };
        }
    }
    setDeviceState(id, newState) {
        this.ensureChannelExists(id);
        const channel = this.channels[id];
        if (channel.curStatus !== newState) {
            channel.curStatus = newState;
            if (newState == GrageAPI_1.GrageDeviceStatus.ALIVE) {
                channel.lastAliveTime = Date.now();
                channel.pingInFlight = false;
            }
            for (const listener of channel.deviceStatusListeners) {
                listener(newState);
            }
        }
    }
    handleWsStateChanged(state) {
        this.debug('[WS State]', IWebsocket_1.ConnectionState[state]);
        for (const id of Object.keys(this.channels)) {
            this.checkChannelConnected(id);
        }
    }
    debug(...args) {
        if (this.options.debug)
            console.log(...args);
    }
}
exports.default = GrageClient;
//# sourceMappingURL=GrageClient.js.map