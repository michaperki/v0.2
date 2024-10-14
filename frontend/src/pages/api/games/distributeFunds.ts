
import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ChessBetting } from '@/types/typechain-types/ChessBetting'; // Import the type
import prisma from '@/lib/prisma';

const deployedNetworkData = process.env.NODE_ENV === 'production'
   ? require('@/constants/deployed-network-production.json')
   : require('@/constants/deployed-network-development.json');

const smartContractData = process.env.NODE_ENV === 'production'
    ? require('@/constants/smart-contracts-production.json')
    : require('@/constants/smart-contracts-development.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { gameId, winnerLichessId } = req.body;
  console.log('Distributing funds for game:', gameId, 'Winner:', winnerLichessId);

  try {
    // Fetch the game data from the database
    const game = await prisma.game.findUnique({
      where: { id: parseInt(gameId) },
    });

    if (!game || !game.contractGameId) {
      return res.status(404).json({ error: 'Game not found or contract not created' });
    }

    // Fetch the winner's user ID based on their Lichess ID
    const winner = await prisma.user.findUnique({
      where: { lichessId: winnerLichessId },  // Query the user table based on Lichess ID
      select: { id: true, walletAddress: true },  // Fetch the user ID and wallet address
    });

    if (!winner || !winner.walletAddress) {
      return res.status(404).json({ error: 'Winner not found' });
    }

    const winnerUserId = winner.id;  // Get the winner's user ID
    const winnerAddress = winner.walletAddress;  // Get the wallet address for smart contract call

    console.log('Winner user ID:', winnerUserId, 'Wallet address:', winnerAddress);

    // Initialize Ethereum provider using the appropriate network configuration
    const provider = new ethers.JsonRpcProvider(deployedNetworkData.url);
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

    // Use the contract address and ABI from constants
    const contract = new ethers.Contract(
      smartContractData.CHESSBETTING.contractAddress, // Access the contract address from constants
      smartContractData.CHESSBETTING.abi, // Access the ABI from constants
      signer
    ) as unknown as ChessBetting;

    // Fetch the total payout amount (escrow) from the contract
    const payoutAmount = await contract.escrow(game.contractGameId);
    console.log('Payout amount:', payoutAmount.toString());
    const payoutAmountInMatic = ethers.formatUnits(payoutAmount, "ether"); // Convert to readable format (MATIC)
    console.log('Payout amount in MATIC:', payoutAmountInMatic);

    if (payoutAmount === BigInt(0)) {
      return res.status(400).json({ error: 'No funds in escrow for this game' });
    }

    // Call the declareResult function on the contract with the wallet address
    const tx = await contract.declareResult(game.contractGameId, winnerAddress);

    console.log('Result declared');

    // Respond early with the transaction hash
    // res.status(202).json({
    //   message: "Transaction sent, waiting for confirmation",
    //   transactionHash: tx.hash,
    // });

    // Wait for the transaction to be mined
    const receipt = await tx.wait();

    if (!receipt) {
      // If no receipt, log and exit
      console.error('No transaction receipt found');
      return res.status(500).json({ error: 'Transaction not confirmed' });
    }

    if (receipt.status !== 1) {
      return res.status(500).json({ error: 'Transaction failed' });
    }

    console.log('Transaction confirmed');

    // Update the game status in the database to store the user ID of the winner
    await prisma.game.update({
      where: { id: game.id },
      data: {
        winner: {
          connect: { id: winnerUserId }, // Use connect to link the winner by user ID
        },
      },
    });

    return res.status(200).json({ success: true, payoutAmountInMatic });
  } catch (error) {
    console.error('Error distributing funds:', error);
    return res.status(500).json({ error: 'Failed to distribute funds' });
  }
}

