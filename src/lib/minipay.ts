"use client";

import { createThirdwebClient } from "thirdweb";
import { createWalletAdapter } from "thirdweb/wallets";
import { wrapFetchWithPayment } from "thirdweb/x402";

export type CeloNetwork = "celo" | "celo-alfajores";

export const NETWORK: CeloNetwork =
  (process.env.NEXT_PUBLIC_CELO_NETWORK as CeloNetwork) ?? "celo-alfajores";

const CHAIN_MAP = {
  celo: { chainId: 42220, chainIdHex: "0xA4EC" as const },
  "celo-alfajores": { chainId: 44787, chainIdHex: "0xAEF3" as const },
} as const;

export const CUSD = {
  celo: "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`,
  "celo-alfajores": "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1" as `0x${string}`,
} as const;

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

function getThirdwebClient() {
  return createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ?? "",
  });
}

export type ConnectedWallet = {
  address: `0x${string}`;
  fetchWithPay: ReturnType<typeof wrapFetchWithPayment>;
};

let _cached: ConnectedWallet | null = null;

export async function connectMiniPay(): Promise<ConnectedWallet> {
  if (_cached) return _cached;

  const provider = window.ethereum;
  if (!provider) throw new Error("Open inside MiniPay to pay.");

  const { chainIdHex, chainId } = CHAIN_MAP[NETWORK];

  try {
    const current = (await provider.request({ method: "eth_chainId" })) as string;
    if (current.toLowerCase() !== chainIdHex.toLowerCase()) {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    }
  } catch { /* proceed — tx will fail if wrong chain */ }

  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as `0x${string}`[];
  const address = accounts[0];
  if (!address) throw new Error("No wallet address returned.");

  const adaptedAccount = {
    address,
    async sendTransaction(tx: { to?: string | null; value?: bigint; data?: string }) {
      const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: address, to: tx.to ?? undefined, value: tx.value ? `0x${tx.value.toString(16)}` : undefined, data: tx.data }],
      }) as `0x${string}`;
      return { transactionHash: hash };
    },
    async signMessage({ message }: { message: string | { raw: `0x${string}` } }) {
      const msg = typeof message === "string" ? message : message.raw;
      return provider.request({ method: "personal_sign", params: [msg, address] }) as Promise<`0x${string}`>;
    },
    async signTypedData(typedData: { domain: Record<string, unknown>; types: Record<string, unknown>; primaryType: string; message: Record<string, unknown> }) {
      return provider.request({
        method: "eth_signTypedData_v4",
        params: [address, JSON.stringify(typedData)],
      }) as Promise<`0x${string}`>;
    },
  };

  const client = getThirdwebClient();
  const wallet = createWalletAdapter({
    client,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adaptedAccount: adaptedAccount as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chain: { id: chainId } as any,
    onDisconnect: () => { _cached = null; },
    switchChain: async () => {},
  });

  const fetchWithPay = wrapFetchWithPayment(fetch, client, wallet);
  _cached = { address, fetchWithPay };
  return _cached;
}

export function disconnectMiniPay() {
  _cached = null;
}
