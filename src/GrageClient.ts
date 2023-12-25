import {ChannelMessage, ConnectMessage, DataMessage, Message, Ping, RequestPing} from "./lib";

import {GrageAPI, GrageDeviceStatus} from "./GrageAPI";
import {ConnectionState, IWebsocket, WebsocketMsg} from "./IWebsocket";
import StableWs from "./StableWs";


function isRequestPing(m: Message): m is RequestPing {
    return m.type === 'rping';
}

function isPingMessage(m: Message): m is Ping {
    return m.type === 'ping';
}

function isChannelMessage(m: Message): m is ChannelMessage {
    return isDataMessage(m) || isRequestPing(m) || isPingMessage(m);
}

function isDataMessage(m: Message): m is DataMessage {
    return m.type === 'data';
}


type LiveListener = (alive: GrageDeviceStatus) => void;
type TerminateListener = (reason: any) => void;

type ChannelListener = (data: any) => void;
type Channel = {
    dataListeners: Set<ChannelListener>;
    curStatus: GrageDeviceStatus;
    deviceStatusListeners: Set<LiveListener>;

    lastAliveTime: number
    lastPingTime: number
    pingInFlight: boolean

    isConnected: boolean

};

export default class GrageClient implements GrageAPI {
    private channels: {
        [id: string]: Channel;
    } = {};
    private ws: IWebsocket = new StableWs();

    options = {
        timeout: 10000, pingPeriod: 4500, checkPeriod: 1000
    }

    private debug(...args: any[]) {
        console.log(...args)
    }

    private handleMsg(evt: WebsocketMsg) {
        let m;
        try {
            m = JSON.parse(evt as string) as Message;
        } catch (e) {
            console.error('Failed parse message ', e, evt)
            return;
        }

        this.debug('[recv]', m);

        //ignore messages from other browsers, ignore non subscribed messages
        if (isChannelMessage(m) && m.fromDevice && this.channels.hasOwnProperty(m.id)) {
            const channel = this.channels[m.id];
            //since this device just sent a message,
            //it must be alive
            this.setDeviceState(m.id, GrageDeviceStatus.ALIVE);

            if (isDataMessage(m)) {
                //send to every listener in the proper channel
                for (const listener of channel.dataListeners) {
                    listener(m.data);
                }
            }
        } else {
            console.warn('[Unknown message type]', m);
        }
    }

    private checkConnections() {
        const now = Date.now()
        for (const [id, channel] of Object.entries(this.channels)) {
            if (this.ws.getConnectionState() === ConnectionState.Connected) {
                const timeSincePing = now - channel.lastPingTime;
                const timeSinceAlive = now - channel.lastAliveTime;

                if (Math.max(timeSincePing, timeSinceAlive) >= this.options.pingPeriod) {
                    this.requestPing(id)
                }

                // If the last known alive was more than timeout ago and we did ping
                // then the device must be dead

                if (timeSinceAlive > this.options.timeout) {
                    if (channel.pingInFlight) {
                        this.setDeviceState(id, GrageDeviceStatus.DEAD)
                    }
                }

            } else {
                this.setDeviceState(id, GrageDeviceStatus.NETWORK_DISCONNECTED)
            }
        }
    }

    begin(url:string) {

        const a = this.ws.begin(url)
        const b = this.ws.onMessage(this.handleMsg.bind(this))
        const c = setInterval(this.checkConnections.bind(this), this.options.checkPeriod)
        return function () {
            a();
            b();
            clearInterval(c)
        }
    }

    sendImpl(m: Message): void {
        let o = JSON.stringify(m);
        this.ws.send(o)
    }

    send(id: string, data: any): void {
        const m: DataMessage = {
            type: "data",
            data,
            id,
            fromDevice: false,
        };

        this.sendImpl(m);
    }

    private sendConnect(id: string) {

        //send channel connect message
        const m: ConnectMessage = {
            type: "connect",
            id,
        };
        this.sendImpl(m);
        this.channels[id].isConnected = true;
    }

    private ensureExists(id: string) {
        if (!this.channels.hasOwnProperty(id)) {
            //initialize channelListeners
            this.channels[id] = {
                dataListeners: new Set<ChannelListener>(),
                deviceStatusListeners: new Set<LiveListener>(),
                curStatus: GrageDeviceStatus.NETWORK_DISCONNECTED,
                isConnected: false,

                lastPingTime: 0,
                lastAliveTime: 0,
                pingInFlight: false
            };
        }
    }

    requestPing(id: string) {
        this.ensureExists(id)
        //send ping
        const m: RequestPing = {
            type: "rping",
            id,
            fromDevice: false
        };

        this.sendImpl(m);
        this.channels[id].lastPingTime = Date.now()
        this.channels[id].pingInFlight = true
    }

    subscribe(id: string, callback: (msg: Message) => void): () => void {
        this.ensureExists(id)


        if (!this.channels[id].isConnected) {
            this.sendConnect(id)
        }

        this.channels[id].dataListeners.add(callback)
        return () => this.channels[id].dataListeners.delete(callback)
    }

    onStatusChanged(id: string, callback: (alive: GrageDeviceStatus) => void): () => void {
        this.ensureExists(id)
        callback(this.channels[id].curStatus)
        this.channels[id].deviceStatusListeners.add(callback)
        return () => {
            this.channels[id].deviceStatusListeners.delete(callback)
        };
    }


    private setDeviceState(id: string, newState: GrageDeviceStatus) {
        this.ensureExists(id)
        const channel = this.channels[id]
        if (channel.curStatus !== newState) {
            channel.curStatus = newState;
            if (newState == GrageDeviceStatus.ALIVE) {
                channel.lastAliveTime = Date.now()
                channel.pingInFlight = false
            }

            for (const listener of channel.deviceStatusListeners) {
                listener(newState)
            }
        }
    }
}
