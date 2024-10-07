export async function fetchLichessGameStatus(lichessGameId: string) {
    try {
        const headers = {
            Authorization: 'Bearer ' + process.env.LICHESS_TOKEN,
        };

        console.log("token", process.env.LICHESS_TOKEN);
        console.log('Fetching Lichess game status:', lichessGameId);

        // Request the game status in PGN format
        const response = await fetch(`https://lichess.org/game/export/${lichessGameId}`, { headers });

        if (!response.ok) {
            throw new Error('Failed to fetch Lichess game status: ' + response.statusText);
        }

        // Parse as text instead of JSON since the response is PGN
        const pgn = await response.text();
        console.log('Fetched Lichess game status:', pgn);

        // Regex to extract the result, White username, and Black username
        const resultRegex = /\[Result "(.*?)"\]/;
        const whiteUsernameRegex = /\[White "(.*?)"\]/;
        const blackUsernameRegex = /\[Black "(.*?)"\]/;

        const resultMatch = pgn.match(resultRegex);
        const whiteUsernameMatch = pgn.match(whiteUsernameRegex);
        const blackUsernameMatch = pgn.match(blackUsernameRegex);

        let gameOver = false;
        let winnerColor: string | null = null;
        let winnerUsername: string | null = null;

        if (resultMatch && resultMatch[1]) {
            const result = resultMatch[1];
            const whiteUsername = whiteUsernameMatch ? whiteUsernameMatch[1] : null;
            const blackUsername = blackUsernameMatch ? blackUsernameMatch[1] : null;

            if (result === '1-0') {
                gameOver = true;
                winnerColor = 'White';
                winnerUsername = whiteUsername;
            } else if (result === '0-1') {
                gameOver = true;
                winnerColor = 'Black';
                winnerUsername = blackUsername;
            } else if (result === '1/2-1/2') {
                gameOver = true;
                winnerColor = 'Draw';
                winnerUsername = null;  // No winner for a draw
            }
        }

        return {
            pgn,
            gameOver,
            winnerColor,
            winnerUsername,
        };
    } catch (error) {
        console.error('Error fetching Lichess game status:', error);
        throw error;
    }
}
