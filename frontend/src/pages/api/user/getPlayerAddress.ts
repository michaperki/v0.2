
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }



    try {
        // Fetch the player's address using the username
        const player = await prisma.user.findUnique({
            where: { lichessId: username.toLowerCase() }, // Adjust this field to match your schema
        });

        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        return res.status(200).json({ address: player.walletAddress });
    } catch (error) {
        console.error('Error fetching player address:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
