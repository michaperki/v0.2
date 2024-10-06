
import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { initiateLichessLogin } from "@/utils/lichess-auth";
import styles from "./styles.module.css";

export default function LichessSection() {
  const [lichessData, setLichessData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLichessData = async () => {
      try {
        // No longer retrieving lichess_id from cookies
        const response = await fetch(`/api/user`, {
          method: "GET",
          credentials: "include",  // Ensure cookies are sent with the request
        });

        if (response.status === 401) {
          console.log("User not authenticated yet.");
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch user from the database");
        }

        const { accessToken } = await response.json();

        if (!accessToken) {
          console.log("No access token found in the database");
          setLoading(false);
          return;
        }

        // Fetch Lichess user data using the access token
        const lichessResponse = await fetch("https://lichess.org/api/account", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!lichessResponse.ok) {
          throw new Error("Failed to fetch Lichess user data");
        }

        const data = await lichessResponse.json();
        setLichessData(data);  // Store Lichess user data in state
      } catch (err) {
        console.error("Failed to fetch Lichess data:", err);
        setError("Failed to fetch Lichess data");
      } finally {
        setLoading(false);
      }
    };

    fetchLichessData(); // Call the async function
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!lichessData) {
    return (
      <div>
        <p>You are not logged in to Lichess.</p>
        <button onClick={initiateLichessLogin}>Login to Lichess</button>
      </div>
    );
  }

  return (
    <div className={styles.lichessSection}>
      <div className={styles.lichessInnerSection}>
        <h1>{lichessData.username}</h1>
        <p>Rating: {lichessData.perfs.rapid.rating}</p>
      </div>
    </div>
  );
}

