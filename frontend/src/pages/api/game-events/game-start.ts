// import { NextApiRequest, NextApiResponse } from 'next';
// import wss from '@/utils/websocket';
//
// export default function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== 'POST') {
//     return res.status(405).end();
//   }
//
//   // Assume game start logic is handled here (initial setup)
//   const { gameId, playerId } = req.body;
//
//   // Notify all players that the game has started
//   wss.clients.forEach((client) => {
//     client.send(JSON.stringify({ type: 'game-started', gameId }));
//   });
//
//   res.status(200).json({ message: 'Game started' });
// }

