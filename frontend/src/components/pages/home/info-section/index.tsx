import styles from "./styles.module.css";

export default function InfoSection() {
    return (
        <div className={styles.infoSection}>
            <div className={styles.infoSectionInner}>
                <h2 className={styles.heading}>
                    Play Blitz Like Never Before
                </h2>

                <hr className={styles.divider} />

                <ul className={styles.list}>
                    {/** Blockchain running */}
                    <li className={styles.listItem}>
                        <h3 className={styles.heading}>
                            1. Connect your wallet
                        </h3>

                        <p className={styles.text}>
                            Connect your wallet to start playing. You can connect your wallet by clicking the &quot;Connect Wallet&quot; button above.
                        </p>
                    </li>

                    {/** Frontend running */}
                    <li className={styles.listItem}>
                        <h3 className={styles.heading}>
                            2. Authenticate your Lichess account
                        </h3>

                        <p className={styles.text}>
                            Authenticate your Lichess account by clicking the &quot;Login to Lichess&quot; button.
                        </p>
                    </li>

                    {/** Modify Frontend */}
                    <li className={styles.listItem}>
                        <h3 className={styles.heading}>
                            3. Find an opponent
                        </h3>

                        <p className={styles.text}>
                            Once you have authenticated your Lichess account, you can start playing against other players. You can find an opponent by entering your wager and clicking the &quot;Find Opponent&quot; button.
                        </p>
                    </li>

                </ul>
            </div>
        </div>
    )
}
