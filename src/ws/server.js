import { WebSocket, WebSocketServer } from "ws";
import { isSpoofedBot } from "@arcjet/inspect";
import { wsArcjet } from "../routes/arcjet.js";

const HEARTBEAT_INTERVAL_MS = 30000;
const MAX_SUBSCRIPTIONS_PER_SOCKET = 2;
const matchSubscribers = new Map();

function subscribe(matchId,socket){
    if(!matchSubscribers.has(matchId)){
        matchSubscribers.set(matchId, new Set());
    }
    matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId,socket){
    const subscribers = matchSubscribers.get(matchId);

    if(!subscribers) return;

    subscribers.delete(socket);

    if(subscribers.size === 0){
        matchSubscribers.delete(matchId);
    }
}

function cleanupSubscriptions(socket){
    for(const matchId of socket.subsciptions){
        unsubscribe(matchId,socket);
    }
}

function broadcastToMatch(matchId,payload){
    const subscribers = matchSubscribers.get(matchId);
    if(!subscribers || subscribers.size === 0) return;
    const message = JSON.stringify(payload);

    for(const client of subscribers){
        if(client.readyState==WebSocket.OPEN){
            client.send(message);
        }
    }
}
function sendJSON(socket,payload){
    if(socket.readyState != WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
}

function broadcastToAll(wss,payload){
    for (const client of wss.clients){
        if(client.readyState!=WebSocket.OPEN) continue;
        client.send(JSON.stringify(payload));
    }
}

function handleMessage(socket,data){
    let message;
    try{
        message = JSON.parse(data.toString());
    }catch(e){
        sendJSON(socket,{type:'error',message:'Invalid JSON'});
        return;
    }
    if(message?.type=="subscribe" && Number.isInteger(message.matchId)){
        const isNewSubscription = !socket.subsciptions.has(message.matchID);
        if (isNewSubscription && socket.subsciptions.size >= MAX_SUBSCRIPTIONS_PER_SOCKET) {
            sendJSON(socket,{type:'error',message:'Subscription limit reached'});
            return;
        }
        subscribe(message.matchId,socket);
        socket.subsciptions.add(message.matchId);
        sendJSON(socket,{type:'subscribed',matchId:message.matchId});
        return;
    }
    if(message?.type=="unsubscribe" && Number.isInteger(message.matchId)){
        unsubscribe(message.matchId,socket);
        socket.subsciptions.delete(message.matchId);
        sendJSON(socket,{type:'unsubscribed',matchId:message.matchId});
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
                    socket.close(1008, 'Access denied');
                    return;
                }
            }catch(e){
                console.error('WS Connection Error:',e);
                socket.close(1011,'Server Security Error');
                return;
            }
        }

        socket.isAlive = true;
        
        socket.on('pong',() => {
            socket.isAlive = true;
        });
        
        socket.subsciptions = new Set();
        
        sendJSON(socket, {type:'welcome'});

        socket.on('message',(data) => {
            handleMessage(socket,data);
        })
        socket.on('error', () => {
            socket.terminate();
        });
        socket.on('close', () => {
            cleanupSubscriptions(socket);
        });
        socket.on('error', console.error);
    })

    function broadcastMatchCreated(match){
        broadcastToAll(wss, {type:'match_created',data:match});
    }

    function broadcastCommentary(matchId,comment){
        broadcastToMatch(matchId,{type: 'commentary', data:comment})
    }

    return {broadcastMatchCreated,broadcastCommentary}
}