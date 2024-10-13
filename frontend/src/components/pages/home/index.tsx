
import { useState, useEffect } from "react";
import WalletSection from "@/components/common/wallet-section";
import styles from "./styles.module.css";
import { useWallet } from "@/hooks/useWallet";
import InfoSection from "./info-section";
import GameSection from "./game-section";
import LichessSection from "./lichess-section";
import useSWR from "swr";

// SWR fetcher for data
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

export default function Home() {
  const { walletConnectionStatus, isAuthenticated } = useWallet();
  const [lichessConnected, setLichessConnected] = useState(false);

  // Use SWR to fetch Lichess data
  const { data: lichessData, error: lichessError } = useSWR('/api/user', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  // Effect to check Lichess status
  useEffect(() => {
    if (lichessData && lichessData.accessToken) {
      setLichessConnected(true);
    }
  }, [lichessData]);

  return (
    <div className={styles.home}>
      <section className={styles.col1}>
        <WalletSection />
      </section>

        <section className={styles.col2}>
            {walletConnectionStatus === "connected" && isAuthenticated && lichessConnected ? (
                <GameSection />
            ) : (
                <InfoSection />
            )}
        </section>

        <section className={styles.col3}>
            <LichessSection />
        </section>
    </div>
    );
}


