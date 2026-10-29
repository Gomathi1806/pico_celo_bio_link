"use client";

import { createPublicClient, createWalletClient, custom, http, formatUnits } from "viem";
import { celo } from "viem/chains";
import { IdentitySDK, ClaimSDK, chainConfigs, SupportedChains, type ClaimEntitlementResult } from "@goodsdks/citizen-sdk";

const CELO_CHAIN_ID = SupportedChains.CELO;
const GD_ENV = "production" as const;

export const GD_TOKEN_ADDRESS = chainConfigs[CELO_CHAIN_ID].contracts.production!.g$Contract;
export const GD_DECIMALS = 2; // G$ uses 2 decimals on Celo

export type ClaimStatus =
  | { status: "loading" }
  | { status: "not_connected" }
  | { status: "not_whitelisted" }
  | { status: "can_claim"; amount: string }
  | { status: "already_claimed"; nextClaimTime: Date }
  | { status: "claiming" }
  | { status: "claimed"; amount: string; txHash: string }
  | { status: "error"; message: string };

function getPublicClient() {
  return createPublicClient({
    chain: celo,
    transport: http("https://forno.celo.org"),
  });
}

function getWalletClient(account: `0x${string}`) {
  const provider = window.ethereum;
  if (!provider) throw new Error("No wallet found");
  return createWalletClient({
    account,
    chain: celo,
    transport: custom(provider),
  });
}

export async function checkGDEntitlement(account: `0x${string}`): Promise<ClaimStatus> {
  try {
    const publicClient = getPublicClient();
    const walletClient = getWalletClient(account);

    const identitySDK = new IdentitySDK({
      account,
      publicClient: publicClient as any,
      walletClient: walletClient as any,
      env: GD_ENV,
    });

    const claimSDK = new ClaimSDK({
      account,
      publicClient: publicClient as any,
      walletClient: walletClient as any,
      identitySDK,
      env: GD_ENV,
    });

    const walletStatus = await claimSDK.getWalletClaimStatus();

    if (walletStatus.status === "not_whitelisted") {
      return { status: "not_whitelisted" };
    }

    if (walletStatus.status === "already_claimed") {
      const nextTime = await claimSDK.nextClaimTime();
      return {
        status: "already_claimed",
        nextClaimTime: new Date(Number(nextTime) * 1000),
      };
    }

    const entitlement: ClaimEntitlementResult = await claimSDK.checkEntitlement();
    const amount = formatUnits(entitlement.amount, GD_DECIMALS);

    if (entitlement.amount === BigInt(0)) {
      const nextTime = await claimSDK.nextClaimTime();
      return {
        status: "already_claimed",
        nextClaimTime: new Date(Number(nextTime) * 1000),
      };
    }

    return { status: "can_claim", amount };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to check entitlement";
    return { status: "error", message: msg };
  }
}

export async function claimGD(account: `0x${string}`): Promise<{
  success: boolean;
  amount?: string;
  txHash?: string;
  error?: string;
}> {
  try {
    const publicClient = getPublicClient();
    const walletClient = getWalletClient(account);

    const identitySDK = new IdentitySDK({
      account,
      publicClient: publicClient as any,
      walletClient: walletClient as any,
      env: GD_ENV,
    });

    const claimSDK = new ClaimSDK({
      account,
      publicClient: publicClient as any,
      walletClient: walletClient as any,
      identitySDK,
      env: GD_ENV,
    });

    const receipt = await claimSDK.claim();
    const entitlement = await claimSDK.checkEntitlement();
    const amount = formatUnits(entitlement.amount, GD_DECIMALS);

    return {
      success: true,
      amount,
      txHash: receipt.transactionHash,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Claim failed";
    return { success: false, error: msg };
  }
}

export async function sendGD(
  from: `0x${string}`,
  to: `0x${string}`,
  amount: string
): Promise<`0x${string}`> {
  const provider = window.ethereum;
  if (!provider) throw new Error("Wallet not found");

  const { encodeFunctionData, parseUnits } = await import("viem");

  const data = encodeFunctionData({
    abi: [
      {
        name: "transfer",
        type: "function",
        inputs: [
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
      },
    ] as const,
    functionName: "transfer",
    args: [to, parseUnits(amount, GD_DECIMALS)],
  });

  return (await provider.request({
    method: "eth_sendTransaction",
    params: [{ from, to: GD_TOKEN_ADDRESS, data }],
  })) as `0x${string}`;
}
