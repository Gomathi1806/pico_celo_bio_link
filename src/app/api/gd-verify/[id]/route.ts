import { NextRequest, NextResponse } from "next/server";
import { getLinkWithCreatorFull, recordGdUnlock } from "@/app/actions/creator";
import { verifyPayment } from "@/lib/payment";
import type { CeloNetwork } from "@/lib/tokens";

const GD_TOKEN_ADDRESS = "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A" as `0x${string}`;
const GD_DECIMALS = 18;
const NETWORK: CeloNetwork = "celo";

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

  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return NextResponse.json({ error: "Invalid transaction hash format." }, { status: 400 });
  }

  const found = await getLinkWithCreatorFull(id);
  if (!found) return NextResponse.json({ error: "Content not found" }, { status: 404 });

  const { link, creatorWallet } = found;

  if (link.type !== "gd_gate") {
    return NextResponse.json({ error: "This link is not G$-gated" }, { status: 400 });
  }

  // Verify a real G$ transfer to the creator on-chain
  // requiredUsd > 0 ensures a zero-value transfer won't pass
  const result = await verifyPayment({
    txHash,
    recipientAddress: creatorWallet,
    requiredUsd: 0.000001,
    network: NETWORK,
    tokenAddress: GD_TOKEN_ADDRESS,
    tokenDecimals: GD_DECIMALS,
  });

  // Retry once if tx not found yet
  let verifyResult = result;
  if (!verifyResult.valid && verifyResult.reason.includes("not found")) {
    await new Promise((r) => setTimeout(r, 5000));
    verifyResult = await verifyPayment({
      txHash,
      recipientAddress: creatorWallet,
      requiredUsd: 0.000001,
      network: NETWORK,
      tokenAddress: GD_TOKEN_ADDRESS,
      tokenDecimals: GD_DECIMALS,
    });
  }

  if (!verifyResult.valid) {
    return NextResponse.json({ error: verifyResult.reason }, { status: 402 });
  }

  // Record the unlock server-side, deduped by txHash
  await recordGdUnlock({
    linkId: id,
    buyerAddress: verifyResult.payer,
    txHash,
  });

  return NextResponse.json({
    success: true,
    contentUrl: link.contentUrl ?? null,
    thankYouMessage: link.thankYouMessage ?? null,
    txHash,
    payer: verifyResult.payer,
  });
}
