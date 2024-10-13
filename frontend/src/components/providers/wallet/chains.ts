
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
        public: { http: [`https://rpc.ankr.com/eth_sepolia`] },
        default: { http: [`https://rpc.ankr.com/eth_sepolia`] },
    },
    blockExplorers: {
        etherscan: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
        default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
    },
}

const polygonAmoy: Chain = {
    id: 80002,
    name: 'Polygon Amoy',
    network: 'amoy',
    nativeCurrency: {
        decimals: 18,
        name: 'Matic',
        symbol: 'MATIC',
    },
    rpcUrls: {
        public: { http: ['https://rpc-amoy.polygon.technology'] },
        default: { http: ['https://rpc-amoy.polygon.technology'] },
    },
    blockExplorers: {
        etherscan: { name: 'Polygonscan', url: 'https://amoy.polygonscan.com' },
        default: { name: 'Polygonscan', url: 'https://amoy.polygonscan.com' },
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
    polygonAmoy,  // Add Polygon Amoy to supported chains
    sepolia,  // Add Sepolia to supported chains
];

