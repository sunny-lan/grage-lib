import StableWs from "../StableWs";
import {ConnectionState} from "../IWebsocket";

test('e2e', done => {
    const ws = new StableWs()
    ws.onMessage(console.log)
    ws.onConnectionStateChanged(status => {
        console.log(ConnectionState[status])
        if(status===ConnectionState.Connected) {
            ws.send('hi')
            done()
        }
    })
    ws.begin('ws://grage.azurewebsites.net/ws')

})