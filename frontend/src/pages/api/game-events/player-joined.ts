//
// import { NextApiRequest, NextApiResponse } from 'next';
// import wss from '@/utils/websocket';
//
// export default function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== 'POST') {
//     return res.status(405).end();
//   }
//
//   const { gameId, playerId } = req.body;
//
//   // Broadcast to all connected players that a new player has joined
//   wss.clients.forEach((client) => {
//     client.send(JSON.stringify({ type: 'player-joined', playerId, gameId }));
//   });
//
//   res.status(200).json({ message: 'Player joined' });
// }
