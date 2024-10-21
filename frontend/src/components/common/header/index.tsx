
// components/common/header/index.tsx
import Logo from '@/components/common/logo';
import WalletSection from '@/components/common/wallet-section';
import LichessSection from '@/components/common/lichess-section';
import styles from './Header.module.css';

export default function Header() {
  return (
    <div className={styles.home}>
      <section className={styles.col1}>
        <Logo />
      </section>

      <section className={styles.col2}>
        <WalletSection />
      </section>

      <section className={styles.col3}>
        <LichessSection />
      </section>
    </div>
  );
}

