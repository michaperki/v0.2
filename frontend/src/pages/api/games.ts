
// GET /api/games
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const games = await prisma.game.findMany();
        return res.status(200).json(games);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to fetch games" });
    }
}
