
import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import smartContractData from '@/constants/smart-contracts-development.json'; // Import ABI & contract address
import deployedNetworkData from '@/constants/deployed-network-development.json'; // Import deployed network constants
import { ChessBetting } from '@/types/typechain-types/ChessBetting'; // Import ChessBetting type

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { gameId } = req.body;

    try {
        // Get the game from the database
        const game = await prisma.game.findUnique({
            where: { id: parseInt(gameId) },
        });

        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        if (game.contractGameId) {
            return res.status(400).json({ error: 'Contract game already created' });
        }

        // Initialize Ethereum provider using the server-side RPC URL
        const provider = new ethers.JsonRpcProvider(deployedNetworkData.url);

        // Use server's private key to create a signer
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

        // Extract contract address and ABI from imported JSON
        const chessBettingContractData = smartContractData.CHESSBETTING;

        // Instantiate the contract with the type `ChessBetting`
        const chessBettingContract = new ethers.Contract(
            chessBettingContractData.contractAddress,
            chessBettingContractData.abi,
            signer
        ) as unknown as ChessBetting;

        const wagerAmount = game.wagerAmount;
        console.log('Creating game with wager amount:', wagerAmount);

        // Parse wager amount as a BigNumber in ether
        const wagerInEther = ethers.parseUnits(wagerAmount.toString(), 'ether');

        // Call the smart contract's `createGame` function without sending value
        const tx = await chessBettingContract.createGame(wagerInEther);
        const receipt = await tx.wait();

        // Get the event signature for the GameCreated event
        const eventSignature = ethers.id("GameCreated(uint256,address,uint256)");

        // Find the log that matches the GameCreated event
        const gameCreatedLog = receipt.logs.find((log) => log.topics[0] === eventSignature);

        if (!gameCreatedLog) {
            throw new Error('GameCreated event not found in the transaction receipt');
        }

        // Decode the event log
        const decodedLog = chessBettingContract.interface.decodeEventLog(
            "GameCreated",
            gameCreatedLog.data,
            gameCreatedLog.topics
        );

        // a cleaner way to write the lines above is:
        const contractGameIdInt = parseInt(decodedLog.gameId.toString());

        // update the game with the contract game ID
        const newGame = await prisma.game.update({
            where: { id: game.id },
            data: { contractGameId: contractGameIdInt },
        });


        // Respond with the newly created game information
        return res.status(200).json({ success: true, contractGameIdInt, gameId: newGame.id });
    } catch (error) {
        console.error('Error creating contract game:', error);
        return res.status(500).json({ error: 'Failed to create contract game' });
    }
}

