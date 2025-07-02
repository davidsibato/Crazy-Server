const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let waitingPlayers = [];

app.get('/', (_, res) => res.send('OK')); // health check

wss.on('connection', (ws, req) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`[Matchmaking] Player connected: ${ip}`);

  ws.on('error', (error) => {
    console.error(`[ERROR] WebSocket Error (${ip}):`, error);
  });
  ws.on('message', (msg) => {
    const message = msg.toString();
    console.log(`[Matchmaking] Received: ${message} from ${ip}`);

    if (message === 'find-match') {
      waitingPlayers.push(ws);

      if (waitingPlayers.length >= 2) {
        const host = waitingPlayers.shift();
        const client = waitingPlayers.shift();

        let hostIP = host._socket.remoteAddress.replace('::ffff:', '');
        if (hostIP === '::1') hostIP = '127.0.0.1';

        host.send(`role:host`);
        client.send(`role:client:${hostIP}`);

        console.log(`[Matchmaking] Matched: Host = ${hostIP}, Client = ${ip}`);
      }
    }
  });

  ws.on('close', () => {
    waitingPlayers = waitingPlayers.filter(p => p !== ws);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ WebSocket Matchmaker running on port ${PORT}`);
  console.log("Environment:", process.env.NODE_ENV);
console.log("WebSocket Server listening on port:", PORT);
console.log("Trust proxy:", process.env.TRUST_PROXY || false);
});
