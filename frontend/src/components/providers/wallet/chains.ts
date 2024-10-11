
import { mainnet, goerli, polygon, polygonMumbai, polygonZkEvm, polygonZkEvmTestnet } from 'wagmi/chains';
import { Chain } from 'wagmi';

const hardhat: Chain = {
    id: 31337,
    name: 'Hardhat',
    network: 'localhost',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        public: { http: ['http://127.0.0.1:8545'] },
        default: { http: ['http://127.0.0.1:8545'] },
    },
}

const sepolia: Chain = {
    id: 11155111,
    name: 'Sepolia',
    network: 'sepolia',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        public: { http: ['https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID'] },
        default: { http: ['https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID'] },
    },
    blockExplorers: {
        etherscan: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
        default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
    },
}

export const supportedChains = [
    hardhat,
    mainnet,
    goerli,
    polygon,
    polygonMumbai,
    polygonZkEvm,
    polygonZkEvmTestnet,
    sepolia,  // Add Sepolia to supported chains
];

