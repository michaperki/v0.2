import { ethers } from "ethers";
import { useWallet } from "./useWallet";
import { IDeployedNetworkConstantJson, ISmartContractsConstantJson } from "@/types/smart-contract";
import { useEffect, useState } from "react";

/**
 *
 * @returns @description Contains data and methods to interact with smart contract
 */
export const useSmartContract = () => {
    const { ethersSigner, ethersProvider } = useWallet();
    const [contractsData, setContractsData] = useState<ISmartContractsConstantJson | null>(null);
    const [deployedNetworkData, setDeployedNetworkData] = useState<IDeployedNetworkConstantJson | null>(null);
    const [loading, setLoading] = useState(true); // Loading state

    useEffect(() => {
        (async () => {
            try {
                const contractsDataNew = await import(`@/constants/smart-contracts-${process.env.NODE_ENV === "production" ? "production" : "development"}.json`);
                const deployedNetworkDataNew = await import(`@/constants/deployed-network-${process.env.NODE_ENV === "production" ? "production" : "development"}.json`);

                setContractsData(contractsDataNew);
                setDeployedNetworkData(deployedNetworkDataNew);
                setLoading(false); // Set loading to false after data is loaded
            } catch (error) {
                console.error('Error loading contract data:', error);
                setLoading(false);
            }
        })();
    }, []);

    const getSmartContract = <T>(name: string) => {
        if (loading || !contractsData || !ethersProvider || !ethersSigner) {
            return null; // Prevent returning undefined if data is not yet loaded
        }
        const smartContractData = contractsData[name];
        if (!smartContractData) return null;

        const smartContract = new ethers.Contract(
            smartContractData.contractAddress,
            smartContractData.abi,
            ethersSigner
        ) as T;

        return smartContract;
    };

    return {
        deployedNetworkData,
        getSmartContract,
        loading,
    };
};
