/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { motion } from "framer-motion";
import LoadingSpinner from "./components/LoadingSpinner";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

const ERC20_ABI = [
  "function transfer(address recipient, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
];

const ERC721_ABI = [
  "function transferFrom(address from, address to, uint256 tokenId) external",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function symbol() external view returns (string)",
];

export default function RelayPage() {
  const [tokenType, setTokenType] = useState<"ERC20" | "ERC721">("ERC20");
  const [tokenAddress, setTokenAddress] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [forwardStatus, setForwardStatus] = useState("");
  const [tokenInfo, setTokenInfo] = useState<{symbol?: string, decimals?: number}>({});
  const [connected, setConnected] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletError, setWalletError] = useState("");

  const connectWallet = async () => {
    setIsConnecting(true);
    setWalletError("");

    try {
      if (typeof window.ethereum === "undefined") {
        setWalletError("MetaMask is not installed!");
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (accounts && accounts.length > 0) {
        setConnected(true);
        setUserAddress(accounts[0]);
        
        // Also verify the connection with provider
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.getSigner(); // This ensures we have proper connection
      } else {
        setWalletError("No accounts found!");
      }
    } catch (error: any) {
      console.error("Connection error:", error);
      setWalletError(error.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const checkWalletConnection = async () => {
    try {
      if (typeof window.ethereum === "undefined") {
        setWalletError("MetaMask is not installed!");
        return;
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
      });

      if (accounts && accounts.length > 0) {
        setConnected(true);
        setUserAddress(accounts[0]);
      }
    } catch (error: any) {
      console.error("Wallet check error:", error);
      setWalletError(error.message);
    }
  };

  useEffect(() => {
    console.log("Checking wallet connection...");
    checkWalletConnection();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        console.log("Accounts changed:", accounts);
        if (accounts.length > 0) {
          setConnected(true);
          setUserAddress(accounts[0]);
        } else {
          setConnected(false);
          setUserAddress("");
        }
      });

      // Handle chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

      // Handle disconnect
      window.ethereum.on('disconnect', () => {
        setConnected(false);
        setUserAddress("");
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners();
      }
    };
  }, []);

  const fetchTokenInfo = async () => {
    if (!tokenAddress || !window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const abi = tokenType === "ERC20" ? ERC20_ABI : ERC721_ABI;
      const contract = new ethers.Contract(tokenAddress, abi, provider);
      
      const symbol = await contract.symbol();
      let decimals;
      if (tokenType === "ERC20") {
        decimals = await contract.decimals();
      }
      
      setTokenInfo({ symbol, decimals });
    } catch (error) {
      console.error("Error fetching token info:", error);
    }
  };

  useEffect(() => {
    if (tokenAddress) {
      fetchTokenInfo();
    }
  }, [tokenAddress, tokenType]);

  const handleForwardTx = async () => {
    if (!window.ethereum || !connected) {
      setForwardStatus("Please connect your wallet first");
      return;
    }

    setIsLoading(true);
    setIsSuccess(false);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const chainId = (await provider.getNetwork()).chainId;
      const nonce = 0; // You should fetch this from the contract

      const domain = {
        name: "GaslessForwarder",
        version: "1",
        chainId,
        verifyingContract: process.env.NEXT_PUBLIC_FORWARDER_ADDRESS,
      };

      const types = {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "data", type: "bytes" },
          { name: "validUntil", type: "uint256" },
        ],
      };

      const abi = tokenType === "ERC20" ? ERC20_ABI : ERC721_ABI;
      const iface = new ethers.Interface(abi);
      
      let data;
      if (tokenType === "ERC20") {
        const value = ethers.parseUnits(amount, tokenInfo.decimals || 18);
        data = iface.encodeFunctionData("transfer", [to, value]);
      } else {
        data = iface.encodeFunctionData("transferFrom", [userAddress, to, tokenId]);
      }

      const validUntil = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      const message = {
        from: userAddress,
        to: tokenAddress,
        value: 0,
        gas: 200000,
        nonce: nonce,
        data: data,
        validUntil: validUntil,
      };

      const signature = await signer.signTypedData(domain, types, message);

      const response = await fetch("/api/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      setForwardStatus(`Transaction sent! Hash: ${result.txHash}`);
      setIsSuccess(true);
    } catch (error: any) {
      console.error(error);
      setForwardStatus(`Error: ${error.message}`);
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-dark text-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto p-6"
      >
        <div className="glass-card bg-opacity-10 backdrop-blur-lg rounded-xl p-8 border border-cyber-blue/30">
          <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-cyber-blue via-cyber-pink to-cyber-purple bg-clip-text text-transparent animate-gradient">
            Gasless Transaction Portal
          </h1>

          {!connected ? (
            <div className="space-y-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={connectWallet}
                disabled={isConnecting}
                className={`w-full py-3 px-6 bg-gradient-to-r from-cyber-blue to-cyber-purple rounded-lg text-white font-bold shadow-neon hover:shadow-neon-lg transition-all duration-300 ${
                  isConnecting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isConnecting ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner />
                    <span className="ml-2">Connecting...</span>
                  </div>
                ) : (
                  "Connect Wallet"
                )}
              </motion.button>

              {walletError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg bg-red-900/20 text-red-400 text-sm text-center"
                >
                  {walletError}
                </motion.div>
              )}

              {typeof window.ethereum === "undefined" && (
                <a 
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-cyber-blue hover:text-cyber-pink transition-colors duration-300"
                >
                  Install MetaMask
                </a>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-cyber-blue">Token Type</span>
                  </label>
                  <select
                    value={tokenType}
                    onChange={(e) => setTokenType(e.target.value as "ERC20" | "ERC721")}
                    className="select select-bordered w-full bg-cyber-dark border-cyber-blue/30"
                  >
                    <option value="ERC20">ERC20</option>
                    <option value="ERC721">ERC721</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-cyber-blue">Token Address</span>
                  </label>
                  <input
                    type="text"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    className="input input-bordered w-full bg-cyber-dark border-cyber-blue/30"
                    placeholder="0x..."
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text text-cyber-blue">Recipient Address</span>
                </label>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="input input-bordered w-full bg-cyber-dark border-cyber-blue/30"
                  placeholder="0x..."
                />
              </div>

              {tokenType === "ERC20" ? (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-cyber-blue">Amount</span>
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input input-bordered w-full bg-cyber-dark border-cyber-blue/30"
                    placeholder="0.0"
                  />
                  {tokenInfo.symbol && <span className="text-sm text-gray-500">Token: {tokenInfo.symbol}</span>}
                </div>
              ) : (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-cyber-blue">Token ID</span>
                  </label>
                  <input
                    type="text"
                    value={tokenId}
                    onChange={(e) => setTokenId(e.target.value)}
                    className="input input-bordered w-full bg-cyber-dark border-cyber-blue/30"
                    placeholder="Token ID"
                  />
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleForwardTx}
                disabled={isLoading}
                className={`w-full py-3 px-6 rounded-lg font-bold shadow-neon transition-all duration-300
                  ${isLoading 
                    ? 'bg-gray-600' 
                    : 'bg-gradient-to-r from-cyber-blue to-cyber-purple hover:shadow-neon-lg'
                  }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner />
                    <span className="ml-2">Processing...</span>
                  </div>
                ) : (
                  "Send Gasless Transaction"
                )}
              </motion.button>

              {forwardStatus && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg flex items-center space-x-2
                    ${isSuccess ? 'bg-green-900/20' : 'bg-red-900/20'}`}
                >
                  {isSuccess ? (
                    <CheckCircleIcon className="w-6 h-6 text-green-400" />
                  ) : (
                    <XCircleIcon className="w-6 h-6 text-red-400" />
                  )}
                  <p className="text-sm break-all">{forwardStatus}</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
