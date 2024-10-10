
// utils/lichess-auth.ts
import Cookies from "js-cookie";

// Generate a code verifier
const generateCodeVerifier = () => {
  const array = new Uint32Array(56 / 2);
  window.crypto.getRandomValues(array);
  return Array.from(array, (dec) => ("0" + dec.toString(16)).substr(-2)).join("");
};

// Base64 URL encode
const base64URLEncode = (str: ArrayBuffer) => {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(str) as any))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

// SHA-256 hashing
const sha256 = async (verifier: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  return window.crypto.subtle.digest("SHA-256", data);
};

// Generate the code challenge based on the verifier
const generateCodeChallenge = async (verifier: string) => {
  const hashed = await sha256(verifier);
  return base64URLEncode(hashed);
};

// Function to generate a random string for the state
const generateState = () => {
  const array = new Uint32Array(28 / 2);
  window.crypto.getRandomValues(array);
  return Array.from(array, (dec) => ("0" + dec.toString(16)).substr(-2)).join("");
};

// Lichess login flow
export const initiateLichessLogin = async () => {
  try {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Generate and store a random state value
    const state = generateState();

    const isProd = process.env.NODE_ENV === 'production'; // Check if in production

    // Store the code verifier and state in cookies, with the 'secure' flag only in production
    Cookies.set("lichess_code_verifier", codeVerifier, { sameSite: "lax", secure: isProd });
    Cookies.set("oauth_state", state, { sameSite: "lax", secure: isProd });

    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.NEXT_PUBLIC_LICHESS_CLIENT_ID!,
      redirect_uri: process.env.NEXT_PUBLIC_LICHESS_REDIRECT_URI!,
      scope: "preference:read",
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
      state: state,  // Include the state in the OAuth request
    });

    // Redirect to Lichess for authentication
    window.location.href = `https://lichess.org/oauth?${params.toString()}`;
  } catch (error) {
    console.error("Failed to initiate Lichess login:", error);
  }
};

