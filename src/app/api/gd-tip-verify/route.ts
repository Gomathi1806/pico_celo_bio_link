import { NextRequest, NextResponse } from "next/server";
import { getCreatorByHandle } from "@/app/actions/creator";
import { verifyPayment } from "@/lib/payment";
import { getDb } from "@/db";
import { gdTips } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatUnits } from "viem";
import type { CeloNetwork } from "@/lib/tokens";

const GD_TOKEN_ADDRESS = "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A" as `0x${string}`;
const GD_DECIMALS = 18;
const NETWORK: CeloNetwork = "celo";

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export async function POST(req: NextRequest) {
  let txHash: `0x${string}`;
  let creatorHandle: string;
  try {
    const body = await req.json();
    txHash = body.txHash;
    creatorHandle = body.creatorHandle;
    if (!txHash || !creatorHandle) throw new Error("missing fields");
  } catch {
    return NextResponse.json({ error: "txHash and creatorHandle required" }, { status: 400 });
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return NextResponse.json({ error: "Invalid transaction hash" }, { status: 400 });
  }

  const creator = await getCreatorByHandle(creatorHandle);
  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  // Verify a real G$ transfer to the creator on-chain
  const result = await verifyPayment({
    txHash,
    recipientAddress: creator.walletAddress as `0x${string}`,
    requiredUsd: 0.000001,
    network: NETWORK,
    tokenAddress: GD_TOKEN_ADDRESS,
    tokenDecimals: GD_DECIMALS,
  });

  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 402 });
  }

  // Extract actual amount from on-chain Transfer log
  const { createPublicClient, http } = await import("viem");
  const { celo: celoChain } = await import("viem/chains");
  const client = createPublicClient({ chain: celoChain, transport: http("https://forno.celo.org") });
  const receipt = await client.getTransactionReceipt({ hash: txHash });

  let amount = "0";
  for (const log of receipt.logs) {
    if (
      log.address.toLowerCase() === GD_TOKEN_ADDRESS.toLowerCase() &&
      log.topics[0] === TRANSFER_TOPIC &&
      log.topics.length >= 3
    ) {
      amount = formatUnits(BigInt(log.data), GD_DECIMALS);
      break;
    }
  }

  // Record tip, deduped by txHash
  const db = getDb();
  const exists = await db.query.gdTips.findFirst({ where: eq(gdTips.txHash, txHash) });
  if (!exists) {
    await db.insert(gdTips).values({
      senderAddress: result.payer.toLowerCase(),
      creatorId: creator.id,
      amount,
      txHash,
    });
  }

  return NextResponse.json({ success: true, amount, payer: result.payer });
}
