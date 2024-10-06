
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/router'; // Import useRouter for navigation
import styles from './styles.module.css';
import { useSmartContract } from '@/hooks/useSmartContract';
import { useWallet } from '@/hooks/useWallet';
import { ChessBetting } from '@/types/typechain-types';  // Assuming you have ChessBetting types available

export default function GameSection() {
    const [wagerToPost, setWagerToPost] = useState("");
    const [games, setGames] = useState<ChessBetting.GameStructOutput[]>([]);
    const { getSmartContract, deployedNetworkData } = useSmartContract();
    const { walletConnectionStatus, switchNetwork, chainCurrent } = useWallet();
    const [error, setError] = useState("");
    const [isSending, setIsSending] = useState(false);
    const router = useRouter(); // Initialize router for navigation

    useEffect(() => {
        if (walletConnectionStatus === "connected") {
            syncGames();
        }
    }, [walletConnectionStatus]);

    useEffect(() => {
        if (deployedNetworkData?.chainId && chainCurrent?.id !== deployedNetworkData?.chainId) {
            switchNetwork && switchNetwork(deployedNetworkData?.chainId);
        }
    }, [chainCurrent, deployedNetworkData]);

    const createGame = async () => {
        setError("");
        const chessBettingContract = getSmartContract<ChessBetting>("CHESSBETTING");

        try {
            if (!chessBettingContract || walletConnectionStatus !== "connected") {
                throw new Error("Wallet or network not ready");
            }

            if (deployedNetworkData?.chainId && chainCurrent?.id !== deployedNetworkData?.chainId) {
                await switchNetwork(deployedNetworkData.chainId);
            }

            if (chainCurrent?.id !== deployedNetworkData.chainId) {
                throw new Error("Failed to switch network");
            }

            setIsSending(true);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            const walletAddress = await signer.getAddress();
            const nonce = await provider.getTransactionCount(walletAddress, "latest"); // Get latest nonce
            console.log("Current nonce:", nonce);

            const wagerAmount = ethers.parseUnits(wagerToPost, "ether");

            const tx = await chessBettingContract.createGame(wagerAmount, {
                value: wagerAmount,
                nonce: nonce, // Set the nonce manually to avoid the mismatch
            });
            const receipt = await tx.wait();
            const gameCreatedEvent = receipt.logs.find((log) => log.fragment.name === "GameCreated");

            if (gameCreatedEvent) {
                console.log("GameCreated event found");
                const contractGameId = gameCreatedEvent.args[0]; // '0' is the gameId
                console.log("Game ID (Game Counter):", contractGameId.toString());
                const creatorAddress = gameCreatedEvent.args[1]; // '1' is the creator address
                const wagerAmount = ethers.formatUnits(gameCreatedEvent.args[2], "ether"); // '2' is the wager amount

                console.log("Game ID (Game Counter):", contractGameId.toString());
                console.log("Creator Address:", creatorAddress);
                console.log("Wager Amount (ETH):", wagerAmount);
                // Step 2: Convert BigInt to number safely for the backend request

                const wagerAmountNumber = Number(wagerAmount);
                if (wagerAmountNumber > Number.MAX_SAFE_INTEGER) {
                    throw new Error("Wager amount exceeds safe integer range");
                }
                // Step 2: Call the backend API to save the game in the database
                const response = await fetch("/api/games/create", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ wagerAmount: wagerAmountNumber, contractGameId: contractGameId.toString() }), // Save the gameId
                });

                if (!response.ok) {
                    throw new Error("Failed to create game in the database");
                }

                const { gameId } = await response.json();

                syncGames(); // Refresh the games list
                setWagerToPost(""); // Clear input

            } else {
                console.log("GameCreated event not found");
            }
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to create game");
        } finally {
            setIsSending(false);
        }
    };

    const joinGame = async (contractGameId: number) => {
        setError("");
        const chessBettingContract = getSmartContract<ChessBetting>("CHESSBETTING");

        try {
            if (!chessBettingContract || walletConnectionStatus !== "connected") {
                throw new Error("Wallet or network not ready");
            }

            if (deployedNetworkData?.chainId && chainCurrent?.id !== deployedNetworkData?.chainId) {
                await switchNetwork(deployedNetworkData.chainId);
            }

            if (chainCurrent?.id !== deployedNetworkData.chainId) {
                throw new Error("Failed to switch network");
            }

            setIsSending(true);

            const game = games.find(game => game.contractGameId === contractGameId);
            if (!game) {
                throw new Error("Game not found");
            }

            const wagerAmountInWei = ethers.parseUnits(game.wagerAmount.toString(), "wei");
            console.log("Wager amount in wei:", wagerAmountInWei.toString());

            // Get the nonce for the transaction to prevent the nonce issue
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const nonce = await provider.getTransactionCount(signer.address);

            console.log("Current nonce:", nonce);

            // Step 1: Call smart contract to join the game using the correct contract game ID
            const tx = await chessBettingContract.joinGame(contractGameId, {
                value: wagerAmountInWei,
                nonce: nonce, // Set the nonce manually to avoid the mismatch
            });
            const receipt = await tx.wait();

            console.log("Join game transaction receipt:", receipt);

            // Step 2: Call the backend API to update the game in the database
            const response = await fetch("/api/games/join", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contractGameId,
                    wagerAmount: Number(wagerAmountInWei),
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to join game in the database");
            }

            syncGames(); // Refresh the games list
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to join game");
        } finally {
            setIsSending(false);
        }
    };

    const syncGames = async () => {
        setError("");
        const chessBettingContract = getSmartContract<ChessBetting>("CHESSBETTING");

        try {
            if (walletConnectionStatus === "connected" && chessBettingContract) {
                // Fetch games from Prisma (DB)
                const response = await fetch('/api/games');
                if (!response.ok) {
                    throw new Error("Failed to fetch games from the database");
                }
                const gamesFromDb = await response.json(); // Games from the database

                // Fetch all games from the smart contract
                const allGames = await chessBettingContract.getAllGames();
                console.log("All games from contract:", allGames);


                // Iterate over each contract game and extract its data
                const formattedGames = gamesFromDb.map((dbGame) => {
                    // Find the corresponding game in the contract by matching contractGameId
                    const contractGame = allGames.find((game, index) => {
                        const contractGameId = index;  // This should match the contractGameId from the smart contract
                        return contractGameId === dbGame.contractGameId;
                    });

                    if (!contractGame) {
                        console.warn(`Contract game not found for contractGameId: ${dbGame.contractGameId}`);
                        return null;
                    }

                    // Ensure the wager amount is correctly converted from wei to ether
                    const wagerAmountInEther = ethers.formatUnits(contractGame[1], "wei");

                    // Extract and map contract game data
                    return {
                        id: dbGame.id, // Use the actual Prisma game ID for navigation
                        contractGameId: dbGame.contractGameId, // Contract game ID
                        wagerAmount: wagerAmountInEther, // Wager amount in ETH
                        isActive: contractGame[4], // Is game active?
                        participants: contractGame[0].map((participant: any) => participant.toString()) // Convert participants to readable format
                    };
                }).filter(game => game !== null); // Filter out any unmatched games

                setGames(formattedGames); // Set the games state
            }
        } catch (e) {
            console.error(e);
            setError("Failed to sync all games");
        }
    };

    return (
        <div className={styles.gameSection}>
            <h2>Chess Betting</h2>

            {walletConnectionStatus === "connected" ? (
                <p>Connected to wallet</p>
            ) : (
                <p>Not connected to wallet</p>
            )}

            {error && <div className={styles.error}>{error}</div>}
            {isSending && <div className={styles.loading}>Sending...</div>}

            <div className={styles.createGame}>
                <h3>Create a New Game</h3>
                <input
                    type="text"
                    value={wagerToPost}
                    onChange={(e) => setWagerToPost(e.target.value)}
                    placeholder="Enter wager amount in ETH"
                />
                <button onClick={createGame} disabled={!wagerToPost}>
                    Create Game
                </button>
            </div>

            <ul className={styles.gameList}>
                {games.map((game, index) => (
                    <li key={index}>
                        <p>Game ID: {game.id}</p>
                        <p>Game contract id: {game.contractGameId}</p>
                        {game.participants.map((participant, idx) => (
                            <p key={idx}>Player {idx + 1}: {participant}</p>
                        ))}
                        <p>Wager: {ethers.formatUnits(game.wagerAmount, "ether")} ETH</p>
                        <p>Status: {game.isActive ? "Active" : "Not active"}</p>

                        {!game.isActive && game.participants.length < 2 && (
                            <button onClick={() => joinGame(game.contractGameId)}>Join Game</button>
                        )}

                        {game.isActive && (
                            <button onClick={() => router.push(`/game/${game.id}`)}>
                                Go to Game
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

