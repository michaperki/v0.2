
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { walletAddress } = req.query;
  console.log("fetching wager history for wallet address:", walletAddress);

  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  try {
    // Fetch the user by wallet address
    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = user.id;

    console.log('Fetching wager history for user:', userId);

    // Fetch games where the user is either player1 or player2
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { player1Id: userId },
          { player2Id: userId },
        ],
      },
      include: {
        player1: true,
        player2: true,
        winner: true,
      },
    });

    console.log('Fetched games:', games);

    // Transform the data to the required format
    const wagerHistory = games.map((game) => {
      const isPlayer1 = game.player1Id === userId;
      const opponent = isPlayer1 ? game.player2?.lichessId : game.player1.lichessId;
      const isWinner = game.winnerId === userId;
      const winLoss = isWinner ? 'win' : 'loss';

      return {
        opponent: opponent || 'N/A',
        wagerAmount: game.wagerAmount ? (Number(game.wagerAmount) / 1e18).toString() + ' ETH' : 'N/A',
        winLoss,
        transactionHash: game.transactionHash || null,
        payoutAmount: game.payoutAmount ? (Number(game.payoutAmount) / 1e18).toString() + ' ETH' : 'N/A',
      };
    });

    res.status(200).json(wagerHistory);
  } catch (error) {
    console.error('Error fetching wager history:', error);
    res.status(500).json({ error: 'Failed to fetch wager history' });
  }
}

