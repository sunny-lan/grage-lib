import GrageClient from "../GrageClient";
import {GrageDeviceStatus} from "../GrageAPI";

test('e2e', done => {
    const recvClient = new GrageClient()
    const sendClient = new GrageClient()

    recvClient.begin('ws://grage.azurewebsites.net/ws')
    sendClient.begin('ws://grage.azurewebsites.net/ws')

    const deviceID = 'testdevice1234'
    const testMsg = {
        str: 'my message',
        num: 123
    }

    recvClient.subscribe(deviceID, msg => {
        console.log(msg)
        try {
            expect(msg).toEqual(testMsg)
            done();
        } catch (error) {
            done(error);
        }
    })


    let sent = false
    recvClient.onStatusChanged(deviceID, status=>{
        console.log('recv status', GrageDeviceStatus[status])

        if(sent) return
        if(status===GrageDeviceStatus.NETWORK_DISCONNECTED) return

        sendClient.onStatusChanged(deviceID, status=>{
            console.log('send status', GrageDeviceStatus[status])

            if(sent)return
            if(status===GrageDeviceStatus.NETWORK_DISCONNECTED) return

            sendClient.send(deviceID, testMsg, true)
            sent=true
        })
    })
})