
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/router';
import { useSmartContract } from '@/hooks/useSmartContract';
import styles from './styles.module.css';
import { ChessBetting } from '@/types/typechain-types';

export default function GameComponent({ game }: { game: any }) {
    const router = useRouter();
    const { id: gameId } = router.query; // Game ID from URL
    const { getSmartContract } = useSmartContract();
    const [isDepositing, setIsDepositing] = useState(false);
    const [error, setError] = useState("");
    const [gameCreated, setGameCreated] = useState(false); // Track if the game has been created on-chain

    useEffect(() => {
        if (!gameId) {
            router.push("/");
        }
        // Fetch the game data (from backend or context) based on the gameId
    }, [gameId]);

    // This function will handle the contract creation or joining based on whether contractGameId exists
    const depositFunds = async () => {
        try {
            setIsDepositing(true);
            const chessBettingContract = getSmartContract<ChessBetting>("CHESSBETTING");

            if (!chessBettingContract) {
                throw new Error("ChessBetting contract not found");
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const walletAddress = await signer.getAddress();

            // Ensure the wager amount is treated as a string before parsing to Ether units
            const wagerAmountInEther = ethers.parseUnits(game.wagerAmount.toString(), "ether");

            // get the nonce for the transaction
            const nonce = await provider.getTransactionCount(walletAddress, 'latest');
            console.log("Nonce:", nonce);

            if (!game.contractGameId) {
                // If contractGameId does not exist, Player 1 is creating the game on-chain
                const tx = await chessBettingContract.createGame(wagerAmountInEther, {
                    value: wagerAmountInEther,
                });
                const receipt = await tx.wait();

                const gameCreatedEvent = receipt.logs.find(log => log.fragment.name === 'GameCreated');
                const contractGameId = gameCreatedEvent?.args?.gameId;

                if (contractGameId) {
                    console.log("Game created on-chain with contractGameId:", contractGameId.toString());

                    // Save the contractGameId in the backend database
                    await fetch('/api/games/updateContractGameId', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ gameId, contractGameId: contractGameId.toString() }),
                    });

                    setGameCreated(true); // Mark that the game is now created
                } else {
                    throw new Error("GameCreated event not found");
                }

            } else {
                // If contractGameId exists, Player 2 is joining the game
                const tx = await chessBettingContract.joinGame(game.contractGameId, {
                    value: wagerAmountInEther,
                });
                await tx.wait();
                console.log("Player 2 has joined the game with contractGameId:", game.contractGameId);
            }

        } catch (e: any) {
            console.error("Error during deposit:", e);
            setError(e.message || "Failed to deposit funds");
        } finally {
            setIsDepositing(false);
        }
    };

    return (
        <div>
            <h1>Game {game.contractGameId || "Pending Creation"}</h1>
            <div className={styles.gameInfo}>
                <div>Wager Amount: {game.wagerAmount} ETH</div>
                <button onClick={depositFunds} disabled={isDepositing}>
                    {isDepositing ? "Depositing..." : game.contractGameId ? "Join Game" : "Create Game"}
                </button>
                {error && <div className={styles.error}>{error}</div>}
            </div>
        </div>
    );
}

