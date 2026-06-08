import { createPublicClient, http, parseUnits, type Hash } from "viem";
import { celo, celoAlfajores } from "viem/chains";
import type { CeloNetwork } from "./minipay";

export const CUSD_ADDRESS = {
  celo: "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`,
  "celo-alfajores": "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1" as `0x${string}`,
} as const;

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as `0x${string}`;

function getClient(network: CeloNetwork) {
  return createPublicClient({
    chain: network === "celo" ? celo : celoAlfajores,
    transport: http(),
  });
}

export type PaymentResult =
  | { valid: true; payer: `0x${string}` }
  | { valid: false; reason: string };

export async function verifyPayment({
  txHash,
  recipientAddress,
  requiredUsd,
  network,
}: {
  txHash: Hash;
  recipientAddress: `0x${string}`;
  requiredUsd: number;
  network: CeloNetwork;
}): Promise<PaymentResult> {
  const client = getClient(network);
  const cusd = CUSD_ADDRESS[network];
  const required = parseUnits(requiredUsd.toFixed(6), 18);

  let receipt: Awaited<ReturnType<typeof client.getTransactionReceipt>>;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash });
  } catch {
    return { valid: false, reason: "Transaction not found on Celo." };
  }

  if (receipt.status !== "success") {
    return { valid: false, reason: "Transaction reverted." };
  }

  for (const log of receipt.logs) {
    if (
      log.address.toLowerCase() !== cusd.toLowerCase() ||
      log.topics[0] !== TRANSFER_TOPIC ||
      log.topics.length < 3
    ) continue;

    const toAddr = ("0x" + log.topics[2]!.slice(26).toLowerCase()) as `0x${string}`;
    if (toAddr !== recipientAddress.toLowerCase()) continue;

    const amount = BigInt(log.data);
    if (amount >= required) {
      const payer = ("0x" + log.topics[1]!.slice(26)) as `0x${string}`;
      return { valid: true, payer };
    }
    return { valid: false, reason: `Underpayment: got ${amount}, need ${required}.` };
  }

  return { valid: false, reason: "No cUSD transfer to recipient found." };
}
