/* eslint-disable @typescript-eslint/no-explicit-any */
import { Eip1193Provider } from 'ethers';

interface ExtendedEip1193Provider extends Eip1193Provider {
  on(eventName: string, callback: (...args: any[]) => void): void;
  removeListener(eventName: string, callback: (...args: any[]) => void): void;
  removeAllListeners(eventName: string): void;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: ExtendedEip1193Provider;
  }
}

export { type ExtendedEip1193Provider };
