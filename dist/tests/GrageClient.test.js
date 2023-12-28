"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
test('e2e', done => {
    const recvClient = new index_1.GrageClient();
    const sendClient = new index_1.GrageClient();
    recvClient.begin('ws://grage.azurewebsites.net/ws');
    sendClient.begin('ws://grage.azurewebsites.net/ws');
    const deviceID = 'testdevice1234';
    const testMsg = index_1.esp8266.digitalWrite(index_1.esp8266.Pin.D1, index_1.esp8266.LogicLevel.LOW);
    recvClient.subscribe(deviceID, msg => {
        console.log(msg);
        try {
            expect(msg).toEqual(testMsg);
            done();
        }
        catch (error) {
            done(error);
        }
    });
    let sent = false;
    recvClient.onStatusChanged(deviceID, status => {
        console.log('recv status', index_1.GrageDeviceStatus[status]);
        if (sent)
            return;
        if (status === index_1.GrageDeviceStatus.NETWORK_DISCONNECTED)
            return;
        sendClient.onStatusChanged(deviceID, status => {
            console.log('send status', index_1.GrageDeviceStatus[status]);
            if (sent)
                return;
            if (status === index_1.GrageDeviceStatus.NETWORK_DISCONNECTED)
                return;
            sendClient.send(deviceID, testMsg, true);
            sent = true;
        });
    });
});
//# sourceMappingURL=GrageClient.test.js.map