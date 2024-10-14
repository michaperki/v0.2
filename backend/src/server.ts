
import { createServer } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { parse } from 'url';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

interface WebSocketConnection {
  playerId: string;
  gameId: string;
  ws: WebSocket;
  isConnected: boolean;
  hasDeposited: boolean;
  isExecuting: boolean; // Flag to prevent simultaneous execution
  contractCreated: boolean; // Flag to prevent creating a contract more than once
  fundsDistributed: boolean; // Flag to prevent distributing funds more than once
}

const server = createServer();
const wss = new WebSocketServer({ server, path: '/ws' });
const connections: WebSocketConnection[] = [];

const safelyParseMessage = (data: RawData): any | null => {
  try {
    return JSON.parse(data.toString());
  } catch (error) {
    console.error('Error parsing message:', error);
    return null;
  }
};

const broadcastToGame = (gameId: string, message: object) => {
  connections
    .filter((conn) => conn.gameId === gameId)
    .forEach((conn) => conn.ws.send(JSON.stringify(message)));
};

const checkAndNotifyRoomReady = async (gameId: string) => {
  const gameConnections = connections.filter((conn) => conn.gameId === gameId);
  if (gameConnections.length === 2) {
    broadcastToGame(gameId, { type: 'game-paired', gameId });
    console.log(`Game ${gameId} is ready with 2 players.`);

    const player1 = gameConnections[0].playerId;
    const player2 = gameConnections[1].playerId;
    await executeContractCreation(gameId, player1, player2);
  }
};

const executeContractCreation = async (gameId: string, player1: string, player2: string) => {
    const connection = connections.find((conn) => conn.gameId === gameId);
    if (!connection || connection.isExecuting || connection.contractCreated) return;

    connection.isExecuting = true;
    try {
        // use an env var CLIENT_API_URL instead of hardcoding the url
        const response = await fetch(`${process.env.CLIENT_API_URL}/api/games/createContractGame`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId, player1, player2 }),
        });

        if (!response.ok) throw new Error('Failed to create game on contract');

        const { contractGameIdInt } = await response.json();
        console.log(`Contract game created with ID: ${contractGameIdInt}`);

        broadcastToGame(gameId, { type: 'game-contract-created', contractGameId: contractGameIdInt });

        connection.contractCreated = true;
    } catch (error) {
        console.error('Error creating contract game:', error);
    } finally {
        connection.isExecuting = false;
    }
};

wss.on('connection', (ws, req) => {
  const parsedUrl = parse(req.url || '', true);
  const playerId = parsedUrl.query.playerId as string;
  const gameId = parsedUrl.query.gameId as string;

  if (!playerId || !gameId) {
    console.log('Missing playerId or gameId, closing connection.');
    ws.send(JSON.stringify({ error: 'playerId or gameId is missing' }));
    ws.close();
    return;
  }

  let connection = connections.find((conn) => conn.playerId === playerId && conn.gameId === gameId);
  if (!connection) {
    connection = { playerId, gameId, ws, hasDeposited: false, isConnected: true, isExecuting: false, contractCreated: false, fundsDistributed: false };
    connections.push(connection);
    console.log(`New player connected: Player ID: ${playerId}, Game ID: ${gameId}`);
  } else {
    connection.ws = ws;
    connection.isConnected = true;
    console.log(`Player reconnected: Player ID: ${playerId}, Game ID: ${gameId}`);
  }

  checkAndNotifyRoomReady(gameId);

  ws.on('message', (data) => {
    const message = safelyParseMessage(data);
    if (message && message.type === 'player-deposited') {
      console.log(`Player ${playerId} deposited funds for game ${gameId}`);
      connection.hasDeposited = true;
      checkAndNotifyDepositsComplete(gameId);
    }
  });

  ws.on('close', () => {
    console.log(`Player ${playerId} disconnected from game ${gameId}`);
    connection.isConnected = false;
  });
});

