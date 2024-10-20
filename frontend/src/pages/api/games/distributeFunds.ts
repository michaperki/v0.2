
import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ChessBetting } from '@/types/typechain-types/ChessBetting'; // Import the type
import prisma from '@/lib/prisma';

const deployedNetworkData = process.env.NODE_ENV === 'production'
   ? require('@/constants/deployed-network-production.json')
   : require('@/constants/smart-contracts-development.json');

const smartContractData = process.env.NODE_ENV === 'production'
    ? require('@/constants/smart-contracts-production.json')
    : require('@/constants/smart-contracts-development.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { gameId, winnerLichessId } = req.body;
  console.log('Distributing funds for game:', gameId, 'Winner:', winnerLichessId);

  try {
    // Fetch game from database
    const game = await prisma.game.findUnique({
      where: { id: parseInt(gameId) },
    });

    if (!game || !game.contractGameId) {
      console.error('Game not found or contract not created.');
      return res.status(404).json({ error: 'Game not found or contract not created' });
    }

    // Fetch winner details
    const winner = await prisma.user.findUnique({
      where: { lichessId: winnerLichessId },
      select: { id: true, walletAddress: true },
    });

    if (!winner || !winner.walletAddress) {
      console.error('Winner not found.');
      return res.status(404).json({ error: 'Winner not found' });
    }

    const winnerUserId = winner.id;
    const winnerAddress = winner.walletAddress;

    console.log('Winner user ID:', winnerUserId, 'Wallet address:', winnerAddress);

    // Initialize Ethereum provider
    const provider = new ethers.JsonRpcProvider(deployedNetworkData.url);
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

    const contract = new ethers.Contract(
      smartContractData.CHESSBETTING.contractAddress,
      smartContractData.CHESSBETTING.abi,
      signer
    ) as unknown as ChessBetting;

    // Fetch the payout amount from the contract
    const payoutAmount = await contract.escrow(game.contractGameId);
    console.log('Payout amount:', payoutAmount.toString());

    if (payoutAmount === BigInt(0)) {
      console.error('No funds in escrow for this game.');
      return res.status(400).json({ error: 'No funds in escrow for this game' });
    }

    // Declare the result on the blockchain
    const tx = await contract.declareResult(game.contractGameId, winnerAddress);
    console.log('Result declared, tx hash:', tx.hash);

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      console.error('Transaction failed or not confirmed.');
      await prisma.game.update({
        where: { id: game.id },
        data: {
          transactionHash: receipt ? receipt.hash : null,
          payoutAmount: BigInt(0),
        },
      });
      return res.status(500).json({ error: 'Transaction failed or not confirmed' });
    }

    console.log('Transaction confirmed, receipt hash:', receipt.hash);

    const feeAmount = (payoutAmount * BigInt(5)) / BigInt(100);
    const winnerPayout = payoutAmount - feeAmount;

    console.log('Winner payout (after 5% fee):', ethers.formatUnits(winnerPayout, 'ether'));

    // Update the game status in the database
    const updateResponse = await prisma.game.update({
      where: { id: game.id },
      data: {
        winner: { connect: { id: winnerUserId } },
        transactionHash: receipt.hash,
        payoutAmount: winnerPayout, // This will be stored as BigInt in the database
      },
    });

    if (!updateResponse) {
      throw new Error('Failed to update game with payout details.');
    }

    console.log('Game successfully updated with payout:', updateResponse);

    // Respond to the client after everything is done
    return res.status(200).json({
      message: 'Funds distributed successfully',
      transactionHash: receipt.hash,
      payoutAmountInMatic: ethers.formatUnits(winnerPayout, 'ether'), // Convert BigInt to string for MATIC value
    });

  } catch (error) {
    console.error('Error distributing funds:', error);
    return res.status(500).json({ error: 'Error distributing funds' });
  }
}

