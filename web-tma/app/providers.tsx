'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import '@mysten/dapp-kit/dist/index.css'; // Don't forget the CSS for the modal!

const { networkConfig } = createNetworkConfig({
  testnet: { url: getJsonRpcFullnodeUrl('testnet'), network: 'testnet' },
  mainnet: { url: getJsonRpcFullnodeUrl('mainnet'), network: 'mainnet' },
});
const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Telegram specific initialization
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

  if (!mounted) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        {/* STRICT ADVICE: 
            Drop manual registration. Slush and Phantom should be 
            detected automatically if they are installed in the browser.
            If this is for TMA, remember: desktop extensions don't work in mobile.
        */}
        <WalletProvider 
          autoConnect 
        >
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}