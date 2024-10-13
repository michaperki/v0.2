
import { ethers } from 'ethers'; // Add ethers.js import
import { NextApiRequest, NextApiResponse } from 'next';
import Cookies from 'cookies';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const cookies = new Cookies(req, res);
    const userId = cookies.get('user_id');  // Get Lichess ID from cookies

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized. Please log in first." });
    }

    try {
        // Fetch the user from the database using Lichess ID
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const { wagerAmount, contractGameId } = req.body;

        if (!wagerAmount || !contractGameId) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Convert wagerAmount from ETH to wei
        const wagerInWei = ethers.parseUnits(wagerAmount.toString(), 'ether'); // Convert to wei

        const adjustedGameId = parseInt(contractGameId); // Increment the game ID by 1
        console.log(`Creating game with ID: ${adjustedGameId}`);

        // Create the game entry in the Game table
        const newGame = await prisma.game.create({
            data: {
                contractGameId: adjustedGameId, // Store the smart contract game ID
                player1Id: user.id, // Use the user's ID from the database
                wagerAmount: BigInt(wagerInWei.toString()), // Store wagerAmount in wei as BigInt
                isActive: false, // Initially inactive until the second player joins
            },
        });

        return res.status(200).json({ gameId: newGame.id });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to create game" });
    }
}

