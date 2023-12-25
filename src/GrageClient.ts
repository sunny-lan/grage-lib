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
        timeout: 10000, pingPeriod: 4500, checkPeriod: 1000, debug:false
    }

    begin(url:string) {

        const a = this.ws.begin(url)
        const d = this.ws.onConnectionStateChanged(this.handleWsStateChanged.bind(this))
        const b = this.ws.onMessage(this.handleMsg.bind(this))
        const c = setInterval(this.checkChannelTimeouts.bind(this), this.options.checkPeriod)
        return function () {
            a();
            d();
            b();
            clearInterval(c)
        }
    }

    sendImpl(m: Message): void {
        this.debug('[Send]', m)

        let o = JSON.stringify(m);
        this.ws.send(o)
    }

    send(id: string, data: any, fromDevice=false): void {
        const m: DataMessage = {
            type: "data",
            data,
            id,
            fromDevice,
        };

        this.sendImpl(m);
    }

    requestPing(id: string) {
        this.ensureChannelExists(id)
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

    subscribe(id: string, callback: (msg: any) => void): () => void {
        this.ensureChannelExists(id)

        this.checkChannelConnected(id)

        this.channels[id].dataListeners.add(callback)
        return () => this.channels[id].dataListeners.delete(callback)
    }


    onStatusChanged(id: string, callback: (alive: GrageDeviceStatus) => void): () => void {
        this.ensureChannelExists(id)
        this.checkChannelConnected(id)

        callback(this.channels[id].curStatus)
        this.channels[id].deviceStatusListeners.add(callback)
        return () => {
            this.channels[id].deviceStatusListeners.delete(callback)
        };
    }

    private checkChannelConnected(id:string){
        if(this.ws.getConnectionState()===ConnectionState.Connected) {
            if (!this.channels[id].isConnected) {
                this.subscribeToIDImpl(id)
            }
        }else{
            this.channels[id].isConnected=false
            this.setDeviceState(id, GrageDeviceStatus.NETWORK_DISCONNECTED)
        }
    }

    private handleMsg(evt: WebsocketMsg) {
        this.debug('[WS Recv]', evt)

        let m;
        try {
            m = JSON.parse(evt as string) as Message;
        } catch (e) {
            console.error('Failed to parse message ', e, evt)
            return;
        }


        //ignore messages from other browsers, ignore non subscribed messages
        if (isChannelMessage(m) ) {
            if(m.fromDevice && this.channels.hasOwnProperty(m.id)) {
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
            }
        } else {
            console.warn('[Unknown message type]', m);
        }
    }

    private checkChannelTimeouts() {
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

    private subscribeToIDImpl(id: string) {

        //send channel connect message
        const m: ConnectMessage = {
            type: "connect",
            id,
        };
        this.sendImpl(m);
        this.channels[id].isConnected = true;
    }

    private ensureChannelExists(id: string) {
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

    private setDeviceState(id: string, newState: GrageDeviceStatus) {
        this.ensureChannelExists(id)
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

    private handleWsStateChanged(state:ConnectionState) {
        this.debug('[WS State]', ConnectionState[state])

        for(const id of Object.keys(this.channels)){
            this.checkChannelConnected(id)
        }
    }

    private debug(...args: any[]) {
        if(this.options.debug)
        console.log(...args)
    }
}
