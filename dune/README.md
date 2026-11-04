# Pico Dune Dashboard Queries

Dune SQL queries for tracking Pico metrics on Celo.
Dashboard URL (once created): https://dune.com/YOUR_HANDLE/pico-celo

## Token addresses (Celo mainnet)

| Token | Address |
|-------|---------|
| USDC  | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` |
| cUSD  | `0x765DE816845861e75A25fCA122bb6898B8B1282a` |
| cEUR  | `0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73` |
| cREAL | `0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787` |
| G$    | `0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A` |

## Setup

1. Go to https://dune.com and sign in
2. Create a new dashboard named "Pico — Celo Creator Payments"
3. For each `.sql` file here, create a new query, paste the SQL, save & add to dashboard
4. Replace `{{creator_wallets}}` parameters with actual creator wallet addresses from your DB (or use the Dune parameter feature)

## Queries

1. **daily_volume.sql** — Daily payment volume by token
2. **gd_claims_and_tips.sql** — G$ UBI claims and tips to creators
3. **unique_supporters.sql** — Unique supporters over time
4. **top_creators.sql** — Top creators by payment volume
5. **token_breakdown.sql** — Payment breakdown by token type
