
import { useEffect, useState } from 'react';
import { ethers, Eip1193Provider } from 'ethers';
import { useRouter } from 'next/router';
import { useSmartContract } from '@/hooks/useSmartContract';
import { useWallet } from '@/hooks/useWallet';
import { ChessBetting } from '@/types/typechain-types';
import Cookies from 'js-cookie';
import styles from './styles.module.css';

export default function GameComponent({ game }: { game: any }) {
    const router = useRouter();
    const { id: gameId } = router.query;
    const { getSmartContract, loading } = useSmartContract();
    const { ethersSigner, ethersProvider } = useWallet();
    const [isDepositing, setIsDepositing] = useState(false);
    const [error, setError] = useState("");
    const [gameBalance, setGameBalance] = useState<string>("0");
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [contractGameId, setContractGameId] = useState<number | null>(null);
    const [lichessGameId, setLichessGameId] = useState<string | null>(null); // New state to store Lichess game ID

    const connectWebSocket = () => {
        const lichessId = Cookies.get("lichess_id");
        if (!lichessId || !gameId) return;

        const ws = new WebSocket(`ws://localhost:8080/ws?playerId=${encodeURIComponent(lichessId)}&gameId=${encodeURIComponent(gameId as string)}`);
        setSocket(ws);

        ws.onopen = () => console.log('Connected to WebSocket server');

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('Received message:', message);

            if (message.type === 'game-contract-created') {
                console.log(`Contract game ID ${message.contractGameId} created`);
                setContractGameId(message.contractGameId);
            }

            if (message.type === 'both-players-deposited') {
                console.log(`Both players have deposited into game ID ${message.gameId}`);
                fetchGameBalance(message.contractGameId);
            }

            if (message.type === 'lichess-game-created') {
                console.log(`Lichess game created with ID: ${message.lichessGameId}`);
                setLichessGameId(message.lichessGameId); // Store the Lichess game ID
            }

            if (message.type === 'game-over') {
                console.log('Game over:', message.event);
            }
        };

        ws.onclose = () => console.log('WebSocket connection closed');
    };

    const fetchGameBalance = async (contractGameId: number) => {
        if (loading || !ethersSigner || !ethersProvider) return;
        if (!contractGameId) {
            console.error("Contract game ID not found");
            return;
        }
        console.log("Fetching game balance for contract game ID:", contractGameId);

        try {
            const chessBettingContract = getSmartContract<ChessBetting>("CHESSBETTING");
            if (!chessBettingContract) {
                throw new Error("ChessBetting contract not found or not yet initialized");
            }

            const balance = await chessBettingContract.escrow(contractGameId);
            setGameBalance(ethers.formatUnits(balance, "ether"));
        } catch (e: any) {
            console.error("Error fetching game balance:", e);
            setError(e.message || "Failed to fetch game balance");
        }
    };

    const depositFunds = async () => {
        if (!ethersSigner || !ethersProvider) {
            setError("Wallet not connected");
            return;
        }

        let provider;
        if (window.ethereum && typeof window.ethereum.request === 'function') {
            provider = new ethers.BrowserProvider(window.ethereum as unknown as Eip1193Provider);
        } else {
            setError("Ethereum provider is not available. Please install MetaMask.");
            return;
        }

        try {
            setIsDepositing(true);
            const chessBettingContract = getSmartContract<ChessBetting>("CHESSBETTING");

            if (!chessBettingContract || !contractGameId) {
                throw new Error("ChessBetting contract not found or contract game ID missing");
            }

            const signer = await provider.getSigner();
            const walletAddress = await signer.getAddress();
            const wagerAmountInEther = ethers.parseUnits(game.wagerAmount.toString(), "ether");

            const nonce = await provider.getTransactionCount(walletAddress, "latest");
            console.log("Nonce:", nonce);

            const tx = await chessBettingContract.joinGame(contractGameId, {
                value: wagerAmountInEther,
                nonce,
            });

            await tx.wait();
            console.log(`Player has joined the game with contractGameId: ${contractGameId}`);

            if (socket) {
                socket.send(JSON.stringify({ type: 'player-deposited', gameId }));
            }

            fetchGameBalance(contractGameId);
        } catch (e: any) {
            console.error("Error during deposit:", e);
            setError(e.message || "Failed to deposit funds");
        } finally {
            setIsDepositing(false);
        }
    };

    useEffect(() => {
        if (!gameId) {
            router.push("/");
        } else {
            if (!loading && ethersSigner && ethersProvider) {
                connectWebSocket();
                if (contractGameId) fetchGameBalance(contractGameId);
            }
        }

        return () => {
            if (socket) {
                socket.close();
            }
        };
    }, [gameId, loading, ethersSigner, ethersProvider, contractGameId]);

    return (
        <div className={styles.gameContainer}>
            {loading ? (
                <div>Loading contract data...</div>
            ) : (
                <>
                    <h1 className={styles.header}>Game {contractGameId || "Pending"}</h1>
                    <div className={styles.gameInfo}>
                        <div className={styles.info}>Wager Amount: {game.wagerAmount} ETH</div>
                        <div className={styles.info}>Game Balance: {gameBalance} ETH</div>
                        <button className={styles.button} onClick={depositFunds} disabled={isDepositing}>
                            {isDepositing ? "Depositing..." : "Join Game"}
                        </button>
                        {lichessGameId && (
                            <a
                                href={`https://lichess.org/${lichessGameId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.button}
                            >
                                Go to Lichess Game
                            </a>
                        )}
                        {error && <div className={styles.error}>{error}</div>}
                    </div>
                </>
            )}
        </div>
    );
}

