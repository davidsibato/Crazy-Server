const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });

let waitingPlayers = [];

wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress.replace('::ffff:', '');
    console.log(`[Matchmaking] Player connected: ${ip}`);

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
            } else {
                console.log(`[Matchmaking] Waiting for next player...`);
            }
        }
    });

    ws.on('close', () => {
        waitingPlayers = waitingPlayers.filter(p => p !== ws);
    });
});

console.log(`✅ WebSocket Matchmaker running on port ${process.env.PORT || 3000}`);
