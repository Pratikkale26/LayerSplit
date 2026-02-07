'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

const getFullnodeUrl = (network: string) => getJsonRpcFullnodeUrl('testnet');
import { registerSlushWallet } from '@mysten/slush-wallet';

// Register Slush wallet for mobile support
if (typeof window !== 'undefined') {
  registerSlushWallet('LayerSplit', {
    origin: 'https://layersplit.vercel.app',
  });
}

const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet'), network: "testnet" },
  mainnet: { url: getFullnodeUrl('mainnet'), network: "mainnet" },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Initialize Telegram WebApp if available
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const webapp = (window as any).Telegram.WebApp;
      webapp.ready();
      webapp.expand();
    }
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider
          autoConnect
          preferredWallets={['Slush', 'Sui Wallet', 'Suiet', 'Nightly']}
        >
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
