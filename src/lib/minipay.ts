"use client";

import { encodeFunctionData, parseUnits } from "viem";

export type CeloNetwork = "celo" | "celo-alfajores";

export const NETWORK: CeloNetwork =
  (process.env.NEXT_PUBLIC_CELO_NETWORK as CeloNetwork) ?? "celo-alfajores";

const CHAIN_MAP = {
  celo:             { chainId: 42220, chainIdHex: "0xA4EC" as const },
  "celo-alfajores": { chainId: 44787, chainIdHex: "0xAEF3" as const },
} as const;

export const CUSD = {
  celo:             "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`,
  "celo-alfajores": "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1" as `0x${string}`,
} as const;

// ERC20 transfer ABI (minimal)
const ERC20_TRANSFER_ABI = [{
  name: "transfer",
  type: "function",
  inputs: [
    { name: "recipient", type: "address" },
    { name: "amount",    type: "uint256" },
  ],
  outputs: [{ name: "", type: "bool" }],
}] as const;

export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.ethereum as { isMiniPay?: boolean } | undefined)?.isMiniPay;
}

export async function detectMiniPay(timeoutMs = 2000): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if ((window.ethereum as { isMiniPay?: boolean } | undefined)?.isMiniPay) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

export type ConnectedWallet = {
  address: `0x${string}`;
};

let _address: `0x${string}` | null = null;

export async function connectMiniPay(): Promise<ConnectedWallet> {
  const provider = window.ethereum;
  if (!provider) throw new Error("Open inside MiniPay to continue.");

  const { chainIdHex } = CHAIN_MAP[NETWORK];

  // Ensure correct chain
  try {
    const current = (await provider.request({ method: "eth_chainId" })) as string;
    if (current.toLowerCase() !== chainIdHex.toLowerCase()) {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    }
  } catch { /* proceed */ }

  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as `0x${string}`[];

  const address = accounts[0];
  if (!address) throw new Error("No wallet address returned.");
  _address = address;
  return { address };
}

/**
 * Send cUSD directly to a recipient address via MiniPay.
 * Returns the transaction hash once submitted.
 */
export async function sendCUSD(
  recipientAddress: `0x${string}`,
  amountUsd: string
): Promise<`0x${string}`> {
  const provider = window.ethereum;
  if (!provider) throw new Error("MiniPay not found.");

  const { address } = await connectMiniPay();
  const cusdContract = CUSD[NETWORK];

  // Convert USD amount to 18-decimal wei
  const amountWei = parseUnits(amountUsd, 18);

  // Encode ERC20 transfer(recipient, amount)
  const data = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [recipientAddress, amountWei],
  });

  // Send transaction — MiniPay will show native confirmation UI
  const txHash = (await provider.request({
    method: "eth_sendTransaction",
    params: [{
      from: address,
      to: cusdContract,
      data,
      // Gas: let MiniPay estimate (Celo fees are ~0.001 CELO)
    }],
  })) as `0x${string}`;

  return txHash;
}

export function disconnectMiniPay() {
  _address = null;
}
