
import { useWeb3Modal, useWeb3ModalState } from "@web3modal/wagmi/react";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { useAccount, useNetwork, useSwitchNetwork, useDisconnect } from "wagmi";
import Cookies from "js-cookie";

/**
 * @description Useful methods and data about Wallet
 */
export const useWallet = () => {
    const { open: showConnectDialog, close: closeConnectDialog } = useWeb3Modal();
    const { open: isConnectDialogOpen } = useWeb3ModalState();
    const { address: walletAddress, status: walletConnectionStatus, connector } = useAccount();
    const { disconnect: disconnectWallet } = useDisconnect();
    const { chain: chainCurrent } = useNetwork();
    const { switchNetwork } = useSwitchNetwork();

    const [ethersProvider, setEthersProvider] = useState<any>(null);
    const [ethersSigner, setEthersSigner] = useState<any>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Fetch the user and store the user ID and Lichess ID in cookies
    const fetchUser = async () => {
        if (!walletAddress) return;
        console.log("Checking user status...");

        try {
            const response = await fetch("/api/user/check-auth", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ walletAddress }),
            });

            if (!response.ok) {
                throw new Error("Failed to check user status");
            }

            const { userId, accessToken, lichessId } = await response.json(); // Get user ID, access token, and Lichess ID from the API
            console.log("User data:", { userId, accessToken, lichessId });

            if (userId) {
                // Store user ID in cookies to use later for Lichess authentication checks
                Cookies.set("user_id", userId.toString(), { sameSite: "lax" });
                setIsAuthenticated(true);
            }

            if (accessToken) {
                // Store the access token in cookies to use later for Lichess API calls
                Cookies.set("access_token", accessToken, { sameSite: "lax" });
            }

            if (lichessId) {
                // Store the Lichess ID in cookies for later use
                Cookies.set("lichess_id", lichessId.toString(), { sameSite: "lax" });
            }

            if (walletAddress) {
                // Store the wallet address in cookies for later use
                Cookies.set("wallet_address", walletAddress, { sameSite: "lax" });
            }

        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    // Fetch user data after wallet is connected
    useEffect(() => {
        if (walletAddress && ethersSigner && !isAuthenticated) {
            fetchUser();  // Ensure we only fetch user data if the wallet is connected and the user isn't authenticated yet
        }
    }, [walletAddress, ethersSigner]);

    useEffect(() => {
        if (connector) {
            (async () => {
                const provider = await connector.getProvider();
                const ethersProviderNew = new ethers.BrowserProvider(provider as any);
                const ethersSignerNew = await ethersProviderNew.getSigner();

                setEthersProvider(ethersProviderNew);
                setEthersSigner(ethersSignerNew);
            })();
        } else {
            setEthersProvider(null);
            setEthersSigner(null);
        }
    }, [connector]);

    return {
        isConnectDialogOpen,
        walletAddress,
        walletConnectionStatus: walletConnectionStatus === "connected" ? (ethersSigner ? "connected" : "connecting") : walletConnectionStatus,
        ethersProvider,
        chainCurrent,
        ethersSigner,
        isAuthenticated,
        showConnectDialog,
        closeConnectDialog,
        disconnectWallet,
        switchNetwork,
    };
};

