
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import WalletSection from '@/components/common/wallet-section';
import styles from './Header.module.css';

export default function WalletAuthStatus() {
  const { walletAddress, ethersProvider } = useWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }

    const fetchBalance = async () => {
      if (walletAddress && ethersProvider) {
        try {
          const balanceInWei = await ethersProvider.getBalance(walletAddress);
          const balanceInEth = ethers.formatUnits(balanceInWei, 'ether');
          setBalance(balanceInEth);
        } catch (error) {
          console.error('Error fetching balance:', error);
        }
      }
    };

    if (walletAddress && ethersProvider) {
      fetchBalance();
    }
  }, [walletAddress, ethersProvider]);

  return (
    <div className={isAuthenticated ? styles.authenticated : styles.unauthenticated}>
      <div className={styles.walletStatusWrapper}>
        <WalletSection />
      </div>
    </div>
  );
}

