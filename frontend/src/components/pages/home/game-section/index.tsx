
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from './styles.module.css';
import { useWallet } from '@/hooks/useWallet';
import Cookies from 'js-cookie';

export default function GameSection() {
    const [wagerToPost, setWagerToPost] = useState("");
    const { walletConnectionStatus, walletAddress } = useWallet();
    const [error, setError] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [socket, setSocket] = useState<WebSocket | null>(null); // WebSocket state
    const router = useRouter();

    // Function to handle WebSocket connection
    const connectWebSocket = (gameId: string) => {
        const lichessId = Cookies.get("lichess_id");
        console.log('Connecting to WebSocket server...');
        console.log('lichessId:', lichessId);
        console.log('gameId:', gameId);

        // Ensure that lichessId and gameId are passed correctly as query parameters
        const ws = new WebSocket(`ws://localhost:8080/ws?playerId=${encodeURIComponent(lichessId!)}&gameId=${encodeURIComponent(gameId)}`);
        setSocket(ws);

        ws.onopen = () => {
            console.log('Connected to WebSocket server');
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('Received message:', message);

            // Handle when the game pairing is completed, or both players have deposited
            if (message.type === 'game-paired') {
                console.log(`Game paired, redirecting to game: ${message.gameId}`);
                router.push(`/game/${message.gameId}`);
            }

            if (message.type === 'both-players-deposited') {
                console.log(`Both players have deposited, game ready: ${message.gameId}`);
                router.push(`/game/${message.gameId}`);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };

        return ws;
    };

    // Close WebSocket connection on unmount
    useEffect(() => {
        return () => {
            if (socket) {
                socket.close();
            }
        };
    }, [socket]);

    const playGame = async () => {
        setError("");
        setIsSending(true);

        try {
            const lichessId = Cookies.get("lichess_id"); // Fetch Lichess ID from cookies

            if (!lichessId) {
                throw new Error("Unauthorized. Please log in first.");
            }

            // Send wagerAmount and lichessId to the pairing API
            const response = await fetch("/api/games/pairing", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    wagerAmount: Number(wagerToPost),
                    lichessId,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to pair players");
            }

            const { gameId, contractGameId } = await response.json();

            // Establish WebSocket connection
            const ws = connectWebSocket(gameId);

            // Check if the contract game has been created, then redirect
            if (contractGameId) {
                console.log(`Game paired successfully, contractGameId: ${contractGameId}`);
                router.push(`/game/${gameId}`); // Redirect to the game page
            } else {
                console.log("Waiting for an opponent...");
            }

            setWagerToPost("");  // Clear input after the process
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to play game");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className={styles.gameSection}>
            <h2>Chess Betting</h2>

            {error && <div className={styles.error}>{error}</div>}
            {isSending && <div className={styles.loading}>Sending...</div>}

            <div className={styles.createGame}>
                <h3>Enter Wager and Play</h3>
                <input
                    className={styles.input}
                    type="text"
                    value={wagerToPost}
                    onChange={(e) => setWagerToPost(e.target.value)}
                    placeholder="Enter wager amount in ETH"
                />
                <button
                    className={styles.btn}
                    onClick={playGame}
                    disabled={!wagerToPost || isSending}
                >
                    {isSending ? "Processing..." : "Play Game"}
                </button>
            </div>
        </div>
    );
}

