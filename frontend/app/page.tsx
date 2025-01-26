/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { motion } from "framer-motion";
import LoadingSpinner from "./components/LoadingSpinner";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import CyberAlert from "./components/CyberAlert";
import { useEthereum } from "./hooks/useEthereum";
import styled from "styled-components";

const ERC20_ABI = [
  // Add name and owner functions
  "function name() external view returns (string)",
  "function owner() external view returns (address)",
  // Existing functions
  "function transfer(address recipient, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function approve(address spender, uint256 amount) external returns (bool)",
];

const ERC721_ABI = [
  // Add name and owner functions
  "function name() external view returns (string)",
  "function owner() external view returns (address)",
  // Existing functions
  "function transferFrom(address from, address to, uint256 tokenId) external",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function symbol() external view returns (string)",
];

// Update FORWARDER_ABI to match the deployed contract exactly
const FORWARDER_ABI = [
  {
    inputs: [{name: "account", type: "address"}],
    name: "getNonce",
    outputs: [{name: "", type: "uint256"}],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{name: "", type: "address"}],
    name: "nonces",
    outputs: [{name: "", type: "uint256"}],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "domainSeparator",
    outputs: [{name: "", type: "bytes32"}],
    stateMutability: "view",
    type: "function"
  }
];

// Add these constants at the top after imports
const TEST_ACCOUNTS = [
  {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    label: "Account #0 (Deployer)"
  },
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    label: "Account #1"
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    label: "Account #2"
  },
  // Add more test accounts as needed
];

const TEST_TOKEN_IDS = [
  "1", "2", "3", "4", "5", "10", "100"
];

const TEST_AMOUNTS = [
  "1", "10", "100", "1000", "10000"
];

// Add styled components for cyberpunk elements
const CyberPanel = motion(styled.div`
  background: rgba(13, 14, 33, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(66, 211, 255, 0.2);
  border-radius: 1rem;
  box-shadow: 0 0 20px rgba(66, 211, 255, 0.1);
  transition: all 0.3s ease;
  
  &:hover {
    border-color: rgba(66, 211, 255, 0.4);
    box-shadow: 0 0 30px rgba(66, 211, 255, 0.2);
  }
`);

const CyberInput = styled.input`
  background: rgba(13, 14, 33, 0.6);
  border: 1px solid rgba(66, 211, 255, 0.3);
  border-radius: 0.5rem;
  color: #fff;
  padding: 0.75rem 1rem;
  width: 100%;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: rgba(66, 211, 255, 0.8);
    box-shadow: 0 0 15px rgba(66, 211, 255, 0.3);
  }
`;

const CyberSelect = styled.select`
  background: rgba(13, 14, 33, 0.6);
  border: 1px solid rgba(66, 211, 255, 0.3);
  border-radius: 0.5rem;
  color: #fff;
  padding: 0.75rem 1rem;
  width: 100%;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: rgba(66, 211, 255, 0.8);
    box-shadow: 0 0 15px rgba(66, 211, 255, 0.3);
  }
`;

