import {IStringified} from "websocket";

export type WebsocketMsg =ArrayBufferView | ArrayBuffer | Buffer | IStringified;
export enum ConnectionState{
    Connected,
    Disconnected
}
export interface IWebsocket{
    begin(url:string):()=>void
    send(data:WebsocketMsg):void
    onMessage(callback:(data:WebsocketMsg)=>void):()=>void
    getConnectionState():ConnectionState
    onConnectionStateChanged(callback:(state:ConnectionState)=>void):()=>void
}