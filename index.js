const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let waitingPlayers = [];

function normalizeIP(ip) {
    return ip.replace('::ffff:', '').replace('::1', '127.0.0.1');
}

app.get('/', (_, res) => {
    res.json({
        status: 'ok',
        activeConnections: wss.clients.size,
        waiting: waitingPlayers.length
    });
});

wss.on('connection', (ws, req) => {
    const ip = normalizeIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
    console.log(`[Matchmaking] Player connected: ${ip}`);

    ws.isAlive = true;

    ws.on('error', (error) => {
        console.error(`[ERROR] WebSocket (${ip}):`, error);
    });

    ws.on('message', (msg) => {
        const message = msg.toString();
        console.log(`[Matchmaking] Received: ${message} from ${ip}`);

        if (message === 'find-match') {
            waitingPlayers.push(ws);

            if (waitingPlayers.length >= 2) {
                const host = waitingPlayers.shift();
                const client = waitingPlayers.shift();

                const hostIP = normalizeIP(host._socket.remoteAddress);

                host.send('role:host');
                client.send(`role:client:${hostIP}`);

                console.log(`[Matchmaking] Matched: Host = ${hostIP}, Client = ${ip}`);
            } else {
                console.log(`[Matchmaking] Waiting for opponent...`);
            }
        }

        if (message === 'ping') {
            ws.send('pong');
        }
    });

    ws.on('close', () => {
        waitingPlayers = waitingPlayers.filter(p => p !== ws);
    });
});

// Heartbeat ping
setInterval(() => {
    wss.clients.forEach(ws => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ WebSocket Matchmaker running on port ${PORT}`);
});
