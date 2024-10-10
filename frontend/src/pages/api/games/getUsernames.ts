
// pages/api/games/getUsernames.ts
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { player1Id, player2Id } = req.body;

    try {
        const player1 = await prisma.user.findUnique({
            where: { id: player1Id },
            select: { lichessId: true }
        });

        const player2 = await prisma.user.findUnique({
            where: { id: player2Id },
            select: { lichessId: true }
        });

        if (!player1 || !player2) {
            return res.status(404).json({ error: "Player not found" });
        }

        res.status(200).json({
            player1Username: player1.lichessId,
            player2Username: player2.lichessId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching player usernames' });
    }
}
