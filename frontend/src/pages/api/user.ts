
import { NextApiRequest, NextApiResponse } from "next";
import Cookies from "cookies";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = new Cookies(req, res);
  const userId = cookies.get('user_id'); // Retrieve the signed user_id from cookies

  console.log("Request to /api/user.ts");

  if (!userId) {
    console.log("No user_id cookie found");
    return res.status(401).json({ error: "User not authenticated" });
  }

  console.log("Fetching user with ID:", userId);

  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      console.log("User not found in database");
      return res.status(404).json({ error: "User not found" });
    }

    console.log("User found:", user);

    return res.status(200).json({ accessToken: user.accessToken });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

