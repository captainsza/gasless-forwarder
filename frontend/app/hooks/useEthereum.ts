
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';

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
  const [chainId, setChainId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  useEffect(() => {
    const checkMetaMask = async () => {
      if (typeof window !== 'undefined' && (window as Window).ethereum) {
        const ethereum = (window as Window).ethereum;
        const hasMetaMask = !!ethereum?.isMetaMask;
        setHasMetaMask(hasMetaMask);
        
        if (hasMetaMask) {
          try {
            const provider = new BrowserProvider(ethereum);
            setProvider(provider);
            
            const network = await provider.getNetwork();
            setChainId(Number(network.chainId));

            // Listen for network changes
            ethereum.on('chainChanged', (id: string) => {
              setChainId(parseInt(id, 16));
            });
          } catch (error) {
            console.error('Error initializing provider:', error);
          }
        }
      }
      setIsLoading(false);
    };

    checkMetaMask();

    return () => {
      if (window?.ethereum) {
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const switchNetwork = async (targetChainId: number): Promise<boolean> => {
    if (!window?.ethereum) return false;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
      return true;
    } catch (error) {
      console.error('Error switching network:', error);
      return false;
    }
  };

  return {
    hasMetaMask,
    chainId,
    isLoading,
    switchNetwork,
    provider
  };
}
