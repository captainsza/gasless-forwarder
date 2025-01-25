/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { motion } from "framer-motion";
import LoadingSpinner from "./components/LoadingSpinner";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import CyberAlert from "./components/CyberAlert";
import { useEthereum } from "./hooks/useEthereum";

const ERC20_ABI = [
  "function transfer(address recipient, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function approve(address spender, uint256 amount) external returns (bool)",
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
  const [isApproving, setIsApproving] = useState(false);
  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    isOpen: boolean;
  }>({ type: 'success', message: '', isOpen: false });

  const { hasMetaMask, provider } = useEthereum();

  const showAlert = (type: 'success' | 'error' | 'warning', message: string) => {
    setAlert({ type, message, isOpen: true });
    setTimeout(() => setAlert(prev => ({ ...prev, isOpen: false })), 5000);
  };

  const handleError = (error: any) => {
    console.error(error);
    if (error.code === 4001) {
      showAlert('warning', 'Transaction was rejected by user');
    } else if (error.message.includes('user rejected')) {
      showAlert('warning', 'Action cancelled by user');
    } else {
      showAlert('error', `Error: ${error.message}`);
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setWalletError("");

    try {
      if (!window?.ethereum) {
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
        if (provider) {
          await provider.getSigner(); // This ensures we have proper connection
        }
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
      if (!window?.ethereum) {
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

      if (!ethers.isAddress(tokenAddress)) {
        setTokenInfo({ symbol: "Invalid Address", decimals: 18 });
        return;
      }

      const contract = new ethers.Contract(tokenAddress, abi, provider);

      try {
        // Handle symbol first
        let symbol = "Unknown";
        try {
          const symbolResult = await contract.symbol();
          if (symbolResult) symbol = symbolResult;
        } catch (error) {
          console.warn("Error getting symbol:", error);
        }

        // Handle decimals
        let decimals = 18;
        if (tokenType === "ERC20") {
          try {
            const decimalsResult = await contract.decimals();
            if (decimalsResult !== undefined) {
              decimals = Number(decimalsResult);
            }
          } catch (error) {
            console.warn("Error getting decimals:", error);
          }
        }

        setTokenInfo({ symbol, decimals });
      } catch (error) {
        console.error("Contract call error:", error);
        setTokenInfo({ symbol: "Error", decimals: 18 });
      }
    } catch (error) {
      console.error("Provider error:", error);
      setTokenInfo({ symbol: "Error", decimals: 18 });
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

    if (!ethers.isAddress(tokenAddress) || !ethers.isAddress(to)) {
      setForwardStatus("Invalid address format");
      return;
    }

    setIsLoading(true);
    setIsSuccess(false);

    try {
      // For ERC20 tokens, check and handle approval first
      if (tokenType === "ERC20") {
        setIsApproving(true);
        try {
          const approved = await approveForwarder();
          if (!approved) {
            throw new Error("Token approval failed");
          }
        } catch (error: any) {
          throw new Error(`Approval failed: ${error.message}`);
        } finally {
          setIsApproving(false);
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const chainId = (await provider.getNetwork()).chainId;
      const userAddr = await signer.getAddress();

      // Validate inputs
      if (tokenType === "ERC20" && (!amount || isNaN(Number(amount)))) {
        setForwardStatus("Please enter a valid amount");
        return;
      }

      if (tokenType === "ERC721" && (!tokenId || isNaN(Number(tokenId)))) {
        setForwardStatus("Please enter a valid token ID");
        return;
      }

      // Prepare data
      const abi = tokenType === "ERC20" ? ERC20_ABI : ERC721_ABI;
      const iface = new ethers.Interface(abi);
      
      let data;
      if (tokenType === "ERC20") {
        const value = ethers.parseUnits(amount, tokenInfo.decimals || 18).toString();
        data = iface.encodeFunctionData("transfer", [to, value]);
      } else {
        data = iface.encodeFunctionData("transferFrom", [userAddress, to, tokenId]);
      }

      const validUntil = Math.floor(Date.now() / 1000) + 3600;

      const message = {
        from: userAddr,
        to: tokenAddress,
        value: "0",
        gas: "200000",
        nonce: "0",
        data: data,
        validUntil: validUntil.toString()
      };

      // Ensure verifyingContract is valid
      const verifyingContract = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS;
      if (!verifyingContract || !ethers.isAddress(verifyingContract)) {
        throw new Error("Invalid forwarder address configuration");
      }

      const domain = {
        name: "GaslessForwarder",
        version: "1",
        chainId: Number(chainId),
        verifyingContract: verifyingContract
      };

      // Remove EIP712Domain from types - it's handled internally
      const types = {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "data", type: "bytes" },
          { name: "validUntil", type: "uint256" }
        ]
      };

      // Format message values as strings
      const messagevalues = {
        from: ethers.getAddress(userAddr),
        to: ethers.getAddress(tokenAddress),
        value: "0",
        gas: "200000",
        nonce: "0",
        data: data,
        validUntil: validUntil.toString()
      };

      console.log("Signing message:", {
        domain,
        types,
        messagevalues
      });

      // Sign the message with proper types
      const signature = await signer.signTypedData(
        domain,
        { ForwardRequest: types.ForwardRequest },
        message
      );

      const response = await fetch("/api/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Transaction failed');
      }

      showAlert('success', `Transaction sent! Hash: ${result.txHash}`);
      setForwardStatus(`Transaction sent! Hash: ${result.txHash}`);
      setIsSuccess(true);
    } catch (error: any) {
      console.error("Transaction error:", error);
      
      // Handle specific error cases
      if (error.message.includes('user rejected')) {
        showAlert('warning', 'Transaction was rejected by user');
      } else if (error.message.includes('insufficient funds')) {
        showAlert('error', 'Insufficient funds for gas');
      } else {
        showAlert('error', `Error: ${error.message}`);
      }
      
      setIsSuccess(false);
      setForwardStatus(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
      setIsApproving(false);
    }
  };

  const approveForwarder = async () => {
    if (!window.ethereum || !connected || !tokenAddress) return false;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Get and validate forwarder address
      const forwarderAddress = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS;
      if (!forwarderAddress || !ethers.isAddress(forwarderAddress)) {
        throw new Error("Invalid forwarder address");
      }

      // Create contract instance
      const tokenContract = new ethers.Contract(
        ethers.getAddress(tokenAddress), // ensure checksummed address
        ERC20_ABI,
        signer
      );

      console.log("Approving forwarder:", forwarderAddress);
      console.log("Token address:", tokenAddress);
      
      // Call approve with proper formatting
      const tx = await tokenContract.approve(
        ethers.getAddress(forwarderAddress),
        ethers.MaxUint256
      );

      console.log("Approval tx sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Approval confirmed:", receipt.transactionHash);

      showAlert('success', 'Token approval successful');
      return true;
    } catch (error: any) {
      handleError(error);
      return false;
    }
  };

  const importTestToken = async () => {
    if (!window.ethereum) return;
    
    const tokenAddress = process.env.NEXT_PUBLIC_TEST_TOKEN_ADDRESS;
    if (!tokenAddress) return;

    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: 'TEST',
            decimals: 18,
          },
        },
      });
    } catch (error) {
      console.error("Error importing token:", error);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-dark text-white">
      <CyberAlert
        type={alert.type}
        message={alert.message}
        isOpen={alert.isOpen}
        onClose={() => setAlert(prev => ({ ...prev, isOpen: false }))}
      />
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

              {!hasMetaMask && (
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
                disabled={isLoading || isApproving}
                className={`w-full py-3 px-6 rounded-lg font-bold shadow-neon transition-all duration-300
                  ${(isLoading || isApproving)
                    ? 'bg-gray-600' 
                    : 'bg-gradient-to-r from-cyber-blue to-cyber-purple hover:shadow-neon-lg'
                  }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner />
                    <span className="ml-2">Processing...</span>
                  </div>
                ) : isApproving ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner />
                    <span className="ml-2">Approving Token...</span>
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

              <button
                onClick={importTestToken}
                className="text-sm text-cyber-blue hover:text-cyber-pink"
              >
                Import Test Token to MetaMask
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
