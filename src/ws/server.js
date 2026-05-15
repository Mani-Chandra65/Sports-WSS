import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../routes/arcjet.js";

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
    
    wss.on('connection',async (socket,req) => {

        if(wsArcjet){
            try{
                const decision = await wsArcjet.protect(req);

                if(decision.isDenied()){
                    const code = decision.reason.isRateLimit() ? 1013 : 1008;
                    const reason = decision.reason.isRateLimit() ? 'Rate limit exceeded' : 'Access denied';

                    socket.close(code,reason);
                    return;
                }
                if (decision.results.some(isSpoofedBot)) {
                    return res.status(403).json({ error: 'Forbidden!' });
                }
            }catch(e){
                console.error('WS Connection Error:',e);
                socket.close(1011,'Server Security Error');
                return;
            }
        }

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