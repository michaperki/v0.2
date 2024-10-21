
import Image from "next/image";
import Link from "next/link";
import logo from "../../../../public/images/logo_white.svg";
import styles from "./Logo.module.css";

export default function Logo() {
    const homeUrl = process.env.NEXT_PUBLIC_HOME_URL as string;

    return (
        <Link href={homeUrl}>
            <div className={styles.logoContainer}>
                <Image
                    src={logo}
                    alt="Blitz Logo"
                    className={styles.logoImage}
                />
                <span className={styles.logoText}>Blitz</span> {/* Add text below the logo */}
            </div>
        </Link>
    );
}

