
// /api/games/createLichessGame.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { createChallenge } from '@/utils/lichess-utils'; // Reuse your utility
const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { gameId, player1Username, player2Username } = req.body;

    try {
        // Check if the game already has a Lichess Game ID
        const game = await prisma.game.findUnique({
            where: { id: gameId },
        });

        if (game?.lichessGameId) {
            return res.status(400).json({ error: "Lichess game already created." });
        }

        // Create the game on Lichess and get the game ID
        const challengeData = await createChallenge(player1Username, player2Username, "60");
        const lichessGameId = challengeData.id;

        // Update the game with the Lichess game ID
        const updatedGame = await prisma.game.update({
            where: { id: gameId },
            data: { lichessGameId: lichessGameId },
        });

        res.status(200).json({ lichessGameId });
    } catch (error) {
        console.error('Error creating Lichess game:', error);
        res.status(500).json({ error: "Failed to create Lichess game" });
    }
}

