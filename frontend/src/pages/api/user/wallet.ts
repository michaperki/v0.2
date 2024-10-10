
// pages/api/user/wallet.ts
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { lichessId, walletAddress } = req.body;

  if (!lichessId || !walletAddress) {
    return res.status(400).json({ error: "Lichess ID and Wallet Address are required" });
  }

  try {
    // Find the user by their Lichess ID
    let user = await prisma.user.findUnique({
      where: { lichessId: lichessId as string },
    });

    // If the user doesn't exist, return an error
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the user's wallet address
    user = await prisma.user.update({
      where: { lichessId: lichessId as string },
      data: { walletAddress },
    });

    return res.status(200).json({ message: "Wallet address associated successfully", user });
  } catch (error) {
    console.error("Error associating wallet address:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
