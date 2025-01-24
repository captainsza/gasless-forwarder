/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/relay/route.ts

import { NextResponse } from "next/server";
import { ethers } from "ethers";

// Load environment variables (remember these won't be exposed to the client)
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || "";
const FORWARDER_CONTRACT_ADDRESS = process.env.FORWARDER_CONTRACT_ADDRESS || "";
const RPC_URL = process.env.RPC_URL || "";

// Create a provider and wallet for the relayer
const provider = new ethers.JsonRpcProvider(RPC_URL);
const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

// Minimal ABI for the forward() function
const FORWARDER_ABI = [
  "function forward((address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data), bytes signature) external payable"
];

// This is the function that will handle POST requests to /api/relay
export async function POST(request: Request) {
  try {
    // Parse JSON body from the incoming request
    const body = await request.json();
    const { message, signature } = body;

    if (!message || !signature) {
      return NextResponse.json(
        { error: "Missing 'message' or 'signature' in request body" },
        { status: 400 }
      );
    }

    // Construct the Forwarder contract instance using the relayer wallet
    const forwarderContract = new ethers.Contract(
      FORWARDER_CONTRACT_ADDRESS,
      FORWARDER_ABI,
      relayerWallet
    );

    // Estimate gas
    const gasEstimate = await forwarderContract.forward.estimateGas(
      message,
      signature
    );

    // Forward the transaction
    const tx = await forwarderContract.forward(message, signature, {
      gasLimit: gasEstimate * BigInt(2), // add a buffer factor
    });

    // Wait for the transaction receipt
    const receipt = await tx.wait();

    // Return a JSON response with the transaction hash
    return NextResponse.json({
      success: true,
      txHash: receipt.transactionHash,
    });
  } catch (error: any) {
    console.error("Relayer error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
