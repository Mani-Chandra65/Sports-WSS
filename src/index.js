import express from "express";
import http from 'http';
import { matchRouter } from "./routes/matches.js";
import 'dotenv/config';
import { attachWebSocketServer } from "./ws/server.js";

const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '0.0.0.0';


const app = express();
const server = http.createServer(app);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello from Express" });
});

app.use('/matches',matchRouter);

const {broadcastMatchCreated} = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
  const baseurl = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server started on ${baseurl}`);
  console.log(`WebSocketServer is running on ${baseurl.replace('http','ws')}/ws`);
});
