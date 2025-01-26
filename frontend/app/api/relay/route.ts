/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/relay/route.ts

import { NextResponse } from "next/server";
import { ethers } from "ethers";

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const FORWARDER_ADDRESS = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS || "";
const RPC_URL = process.env.RPC_URL || "";

const FORWARDER_ABI = [
  "function forward((address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data,uint256 validUntil) req, bytes signature) returns (bool)"
];

export async function POST(request: Request) {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const forwarder = new ethers.Contract(FORWARDER_ADDRESS, FORWARDER_ABI, signer);

    const { message, signature } = await request.json();

    const tx = await forwarder.forward(message, signature, {
      gasLimit: 500000
    });

    const receipt = await tx.wait();
    return NextResponse.json({ txHash: receipt.hash });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
