'use client';

import { ReactNode } from 'react';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

const getFullnodeUrl = (network: string) => getJsonRpcFullnodeUrl('testnet');

const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet'), network: 'testnet' },
  mainnet: { url: getFullnodeUrl('mainnet'), network: 'mainnet' },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
