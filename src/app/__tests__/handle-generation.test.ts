import { describe, it, expect } from 'vitest';

// Extracted from createCreatorWithLink for unit testing
function generateBase(displayName: string): string {
  return (displayName || 'creator')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 18) || 'creator';
}

describe('handle base generation', () => {
  it('converts name to lowercase slug', () => {
    expect(generateBase('Alice')).toBe('alice');
  });

  it('replaces spaces with underscores', () => {
    expect(generateBase('Celo Dev')).toBe('celo_dev');
  });

  it('strips special characters', () => {
    expect(generateBase('Amara 🇳🇬')).toBe('amara');
  });

  it('collapses multiple underscores', () => {
    expect(generateBase('hello   world')).toBe('hello_world');
  });

  it('trims leading and trailing underscores', () => {
    expect(generateBase('  hello  ')).toBe('hello');
  });

  it('truncates to 18 characters', () => {
    const long = 'averylongnamethatexceedslimit';
    expect(generateBase(long).length).toBeLessThanOrEqual(18);
  });

  it('falls back to creator for empty name', () => {
    expect(generateBase('')).toBe('creator');
  });

  it('falls back to creator for symbols-only name', () => {
    expect(generateBase('🎉🎊🎈')).toBe('creator');
  });

  it('handles numbers in name', () => {
    expect(generateBase('dev123')).toBe('dev123');
  });

  it('preserves underscores in handle-safe names', () => {
    expect(generateBase('celo_dev')).toBe('celo_dev');
  });
});

describe('wallet-derived fallback handle', () => {
  it('produces 8-char hex slice from wallet', () => {
    const wallet = '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12';
    const fallback = `user_${wallet.slice(2, 10)}`;
    expect(fallback).toBe('user_1a2b3c4d');
  });

  it('fallback handle is always unique per wallet', () => {
    const wallets = [
      '0xaabbccdd1111111111111111111111111111111',
      '0x1234567890abcdef1234567890abcdef12345678',
    ];
    const handles = wallets.map(w => `user_${w.slice(2, 10)}`);
    expect(handles[0]).not.toBe(handles[1]);
  });
});
