
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

