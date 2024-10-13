
import { ethers } from 'ethers'; // Add ethers.js import
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const { wagerAmount, lichessId } = req.body;
        console.log(`Pairing players with wager amount: ${wagerAmount}`);
        console.log(`Lichess ID: ${lichessId}`);

        // Get the user from the database using the Lichess ID
        const user = await prisma.user.findUnique({
            where: { lichessId },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Convert wagerAmount from ETH to wei
        const wagerInWei = ethers.parseUnits(wagerAmount.toString(), 'ether'); // Convert to wei

        // Check if there is an open game waiting for a player
        let pendingGame = await prisma.game.findFirst({
            where: { isActive: false, player2Id: null },
        });

        if (pendingGame) {
            // Assign the second player and make the game active
            const updatedGame = await prisma.game.update({
                where: { id: pendingGame.id },
                data: { isActive: true, player2Id: user.id },  // Assume user is authenticated
            });
            return res.status(200).json({ gameId: updatedGame.id, contractGameId: updatedGame.contractGameId });
        } else {
            // Create a new game if no pending game exists
            const newGame = await prisma.game.create({
                data: {
                    wagerAmount: BigInt(wagerInWei.toString()), // Store wagerAmount in wei as BigInt
                    player1Id: user.id,  // Assume user is authenticated
                    isActive: false,
                },
            });
            return res.status(200).json({ gameId: newGame.id });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to pair players" });
    }
}

