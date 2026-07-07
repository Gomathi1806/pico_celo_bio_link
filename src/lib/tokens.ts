// Shared token config — no "use client" so this is safe to import on server and client

export type CeloNetwork = "celo" | "celo-alfajores";
export type TokenSymbol = "USDC" | "cUSD" | "cEUR" | "cREAL";

export const TOKENS: Record<TokenSymbol, {
  address: Record<CeloNetwork, `0x${string}`>;
  decimals: number;
  label: string;
  symbol: string;
}> = {
  USDC: {
    address: {
      celo:             "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
      "celo-alfajores": "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B",
    },
    decimals: 6,
    label: "USDC",
    symbol: "$",
  },
  cUSD: {
    address: {
      celo:             "0x765DE816845861e75A25fCA122bb6898B8B1282a",
      "celo-alfajores": "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
    },
    decimals: 18,
    label: "USDm",
    symbol: "$",
  },
  cEUR: {
    address: {
      celo:             "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
      "celo-alfajores": "0x10c892A6EC43a53E45D0B916B4b7D383B1b78d0F",
    },
    decimals: 18,
    label: "EURm",
    symbol: "€",
  },
  cREAL: {
    address: {
      celo:             "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787",
      "celo-alfajores": "0xE4D517785D091D3c54818832dB6094bcc2744545",
    },
    decimals: 18,
    label: "BRLm",
    symbol: "R$",
  },
};

// MiniPay only supports USDC, USDT, and USDm — cEUR/cREAL shown in browser only
export const ALL_TOKENS: TokenSymbol[] = ["USDC", "cUSD", "cEUR", "cREAL"];
export const MINIPAY_TOKENS: TokenSymbol[] = ["USDC", "cUSD"];
export const DEFAULT_TOKEN: TokenSymbol = "USDC";

export const CUSD = {
  celo:             TOKENS.cUSD.address.celo,
  "celo-alfajores": TOKENS.cUSD.address["celo-alfajores"],
} as const;
