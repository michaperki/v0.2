import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react'
import React from 'react'
import { WagmiConfig } from 'wagmi'
import { supportedChains } from './chains'

// Config for WC v3
const metadata = {
    name: 'blitz',
    description: 'a chess betting game',
    url: 'https://blitz-three-nu.vercel.app/',
    icons: ['https://avatars.githubusercontent.com/u/37784886']
}
const wagmiConfig = defaultWagmiConfig({
    chains: supportedChains,
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID as string,
    metadata
})
createWeb3Modal({
    wagmiConfig,
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID as string,
    chains: supportedChains
})

interface IWalletProvider {
    children: React.ReactNode;
}

export default function WalletProvider({ children }: IWalletProvider) {
    return (
        <WagmiConfig config={wagmiConfig}>
            {children}
        </WagmiConfig>
    )
}
