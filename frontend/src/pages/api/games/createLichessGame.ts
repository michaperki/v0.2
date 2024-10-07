
// /api/games/createLichessGame.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { createChallenge } from '@/utils/lichess-utils'; // Reuse your utility
const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { gameId, player1Username, player2Username } = req.body;

    try {
        const challengeData = await createChallenge(player1Username, player2Username, "60");
        console.log(challengeData);
        const lichessGameId = challengeData.id; // Extract the Lichess game ID
        console.log("lichessGameId", lichessGameId);
        console.log("gameId", gameId);

        // Update the game with the Lichess game ID
        const updatedGame = await prisma.game.update({
            where: { id: gameId },
            data: { lichessGameId: lichessGameId }
        });

        console.log({ updatedGame });

        res.status(200).json({ lichessGameId });
    } catch (error) {
        res.status(500).json({ error: "Failed to create Lichess game" });
    }
}