const CyberButton = motion(styled.button`
  background: linear-gradient(45deg, #2b5876, #4e4376);
  border: none;
  border-radius: 0.5rem;
  color: #fff;
  padding: 1rem 2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: 0.5s;
  }

  &:hover::before {
    left: 100%;
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`);

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
    let friendlyMessage = "An unknown error occurred. Check console for details.";

    if (error.message.includes("could not decode result data")) {
      friendlyMessage = "Unable to get nonce. Check if the contract and ABI are correct.";
    } else if (error.code === "BAD_DATA") {
      friendlyMessage = "The contract call returned invalid data. Please verify inputs.";
    } else if (error.code === 4001 || error.message.includes("user rejected")) {
      friendlyMessage = "Transaction was rejected by user.";
    }

    showAlert('error', friendlyMessage);
  };

  // Add detailed logging to connectWallet
  const connectWallet = async () => {
    console.log("Attempting wallet connection...");
    setIsConnecting(true);
    setWalletError("");

    try {
      console.log("Checking if MetaMask exists:", !!window?.ethereum);
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
      console.log("Connected account:", accounts[0]);
      console.log("Connection status:", connected);
      console.log("Provider status:", !!provider);
    } catch (error: any) {
      console.error("Connection error details:", {
        message: error.message,
        code: error.code,
        data: error.data
      });
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

  // Update the ethereum event handling
  useEffect(() => {
    console.log("Checking wallet connection...");
    checkWalletConnection();

    const { ethereum } = window;
    if (ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        console.log("Accounts changed:", accounts);
        if (accounts.length > 0) {
          setConnected(true);
          setUserAddress(accounts[0]);
        } else {
          setConnected(false);
          setUserAddress("");
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      const handleDisconnect = () => {
        setConnected(false);
        setUserAddress("");
      };

      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);
      ethereum.on('disconnect', handleDisconnect);

      return () => {
        // Clean up listeners
        if (ethereum.removeListener) {
          ethereum.removeListener('accountsChanged', handleAccountsChanged);
          ethereum.removeListener('chainChanged', handleChainChanged);
          ethereum.removeListener('disconnect', handleDisconnect);
        }
      };
    }
  }, []);

  // Add logging to fetchTokenInfo
  const fetchTokenInfo = async () => {
    console.log("Fetching token info for:", tokenAddress);
    console.log("Token type:", tokenType);
    
    if (!tokenAddress || !window.ethereum) {
      console.log("Missing requirements:", { tokenAddress, ethereum: !!window.ethereum });
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Check if contract exists first
      const code = await provider.getCode(tokenAddress);
      if (code === '0x') {
        setTokenInfo({ symbol: "Not Found", decimals: 18 });
        return;
      }

      const contract = new ethers.Contract(
        tokenAddress, 
        tokenType === "ERC20" ? ERC20_ABI : ERC721_ABI, 
        provider
      );

      let symbol = "Unknown";
      let decimals = 18;

      // Try multiple ways to get token info with fallbacks
      try {
        try {
          symbol = await contract.symbol();
        } catch {
          try {
            symbol = await contract.name();
          } catch {
            symbol = tokenType === "ERC20" ? "Unknown Token" : "Unknown NFT";
          }
        }

        if (tokenType === "ERC20") {
          try {
            decimals = await contract.decimals();
          } catch {
            console.warn("Using default decimals: 18");
          }
        }

        setTokenInfo({ symbol, decimals });
      } catch (error) {
        console.warn("Token info retrieval failed:", error);
        setTokenInfo({ 
          symbol: tokenType === "ERC20" ? "Unknown Token" : "Unknown NFT", 
          decimals: 18 
        });
      }
    } catch (error) {
      console.error("Provider error:", error);
      setTokenInfo({ 
        symbol: "Error", 
        decimals: 18 
      });
    }
  };

  useEffect(() => {
    if (tokenAddress) {
      fetchTokenInfo();
    }
  }, [tokenAddress, tokenType]);

  // Enhanced handleForwardTx logging
  const handleForwardTx = async () => {
    console.log("Starting transaction with params:", {
      tokenType,
      tokenAddress,
      to,
      amount,
      tokenId
    });

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
      if (!window?.ethereum) {
        throw new Error("MetaMask not found");
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      // Add logging before approval
      console.log("Checking approval requirements...");
      if (tokenType === "ERC20") {
        console.log("Starting ERC20 approval process");
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

      // Ensure verifyingContract is valid
      const verifyingContract = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS;
      if (!verifyingContract || !ethers.isAddress(verifyingContract)) {
        throw new Error("Invalid forwarder address configuration");
      }

      // Create forwarder contract instance with proper ABI
      const forwarderContract = new ethers.Contract(
        verifyingContract,
        FORWARDER_ABI,
        provider
      );

      // Get nonce with better error handling
      let nonce;
      const getNonceWithFallback = async (contract: ethers.Contract, address: string) => {
        const errors: Error[] = [];
      
        // Try nonces first
        try {
          console.log("Trying nonces() method...");
          const result = await contract.nonces.staticCall(address);
          console.log("Got nonce from nonces():", result.toString());
          return result;
        } catch (error) {
          console.log("nonces() failed:", error);
          errors.push(error as Error);
        }
      
        // Try getNonce as fallback
        try {
          console.log("Trying getNonce() method...");
          const result = await contract.getNonce.staticCall(address);
          console.log("Got nonce from getNonce():", result.toString());
          return result;
        } catch (error) {
          console.log("getNonce() failed:", error);
          errors.push(error as Error);
        }
      
        // Try raw call as last resort
        try {
          console.log("Trying raw call...");
          const data = contract.interface.encodeFunctionData("getNonce", [address]);
          const result = await contract.provider.call({
            to: contract.target,
            data
          });
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], result);
          console.log("Got nonce from raw call:", decoded[0].toString());
          return decoded[0];
        } catch (error) {
          console.log("Raw call failed:", error);
          errors.push(error as Error);
        }
      
        console.error("All nonce retrieval methods failed:", errors);
        throw new Error(`All nonce retrieval methods failed. Last error: ${errors[errors.length - 1]?.message}`);
      };
      
      try {
        const forwarderContract = new ethers.Contract(
          verifyingContract,
          FORWARDER_ABI, // Use full ABI here
          provider
        );
      
        console.log("Getting nonce for address:", userAddr);
        nonce = await getNonceWithFallback(forwarderContract, userAddr);
        console.log("Got nonce:", nonce.toString());
      } catch (error: any) {
        console.error("Nonce retrieval error:", error);
        throw new Error(`Failed to get nonce: ${error.message}`);
      }

      const message = {
        from: userAddr,
        to: tokenAddress,
        value: "0",
        gas: "200000",
        nonce: nonce.toString(),
        data: data,
        validUntil: validUntil.toString()
      };

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
        nonce: nonce.toString(),
        data: data,
        validUntil: validUntil.toString()
      };

      // Log transaction preparation
      console.log("Preparing transaction data:", {
        chainId: chainId.toString(),
        userAddress,
        message,
        domain,
        types
      });

      // Log signature request
      console.log("Requesting signature...");
      const signature = await signer.signTypedData(
        domain,
        { ForwardRequest: types.ForwardRequest },
        message
      );
      console.log("Signature received:", signature);

      // Log relay request
      console.log("Sending relay request to API...");
      const response = await fetch("/api/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });

      console.log("API response status:", response.status);
      const result = await response.json();
      console.log("API response data:", result);

      if (!response.ok) {
        throw new Error(result.error || 'Transaction failed');
      }

      showAlert('success', `Transaction sent! Hash: ${result.txHash}`);
      setForwardStatus(`Transaction sent! Hash: ${result.txHash}`);
      setIsSuccess(true);
    } catch (error: any) {
      console.error("Transaction error details:", {
        message: error.message,
        code: error.code,
        data: error.data,
        stack: error.stack
      });
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

  // Add logging to approveForwarder
  const approveForwarder = async () => {
    console.log("Starting token approval process");
    console.log("Current state:", {
      tokenAddress,
      connected,
      hasMetaMask: !!window.ethereum
    });

    if (!window.ethereum || !connected || !tokenAddress) return false;

    try {
      if (!window?.ethereum) {
        throw new Error("MetaMask not found");
      }
      
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
        ethers.MaxUint256,
        {
          gasLimit: 300000
        }
      );

      console.log("Approval transaction details:", {
        forwarderAddress,
        tokenAddress,
        gasLimit: 300000
      });
      
      // Log approval status
      console.log("Approval transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Approval confirmed:", receipt.transactionHash);

      showAlert('success', 'Token approval successful');
      return true;
    } catch (error: any) {
      console.error("Approval error details:", {
        message: error.message,
        code: error.code,
        data: error.data
      });
      handleError(error);
      return false;
    }
  };

  const importTestToken = async () => {
    console.log("Starting token import process...");
    
    if (!window.ethereum) {
      console.error("MetaMask not available");
      showAlert('error', 'MetaMask not installed');
      return;
    }
    
    const tokenAddress = process.env.NEXT_PUBLIC_TEST_TOKEN_ADDRESS;
    if (!tokenAddress) {
      console.error("Test token address not configured");
      showAlert('error', 'Test token address not found');
      return;
    }
  
    try {
      console.log("Token import parameters:", {
        address: tokenAddress,
        symbol: 'TEST',
        decimals: 18
      });
  
      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: 'TEST',
            decimals: 18,
            // Optional image URL
            image: 'https://your-token-image.png',
          },
        },
      });
  
      console.log("Token import result:", wasAdded);
      
      if (wasAdded) {
        console.log("Token successfully added to MetaMask");
        showAlert('success', 'Token added to MetaMask');
        
        // Verify token contract exists
        const provider = new ethers.BrowserProvider(window.ethereum);
        const code = await provider.getCode(tokenAddress);
        console.log("Token contract verification:", {
          address: tokenAddress,
          hasCode: code !== '0x'
        });
      } else {
        console.log("User rejected token import");
        showAlert('warning', 'Token import cancelled');
      }
    } catch (error: any) {
      console.error("Token import error:", {
        message: error.message,
        code: error.code,
        data: error.data
      });
      showAlert('error', `Failed to import token: ${error.message}`);
    }
  };

  // Add these state variables to the component
  const [useCustomAddress, setUseCustomAddress] = useState(false);
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [selectedTestAccount, setSelectedTestAccount] = useState("");
  const [selectedTestAmount, setSelectedTestAmount] = useState("");
  const [selectedTokenId, setSelectedTokenId] = useState("");

  // Add delay utility
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Add retry utility
  async function retry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delayMs = 1000
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        await delay(delayMs);
        return retry(fn, retries - 1, delayMs);
      }
      throw error;
    }
  }

  // Update validateForwarderSetup function
  const validateForwarderSetup = async () => {
    try {
      if (!window?.ethereum) {
        throw new Error("MetaMask not found");
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const verifyingContract = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS;
      
      if (!verifyingContract || !ethers.isAddress(verifyingContract)) {
        throw new Error("Invalid forwarder address");
      }

      console.log("Validating forwarder contract:", verifyingContract);

      // First check if contract exists
      const code = await provider.getCode(verifyingContract);
      if (code === '0x') {
        console.log("No contract code found, waiting and retrying...");
        await delay(2000); // Wait 2 seconds
        const retryCode = await provider.getCode(verifyingContract);
        if (retryCode === '0x') {
          throw new Error('Contract not deployed at this address');
        }
      }

      // Create contract instance with minimal ABI
      const forwarderContract = new ethers.Contract(
        verifyingContract,
        ["function getNonce(address) view returns (uint256)"],
        provider
      );

      // Test contract call with retries
      const testAddress = ethers.ZeroAddress;
      let lastError;

      for (let i = 0; i < 3; i++) {
        try {
          console.log(`Attempt ${i + 1}: Testing getNonce with address:`, testAddress);
          const result = await forwarderContract.getNonce.staticCall(testAddress);
          console.log("Got nonce:", result.toString());
          return true;
        } catch (error: any) {
          console.log(`Attempt ${i + 1} failed:`, error.message);
          lastError = error;
          if (i < 2) await delay(1000); // Wait between retries
        }
      }

      throw lastError || new Error('Contract validation failed');
    } catch (error: any) {
      console.error("Forwarder setup validation failed:", error);
      showAlert('error', `Contract validation failed: ${error.message}`);
      return false;
    }
  };

  // Add useEffect to validate forwarder setup on mount
  useEffect(() => {
    if (connected && window.ethereum) {
      // Add slight delay to ensure contract is deployed
      setTimeout(() => {
        validateForwarderSetup();
      }, 2000);
    }
  }, [connected]);

  // Add animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  const TransactionHistory = () => (
    <motion.div className="mt-8 space-y-4">
      <h2 className="text-xl font-bold text-cyan-400">Transaction History</h2>
      {/* Transaction list */}
    </motion.div>
  );
  const GasSavings = () => (
    <motion.div className="mt-4 p-4 border border-cyan-400/20 rounded-lg">
      <h3 className="text-lg font-bold text-cyan-400">Gas Savings</h3>
      {/* Gas savings stats */}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white px-4 py-8">
      <CyberAlert
        type={alert.type}
        message={alert.message}
        isOpen={alert.isOpen}
        onClose={() => setAlert(prev => ({ ...prev, isOpen: false }))}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto"
      >
        <CyberPanel className="p-8">
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-center mb-12
                       bg-clip-text text-transparent bg-gradient-to-r
                       from-cyan-400 via-blue-500 to-purple-600"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Gasless Transaction Portal
            <div className="text-sm font-normal text-cyan-400 mt-2">
              by Zaid Ahmad
            </div>
          </motion.h1>

          {!connected ? (
            <motion.div
              variants={itemVariants}
              className="space-y-6"
            >
              <CyberButton
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner />
                    <span className="ml-2">Connecting Wallet...</span>
                  </div>
                ) : (
                  "Connect Wallet"
                )}
              </CyberButton>

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
                  className="block text-center text-cyan-400 hover:text-cyan-300 transition-colors duration-300"
                >
                  Install MetaMask
                </a>
              )}
            </motion.div>
          ) : (
            <motion.div
              variants={itemVariants}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-cyan-400 text-sm font-semibold">
                    Token Type
                  </label>
                  <CyberSelect
                    value={tokenType}
                    onChange={(e: { target: { value: string; }; }) => setTokenType(e.target.value as "ERC20" | "ERC721")}
                  >
                    <option value="ERC20">ERC20 Token</option>
                    <option value="ERC721">ERC721 NFT</option>
                  </CyberSelect>
                </div>

                <div className="space-y-2">
                  <label className="text-cyan-400 text-sm font-semibold">
                    Token Address
                  </label>
                  <CyberInput
                    type="text"
                    value={tokenAddress}
                    onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setTokenAddress(e.target.value)}
                    placeholder="0x..."
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text text-cyber-blue">Recipient Address</span>
                </label>
                <select
                  value={selectedTestAccount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedTestAccount(value);
                    setTo(value);
                    setUseCustomAddress(value === "custom");
                  }}
                  className="select select-bordered w-full bg-cyber-dark border-cyber-blue/30"
                >
                  <option value="">Select a test account</option>
                  {TEST_ACCOUNTS.map((account) => (
                    <option key={account.address} value={account.address}>
                      {account.label}
                    </option>
                  ))}
                  <option value="custom">Custom Address</option>
                </select>
                {useCustomAddress && (
                  <input
                    type="text"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="input input-bordered w-full bg-cyber-dark border-cyber-blue/30 mt-2"
                    placeholder="0x..."
                  />
                )}
              </div>

              {tokenType === "ERC20" ? (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-cyber-blue">Amount</span>
                  </label>
                  <select
                    value={selectedTestAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedTestAmount(value);
                      setAmount(value);
                      setUseCustomAmount(value === "custom");
                    }}
                    className="select select-bordered w-full bg-cyber-dark border-cyber-blue/30"
                  >
                    <option value="">Select a test amount</option>
                    {TEST_AMOUNTS.map((amount) => (
                      <option key={amount} value={amount}>
                        {amount}
                      </option>
                    ))}
                    <option value="custom">Custom Amount</option>
                  </select>
                  {useCustomAmount && (
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="input input-bordered w-full bg-cyber-dark border-cyber-blue/30 mt-2"
                      placeholder="0.0"
                    />
                  )}
                  {tokenInfo.symbol && <span className="text-sm text-gray-500">Token: {tokenInfo.symbol}</span>}
                </div>
              ) : (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-cyber-blue">Token ID</span>
                  </label>
                  <select
                    value={selectedTokenId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedTokenId(value);
                      setTokenId(value);
                    }}
                    className="select select-bordered w-full bg-cyber-dark border-cyber-blue/30"
                  >
                    <option value="">Select a test token ID</option>
                    {TEST_TOKEN_IDS.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={tokenId}
                    onChange={(e) => setTokenId(e.target.value)}
                    className="input input-bordered w-full bg-cyber-dark border-cyber-blue/30 mt-2"
                    placeholder="Token ID"
                  />
                </div>
              )}

              <CyberButton
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleForwardTx}
                disabled={isLoading || isApproving}
                className="w-full"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner />
                    <span className="ml-2">Processing Transaction...</span>
                  </div>
                ) : isApproving ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner />
                    <span className="ml-2">Approving Token...</span>
                  </div>
                ) : (
                  "Send Gasless Transaction"
                )}
              </CyberButton>

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

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={importTestToken}
                className="text-sm text-cyan-400 hover:text-cyan-300
                          transition-colors duration-300"
              >
                Import Test Token to MetaMask
              </motion.button>

              <TransactionHistory />
              <GasSavings />
            </motion.div>
          )}
        </CyberPanel>

        {/* Network Status Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-center text-sm text-cyan-400/60"
        >
          {connected ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>Connected to Network</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-red-400 rounded-full" />
              <span>Not Connected</span>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}