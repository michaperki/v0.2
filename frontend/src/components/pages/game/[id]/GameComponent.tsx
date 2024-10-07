
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/router';
import { useSmartContract } from '@/hooks/useSmartContract';
import styles from './styles.module.css';
import { ChessBetting } from '@/types/typechain-types';
import Cookies from 'js-cookie'; // To handle player IDs

export default function GameComponent({ game }: { game: any }) {
    const router = useRouter();
    const { id: gameId } = router.query; // Game ID from URL
    const { getSmartContract } = useSmartContract();
    const [isDepositing, setIsDepositing] = useState(false);
    const [error, setError] = useState("");
    const [gameBalance, setGameBalance] = useState<string>("0"); // Store game balance
    const [socket, setSocket] = useState<WebSocket | null>(null); // WebSocket connection

    useEffect(() => {
        if (!gameId) {
            router.push("/");
        } else {
            connectWebSocket(); // Establish WebSocket connection when component mounts
            fetchGameBalance(); // Fetch the game balance on component load
        }

        // Clean up WebSocket on component unmount
        return () => {
            if (socket) {
                socket.close();
            }
        };
    }, [gameId]);

    // Function to establish WebSocket connection
    const connectWebSocket = () => {
        const lichessId = Cookies.get("lichess_id"); // Fetch player's Lichess ID from cookies
        if (!lichessId || !gameId) {
            return;
        }

        const ws = new WebSocket(`ws://localhost:8080/ws?playerId=${encodeURIComponent(lichessId)}&gameId=${encodeURIComponent(gameId as string)}`);
        setSocket(ws);

        ws.onopen = () => {
            console.log('Connected to WebSocket server');
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('Received message:', message);

            if (message.type === 'both-players-deposited') {
                console.log(`Both players have deposited. Game ${message.gameId} is fully funded and ready.`);
            }

            if (message.type === 'game-over') {
                console.log('Game over:', message.event);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };
    };

    // Fetch the game's balance from the smart contract
    const fetchGameBalance = async () => {
        try {
            const chessBettingContract = getSmartContract<ChessBetting>("CHESSBETTING");

            if (!chessBettingContract || !game.contractGameId) {
                throw new Error("ChessBetting contract not found or game not created");
            }

            // Fetch the balance of the game from the contract
            const balance = await chessBettingContract.escrow(game.contractGameId);
            setGameBalance(ethers.formatUnits(balance, "ether")); // Convert from wei to ether
        } catch (e: any) {
            console.error("Error fetching game balance:", e);
            setError(e.message || "Failed to fetch game balance");
        }
    };

    // Function to handle joining the existing game by depositing funds
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

            // Ensure the wager amount is parsed to Ether units
            const wagerAmountInEther = ethers.parseUnits(game.wagerAmount.toString(), "ether");

            // Get the nonce
            const nonce = await provider.getTransactionCount(walletAddress, "latest");
            console.log("Nonce:", nonce);

            // Join the existing game by depositing funds
            const tx = await chessBettingContract.joinGame(game.contractGameId, {
                value: wagerAmountInEther,
            });

            await tx.wait();
            console.log(`Player has joined the game with contractGameId: ${game.contractGameId}`);

            // Notify WebSocket that the player has deposited
            if (socket) {
                socket.send(JSON.stringify({ type: 'player-deposited', gameId }));
            }

            // Fetch the updated balance after the deposit
            fetchGameBalance();
        } catch (e: any) {
            console.error("Error during deposit:", e);
            setError(e.message || "Failed to deposit funds");
        } finally {
            setIsDepositing(false);
        }
    };

    return (
        <div className={styles.gameContainer}>
            <h1 className={styles.header}>Game {game.contractGameId || "Pending"}</h1>
            <div className={styles.gameInfo}>
                <div className={styles.info}>Wager Amount: {game.wagerAmount} ETH</div>
                <div className={styles.info}>Game Balance: {gameBalance} ETH</div> {/* Display game balance */}
                <button className={styles.button} onClick={depositFunds} disabled={isDepositing}>
                    {isDepositing ? "Depositing..." : "Join Game"}
                </button>
                {error && <div className={styles.error}>{error}</div>}
            </div>
        </div>
    );
}

