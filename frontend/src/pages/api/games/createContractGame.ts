
import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import smartContractABI from '@/constants/smart-contracts-dev.json'; // Import ABI from the constants folder

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { gameId, player1, player2, wagerAmount } = req.body;

    try {
        // Fetch the game details from the database
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        // Parse wager amount as a BigNumber
        const wagerInEther = ethers.parseUnits(wagerAmount.toString(), 'ether');

        // Initialize contract instance using the ABI from the constants folder
        const contractAddress = process.env.CONTRACT_ADDRESS;
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider); // Backend wallet signs the transaction
        const chessBettingContract = new ethers.Contract(contractAddress, smartContractABI, signer);

        // Call createGame on the smart contract
        const tx = await chessBettingContract.createGame(player1, player2, wagerInEther, {
            value: wagerInEther,  // Specify value if any funds need to be sent
        });
        const receipt = await tx.wait();

        // Extract the contractGameId from the transaction receipt
        const gameCreatedEvent = receipt.logs.find((log) => log.event === "GameCreated");
        if (!gameCreatedEvent) {
            throw new Error("GameCreated event not found in the transaction receipt");
        }

        const contractGameId = gameCreatedEvent.args[0].toString(); // Get contract game ID

        // Update the game in the database with the contractGameId
        await prisma.game.update({
            where: { id: gameId },
            data: {
                contractGameId: contractGameId,
                isActive: true, // Set the game as active
            },
        });

        return res.status(200).json({ success: true, contractGameId });
    } catch (error) {
        console.error("Error creating contract game:", error);
        return res.status(500).json({ error: "Failed to create contract game" });
    }
}

