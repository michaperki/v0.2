
import { WebSocketServer, WebSocket } from 'ws';
import { monitorLichessGame } from './game-monitor';  // Import the game monitoring function

const wss = new WebSocketServer({ port: 8080 });

// Function to notify clients about game events
const broadcastGameUpdate = (gameId: string, message: object) => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ gameId, ...message }));
        }
    });
};

// Setup WebSocket to monitor game and send events to clients
wss.on('connection', (ws) => {
    ws.on('message', async (data) => {
        const { gameId, lichessToken } = JSON.parse(data.toString());

        // Start monitoring the Lichess game
        await monitorLichessGame(gameId, lichessToken, (event) => {
            if (event.type === 'gameFinish') {
                broadcastGameUpdate(gameId, { type: 'game-over', event });
            } else if (event.type === 'gameState') {
                broadcastGameUpdate(gameId, { type: 'game-update', moves: event.moves });
            }
        });
    });
});

export default wss;
