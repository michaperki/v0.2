
// pages/game/[id].tsx

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function GamePage() {
    const router = useRouter();
    const { id } = router.query;
    const [gameDetails, setGameDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (id) {
            fetchGameDetails(id);
        }
    }, [id]);

    const fetchGameDetails = async (gameId) => {
        try {
            const response = await fetch(`/api/games/${gameId}`);
            if (!response.ok) {
                throw new Error("Failed to fetch game details");
            }
            const data = await response.json();
            setGameDetails(data);
            setLoading(false);
        } catch (e) {
            setError(e.message);
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
            <p>Wager Amount: {gameDetails.wagerAmount}</p>
            <p>Status: {gameDetails.isActive ? "Active" : "Not Active"}</p>
            {gameDetails.participants && gameDetails.participants.map((participant, idx) => (
                <p key={idx}>Player {idx + 1}: {participant}</p>
            ))}
        </div>
    );
}
