
import { useEffect, useState } from "react";
import { initiateLichessLogin } from "@/utils/lichess-auth";
import styles from "./styles.module.css";

export default function LichessSection() {
  const [lichessData, setLichessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLichessData = async () => {
      try {
        const response = await fetch(`/api/user`, {
          method: "GET",
          credentials: "include",
        });

        if (response.status === 401 || !response.ok) {
          setLoading(false);
          return;
        }

        const { accessToken } = await response.json();
        if (!accessToken) {
          setLoading(false);
          return;
        }

        const lichessResponse = await fetch("https://lichess.org/api/account", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!lichessResponse.ok) {
          throw new Error("Failed to fetch Lichess user data");
        }

        const data = await lichessResponse.json();
        setLichessData(data);
      } catch (err) {
        console.error("Failed to fetch Lichess data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLichessData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.lichessSection}>
      {!lichessData ? (
        <div className={styles.lichessSectionInner}>
          <p>You are not logged in to Lichess.</p>
            <hr className={styles.divider} />
          <button className={styles.button} onClick={initiateLichessLogin}>
            Login to Lichess
          </button>
        </div>
      ) : (
        <div className={styles.lichessSectionInner}>
          <h1>{lichessData.username}</h1>
          <p>Rating: {lichessData.perfs.rapid.rating}</p>
          <div className={styles.divider} />
        </div>
      )}
    </div>
  );
}

