
import fetch from 'node-fetch';

// Function to connect to the Lichess game stream
export async function monitorLichessGame(gameId: string, token: string, onGameEvent: (event: any) => void) {
    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    try {
        const response = await fetch(`https://lichess.org/api/board/game/stream/${gameId}`, { headers });

        if (!response.ok) {
            throw new Error(`Failed to connect to Lichess game stream: ${response.statusText}`);
        }

        // Streaming game updates
        const stream = response.body;

        // Listen for game updates
        stream.on('data', (chunk: Buffer) => {
            const updates = chunk.toString().split("\n").filter(line => line.trim());
            updates.forEach(update => {
                try {
                    const event = JSON.parse(update);
                    onGameEvent(event);  // Pass each event to the callback function
                } catch (error) {
                    console.error('Error processing game update:', error);
                }
            });
        });

        stream.on('end', () => {
            console.log('Game stream ended.');
        });

    } catch (error) {
        console.error('Error in game monitoring:', error);
    }
}
