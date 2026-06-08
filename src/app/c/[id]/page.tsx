'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { detectMiniPay, connectMiniPay, NETWORK } from '@/lib/minipay';
import { getLinkById, hasPurchased, recordPurchase, getCreatorByWallet } from '@/app/actions/creator';
import { getCreatorByHandle } from '@/app/actions/creator';
import type { PicoLink } from '@/db/schema';

const TYPE_EMOJI: Record<string, string> = {
  tip: '🍵', coffee: '🍵', pdf: '📄', guide: '📘',
  call: '🎯', audio: '🎙️', video: '🎬', other: '🎁',
};

type UIState = 'loading' | 'no-minipay' | 'idle' | 'paying' | 'unlocked' | 'already-owned';

export default function SupportPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);

  const [link, setLink] = useState<PicoLink | null>(null);
  const [creatorHandle, setCreatorHandle] = useState('');
  const [state, setState] = useState<UIState>('loading');
  const [contentUrl, setContentUrl] = useState('');
  const [thankYou, setThankYou] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
      } catch { /* show idle */ }

      setState('idle');
    }
    init();
  }, [id]);

  const handlePay = async () => {
    if (!link) return;
    setState('paying');
    setErrorMsg('');

    try {
      const { address, fetchWithPay } = await connectMiniPay();

      const res = await fetchWithPay(`/api/content/${id}`, {
        method: 'GET',
        headers: { 'x-buyer': address },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }

      const data = await res.json();
      const txHash = res.headers.get('x-payment-tx') ?? data.txHash ?? '0x';

      await recordPurchase({
        linkId: id,
        buyerAddress: address,
        txHash,
        amountPaid: link.price,
      });

      setContentUrl(data.contentUrl ?? '');
      setThankYou(link.thankYouMessage ?? '');
      setState('unlocked');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Payment failed. Please try again.');
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
          This page accepts payments via Celo MiniPay. Open this link inside the MiniPay app to support this creator.
        </p>
      </div>
    );
  }

  if (!link) {
    return <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--text-muted)' }}>Not found.</div>;
  }

  const emoji = TYPE_EMOJI[link.type] ?? '🎁';
  const isTip = !link.contentUrl;

  // ── Thank you screen ──
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
          {thankYou || `Your support means the world! You paid $${link.price} cUSD for "${link.title}".`}
        </p>

        {contentUrl && (
          <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
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

        <Link
          href={`/@${creatorHandle || 'back'}`}
          className="btn btn-secondary"
          style={{ textDecoration: 'none', display: 'block', width: '100%' }}
        >
          ← Back to creator page
        </Link>
      </div>
    );
  }

  // ── Main support screen ──
  return (
    <div className="animate-fade">
      {/* Back link */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={creatorHandle ? `/@${creatorHandle}` : '/'} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>
          ← Back
        </Link>
      </div>

      {/* Support card */}
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
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-celo)' }}>${link.price}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>cUSD</span>
        </div>

        {isTip && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '1.5rem' }}>
            💚 This is a tip — no product attached. Just pure support.
          </p>
        )}

        {!isTip && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '1.5rem' }}>
            🔒 Pay to unlock · Content revealed instantly after payment
          </p>
        )}

        {/* Pay button */}
        <button
          className="btn btn-primary"
          style={{ width: '100%', fontSize: '1rem', padding: '1rem' }}
          onClick={handlePay}
          disabled={state === 'paying'}
        >
          {state === 'paying'
            ? <><div className="spinner" />Processing…</>
            : `Support with MiniPay · $${link.price} cUSD`}
        </button>

        {errorMsg && (
          <p style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '1rem' }}>{errorMsg}</p>
        )}

        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>⚡ Instant · 🔐 MiniPay · 🌍 cUSD on Celo</p>
          {link.salesCount > 0 && (
            <p style={{ color: 'var(--accent-celo)', fontSize: '0.68rem', fontWeight: 700 }}>
              ✓ {link.salesCount} person{link.salesCount !== 1 ? 's' : ''} already supported
            </p>
          )}
        </div>
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
