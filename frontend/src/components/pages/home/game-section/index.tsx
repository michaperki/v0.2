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
    const [isListening, setIsListening] = useState(false); // To prevent adding multiple listeners
    const [socket, setSocket] = useState<WebSocket | null>(null); // WebSocket state
    const router = useRouter(); // Initialize router for navigation

    // WebSocket connection logic
    const connectWebSocket = (playerId: string, gameId: string) => {
        // Ensure that playerId and gameId are passed correctly as query parameters
        const ws = new WebSocket(`ws://localhost:8080/ws?playerId=${encodeURIComponent(playerId)}&gameId=${encodeURIComponent(gameId)}`);
        setSocket(ws);

        ws.onopen = () => {
            console.log('Connected to WebSocket server');
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('Received message:', message);

            if (message.type === 'game-started') {
                console.log(`Game started, redirecting to game: ${message.gameId}`);
                router.push(`/game/${message.gameId}`);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };


        return ws;
    };

    useEffect(() => {
        if (walletConnectionStatus === "connected") {
            syncGames();
            listenToEscrowDepositEvents(); // Start listening for EscrowDeposit events
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
                const contractGameId = gameCreatedEvent.args[0]; // '0' is the gameId
                const creatorAddress = gameCreatedEvent.args[1]; // '1' is the creator address
                const wagerAmountFormatted = ethers.formatUnits(gameCreatedEvent.args[2], "ether"); // '2' is the wager amount

                // Save game to the database
                const response = await fetch("/api/games/create", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ wagerAmount: Number(wagerAmountFormatted), contractGameId: contractGameId.toString() }),
                });

                if (!response.ok) {
                    throw new Error("Failed to create game in the database");
                }

                const { gameId } = await response.json();

                // Connect to WebSocket server
                connectWebSocket(walletAddress, gameId);

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

            // Get the nonce for the transaction
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const nonce = await provider.getTransactionCount(signer.address);

            // Call smart contract to join the game
            const tx = await chessBettingContract.joinGame(contractGameId, {
                value: wagerAmountInWei,
                nonce: nonce,
            });
            const receipt = await tx.wait();

            // Update the game in the database
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

            const walletAddress = await signer.getAddress();

            // Connect to WebSocket server
            connectWebSocket(walletAddress, game.id);
            setIsSending(false);

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
                const gamesFromDb = await response.json();

                // Fetch all games from the smart contract
                const allGames = await chessBettingContract.getAllGames();

                const formattedGames = gamesFromDb.map((dbGame) => {
                    const contractGame = allGames.find((game, index) => index === dbGame.contractGameId);
                    if (!contractGame) {
                        console.warn(`Contract game not found for contractGameId: ${dbGame.contractGameId}`);
                        return null;
                    }

                    const wagerAmountInEther = ethers.formatUnits(contractGame[1], "wei");

                    return {
                        id: dbGame.id,
                        contractGameId: dbGame.contractGameId,
                        wagerAmount: wagerAmountInEther,
                        isActive: contractGame[4],
                        participants: contractGame[0].map((participant: any) => participant.toString())
                    };
                }).filter(game => game !== null);

                setGames(formattedGames);
            }
        } catch (e) {
            console.error(e);
            setError("Failed to sync all games");
        }
    };

    const listenToEscrowDepositEvents = async () => {
        if (isListening) return;

        try {
            const chessBettingContract = getSmartContract<ChessBetting>("CHESSBETTING");
            if (!chessBettingContract) return;

            const filter = chessBettingContract.filters.EscrowDeposit();
            const pastEvents = await chessBettingContract.queryFilter(filter);

            pastEvents.forEach((event) => {
                console.log(`Past EscrowDeposit event for Game ID: ${event.args.gameId.toString()}`);
                syncGames();
            });

            chessBettingContract.on("EscrowDeposit", (gameId, player, amount) => {
                console.log(`EscrowDeposit event detected for Game ID: ${gameId.toString()}`);
                syncGames();
            });

            setIsListening(true);
        } catch (error) {
            console.error("Error listening: to EscrowDeposit events:", error);
        }
    };

    return (
        <div className={styles.gameSection}>
            <h2>Chess Betting</h2>

            {error && <div className={styles.error}>{error}</div>}
            {isSending && <div className={styles.loading}>Sending...</div>}

            <div className={styles.createGame}>
                <h3>Create a New Game</h3>
                <input
                    className={styles.input}
                    type="text"
                    value={wagerToPost}
                    onChange={(e) => setWagerToPost(e.target.value)}
                    placeholder="Enter wager amount in ETH"
                />
                <button className={styles.btn} onClick={createGame} disabled={!wagerToPost}>
                    Create Game
                </button>
            </div>

            <ul className={styles.gameList}>
                {games.map((game, index) => (
                    <li className={styles.list} key={index}>
                        <div className={styles.listItem}>
                            <p>Game ID: {game.id}</p>
                            <p>Game contract id: {game.contractGameId}</p>
                            {game.participants.map((participant, idx) => (
                                <p key={idx}>Player {idx + 1}: {participant}</p>
                            ))}
                            <p>Wager: {ethers.formatUnits(game.wagerAmount, "ether")} ETH</p>
                            <p>Status: {game.isActive ? "Active" : "Not active"}</p>

                            {!game.isActive && game.participants.length < 2 && (
                                <button className={styles.btn} onClick={() => joinGame(game.contractGameId)}>Join Game</button>
                            )}

                            {game.isActive && (
                                <button onClick={() => router.push(`/game/${game.id}`)}>
                                    Go to Game
                                </button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
