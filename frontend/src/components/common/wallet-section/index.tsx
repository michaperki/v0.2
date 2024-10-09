import ConnectButton from "@/components/common/connect-btn";
import styles from "./styles.module.css";

export default function WalletSection() {

    return (
        <div className={styles.connectWallet}>
            <div className={styles.btnContainer}>
                <ConnectButton />
            </div>
        </div>
    )
}
