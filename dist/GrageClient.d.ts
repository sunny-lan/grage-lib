import { Message } from "./lib";
import { GrageAPI, GrageDeviceStatus } from "./GrageAPI";
export default class GrageClient implements GrageAPI {
    private channels;
    private ws;
    options: {
        timeout: number;
        pingPeriod: number;
        checkPeriod: number;
        debug: boolean;
    };
    begin(url: string): () => void;
    sendImpl(m: Message): void;
    send(id: string, data: any, fromDevice?: boolean): void;
    requestPing(id: string): void;
    subscribe(id: string, callback: (msg: any) => void): () => void;
    onStatusChanged(id: string, callback: (alive: GrageDeviceStatus) => void): () => void;
    private checkChannelConnected;
    private handleMsg;
    private checkChannelTimeouts;
    private subscribeToIDImpl;
    private ensureChannelExists;
    private setDeviceState;
    private handleWsStateChanged;
    private debug;
}
