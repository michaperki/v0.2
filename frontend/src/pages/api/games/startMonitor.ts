
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { gameId, lichessToken } = req.body;

    try {
        // Send the gameId and token to the WebSocket server to start monitoring
        const ws = new WebSocket('ws://localhost:8080');
        ws.onopen = () => {
            ws.send(JSON.stringify({ gameId, lichessToken }));
        };

        res.status(200).json({ message: 'Started monitoring the game' });
    } catch (error) {
        console.error('Error starting Lichess game monitoring:', error);
        res.status(500).json({ error: 'Failed to start game monitoring' });
    }
}
