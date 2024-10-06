
// GET /api/games/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { id } = req.query;

    try {
        // Fetch the game details by ID
        const game = await prisma.game.findUnique({
            where: { id: Number(id) },
            include: {
                player1: true,  // Include player1 details
                player2: true,  // Include player2 details (if available)
            },
        });

        if (!game) {
            return res.status(404).json({ error: "Game not found" });
        }

        return res.status(200).json(game);
    } catch (error) {
        console.error("Error fetching game:", error);
        return res.status(500).json({ error: "Failed to fetch game details" });
    }
}
