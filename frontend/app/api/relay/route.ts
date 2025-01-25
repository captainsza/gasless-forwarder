/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/relay/route.ts

import { NextResponse } from "next/server";
import { ethers } from "ethers";

const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || "";
const FORWARDER_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS || "";
const RPC_URL = process.env.RPC_URL || "";

// Create provider and wallet with proper private key handling
let provider: ethers.JsonRpcProvider;
let relayerWallet: ethers.Wallet;

try {
  provider = new ethers.JsonRpcProvider(RPC_URL);
  // Ensure private key is properly formatted
  const privateKey = RELAYER_PRIVATE_KEY.startsWith('0x') 
    ? RELAYER_PRIVATE_KEY 
    : `0x${RELAYER_PRIVATE_KEY}`;
  relayerWallet = new ethers.Wallet(privateKey, provider);
} catch (error) {
  console.error("Error initializing provider/wallet:", error);
}

// Minimal ABI for the forward() function
const FORWARDER_ABI = [
  "function forward((address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data,uint256 validUntil) req, bytes signature) external payable returns (bool)",
  "function verifyAndDebug((address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data,uint256 validUntil) req, bytes signature) external returns (bool)",
  "function nonces(address signer) external view returns (uint256)",
  "event Debug(string context, address recovered, address expected, bytes32 hash, bytes32 digest)"
];

// This is the function that will handle POST requests to /api/relay
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, signature } = body;

    // Validate input
    if (!message || !signature) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Format the message
    const formattedMessage = {
      from: ethers.getAddress(message.from),
      to: ethers.getAddress(message.to),
      value: BigInt(message.value).toString(),
      gas: BigInt(message.gas).toString(),
      nonce: BigInt(message.nonce).toString(),
      data: message.data,
      validUntil: BigInt(message.validUntil).toString()
    };

    // Create contract instance
    const forwarderContract = new ethers.Contract(
      FORWARDER_CONTRACT_ADDRESS,
      FORWARDER_ABI,
      relayerWallet
    );

    // Use verifyAndDebug instead of verify
    try {
      const isValid = await forwarderContract.verifyAndDebug(formattedMessage, signature);
      if (!isValid) {
        console.error("Invalid signature detected");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      return NextResponse.json({ 
        error: "Signature verification failed", 
        details: error.message 
      }, { status: 400 });
    }

    // Forward the transaction
    const tx = await forwarderContract.forward(formattedMessage, signature, {
      gasLimit: BigInt(300000) // Use fixed gas limit for now
    });

    const receipt = await tx.wait();
    return NextResponse.json({ success: true, txHash: receipt.hash });
  } catch (error: any) {
    console.error("Relay error:", error);
    return NextResponse.json({ 
      error: error.message || "Unknown error",
      details: error.reason || error.code 
    }, { status: 500 });
  }
}
