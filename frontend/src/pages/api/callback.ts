
import Cookies from "cookies";
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = new Cookies(req, res);

  // Get the state from the query and the verifier from cookies
  const code = req.query.code as string;
  const returnedState = req.query.state as string;
  const storedState = cookies.get("oauth_state");  // Retrieve the stored state from cookies

  // Log critical information
  console.log("Code received:", code);
  console.log("State received:", returnedState);
  console.log("Stored state:", storedState);

  if (!code || !returnedState || !storedState || returnedState !== storedState) {
    console.error("Invalid or missing state parameter");
    return res.status(400).json({ error: "Invalid state" });
  }

  const codeVerifier = cookies.get("lichess_code_verifier");
  console.log("Code verifier:", codeVerifier); // Log the code verifier

  if (!codeVerifier) {
    return res.status(400).json({ error: "Missing code verifier" });
  }

  try {
    // Step 1: Exchange the code for an access token
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
      const errorResponse = await lichessResponse.text();
      console.error("Lichess API Error:", errorResponse); // Log the full error response
      throw new Error("Failed to fetch access token");
    }

    const { access_token } = await lichessResponse.json();
    console.log("Access token received:", access_token); // Log the access token

    // Step 2: Fetch the Lichess user data using the access token
    const lichessUserResponse = await fetch("https://lichess.org/api/account", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!lichessUserResponse.ok) {
      const errorResponse = await lichessUserResponse.text();
      console.error("Lichess API Error (User Data):", errorResponse);
      throw new Error("Failed to fetch Lichess user data");
    }

    const lichessUserData = await lichessUserResponse.json();
    const lichessId = lichessUserData.id; // Assuming 'id' is the unique identifier for the user
    console.log("Lichess user data received:", lichessUserData); // Log the Lichess user data

    // Step 3: Upsert the user in the Prisma database
    const user = await prisma.user.upsert({
      where: { lichessId },
      update: { accessToken: access_token },
      create: {
        lichessId,
        accessToken: access_token,
      },
    });

    console.log("User upserted successfully:", lichessId);

    // Step 4: Redirect or respond with success
    const cookies = new Cookies(req, res);
    cookies.set("lichess_access_token", access_token, {
      httpOnly: false,
      sameSite: "strict",
    });

    cookies.set("lichess_id", lichessId, {
        httpOnly: false,
        sameSite: "strict",
    });

    cookies.set("user_id", user.id.toString(), {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
    });

    res.redirect("/"); // Redirect to the home page

  } catch (error) {
    console.error("Failed to handle callback:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
