
// components/pages/game/[id]/GameComponent.tsx
import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { useRouter } from 'next/router';
import { ethers } from 'ethers'; // Import ethers.js
import { useSmartContract } from '@/hooks/useSmartContract'; // Hook to get the smart contract
import styles from './styles.module.css';
import { ChessBetting } from '@/types/typechain-types'; // Assuming you have ChessBetting types available

export default function GameComponent() {
    const router = useRouter();
    const { id } = router.query; // Game ID from URL
    const [game, setGame] = useState<any>(null);
    const [position, setPosition] = useState<string | null>(null);
    const [contractBalance, setContractBalance] = useState<string>(""); // State for contract balance
    const { getSmartContract } = useSmartContract(); // Hook to access the smart contract

    useEffect(() => {
        if (id) {
            fetchGameDetails(id as string);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchContractBalance();
        }
    }, [id]);

    // Fetch game details by ID
    const fetchGameDetails = async (id: string) => {
        try {
            const response = await fetch(`/api/games/${id}`);
            if (!response.ok) {
                throw new Error("Failed to fetch game details");
            }
            const data = await response.json();
            setGame(data);
        } catch (error) {
            console.error("Error fetching game details:", error);
        }
    };

    // Fetch the balance of the smart contract
    const fetchContractBalance = async () => {
        try {
            const chessBettingContract = getSmartContract<ChessBetting>("CHESSBETTING"); // Get the smart contract
            const provider = new ethers.BrowserProvider(window.ethereum); // Provider to interact with Ethereum
            const balance = await provider.getBalance(chessBettingContract.address); // Get balance
            setContractBalance(ethers.formatUnits(balance, "ether")); // Format the balance and set it
        } catch (error) {
            console.error("Error fetching contract balance:", error);
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
                <div>Contract Balance: {contractBalance} ETH</div> {/* Display contract balance */}
            </div>
        </div>
    );
}

