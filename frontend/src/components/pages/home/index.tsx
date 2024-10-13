
import { useState, useEffect } from "react";
import WalletSection from "@/components/common/wallet-section";
import InfoSection from "./info-section";
import GameSection from "./game-section";
import LichessSection from "./lichess-section";
import styles from "./styles.module.css";
import { useWallet } from "@/hooks/useWallet";

export default function Home() {
  const { walletConnectionStatus, isAuthenticated } = useWallet();
  const [lichessConnected, setLichessConnected] = useState(false);
  const [loading, setLoading] = useState(true); // Unified loading state

  useEffect(() => {
    const checkLichessStatus = async () => {
      try {
        const response = await fetch(`/api/user`, { method: "GET", credentials: "include" });
        if (response.ok) {
          const { accessToken } = await response.json();
          if (accessToken) {
            setLichessConnected(true);
          }
        }
      } catch (error) {
        console.error("Failed to check Lichess login status:", error);
      } finally {
        setLoading(false); // Ensure loading is finished whether success or failure
      }
    };

    if (walletConnectionStatus === "connected" && isAuthenticated) {
      checkLichessStatus();
    } else {
      setLoading(false); // If the wallet isn't connected, we stop the loading state
    }
  }, [walletConnectionStatus, isAuthenticated]);

  if (loading) {
    // Show a spinner or skeleton until all data is fetched
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.home}>
      <section className={styles.col1}>
        <WalletSection />
      </section>
      <LichessSection />
      <section className={styles.col2}>
        {walletConnectionStatus === "connected" && isAuthenticated && lichessConnected ? (
          <GameSection />
        ) : (
          <InfoSection />
        )}
      </section>
    </div>
  );
}

