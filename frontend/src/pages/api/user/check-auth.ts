
// pages/api/user/check-auth.ts
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ error: "Wallet address is required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return userId and accessToken for future use
    return res.status(200).json({ userId: user.id, accessToken: user.accessToken });
  } catch (error) {
    console.error("Error checking user authentication:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

