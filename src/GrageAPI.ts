import {Message} from "./lib";

export enum GrageDeviceStatus {
    ALIVE, DEAD, NETWORK_DISCONNECTED
}

export interface GrageAPI{
    /**
     * Connect to grage server at host
     * @param host
     */
    begin(host:string):()=>void

    /**
     * Listen for messages from device
     * @param deviceId
     * @param callback
     */
    subscribe(deviceId:string, callback:(msg:Message)=>void):()=>void

    /**
     * Send message to device
     * @param deviceId device to send to
     * @param data Data to send
     */
    send(deviceId:string, data:any):void

    /**
     * Listen to status (alive/dead) changes from device
     * @param deviceId
     * @param callback
     */
    onStatusChanged(deviceId:string, callback:(livestate:GrageDeviceStatus)=>void):()=>void

    /**
     * Send a ping check to the device
     * @param deviceId
     */
    requestPing(deviceId: string):void
}