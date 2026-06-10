import { describe, it, expect } from 'vitest';
import { TOKENS, ALL_TOKENS, DEFAULT_TOKEN, type TokenSymbol } from '../minipay';

describe('TOKENS config', () => {
  it('has all 4 tokens', () => {
    expect(ALL_TOKENS).toEqual(['USDC', 'cUSD', 'cEUR', 'cREAL']);
  });

  it('default token is USDC', () => {
    expect(DEFAULT_TOKEN).toBe('USDC');
  });

  it('USDC has 6 decimals', () => {
    expect(TOKENS.USDC.decimals).toBe(6);
  });

  it('cUSD/cEUR/cREAL have 18 decimals', () => {
    expect(TOKENS.cUSD.decimals).toBe(18);
    expect(TOKENS.cEUR.decimals).toBe(18);
    expect(TOKENS.cREAL.decimals).toBe(18);
  });

  it('every token has mainnet and testnet addresses', () => {
    for (const symbol of ALL_TOKENS) {
      const t = TOKENS[symbol as TokenSymbol];
      expect(t.address.celo).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(t.address['celo-alfajores']).toMatch(/^0x[0-9a-fA-F]{40}$/);
    }
  });

  it('mainnet and testnet addresses differ for each token', () => {
    for (const symbol of ALL_TOKENS) {
      const t = TOKENS[symbol as TokenSymbol];
      expect(t.address.celo.toLowerCase()).not.toBe(t.address['celo-alfajores'].toLowerCase());
    }
  });

  it('no two tokens share the same mainnet address', () => {
    const mainnetAddrs = ALL_TOKENS.map(s => TOKENS[s as TokenSymbol].address.celo.toLowerCase());
    const unique = new Set(mainnetAddrs);
    expect(unique.size).toBe(ALL_TOKENS.length);
  });
});
