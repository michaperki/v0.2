
import WalletProvider from '@/components/providers/wallet'
import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Header from '@/components/common/header'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WalletProvider>
      <div>
        <Header />
        <main>
          <Component {...pageProps} />
        </main>
      </div>
    </WalletProvider>
  )
}

