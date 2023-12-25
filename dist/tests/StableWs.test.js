"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const StableWs_1 = require("../StableWs");
const IWebsocket_1 = require("../IWebsocket");
test('e2e', done => {
    const ws = new StableWs_1.default();
    ws.onMessage(console.log);
    ws.onConnectionStateChanged(status => {
        console.log(IWebsocket_1.ConnectionState[status]);
        if (status === IWebsocket_1.ConnectionState.Connected) {
            ws.send('hi');
            done();
        }
    });
    ws.begin('ws://grage.azurewebsites.net/ws');
});
//# sourceMappingURL=StableWs.test.js.map