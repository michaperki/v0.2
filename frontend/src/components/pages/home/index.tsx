import { useState, useEffect } from "react";
import WalletSection from "@/components/common/wallet-section";
import styles from "./styles.module.css";
import { useWallet } from "@/hooks/useWallet";
import InfoSection from "./info-section";
import GameSection from "./game-section";
import LichessSection from "./lichess-section";

export default function Home() {
  const { walletConnectionStatus, isAuthenticated } = useWallet();
  const [lichessConnected, setLichessConnected] = useState(false);

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
      }
    };

    if (walletConnectionStatus === "connected" && isAuthenticated) {
      checkLichessStatus();
    }
  }, [walletConnectionStatus, isAuthenticated]);

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
