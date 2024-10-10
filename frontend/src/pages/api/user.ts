
// /pages/api/user.ts
import { NextApiRequest, NextApiResponse } from "next";
import Cookies from "cookies";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = new Cookies(req, res);
  const userId = cookies.get('user_id'); // Retrieve the signed user_id from cookies

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    // Fetch the user from the database using the user ID
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ accessToken: user.accessToken });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

