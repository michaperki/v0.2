import styles from "./ConnectButton.module.css";

export default function ConnectButton() {
  return (
    <div className={styles.connectWallet}>
      <w3m-button balance="show" label="Connect your wallet" />
    </div>
  );
}

