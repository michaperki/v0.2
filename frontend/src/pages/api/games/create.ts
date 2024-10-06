
// POST /api/games/create
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import Cookies from 'cookies';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const cookies = new Cookies(req, res);
    const lichessId = cookies.get('lichess_id');  // Get Lichess ID from cookies

    if (!lichessId) {
        return res.status(401).json({ error: "Unauthorized. Please log in first." });
    }

    try {
        // Fetch the user from the database using Lichess ID
        const user = await prisma.user.findUnique({
            where: { lichessId },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const { wagerAmount, contractGameId } = req.body;

        if (!wagerAmount || !contractGameId) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const adjustedGameId = parseInt(contractGameId); // Increment the game ID by 1

        // Create the game entry in the Game table
        const newGame = await prisma.game.create({
            data: {
                contractGameId: adjustedGameId, // Store the smart contract game ID
                player1Id: user.id, // Use the user's ID from the database
                wagerAmount,
                isActive: false, // Initially inactive until the second player joins
            },
        });

        return res.status(200).json({ gameId: newGame.id });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to create game" });
    }
}

