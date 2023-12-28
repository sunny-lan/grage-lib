import {esp8266, GrageClient, GrageDeviceStatus} from '../index'

test('e2e', done => {
    const recvClient = new GrageClient()
    const sendClient = new GrageClient()

    recvClient.begin('ws://grage.azurewebsites.net/ws')
    sendClient.begin('ws://grage.azurewebsites.net/ws')

    const deviceID = 'testdevice1234'
    const testMsg = esp8266.digitalWrite(esp8266.Pin.D1, esp8266.LogicLevel.LOW)

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