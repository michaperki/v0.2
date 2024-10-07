
interface LichessGameStatus {
    pgn: string;
    gameOver: boolean;
    winnerColor: string | null;
    winnerUsername: string | null;
}

export async function fetchLichessGameStatus(lichessGameId: string): Promise<LichessGameStatus> {
    try {
        const headers = {
            Authorization: 'Bearer ' + process.env.LICHESS_TOKEN,
        };

        console.log("Token:", process.env.LICHESS_TOKEN);
        console.log('Fetching Lichess game status for game ID:', lichessGameId);

        // Request the game status in PGN format
        const response = await fetch(`https://lichess.org/game/export/${lichessGameId}`, { headers });

        if (!response.ok) {
            throw new Error('Failed to fetch Lichess game status: ' + response.statusText);
        }

        // Parse as text instead of JSON since the response is in PGN format
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
                winnerUsername = null; // No winner for a draw
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

interface ChallengeData {
    id: string;
    status: string;
    challenger: string;
    // Add more fields as necessary based on the Lichess API response structure
}

export async function createChallenge(
    player1Username: string,
    player2Username: string,
    timeControl: string
): Promise<ChallengeData> {
    console.log('createChallenge function called');
    // for now, if the time control is not provided, default to 90 seconds
    if (!timeControl) {
        console.log('Time control not provided, defaulting to 90 seconds');
        timeControl = '90';
    }

    console.log('player1Username:', player1Username);
    console.log('player2Username:', player2Username);
    console.log('timeControl:', timeControl);

    try {
        const lichessApiUrl = 'https://lichess.org/api/challenge/open';
        const headers = {
            Authorization: 'Bearer ' + process.env.LICHESS_TOKEN,
            'Content-Type': 'application/x-www-form-urlencoded',
        };

        const body = new URLSearchParams({
            variant: 'standard',
            rated: 'false',
            color: 'random',
            'clock.limit': timeControl,
            'clock.increment': '0',
            users: `${player1Username},${player2Username}`,
            rules: 'noRematch,noGiveTime,noEarlyDraw',
            name: 'Cheth Game',
        });

        const response = await fetch(lichessApiUrl, {
            method: 'POST',
            headers,
            body: body.toString(),
        });

        console.log('Response status code:', response.status);

        if (!response.ok) {
            console.error('Error response:', await response.text());
            throw new Error('Failed to create open challenge on Lichess');
        }

        const challengeData: ChallengeData = await response.json();
        return challengeData;
    } catch (error) {
        console.error('Error creating challenge:', error);
        throw error;
    }
}

