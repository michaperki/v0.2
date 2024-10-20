
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

// Define the expected structure for game details
interface GameDetails {
    wagerAmount: string;
    isActive: boolean;
    participants: string[];
}

export default function GamePage() {
    const router = useRouter();
    const { id } = router.query;

    // Define the types for state
    const [gameDetails, setGameDetails] = useState<GameDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (id) {
            fetchGameDetails(id as string); // Explicitly cast `id` as string
        }
    }, [id]);

    const fetchGameDetails = async (gameId: string) => {
        try {
            const response = await fetch(`/api/games/${gameId}`);
            if (!response.ok) {
                throw new Error("Failed to fetch game details");
            }
            const data = await response.json();
            setGameDetails(data);
            setLoading(false);
        } catch (e: any) {
            setError(e.message || "Failed to load game details");
            setLoading(false);
        }
    };

    if (loading) {
        return <div>Loading game details...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div>
            <h1>Game {id}</h1>
            {gameDetails ? (
                <>
                    <p>Wager Amount: {gameDetails.wagerAmount}</p>
                    <p>Status: {gameDetails.isActive ? "Active" : "Not Active"}</p>
                    {gameDetails.participants && gameDetails.participants.map((participant, idx) => (
                        <p key={idx}>Player {idx + 1}: {participant}</p>
                    ))}
                </>
            ) : (
                <p>No game details available</p>
            )}
        </div>
    );
}

