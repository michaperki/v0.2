
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

// POST /api/games/updateContractGameId
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { gameId, contractGameId } = req.body;

    try {
        // Logic to update the database with the contractGameId
        await prisma.game.update({
            where: { id: gameId },
            data: { contractGameId },
        });

        res.status(200).json({ message: "Contract game ID updated successfully" });
    } catch (error) {
        console.error("Error updating contract game ID:", error);
        res.status(500).json({ error: "Failed to update contract game ID" });
    }
}

