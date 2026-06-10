import { NextRequest, NextResponse } from "next/server";
import { getLinkWithCreator } from "@/app/actions/creator";
import { verifyPayment } from "@/lib/payment";
import { TOKENS, DEFAULT_TOKEN, type CeloNetwork, type TokenSymbol } from "@/lib/minipay";

const NETWORK = (process.env.NEXT_PUBLIC_CELO_NETWORK ?? "celo-alfajores") as CeloNetwork;
const PLATFORM_FEE = 0.01; // 1%

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  let txHash: `0x${string}`;
  let token: TokenSymbol;
  try {
    const body = await req.json();
    txHash = body.txHash;
    token = (body.token as TokenSymbol) ?? DEFAULT_TOKEN;
    if (!txHash) throw new Error("missing txHash");
  } catch {
    return NextResponse.json({ error: "txHash required" }, { status: 400 });
  }

  // Validate txHash is a well-formed 0x-prefixed 32-byte hex hash
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return NextResponse.json({ error: "Invalid transaction hash format." }, { status: 400 });
  }
  // Validate token is one we support
  if (!(token in TOKENS)) {
    return NextResponse.json({ error: `Unsupported token: ${token}` }, { status: 400 });
  }

  const found = await getLinkWithCreator(id);
  if (!found) return NextResponse.json({ error: "Content not found" }, { status: 404 });

  const { link, creatorWallet } = found;

  // Creator receives 99% — verify that amount hit their wallet
  const creatorAmount = parseFloat(link.price) * (1 - PLATFORM_FEE);
  const tokenMeta = TOKENS[token];

  if (!tokenMeta) {
    return NextResponse.json({ error: `Unsupported token: ${token}` }, { status: 400 });
  }

  const tokenAddress = tokenMeta.address[NETWORK];

  console.log(`[verify/${id}] tx ${txHash} | token ${token} | creator ${creatorWallet} | expected ${creatorAmount}`);

  let result = await verifyPayment({
    txHash,
    recipientAddress: creatorWallet,
    requiredUsd: creatorAmount,
    network: NETWORK,
    tokenAddress,
    tokenDecimals: tokenMeta.decimals,
  });

  // Retry once after 5s if block not yet mined (~5s on Celo)
  if (!result.valid && result.reason.includes("not found")) {
    await new Promise((r) => setTimeout(r, 5000));
    result = await verifyPayment({
      txHash,
      recipientAddress: creatorWallet,
      requiredUsd: creatorAmount,
      network: NETWORK,
      tokenAddress,
      tokenDecimals: tokenMeta.decimals,
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
