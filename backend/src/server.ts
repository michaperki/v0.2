import { createServer } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';  // Add RawData here for type reference
import { parse } from 'url';

interface WebSocketConnection {
  playerId: string;
  gameId: string;
  ws: WebSocket;
}

// Create HTTP server
const server = createServer();

// Initialize WebSocket server over the HTTP server
const wss = new WebSocketServer({ server, path: '/ws' });

// Store connected players
const connections: WebSocketConnection[] = [];

// Safely parse WebSocket message data
const safelyParseMessage = (data: RawData): any | null => {  // Use RawData directly
  try {
    const messageString = Buffer.isBuffer(data) ? data.toString() : data;
    return JSON.parse(messageString as string);
  } catch (error) {
    console.error('Error parsing message:', error);
    return null;
  }
};

// Broadcast message to all players in the same game
const broadcastToGame = (gameId: string, message: object) => {
  connections
    .filter((conn) => conn.gameId === gameId)
    .forEach((conn) => conn.ws.send(JSON.stringify(message)));
};



// Function to handle pairing and trigger contract game creation
const checkAndNotifyRoomReady = async (gameId: string) => {
  const gameConnections = connections.filter(conn => conn.gameId === gameId);

  if (gameConnections.length === 2) {
    // Send WebSocket message to start the game
    broadcastToGame(gameId, { type: 'game-started', gameId });
    console.log(`Game ${gameId} is ready with 2 players.`);

    // Extract the players' information (e.g., addresses or Lichess IDs)
    const player1 = gameConnections[0].playerId;
    const player2 = gameConnections[1].playerId;

    try {
      // Send a POST request to the backend to trigger the contract game creation
      const response = await fetch('http://localhost:3000/api/games/createContractGame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId,
          player1,
          player2,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create game on contract');
      }

      console.log(`Contract game successfully created for Game ID: ${gameId}`);
    } catch (error) {
      console.error('Error creating contract game:', error);
    }
  }
};

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  // Parse query parameters from the WebSocket URL
  const parsedUrl = parse(req.url || '', true);
  const playerId = parsedUrl.query.playerId as string;
  const gameId = parsedUrl.query.gameId as string;

  if (!playerId || !gameId) {
    console.log('Missing playerId or gameId, closing connection.');
    ws.send(JSON.stringify({ error: 'playerId or gameId is missing' }));
    ws.close();
    return;
  }

  // Add new player connection
  connections.push({ playerId, gameId, ws });
  console.log(`Player ID: ${playerId}, Game ID: ${gameId} connected`);

  // Check if the game room is ready to start (2 players)
  checkAndNotifyRoomReady(gameId);

  // Handle incoming WebSocket messages
  ws.on('message', (data) => {
    const message = safelyParseMessage(data);
    if (message) {
      console.log('Received message:', message);
      handleGameEvent(message, playerId, gameId);
    }
  });

  // Handle WebSocket disconnection
  ws.on('close', () => {
    console.log(`Player ${playerId} disconnected from game ${gameId}`);
    removeConnection(playerId, gameId);
  });
});

// Handle game events
const handleGameEvent = (message: any, playerId: string, gameId: string) => {
  switch (message.type) {
    case 'move':
      console.log(`Player ${playerId} made a move: ${message.move}`);
      broadcastToGame(gameId, { type: 'move', move: message.move });
      break;
    case 'game-over':
      console.log(`Game over, winner: ${message.winner}`);
      broadcastToGame(gameId, { type: 'game-over', winner: message.winner });
      break;
    default:
      console.log('Unknown message type');
  }
};

// Remove player connection on disconnect
const removeConnection = (playerId: string, gameId: string) => {
  const index = connections.findIndex(
    (conn) => conn.playerId === playerId && conn.gameId === gameId
  );
  if (index !== -1) {
    connections.splice(index, 1);
    console.log(`Removed player ${playerId} from game ${gameId}`);
  }
};



// Start the HTTP server and WebSocket server
server.listen(8080, () => {
  console.log('Server is running on http://localhost:8080');
});

