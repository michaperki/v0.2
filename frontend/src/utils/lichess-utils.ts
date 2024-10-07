
// utils/lichessUtils.ts
import fetch from 'node-fetch';

interface LichessUserInfo {
    id: string;
    username: string;
    perfs: {
        rapid: { rating: number };
    };
    // Add other fields you expect from the Lichess user info response
}

interface LichessChallengeResponse {
    challenge: {
        id: string;
        url: string;
        // Add other relevant fields
    };
}

/**
 * Fetches user information from Lichess
 * @param lichessHandle The Lichess username
 * @returns LichessUserInfo
 */
export async function fetchLichessUserInfo(lichessHandle: string): Promise<LichessUserInfo> {
    try {
        const headers = {
            Authorization: 'Bearer ' + process.env.LICHESS_TOKEN,
        };

        const response = await fetch(`https://lichess.org/api/user/${lichessHandle}`, { headers });

        if (!response.ok) {
            throw new Error('Failed to fetch Lichess user information: ' + response.statusText);
        }

        const userInformation: LichessUserInfo = await response.json();
        return userInformation;
    } catch (error) {
        console.error('Error fetching Lichess user information:', error);
        throw error;
    }
}

/**
 * Creates a chess challenge on Lichess
 * @param player1Username Player 1's username
 * @param player2Username Player 2's username
 * @param timeControl Time control in seconds for the game
 * @returns LichessChallengeResponse
 */
export async function createChallenge(
    player1Username: string,
    player2Username: string,
    timeControl: string
): Promise<LichessChallengeResponse> {
    try {
        const lichessApiUrl = 'https://lichess.org/api/challenge/open';
        const headers = {
            Authorization: 'Bearer ' + process.env.LICHESS_TOKEN,
            'Content-Type': 'application/x-www-form-urlencoded'
        };

        const body = new URLSearchParams({
            variant: 'standard',
            rated: 'false',
            color: 'random',
            'clock.limit': timeControl,
            'clock.increment': '0',
            users: `${player1Username},${player2Username}`,
            rules: 'noRematch,noGiveTime,noEarlyDraw',
            name: 'Cheth Game'
        });

        console.log('Creating challenge:', body.toString());

        const response = await fetch(lichessApiUrl, {
            method: 'POST',
            headers: headers,
            body: body
        });

        if (!response.ok) {
            console.error('Error response:', await response.text());
            throw new Error('Failed to create open challenge on Lichess');
        }

        console.log('Challenge created:', response.status);

        const challengeData: LichessChallengeResponse = await response.json();
        return challengeData;
    } catch (error) {
        console.error('Error creating challenge:', error);
        throw error;
    }
}

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

        // Check if the game is over by looking at the result in the PGN
        const resultRegex = /\[Result "(.*?)"\]/;
        const resultMatch = pgn.match(resultRegex);
        let gameOver = false;
        let winner = null;

        if (resultMatch && resultMatch[1]) {
            const result = resultMatch[1];
            if (result === '1-0') {
                gameOver = true;
                winner = 'White';
            } else if (result === '0-1') {
                gameOver = true;
                winner = 'Black';
            } else if (result === '1/2-1/2') {
                gameOver = true;
                winner = 'Draw';
            }
        }
        return { pgn, gameOver, winner };
    } catch (error) {
        console.error('Error fetching Lichess game status:', error);
        throw error;
    }
}
