import express from "express";
import http from 'http';
import { matchRouter } from "./routes/matches.js";
import 'dotenv/config';
import { attachWebSocketServer } from "./ws/server.js";
import { securityMiddleware } from "./routes/arcjet.js";

const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '0.0.0.0';


const server = http.createServer(app);
const app = express();

app.use(express.json());
app.use(securityMiddleware());

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
