import { NextRequest, NextResponse } from 'next/server';
import { getLinkById } from '@/app/actions/creator';
import { verifyPayment } from '@/lib/payment';
import type { CeloNetwork } from '@/lib/minipay';

const OPERATOR = (process.env.NEXT_PUBLIC_OPERATOR_ADDRESS ?? '') as `0x${string}`;
const NETWORK = (process.env.NEXT_PUBLIC_CELO_NETWORK ?? 'celo-alfajores') as CeloNetwork;

const CUSD = {
  celo: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  'celo-alfajores': '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1',
};

// x402 payment requirements object — returned in 402 responses
function paymentRequired(price: string, linkId: string) {
  return {
    version: '0.2',
    accepts: [
      {
        scheme: 'exact',
        network: NETWORK === 'celo' ? 'eip155:42220' : 'eip155:44787',
        maxAmountRequired: String(Math.round(parseFloat(price) * 1e18)),
        resource: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/content/${linkId}`,
        description: 'USDm payment via Celo MiniPay',
        mimeType: 'application/json',
        payTo: OPERATOR,
        maxTimeoutSeconds: 300,
        asset: CUSD[NETWORK],
        extra: { name: 'USDm', version: '1' },
      },
    ],
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const start = Date.now();

  console.log(`[content/${id}] GET from ${req.headers.get('x-forwarded-for') ?? 'unknown'}`);

  const link = await getLinkById(id);
  if (!link) {
    console.warn(`[content/${id}] Not found`);
    return NextResponse.json({ error: 'Content not found.' }, { status: 404 });
  }

  // Check for x402 payment proof header
  const paymentHeader = req.headers.get('x-payment');
  if (!paymentHeader) {
    console.log(`[content/${id}] No payment header — returning 402`);
    return NextResponse.json(paymentRequired(link.price, id), {
      status: 402,
      headers: { 'x-payment-required': 'true' },
    });
  }

  // Decode the payment proof (base64 JSON from thirdweb client)
  let txHash: `0x${string}`;
  let buyerAddress: `0x${string}`;
  try {
    const proof = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));
    txHash = proof.payload?.authorization?.value ?? proof.txHash ?? proof.transaction?.transactionHash;
    buyerAddress = proof.payload?.authorization?.from ?? req.headers.get('x-buyer') ?? '0x';
    if (!txHash) throw new Error('Missing txHash in payment proof');
  } catch (err) {
    console.warn(`[content/${id}] Invalid payment header:`, err);
    return NextResponse.json({ error: 'Invalid payment proof.' }, { status: 400 });
  }

  // Verify on-chain (legacy x402 route uses cUSD)
  const cusdAddress = CUSD[NETWORK] as `0x${string}`;
  const result = await verifyPayment({
    txHash,
    recipientAddress: OPERATOR,
    requiredUsd: parseFloat(link.price),
    network: NETWORK,
    tokenAddress: cusdAddress,
    tokenDecimals: 18,
  });

  if (!result.valid) {
    console.warn(`[content/${id}] Payment invalid: ${result.reason}`);
    return NextResponse.json({ error: result.reason }, { status: 402 });
  }

  console.log(`[content/${id}] Payment verified in ${Date.now() - start}ms — payer: ${result.payer}`);

  return NextResponse.json(
    { contentUrl: link.contentUrl, title: link.title, txHash },
    {
      headers: {
        'x-payment-tx': txHash,
        'x-payment-response': 'true',
      },
    }
  );
}
