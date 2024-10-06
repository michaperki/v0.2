
// POST /api/games/join
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import Cookies from 'cookies';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const cookies = new Cookies(req, res);
    const userId = cookies.get('user_id'); // Fetch signed user_id from cookies

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    const { contractGameId } = req.body;

    try {
        console.log("Joining game with contract ID:", contractGameId);
        // Fetch the game from the database
        const game = await prisma.game.findUnique({
            where: { contractGameId: contractGameId },
        });

        console.log("Game found:", game);

        if (!game) {
            return res.status(404).json({ error: "Game not found" });
        }

        if (game.player2Id) {
            return res.status(400).json({ error: "Game already has two players" });
        }

        console.log("Joining game with ID:", game.id);

        // Update the game with the second player
        const updatedGame = await prisma.game.update({
            where: { id: game.id },
            data: {
                player2Id: Number(userId),
                isActive: true, // Game is now active
            },
        });

        return res.status(200).json({ message: "Joined the game successfully", game: updatedGame });
    } catch (error) {
        console.error("Error joining game:", error);
        return res.status(500).json({ error: "Failed to join game" });
    }
}

