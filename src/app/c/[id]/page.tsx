'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { detectMiniPay, connectMiniPay, sendCUSD } from '@/lib/minipay';
import { getLinkById, hasPurchased, recordPurchase, getCreatorByHandle } from '@/app/actions/creator';
import type { PicoLink } from '@/db/schema';

const TYPE_EMOJI: Record<string, string> = {
  tip: '🍵', coffee: '🍵', pdf: '📄', guide: '📘',
  call: '🎯', audio: '🎙️', video: '🎬', other: '🎁',
};

const OPERATOR = process.env.NEXT_PUBLIC_OPERATOR_ADDRESS as `0x${string}`;

type UIState = 'loading' | 'no-minipay' | 'idle' | 'sending' | 'verifying' | 'unlocked' | 'already-owned';

export default function SupportPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);

  const [link, setLink]           = useState<PicoLink | null>(null);
  const [creatorHandle, setCreatorHandle] = useState('');
  const [state, setState]         = useState<UIState>('loading');
  const [contentUrl, setContentUrl] = useState('');
  const [thankYou, setThankYou]   = useState('');
  const [errorMsg, setErrorMsg]   = useState('');

  useEffect(() => {
    async function init() {
      const found = await detectMiniPay();
      if (!found) { setState('no-minipay'); return; }

      const linkData = await getLinkById(id);
      if (!linkData) { setState('idle'); return; }
      setLink(linkData);

      try {
        const { address } = await connectMiniPay();
        const owned = await hasPurchased(id, address);
        if (owned) {
          setContentUrl(linkData.contentUrl ?? '');
          setThankYou(linkData.thankYouMessage ?? '');
          setState('already-owned');
          return;
        }
      } catch { /* wallet connect failed — still show idle */ }

      setState('idle');
    }
    init();
  }, [id]);

  const handlePay = async () => {
    if (!link || !OPERATOR) return;
    setErrorMsg('');

    try {
      // Step 1 — connect wallet & send cUSD
      setState('sending');
      await connectMiniPay(); // ensures correct chain
      const txHash = await sendCUSD(OPERATOR, link.price);

      // Step 2 — verify on-chain (server waits for Celo confirmation)
      setState('verifying');
      const res = await fetch(`/api/verify/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? `Verification failed (${res.status})`);

      // Step 3 — record purchase & show content
      const { address } = await connectMiniPay();
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
      // Don't show error if user cancelled
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

  // ── No MiniPay ──
  if (state === 'no-minipay') {
    return (
      <div className="animate-fade" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📱</div>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>Open in MiniPay</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '260px', margin: '0 auto' }}>
          This page accepts cUSD payments via Celo MiniPay. Open this link inside the MiniPay app to support this creator.
        </p>
      </div>
    );
  }

  if (!link) {
    return <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--text-muted)' }}>Not found.</div>;
  }

  const emoji  = TYPE_EMOJI[link.type] ?? '🎁';
  const isTip  = !link.contentUrl;
  const isPaying = state === 'sending' || state === 'verifying';

  const statusLabel = () => {
    if (state === 'sending')   return '⏳ Confirm in MiniPay…';
    if (state === 'verifying') return '🔗 Confirming on Celo…';
    return `Support with MiniPay · $${link.price} cUSD`;
  };

  // ── Thank you ──
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
          {thankYou || `Your support means the world! You paid $${link.price} cUSD.`}
        </p>

        {contentUrl && (
          <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '1rem' }}>
              🎁 Here&apos;s what you unlocked:
            </p>
            <a
              href={contentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: 'block', textDecoration: 'none', width: '100%' }}
            >
              {emoji} Open {link.title}
            </a>
          </div>
        )}

        {creatorHandle && (
          <Link
            href={`/@${creatorHandle}`}
            className="btn btn-secondary"
            style={{ textDecoration: 'none', display: 'block', width: '100%' }}
          >
            ← Back to @{creatorHandle}
          </Link>
        )}
      </div>
    );
  }

  // ── Main support screen ──
  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href={creatorHandle ? `/@${creatorHandle}` : '/'}
          style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}
        >
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

        {/* Price pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'baseline', gap: '0.3rem',
          background: 'rgba(53,208,127,0.1)', border: '1px solid rgba(53,208,127,0.25)',
          borderRadius: '100px', padding: '0.5rem 1.25rem', marginBottom: '1.75rem',
        }}>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-celo)' }}>
            ${link.price}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>cUSD</span>
        </div>

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
          {isPaying ? (
            <><div className="spinner" />{statusLabel()}</>
          ) : statusLabel()}
        </button>

        {errorMsg && (
          <p style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '1rem' }}>
            {errorMsg}
          </p>
        )}

        {/* Step indicators when paying */}
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

        {!isPaying && (
          <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
              ⚡ Instant · 🔐 cUSD on Celo · ~$0.001 gas
            </p>
            {link.salesCount > 0 && (
              <p style={{ color: 'var(--accent-celo)', fontSize: '0.68rem', fontWeight: 700 }}>
                ✓ {link.salesCount} person{link.salesCount !== 1 ? 's' : ''} already supported
              </p>
            )}
          </div>
        )}
      </div>

      <footer style={{ marginTop: '3rem', textAlign: 'center', paddingBottom: '3rem' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
            🍵 Powered by <strong style={{ color: 'white' }}>Pico</strong> · Get your free page
          </p>
        </Link>
      </footer>
    </div>
  );
}
