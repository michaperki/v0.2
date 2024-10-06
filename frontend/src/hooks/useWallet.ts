
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

    useEffect(() => {
        if (connector) {
            (async () => {
                const provider = await connector.getProvider();
                const ethersProviderNew = new ethers.BrowserProvider(provider as any);
                const ethersSignerNew = await ethersProviderNew.getSigner();

                setEthersProvider(ethersProviderNew);
                setEthersSigner(ethersSignerNew);

                const lichessId = Cookies.get("lichess_id");

                if (lichessId && walletAddress) {
                    try {
                        // Call the new API route to associate the wallet with the Lichess ID
                        const response = await fetch("/api/user/wallet", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ lichessId, walletAddress }),
                        });

                        if (!response.ok) {
                            throw new Error("Failed to associate wallet address");
                        }

                        const data = await response.json();
                    } catch (error) {
                        console.error("Error associating wallet address:", error);
                    }
                }
            })();
        } else {
            setEthersProvider(null);
            setEthersSigner(null);
        }
    }, [connector, walletAddress]);

    return {
        // Data
        isConnectDialogOpen,
        walletAddress,
        walletConnectionStatus: ((walletConnectionStatus === "connected") ? (ethersSigner ? "connected" : "connecting") : walletConnectionStatus) as ("disconnected" | "connected" | "reconnecting" | "connecting"),
        ethersProvider,
        chainCurrent,
        ethersSigner,

        // Methods
        showConnectDialog,
        closeConnectDialog,
        disconnectWallet,
        switchNetwork,
    };
};

