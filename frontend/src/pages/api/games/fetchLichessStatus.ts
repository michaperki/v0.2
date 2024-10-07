
// pages/api/games/fetchLichessStatus.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchLichessGameStatus } from '@/utils/lichess-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { lichessGameId } = req.query;

    if (!lichessGameId || typeof lichessGameId !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid Lichess game ID' });
    }

    try {
        const gameStatus = await fetchLichessGameStatus(lichessGameId);
        return res.status(200).json(gameStatus);
    } catch (error) {
        console.error('Error fetching Lichess game status:', error);
        return res.status(500).json({ error: 'Failed to fetch Lichess game status' });
    }
}

