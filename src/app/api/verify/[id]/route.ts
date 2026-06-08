import { NextRequest, NextResponse } from "next/server";
import { getLinkWithCreator } from "@/app/actions/creator";
import { verifyPayment } from "@/lib/payment";
import type { CeloNetwork } from "@/lib/minipay";

const NETWORK = (process.env.NEXT_PUBLIC_CELO_NETWORK ?? "celo-alfajores") as CeloNetwork;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  let txHash: `0x${string}`;
  try {
    const body = await req.json();
    txHash = body.txHash;
    if (!txHash) throw new Error("missing txHash");
  } catch {
    return NextResponse.json({ error: "txHash required" }, { status: 400 });
  }

  // Look up link + creator wallet from DB
  const found = await getLinkWithCreator(id);
  if (!found) return NextResponse.json({ error: "Content not found" }, { status: 404 });

  const { link, creatorWallet } = found;

  console.log(`[verify/${id}] checking tx ${txHash} → creator ${creatorWallet} for $${link.price} cUSD`);

  // Wait up to 30s for the tx to confirm on Celo (blocks ~5s)
  let result = await verifyPayment({
    txHash,
    recipientAddress: creatorWallet,
    requiredUsd: parseFloat(link.price),
    network: NETWORK,
  });

  // Retry once after 5s if tx not yet mined
  if (!result.valid && result.reason.includes("not found")) {
    await new Promise((r) => setTimeout(r, 5000));
    result = await verifyPayment({
      txHash,
      recipientAddress: creatorWallet,
      requiredUsd: parseFloat(link.price),
      network: NETWORK,
    });
  }

  if (!result.valid) {
    console.warn(`[verify/${id}] invalid: ${result.reason}`);
    return NextResponse.json({ error: result.reason }, { status: 402 });
  }

  console.log(`[verify/${id}] ✓ verified — payer: ${result.payer}`);

  return NextResponse.json({
    success: true,
    contentUrl: link.contentUrl ?? null,
    thankYouMessage: link.thankYouMessage ?? null,
    txHash,
    payer: result.payer,
  });
}
