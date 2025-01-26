/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import type { ExtendedEip1193Provider } from '../types/global';

interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (eventName: string, handler: (...args: any[]) => void) => void;
    removeAllListeners: (eventName: string) => void;
  };
}

export function useEthereum() {
  const [hasMetaMask, setHasMetaMask] = useState(false);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [ethereum, setEthereum] = useState<ExtendedEip1193Provider | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      setHasMetaMask(!!window.ethereum.isMetaMask);
      setEthereum(window.ethereum);
      try {
        const provider = new BrowserProvider(window.ethereum);
        setProvider(provider);
      } catch (error) {
        console.error("Error creating provider:", error);
      }
    }
  }, []);

  return {
    hasMetaMask,
    provider,
    ethereum
  };
}
