
import { ethers } from 'ethers';
import { NextApiRequest, NextApiResponse } from 'next';
import { ChessBetting } from '@/types/typechain-types/ChessBetting'; // Import ChessBetting type
import prisma from '@/lib/prisma';

const deployedNetworkData = process.env.NODE_ENV === 'production'
   ? require('@/constants/deployed-network-production.json')
   : require('@/constants/deployed-network-development.json');

const smartContractData = process.env.NODE_ENV === 'production'
    ? require('@/constants/smart-contracts-production.json')
    : require('@/constants/smart-contracts-development.json');

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
        console.log('Wager amount:', wagerAmount);

        // Parse wager amount as a bigint in ether (ethers v6 uses native bigint)
        const wagerInEther = ethers.parseUnits(wagerAmount.toString(), 'wei');
        console.log('Wager in ether:', wagerInEther);


        // Get the fee data from provider in ethers.js v6
        const feeData = await provider.getFeeData();

        const maxFeePerGas = feeData.maxFeePerGas ? feeData.maxFeePerGas * 2n : 20n * 10n**9n;  // Set a fallback to 20 Gwei
        const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ? feeData.maxPriorityFeePerGas * 2n : 2n * 10n**9n;  // Fallback to 2 Gwei

        console.log('Max fee per gas:', maxFeePerGas.toString());
        console.log('Max priority fee per gas:', maxPriorityFeePerGas.toString());

        // Static gas limit with buffer
        const gasLimit = 500000n;  // Using bigint for gas limit

        // Call the smart contract's `createGame` function with gas limit and fee data
        const txPromise = chessBettingContract.createGame(wagerInEther, {
            gasLimit: gasLimit,  // Static gas limit using bigint
            maxFeePerGas,
            maxPriorityFeePerGas,
        });

        const tx = await txPromise;
        const receipt = await tx.wait();

        if (!receipt || !Array.isArray(receipt.logs)) {
            throw new Error('Transaction receipt is null or logs are missing');
        }

        console.log('Transaction receipt:', receipt);

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

        // Convert the game ID from the event
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

