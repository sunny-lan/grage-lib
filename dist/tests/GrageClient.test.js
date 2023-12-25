"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GrageClient_1 = require("../GrageClient");
const GrageAPI_1 = require("../GrageAPI");
test('e2e', done => {
    const recvClient = new GrageClient_1.default();
    const sendClient = new GrageClient_1.default();
    recvClient.begin('ws://grage.azurewebsites.net/ws');
    sendClient.begin('ws://grage.azurewebsites.net/ws');
    const deviceID = 'testdevice1234';
    const testMsg = {
        str: 'my message',
        num: 123
    };
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
        console.log('recv status', GrageAPI_1.GrageDeviceStatus[status]);
        if (sent)
            return;
        if (status === GrageAPI_1.GrageDeviceStatus.NETWORK_DISCONNECTED)
            return;
        sendClient.onStatusChanged(deviceID, status => {
            console.log('send status', GrageAPI_1.GrageDeviceStatus[status]);
            if (sent)
                return;
            if (status === GrageAPI_1.GrageDeviceStatus.NETWORK_DISCONNECTED)
                return;
            sendClient.send(deviceID, testMsg, true);
            sent = true;
        });
    });
});
//# sourceMappingURL=GrageClient.test.js.map