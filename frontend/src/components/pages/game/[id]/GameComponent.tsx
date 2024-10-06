
// components/pages/game/[id]/GameComponent.tsx
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

    useEffect(() => {
        if (id) {
            fetchGameEscrowBalance(id as string); // Fetch the balance specific to this game
        }
    }, [id]);

    // Fetch the balance for the specific game from the escrow
    const fetchGameEscrowBalance = async (gameId: string) => {
        try {
            const chessBettingContract = getSmartContract<ChessBetting>("CHESSBETTING"); // Get the smart contract instance
            const balance = await chessBettingContract.escrow(gameId); // Fetch the escrow balance for the game
            setGameBalance(ethers.formatUnits(balance, "ether")); // Format the balance and set it
        } catch (error) {
            console.error("Error fetching game balance:", error);
        }
    };

    const handleMove = (move: string) => {
        // Update the position on the chessboard
        setPosition(move);
    };

    if (!game) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h1>Game {id}</h1>
            <div className={styles.gameContainer}>
                <Chessboard
                    position={position || game.initialPosition}
                    onMove={handleMove}
                />
            </div>

            <div className={styles.playerInfo}>
                <div>Player 1: {game.player1Id}</div>
                <div>Player 2: {game.player2Id}</div>
            </div>
            <div className={styles.gameInfo}>
                <div>Wager Amount: {game.wagerAmount}</div>
                <div>Active: {game.isActive.toString()}</div>
                <div>Game Balance (Escrow): {gameBalance} ETH</div> {/* Display game-specific balance */}
            </div>
        </div>
    );
}

