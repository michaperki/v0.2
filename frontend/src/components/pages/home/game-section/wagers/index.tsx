
// File: components/home/game-section/wagers/index.tsx

import React, { useEffect, useState } from 'react';
import styles from './styles.module.css';

interface Wager {
  opponent: string | null;
  wagerAmount: string;
  winLoss: string;
  transactionHash: string | null;
  payoutAmount: string;
}

interface WagersProps {
  walletAddress: string;
}

const Wagers: React.FC<WagersProps> = ({ walletAddress }) => {
  const [wagers, setWagers] = useState<Wager[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchWagers = async () => {
      try {
        const response = await fetch(`/api/wagers/${walletAddress}`);
        if (!response.ok) {
          throw new Error('Failed to fetch wagers');
        }
        const data = await response.json();
        setWagers(data);
      } catch (error) {
        console.error('Error fetching wagers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWagers();
  }, [walletAddress]);

  if (loading) {
    return <p>Loading wagers...</p>;
  }

  // Limit to showing the last 5 wagers
  const recentWagers = wagers.slice(-5);

  return (
    <div className={styles.wagers}>
      <h3>Wager History</h3>
      {recentWagers.length === 0 ? (
        <p>No wagers available.</p>
      ) : (
        <table className={styles.wagersTable}>
          <thead>
            <tr>
              <th>Opponent</th>
              <th>Wager Amount (ETH)</th>
              <th>Win/Loss</th>
              <th>Transaction Hash</th>
              <th>Payout Amount (ETH)</th>
            </tr>
          </thead>
          <tbody>
            {recentWagers.map((wager, index) => (
              <tr key={index}>
                <td>{wager.opponent || 'N/A'}</td>
                <td>{wager.wagerAmount}</td>
                <td>{wager.winLoss === 'win' ? 'Win' : 'Loss'}</td>
                <td>
                  {wager.transactionHash ? (
                    <a href={`https://polygonscan.com/tx/${wager.transactionHash}`} target="_blank" rel="noopener noreferrer">
                      {wager.transactionHash.substring(0, 6)}...{wager.transactionHash.substring(wager.transactionHash.length - 4)}
                    </a>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td>{wager.payoutAmount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Wagers;

