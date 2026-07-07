'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { detectWallet, connectMiniPay, sendToken, TOKENS, ALL_TOKENS, DEFAULT_TOKEN, type TokenSymbol, isMiniPay } from '@/lib/minipay';
import { MINIPAY_TOKENS } from '@/lib/tokens';
import { getLinkWithCreator, hasPurchased, recordPurchase } from '@/app/actions/creator';
import type { PicoLink } from '@/db/schema';

const TYPE_EMOJI: Record<string, string> = {
  tip: '🍵', coffee: '🍵', pdf: '📄', guide: '📘',
  call: '🎯', audio: '🎙️', video: '🎬', other: '🎁',
};

const OPERATOR = process.env.NEXT_PUBLIC_OPERATOR_ADDRESS as `0x${string}` | undefined;
const PLATFORM_FEE = 0.01; // 1%

type UIState = 'loading' | 'no-minipay' | 'idle' | 'sending' | 'verifying' | 'unlocked' | 'already-owned';

export default function SupportPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);

  const [link, setLink]               = useState<PicoLink | null>(null);
  const [creatorWallet, setCreatorWallet] = useState<`0x${string}` | ''>('');
  const [state, setState]             = useState<UIState>('loading');
  const [contentUrl, setContentUrl]   = useState('');
  const [thankYou, setThankYou]       = useState('');
  const [errorMsg, setErrorMsg]       = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>(DEFAULT_TOKEN);

  useEffect(() => {
    async function init() {
      const result = await getLinkWithCreator(id);
      if (!result) { setState('idle'); return; }
      setLink(result.link);
      setCreatorWallet(result.creatorWallet);
      // Use the creator's preferred token as default
      const preferred = (result.link.token ?? DEFAULT_TOKEN) as TokenSymbol;
      setSelectedToken(preferred);

      if (isMiniPay()) {
        try {
          const { address } = await connectMiniPay();
          const owned = await hasPurchased(id, address);
          if (owned) {
            setContentUrl(result.link.contentUrl ?? '');
            setThankYou(result.link.thankYouMessage ?? '');
            setState('already-owned');
            return;
          }
        } catch { /* proceed */ }
      } else {
        // Outside MiniPay, check if wallet is injected
        const found = await detectWallet(1000);
        if (!found) {
          setState('no-minipay');
          return;
        }
      }

      setState('idle');
    }
    init();
  }, [id]);

  const handlePay = async () => {
    if (!link || !creatorWallet) return;
    setErrorMsg('');

    try {
      setState('sending');
      // Capture address once — reuse for purchase recording (avoids account-switch race)
      const { address } = await connectMiniPay();

      const totalPrice  = parseFloat(link.price);
      const creatorAmt  = (totalPrice * (1 - PLATFORM_FEE)).toFixed(6);
      const platformAmt = (totalPrice * PLATFORM_FEE).toFixed(6);

      // Step 1 — pay creator 99%
      const txHash = await sendToken(creatorWallet as `0x${string}`, creatorAmt, selectedToken);

      // Step 2 — collect 1% platform fee (best-effort, non-blocking)
      if (OPERATOR) {
        try {
          await sendToken(OPERATOR, platformAmt, selectedToken);
        } catch { /* fee declined — don't block content unlock */ }
      }

      // Step 3 — verify on-chain
      setState('verifying');
      const res = await fetch(`/api/verify/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash, token: selectedToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Verification failed (${res.status})`);

      // Step 4 — record purchase (use address captured at payment time)
      await recordPurchase({
        linkId: id,
        buyerAddress: address,
        txHash,
        amountPaid: link.price,
      });

      setContentUrl(data.contentUrl ?? '');
      setThankYou(data.thankYouMessage ?? link.thankYouMessage ?? '');
      setState('unlocked');

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      const isLowBalance = msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('balance');
      if (isLowBalance) {
        window.location.href = 'https://link.minipay.xyz/add_cash?tokens=USDC,USDm';
        return;
      }
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('denied')) {
        setErrorMsg(msg);
      }
      setState('idle');
    }
  };

  // ── Loading ──
  if (state === 'loading') {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 0' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</p>
      </div>
    );
  }

  // ── No wallet found ──
  if (state === 'no-minipay') {
    const hasInjected = typeof window !== 'undefined' && !!window.ethereum;

    const handleConnectWallet = async () => {
      try {
        setState('loading');
        const { address } = await connectMiniPay();
        const owned = await hasPurchased(id, address);
        if (owned && link) {
          setContentUrl(link.contentUrl ?? '');
          setThankYou(link.thankYouMessage ?? '');
          setState('already-owned');
        } else {
          setState('idle');
        }
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Connection failed');
        setState('no-minipay');
      }
    };

    return (
      <div className="animate-fade" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📱</div>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>No wallet detected</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '280px', margin: '0 auto 2rem' }}>
          This page accepts stablecoin payments via Celo. Open this link inside MiniPay, or in a browser with a wallet extension (e.g. MetaMask) connected to Celo, to support this creator.
        </p>

        <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '320px', margin: '0 auto 1.5rem', textAlign: 'left' }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>Web Browser Wallet Connection</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
            To support this creator, connect your browser wallet extension (such as MetaMask) on the Celo network.
          </p>
          
          {hasInjected ? (
            <button className="btn btn-primary" onClick={handleConnectWallet} style={{ width: '100%' }}>
              🔌 Connect Wallet
            </button>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '0.85rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No web3 wallet detected. Please install MetaMask or open this URL inside the MiniPay wallet.
            </div>
          )}
        </div>

        {errorMsg && <p style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '1rem' }}>{errorMsg}</p>}
        
        <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem', display: 'block', marginTop: '1rem' }}>
          ← Back home
        </Link>
      </div>
    );
  }

  if (!link) {
    return <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--text-muted)' }}>Not found.</div>;
  }

  const emoji    = TYPE_EMOJI[link.type] ?? '🎁';
  const isTip    = !link.contentUrl;
  const isPaying = state === 'sending' || state === 'verifying';
  const tokenMeta = TOKENS[selectedToken];

  const statusLabel = () => {
    if (state === 'sending')   return '⏳ Confirm in MiniPay…';
    if (state === 'verifying') return '🔗 Confirming on Celo…';
    return `Pay ${tokenMeta.symbol}${link.price} ${selectedToken}`;
  };

  // ── Thank you / unlocked ──
  if (state === 'unlocked' || state === 'already-owned') {
    return (
      <div className="animate-fade" style={{ textAlign: 'center', paddingTop: '3rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
          {state === 'already-owned' ? '✨' : '🎉'}
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          {state === 'already-owned' ? 'You already supported!' : 'Thank you so much!'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          {thankYou || `Your support means the world!`}
        </p>

        {contentUrl && (
          <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '1rem' }}>
              🎁 Here&apos;s what you unlocked:
            </p>
            <a href={contentUrl} target="_blank" rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: 'block', textDecoration: 'none', width: '100%' }}>
              {emoji} Open {link.title}
            </a>
          </div>
        )}

        <Link href="/" className="btn btn-secondary"
          style={{ textDecoration: 'none', display: 'block', width: '100%' }}>
          ← Back to Pico
        </Link>
      </div>
    );
  }

  // ── Main payment screen ──
  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>
          ← Back
        </Link>
      </div>

      <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{emoji}</div>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          {link.title}
        </h2>
        {link.description && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {link.description}
          </p>
        )}

        {/* Price */}
        <div style={{
          display: 'inline-flex', alignItems: 'baseline', gap: '0.3rem',
          background: 'rgba(53,208,127,0.1)', border: '1px solid rgba(53,208,127,0.25)',
          borderRadius: '100px', padding: '0.5rem 1.25rem', marginBottom: '1.5rem',
        }}>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-celo)' }}>
            {tokenMeta.symbol}{link.price}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{TOKENS[selectedToken].label}</span>
        </div>

        {/* Token selector */}
        {!isPaying && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              PAY WITH
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {(isMiniPay() ? MINIPAY_TOKENS : ALL_TOKENS).map(t => (
                <button key={t} onClick={() => setSelectedToken(t)}
                  style={{
                    padding: '0.4rem 0.9rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                    background: selectedToken === t ? 'var(--accent-celo)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${selectedToken === t ? 'var(--accent-celo)' : 'var(--card-border)'}`,
                    color: selectedToken === t ? '#0a1a12' : 'white',
                  }}>
                  {TOKENS[t].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isTip ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '1.5rem' }}>
            💚 Pure support — no product attached.
          </p>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '1.5rem' }}>
            🔒 Pay to unlock · Content revealed instantly
          </p>
        )}

        {/* Pay button */}
        <button
          className="btn btn-primary"
          style={{ width: '100%', fontSize: '1rem', padding: '1rem', gap: '0.6rem' }}
          onClick={handlePay}
          disabled={isPaying}
        >
          {isPaying ? <><div className="spinner" />{statusLabel()}</> : statusLabel()}
        </button>

        {errorMsg && (
          <p style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '1rem' }}>{errorMsg}</p>
        )}

        {/* Step indicators while paying */}
        {isPaying && (
          <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: state === 'sending' ? 'white' : 'var(--accent-celo)' }}>
                {state === 'sending' ? '⏳' : '✓'} Step 1 — Approve in MiniPay
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: state === 'verifying' ? 'white' : 'var(--text-muted)' }}>
                {state === 'verifying' ? '⏳' : '○'} Step 2 — Confirm on Celo (~5s)
              </span>
            </div>
          </div>
        )}

        {/* Trust signals */}
        {!isPaying && (
          <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
              ⚡ Instant · 🔐 On-chain Celo · ~$0.001 Network fee
            </p>
            {link.salesCount > 0 && (
              <p style={{ color: 'var(--accent-celo)', fontSize: '0.68rem', fontWeight: 700 }}>
                ✓ {link.salesCount} person{link.salesCount !== 1 ? 's' : ''} already supported
              </p>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
              1% platform fee · 99% goes directly to creator
            </p>
          </div>
        )}
      </div>

      <footer style={{ marginTop: '3rem', textAlign: 'center', paddingBottom: '3rem' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.5rem' }}>
            🍵 Powered by <strong style={{ color: 'white' }}>Pico</strong> · Get your free page
          </p>
        </Link>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/terms" style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textDecoration: 'none' }}>Terms</a>
          <a href="/privacy" style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textDecoration: 'none' }}>Privacy</a>
          <a href="mailto:tgomathi1806@gmail.com" style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textDecoration: 'none' }}>Support</a>
        </div>
      </footer>
    </div>
  );
}
