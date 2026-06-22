# 🍵 Pico — Creator Payments on Celo MiniPay

> Get paid by your fans. No bank. No Stripe. Payments go straight to your MiniPay wallet.

Pico is a **"Buy Me a Tea"** style creator monetization platform built natively for [Celo MiniPay](https://www.opera.com/products/minipay) — the stablecoin wallet with 16M+ users across Africa, Latin America, and Southeast Asia.

Creators generate a shareable payment link in seconds. Fans open the link, tap once, and pay in USDC or Celo stablecoins. The creator receives 99% directly to their wallet — on-chain, instantly, with no intermediary.

**Live:** [pico-celo-bio-link.vercel.app](https://pico-celo-bio-link.vercel.app)

---

## How It Works

```
Creator opens Pico in MiniPay
  → Sets name, purpose, and price
  → Gets a shareable link: pico.app/c/<id>

Fan opens the link
  → Sees the creator's page
  → Taps Pay → confirms in MiniPay
  → 99% goes to creator's wallet on-chain
  → Platform takes 1% (best-effort second tx)
```

---

## Features

- **One-tap payment** — fans pay in a single MiniPay confirmation
- **Direct to wallet** — payments route straight to the creator's address, not a platform escrow
- **Multi-stablecoin** — USDC (default), USDm (cUSD), EURm (cEUR), BRLm (cREAL)
- **On-chain verification** — every payment verified against Celo RPC before content is unlocked
- **Link-in-bio style** — creators share one link; fans see all their support items
- **Content gating** — PDFs, guides, Calendly links, and more revealed only after payment
- **Browser testable** — works with MetaMask on Celo network, not just MiniPay
- **1% platform fee** — best-effort second transaction; never blocks the fan experience

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Blockchain | Celo (OP Stack L2) |
| Wallet | MiniPay + any EVM wallet |
| Payments | Direct ERC-20 transfer via `eth_sendTransaction` |
| Verification | On-chain via viem + Celo RPC |
| Database | Neon PostgreSQL + Drizzle ORM |
| Hosting | Vercel |
| Tests | Vitest (52 tests) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database
- A Celo wallet address (for the operator fee receiver)

### Setup

```bash
git clone https://github.com/Gomathi1806/pico_celo_bio_link.git
cd pico_celo_bio_link
npm install
```

Copy the environment template and fill in your values:

```bash
cp env.template .env.local
```

```env
# Database
DATABASE_URL=postgresql://...

# Celo network: "celo" for mainnet, "celo-alfajores" for testnet
NEXT_PUBLIC_CELO_NETWORK=celo

# Your wallet address to receive the 1% platform fee
NEXT_PUBLIC_OPERATOR_ADDRESS=0x...

# App URL (used for share links)
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### Database

```bash
npx drizzle-kit push
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser with MetaMask connected to Celo mainnet, or open it inside MiniPay.

### Tests

```bash
npm test               # run all 52 tests
npm run test:coverage  # with coverage report
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page — creator onboarding
│   ├── c/[id]/page.tsx       # Fan payment page
│   ├── dashboard/            # Creator dashboard
│   ├── [handle]/page.tsx     # Public creator profile
│   └── api/
│       ├── verify/[id]/      # On-chain payment verification
│       ├── content/[id]/     # Legacy x402 content gate
│       └── health/           # Health check endpoint
├── lib/
│   ├── minipay.ts            # Wallet connection + ERC-20 transfer
│   ├── tokens.ts             # Token config (addresses, decimals) — shared server/client
│   └── payment.ts            # On-chain verification via viem
└── db/
    └── schema.ts             # Drizzle schema (creators, links, purchases)
```

---

## Payment Flow (Technical)

1. Fan opens `/c/<id>` — creator wallet address is fetched from DB
2. Fan clicks Pay — `eth_sendTransaction` sends ERC-20 transfer directly to creator (99%)
3. A second `eth_sendTransaction` sends the 1% fee to the operator (best-effort)
4. App POSTs to `/api/verify/<id>` with the transaction hash
5. Server reads ERC-20 Transfer logs from Celo RPC via viem
6. Verifies: correct token, correct recipient, correct amount (≥ 99% of price)
7. Returns content URL or thank-you message on success

---

## Supported Tokens

| Token | Symbol | Network | Decimals |
|---|---|---|---|
| USDC | `USDC` | Celo Mainnet | 6 |
| USDm (cUSD) | `cUSD` | Celo Mainnet | 18 |
| EURm (cEUR) | `cEUR` | Celo Mainnet | 18 |
| BRLm (cREAL) | `cREAL` | Celo Mainnet | 18 |

USDC is the default settlement token. Fans can switch tokens at payment time.

---

## Deployment

Deploy to Vercel in one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Gomathi1806/pico_celo_bio_link)

Set the environment variables in Vercel dashboard, then push the schema:

```bash
DATABASE_URL="<your-vercel-neon-url>" npx drizzle-kit push
```

---

## Testing Without MiniPay

Pico works in any browser with a web3 wallet:

1. Install [MetaMask](https://metamask.io)
2. Add Celo Mainnet (Chain ID: 42220, RPC: `https://forno.celo.org`)
3. Open the app — MetaMask will be detected automatically
4. Connect wallet and use all features as a creator or fan

---

## Built With

- [Celo](https://celo.org) — EVM L2 optimized for stablecoin payments
- [MiniPay](https://www.opera.com/products/minipay) — 16M+ wallet users in 66+ countries
- [viem](https://viem.sh) — TypeScript EVM library for on-chain reads
- [Drizzle ORM](https://orm.drizzle.team) — type-safe database access
- [Neon](https://neon.tech) — serverless PostgreSQL

---

## License

MIT