const checkAndNotifyDepositsComplete = async (gameId: string) => {
  const gameConnections = connections.filter((conn) => conn.gameId === gameId);
  if (gameConnections.every((conn) => conn.hasDeposited)) {
    console.log(`Both players have deposited for game ${gameId}`);
    broadcastToGame(gameId, { type: 'both-players-deposited', gameId });

    const player1 = gameConnections[0].playerId;
    const player2 = gameConnections[1].playerId;

    try {
      const response = await fetch(`${process.env.CLIENT_API_URL}/api/games/createLichessGame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, player1Username: player1, player2Username: player2 }),
      });

      if (!response.ok) throw new Error('Failed to create Lichess game');

      const { lichessGameId } = await response.json();

      // Broadcast the Lichess game ID to all connected clients
      broadcastToGame(gameId, { type: 'lichess-game-created', lichessGameId });

      attemptToAddGameToStream(gameId, lichessGameId);
    } catch (error) {
      console.error('Error creating Lichess game:', error);
    }
  }
};

const attemptToAddGameToStream = async (gameId: string, lichessGameId: string, retries = 5, delay = 30000) => {
  let attempts = 0;
  let added = false;

  while (attempts < retries && !added) {
    attempts++;
    console.log(`Attempting to add Lichess game ${lichessGameId} to stream. Attempt ${attempts}`);
    try {
      await addGameToLichessStream(gameId, lichessGameId);
      added = true;
      console.log(`Lichess game ${lichessGameId} successfully added to stream on attempt ${attempts}`);
    } catch (error: any) {
      console.error(`Error adding game to stream (attempt ${attempts}):`, error);
      // Check if the error is due to rate limiting (HTTP 429)
      if (error.message.includes('Too Many Requests')) {
        const retryAfter = error.headers?.get('Retry-After'); // Check if Lichess provides a retry window
        const retryDelay = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay; // Use 'Retry-After' header or fallback to default delay
        console.log(`Rate limit hit. Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else if (attempts < retries) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  if (!added) {
    console.error(`Failed to add Lichess game ${lichessGameId} to stream after ${retries} attempts. Marking as abandoned.`);
    // Handle the failure case, e.g., mark the game as abandoned in your database
  }
};
// Other unchanged logic omitted for brevity


// Add a game to Lichess stream and log all incoming events
const addGameToLichessStream = async (gameId: string, lichessGameId: string) => {
  const streamId = process.env.LICHESS_STREAM_ID;

  if (!streamId) {
    throw new Error('LICHESS_STREAM_ID not found in environment variables');
  }

  const lichessApiUrl = `https://lichess.org/api/stream/games/${streamId}`;
  const headers = {
    Authorization: `Bearer ${process.env.LICHESS_TOKEN}`,
    'Content-Type': 'text/plain',
  };

  const response = await fetch(lichessApiUrl, {
    method: 'POST',
    headers,
    body: lichessGameId,  // Add the game ID to the stream
  });

  if (!response.ok) {
    throw new Error(`Failed to add game to Lichess stream: ${response.statusText}`);
  }

  console.log(`Game ID ${lichessGameId} added to Lichess stream.`);

  // Log all events from the stream
  const stream = response.body;
  stream.on('data', (chunk: Buffer) => {
    const updates = chunk.toString().split("\n").filter((line) => line.trim());
    updates.forEach((update) => {
      const event = JSON.parse(update);
      console.log('Received event from Lichess:', event);  // Log the received event
      handleGameEvent(gameId, event);  // Continue handling the event as usual
    });
  });

  stream.on('end', () => {
    console.log('Lichess game stream ended.');
  });
};

const handleGameEvent = async (gameId: string, event: any) => {
  // Log the received event
  console.log(`Handling event for game ${gameId}:`, event);

  // Check the `status` field to determine the state of the game
  switch (event.status) {
    case 20: // Status code 20 indicates the game has started
      console.log(`Game ${gameId} has started!`);
      // Handle any additional logic when the game starts
      break;

    case 30: // Status code 30 indicates checkmate (game finish)
      console.log(`Game over for game ${gameId}. Result: ${event.statusName}`);
      // Notify players that the game has finished
      broadcastToGame(gameId, { type: 'game-finished', gameId, result: event });
      // Handle game finalization logic like updating the database, managing payouts, etc.
      await triggerFundDistribution(gameId, event);
      break;

    default:
      console.log(`Unhandled event status for game ${gameId}: ${event.statusName} (${event.status})`);
      break;
  }
};

// New fund distribution logic
const triggerFundDistribution = async (gameId: string, event: any) => {
  const connection = connections.find(conn => conn.gameId === gameId);
  if (!connection) return;

  // Check if already executing or distribution done
  if (connection.isExecuting || connection.fundsDistributed) {
    console.log(`Fund distribution already in progress or completed for game ${gameId}`);
    return;
  }

  connection.isExecuting = true;

  try {
    let winner: string | null = null;
    // Determine the winner based on event.statusName and players
    const winnerColor = await fetchGameDetails(event.id); // Use event.id to get the game ID
    if (winnerColor === 'white') {
      winner = event.players.white.userId;
    } else if (winnerColor === 'black') {
      winner = event.players.black.userId;
    }

    if (!winner) {
      throw new Error('Unable to determine the winner.');
    }

    console.log(`Distributing funds for game ${gameId} to winner ${winner}`);

    // Sending distribution request to internal API
    const response = await fetch(`${process.env.CLIENT_API_URL}/api/games/distributeFunds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        winnerLichessId: winner, // Pass the determined winner
      }),
    });

    if (!response.ok) throw new Error('Failed to distribute funds');

    const { payoutAmountInMatic } = await response.json();  // Wait for the payout amount

    if (!payoutAmountInMatic) {
      throw new Error('Payout amount is undefined');
    }

    connection.fundsDistributed = true;  // Mark as distributed
    console.log(`Funds distributed for game ${gameId}. Payout: ${payoutAmountInMatic} MATIC`);

    // Notify players about the result and fund distribution
    broadcastToGame(gameId, {
      type: 'funds-distributed',
      gameId,
      winner,
      message: `Game ${gameId}: You won ${payoutAmountInMatic} MATIC (AMOY)!`,
    });

    console.log(`Notification sent to both players for game ${gameId}`);

  } catch (error) {
    console.error('Error distributing funds:', error);
  } finally {
    connection.isExecuting = false;
  }
};

const fetchGameDetails = async (lichessGameId: string) => {
  const lichessApiUrl = `https://lichess.org/api/game/${lichessGameId}`;
  const headers = {
    Authorization: `Bearer ${process.env.LICHESS_TOKEN}`,
  };

  try {
    const response = await fetch(lichessApiUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch game details: ${response.statusText}`);
    }

    const gameDetails = await response.json();
    return gameDetails.winner; // This will be either 'white' or 'black'
  } catch (error) {
    console.error('Error fetching game details:', error);
    throw error;
  }
};

// Start the HTTP and WebSocket server
server.listen(8080, () => {
  console.log('Server is running on http://localhost:8080');
});

