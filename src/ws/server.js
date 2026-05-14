import { WebSocket, WebSocketServer } from "ws";

const HEARTBEAT_INTERVAL_MS = 30000;

function sendJSON(socket,payload){
    if(socket.readyState != WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
}

function broadcast(wss,payload){
    for (const client of wss.clients){
        if(client.readyState!=WebSocket.OPEN) continue;
        client.send(JSON.stringify(payload));
    }
}

export function attachWebSocketServer(server){
    const wss = new WebSocketServer({  
        server,
        path: '/ws',
        maxPayload: 1024*1024,
    })  

    const interval = setInterval(() => {
        for (const client of wss.clients) {
            if (client.isAlive === false) {
                client.terminate();
                continue;
            }

            client.isAlive = false;
            client.ping();
        }
    }, HEARTBEAT_INTERVAL_MS);

    wss.on('close', () => {
        clearInterval(interval);
    });
    
    wss.on('connection',(socket) => {
        socket.isAlive = true;
        sendJSON(socket, {type:'welcome'});

        socket.on('pong',() => {
            socket.isAlive = true;
        });

        socket.on('error', console.error);
    })

    function broadcastMatchCreated(match){
        broadcast(wss, {type:'match_created',data:match});
    }

    return {broadcastMatchCreated}
}