
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
            case 'game-started':
                console.log(`Game started with ID: ${message.gameId}`);
                // Handle game start
                break;

            case 'player-joined':
                console.log(`Player joined game: ${message.playerId}`);
                // Handle player join
                break;

            default:
                console.log('Unknown message type');
        }
    };

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

export { wss };
