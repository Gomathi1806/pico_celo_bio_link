import { describe, it, expect } from 'vitest';

const PLATFORM_FEE = 0.01;

function creatorAmount(price: number): string {
  return (price * (1 - PLATFORM_FEE)).toFixed(6);
}

function platformAmount(price: number): string {
  return (price * PLATFORM_FEE).toFixed(6);
}

function totalAmount(price: number): number {
  return parseFloat(creatorAmount(price)) + parseFloat(platformAmount(price));
}

describe('1% platform fee math', () => {
  it('creator gets 99% of $1', () => {
    expect(creatorAmount(1)).toBe('0.990000');
  });

  it('platform gets 1% of $1', () => {
    expect(platformAmount(1)).toBe('0.010000');
  });

  it('creator + platform = original price for common amounts', () => {
    for (const price of [1, 2, 5, 10, 0.5, 100]) {
      expect(totalAmount(price)).toBeCloseTo(price, 5);
    }
  });

  it('creator gets 99% of $2', () => {
    expect(parseFloat(creatorAmount(2))).toBeCloseTo(1.98, 6);
  });

  it('creator gets 99% of $10', () => {
    expect(parseFloat(creatorAmount(10))).toBeCloseTo(9.9, 6);
  });

  it('platform gets 1% of $100', () => {
    expect(parseFloat(platformAmount(100))).toBeCloseTo(1.0, 6);
  });

  it('creator never gets more than price', () => {
    for (const price of [0.01, 0.1, 1, 5, 10, 1000]) {
      expect(parseFloat(creatorAmount(price))).toBeLessThan(price);
    }
  });

  it('platform fee is never zero for positive prices', () => {
    for (const price of [0.01, 0.1, 1, 5, 10]) {
      expect(parseFloat(platformAmount(price))).toBeGreaterThan(0);
    }
  });
});

describe('price validation', () => {
  function isValidPrice(price: string): boolean {
    const n = parseFloat(price);
    return isFinite(n) && n > 0 && n <= 10000;
  }

  it('accepts valid prices', () => {
    expect(isValidPrice('1')).toBe(true);
    expect(isValidPrice('0.01')).toBe(true);
    expect(isValidPrice('10000')).toBe(true);
    expect(isValidPrice('2.50')).toBe(true);
  });

  it('rejects zero', () => {
    expect(isValidPrice('0')).toBe(false);
  });

  it('rejects negative', () => {
    expect(isValidPrice('-5')).toBe(false);
  });

  it('rejects NaN', () => {
    expect(isValidPrice('abc')).toBe(false);
    expect(isValidPrice('NaN')).toBe(false);
  });

  it('rejects above max', () => {
    expect(isValidPrice('10001')).toBe(false);
    expect(isValidPrice('999999')).toBe(false);
  });
});

describe('wallet address validation', () => {
  function isValidWallet(addr: string): boolean {
    return /^0x[0-9a-fA-F]{40}$/.test(addr);
  }

  it('accepts valid checksummed address', () => {
    expect(isValidWallet('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe(true);
  });

  it('accepts valid lowercase address', () => {
    expect(isValidWallet('0x' + 'a'.repeat(40))).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidWallet('')).toBe(false);
  });

  it('rejects address without 0x prefix', () => {
    expect(isValidWallet('d8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe(false);
  });

  it('rejects address that is too short', () => {
    expect(isValidWallet('0x' + 'a'.repeat(39))).toBe(false);
  });

  it('rejects address with invalid characters', () => {
    expect(isValidWallet('0x' + 'g'.repeat(40))).toBe(false);
  });
});

describe('txHash validation', () => {
  function isValidTxHash(hash: string): boolean {
    return /^0x[0-9a-fA-F]{64}$/.test(hash);
  }

  it('accepts valid 32-byte hex hash', () => {
    expect(isValidTxHash('0x' + 'a'.repeat(64))).toBe(true);
    expect(isValidTxHash('0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3')).toBe(true);
  });

  it('rejects too short', () => {
    expect(isValidTxHash('0x' + 'a'.repeat(63))).toBe(false);
  });

  it('rejects too long', () => {
    expect(isValidTxHash('0x' + 'a'.repeat(65))).toBe(false);
  });

  it('rejects missing 0x prefix', () => {
    expect(isValidTxHash('a'.repeat(64))).toBe(false);
  });

  it('rejects arbitrary strings', () => {
    expect(isValidTxHash('not-a-hash')).toBe(false);
    expect(isValidTxHash('')).toBe(false);
  });
});
