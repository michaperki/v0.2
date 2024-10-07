
import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { useRouter } from 'next/router';
import { ethers } from 'ethers'; // Import ethers.js
import { useSmartContract } from '@/hooks/useSmartContract'; // Hook to get the smart contract
import styles from './styles.module.css';
import { ChessBetting } from '@/types/typechain-types'; // Assuming you have ChessBetting types available

export default function GameComponent({ game }: { game: any }) {
    const router = useRouter();
    const { id } = router.query; // Game ID from URL
    const [position, setPosition] = useState<string | null>(null);
    const [gameBalance, setGameBalance] = useState<string>(""); // State for the specific game's escrow balance
    const { getSmartContract } = useSmartContract(); // Hook to access the smart contract
    const [lichessGameId, setLichessGameId] = useState<string | null>(game.lichessGameId);
    const [lichessStatus, setLichessStatus] = useState<string | null>(null);
    const [player1Username, setPlayer1Username] = useState<string | null>(null);
    const [player2Username, setPlayer2Username] = useState<string | null>(null);
    const [gameOver, setGameOver] = useState<boolean>(false);
    const [winner, setWinner] = useState<string | null>(null);

    useEffect(() => {
        if (game.contractGameId) {
            fetchGameEscrowBalance(game.contractGameId); // Fetch the balance using contractGameId
        }
    }, [game.contractGameId, gameBalance]);

    // Fetch the balance for the specific game from the escrow
    const fetchGameEscrowBalance = async (contractGameId: string) => {
        try {
            const chessBettingContract = getSmartContract<ChessBetting>("CHESSBETTING");
            if (!chessBettingContract) {
                console.error("ChessBetting contract not found");
                return;
            }
            const balance = await chessBettingContract.escrow(contractGameId); // Use contractGameId
            setGameBalance(ethers.formatUnits(balance, "ether"));
        } catch (error) {
            console.error("Error fetching game balance:", error);
        }
    };

    // Fetch player usernames based on player IDs from the game object
    useEffect(() => {
        if (!player1Username || !player2Username) {
            fetchPlayerUsernames(game.player1Id, game.player2Id);
        }
    }, [player1Username, player2Username]);

    const fetchPlayerUsernames = async (player1Id: number, player2Id: number) => {
        try {
            const response = await fetch('/api/games/getUsernames', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player1Id, player2Id })
            });

            const data = await response.json();
            setPlayer1Username(data.player1Username);
            setPlayer2Username(data.player2Username);
        } catch (error) {
            console.error('Error fetching player usernames:', error);
        }
    };

    // Create a Lichess game if not already created
    useEffect(() => {
        if (!lichessGameId && player1Username && player2Username) {
            createLichessGame(game.id, player1Username, player2Username);
        }
    }, [lichessGameId, player1Username, player2Username]);

    const createLichessGame = async (gameId: number, player1Username: string, player2Username: string) => {
        console.log("gameId: ", gameId);
        try {
            const response = await fetch('/api/games/createLichessGame', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId,
                    player1Username,
                    player2Username
                }),
            });
            const data = await response.json();
            setLichessGameId(data.lichessGameId);
        } catch (error) {
            console.error("Error creating Lichess game:", error);
        }
    };

    const handleMove = (move: string) => {
        // Update the position on the chessboard
        setPosition(move);
    };

    if (!game) {
        return <div>Loading...</div>;
    }

    const fetchLichessGameStatus = async () => {
        try {
            const response = await fetch(`/api/games/fetchLichessStatus?lichessGameId=${lichessGameId}`);
            const data = await response.json();
            setLichessStatus(data.pgn); // Set the fetched PGN status
            setGameOver(data.gameOver);
            setWinner(data.winner);
        } catch (error) {
            console.error('Error fetching Lichess game status:', error);
        }
    };

    return (
        <div>
            <h1>Game {game.contractGameId}</h1>
            <div className={styles.gameContainer}>
                <Chessboard
                    position={position || game.initialPosition}
                    onMove={handleMove}
                />
            </div>

            <div className={styles.playerInfo}>
                <div>Player 1: {player1Username || game.player1Id}</div>
                <div>Player 2: {player2Username || game.player2Id}</div>
            </div>
            <div className={styles.gameInfo}>
                <div>Wager Amount: {game.wagerAmount}</div>
                <div>Active: {game.isActive.toString()}</div>
                <div>Game Balance (Escrow): {gameBalance} ETH</div> {/* Display game-specific balance */}
            </div>

            {lichessGameId && (
                <div className={styles.lichessLink}>
                    <a href={`https://lichess.org/${lichessGameId}`} target="_blank" rel="noopener noreferrer">
                        Play on Lichess
                    </a>
                </div>
            )}

            <button onClick={fetchLichessGameStatus} className={styles.statusButton}>
                Fetch Lichess Game Status
            </button>

            {lichessStatus && (
                <div className={styles.lichessStatus}>
                    <h3>Lichess Game Status:</h3>
                    <pre
                        style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
                    >{lichessStatus}</pre> {/* Display game status as PGN */}
                    {gameOver && (
                        <div>
                            <h3>Game Over! Winner: {winner}</h3>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

