
import Cookies from "cookies";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = new Cookies(req, res);

  const code = req.query.code as string;
  const returnedState = req.query.state as string;
  const storedState = cookies.get("oauth_state");

  if (!code || !returnedState || !storedState || returnedState !== storedState) {
    return res.status(400).json({ error: "Invalid state" });
  }

  const codeVerifier = cookies.get("lichess_code_verifier");
  if (!codeVerifier) {
    return res.status(400).json({ error: "Missing code verifier" });
  }

  try {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.NEXT_PUBLIC_LICHESS_REDIRECT_URI!,
      client_id: process.env.NEXT_PUBLIC_LICHESS_CLIENT_ID!,
      code_verifier: codeVerifier,
      client_secret: process.env.LICHESS_CLIENT_SECRET!,
    });

    const lichessResponse = await fetch("https://lichess.org/api/token", {
      method: "POST",
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!lichessResponse.ok) {
      throw new Error("Failed to fetch access token");
    }

    const { access_token } = await lichessResponse.json();

    const lichessUserResponse = await fetch("https://lichess.org/api/account", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!lichessUserResponse.ok) {
      throw new Error("Failed to fetch Lichess user data");
    }

    const lichessUserData = await lichessUserResponse.json();
    const lichessId = lichessUserData.id;

    const walletAddress = cookies.get("wallet_address"); // Retrieve the wallet address from cookies

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet not connected" });
    }

    let user;
    try {
      user = await prisma.user.upsert({
        where: { walletAddress }, // Ensure walletAddress is the key identifier
        update: { lichessId, accessToken: access_token },
        create: { walletAddress, lichessId, accessToken: access_token },
      });
    } catch (error: any) {
      throw new Error("Database error occurred.");
    }

    cookies.set("lichess_id", lichessId, {
      httpOnly: false,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    });

    cookies.set("user_id", user.id.toString(), {
      httpOnly: false,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    });

    res.redirect("/");

  } catch (error: any) {
    res.redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
}

