
// pages/api/games/[id].tsx

import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (req.method !== 'GET') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const game = await prisma.game.findUnique({
            where: { id: parseInt(id as string) },
            include: {
                player1: true, // Replace with actual field names
                player2: true,
            },
        });

        if (!game) {
            return res.status(404).json({ error: "Game not found" });
        }

        res.status(200).json(game);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch game details" });
    }
}

