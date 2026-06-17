'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { detectWallet, connectMiniPay, disconnectMiniPay, isMiniPay, TOKENS, type TokenSymbol } from '@/lib/minipay';
import { getOrCreateCreator, getCreatorLinks, getCreatorEarnings } from '@/app/actions/creator';
import type { Creator, PicoLink } from '@/db/schema';

type Step = 'detecting' | 'no-minipay' | 'needs-handle' | 'ready';

const TYPE_EMOJI: Record<string, string> = {
  tip: '🍵', coffee: '🍵', pdf: '📄', guide: '📘',
  call: '🎯', audio: '🎙️', video: '🎬', other: '🎁',
};

export default function DashboardPage() {
  const [step, setStep] = useState<Step>('detecting');
  const [creator, setCreator] = useState<Creator | null>(null);
  const [links, setLinks] = useState<PicoLink[]>([]);
  const [earnings, setEarnings] = useState({ total: '0.00', sales: 0 });
  const [handleInput, setHandleInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [copied, setCopied] = useState(false);

  const loadDashboard = useCallback(async (c: Creator) => {
    const [ls, e] = await Promise.all([getCreatorLinks(c.id), getCreatorEarnings(c.id)]);
    setLinks(ls);
    setEarnings(e);
  }, []);

  useEffect(() => {
    if (isMiniPay()) {
      // Auto-connect inside MiniPay
      connectMiniPay().then(async ({ address }) => {
        setWalletAddress(address);
        const res = await getOrCreateCreator(address);
        if (res.success && res.creator) {
          setCreator(res.creator);
          await loadDashboard(res.creator);
          setStep('ready');
        } else {
          setStep('needs-handle');
        }
      }).catch(() => setStep('no-minipay'));
    } else {
      // Outside MiniPay, let user choose on-demand
      setStep('no-minipay');
    }
  }, [loadDashboard]);

  const handleClaim = async () => {
    if (!handleInput.trim() || !walletAddress) return;
    setLoading(true);
    setError('');
    const res = await getOrCreateCreator(walletAddress, handleInput.trim());
    if (res.success && res.creator) {
      setCreator(res.creator);
      await loadDashboard(res.creator);
      setStep('ready');
    } else {
      setError(res.error ?? 'Something went wrong.');
    }
    setLoading(false);
  };

  const copyPageLink = () => {
    if (!creator) return;
    navigator.clipboard.writeText(`${window.location.origin}/@${creator.handle}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyItemLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/c/${id}`);
    alert('Link copied!');
  };

  // ── Detecting ──
  if (step === 'detecting') {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 0' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Connecting to MiniPay…</p>
      </div>
    );
  }

  // ── No MiniPay ──
  if (step === 'no-minipay') {
    const hasInjected = typeof window !== 'undefined' && !!window.ethereum;

    const handleConnectWallet = async () => {
      try {
        const { address } = await connectMiniPay();
        setWalletAddress(address);
        const res = await getOrCreateCreator(address);
        if (res.success && res.creator) {
          setCreator(res.creator);
          await loadDashboard(res.creator);
          setStep('ready');
        } else {
          setStep('needs-handle');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Connection failed. Please try again.');
      }
    };

    return (
      <div className="animate-fade" style={{ textAlign: 'center', paddingTop: '3rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.75rem' }}>Open in MiniPay</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '2rem', maxWidth: '260px', margin: '0 auto 2rem' }}>
          Pico is a MiniPay mini app. Open this page inside the MiniPay app on your phone to create your support page.
        </p>

        <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', textAlign: 'left' }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>Web Browser Wallet Connection</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
            To access the dashboard, connect your browser wallet extension (such as MetaMask) on the Celo network.
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

        {error && <p style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '1.5rem' }}>{error}</p>}

        <Link href="/" style={{ display: 'block', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Back home
        </Link>
      </div>
    );
  }

  // ── Claim handle ──
  if (step === 'needs-handle') {
    return (
      <div className="animate-fade">
        <header style={{ textAlign: 'center', marginBottom: '2.5rem', paddingTop: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🍵</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.4rem' }}>Create your page</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Pick a handle — this becomes your shareable link
          </p>
        </header>

        <div className="glass" style={{ padding: '1.75rem' }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            YOUR HANDLE
          </label>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--card-border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '0.5rem' }}>
            <span style={{ padding: '0.9rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem', borderRight: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
              pico.app/@
            </span>
            <input
              type="text"
              placeholder="yourname"
              value={handleInput}
              onChange={e => setHandleInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleClaim()}
              style={{ flex: 1, border: 'none', padding: '0.9rem', borderRadius: 0, background: 'transparent' }}
            />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '1.5rem' }}>
            Letters, numbers, underscores only. You can&apos;t change this later.
          </p>

          {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

          <button className="btn btn-primary" style={{ width: '100%' }}
            onClick={handleClaim} disabled={loading || !handleInput.trim()}>
            {loading ? <><div className="spinner" />Creating…</> : '✨ Create My Page'}
          </button>
        </div>
      </div>
    );
  }

  // ── Main dashboard ──
  return (
    <div className="animate-fade">
      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', paddingTop: '0.5rem' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>🍵 Pico</span>
        <button onClick={() => { disconnectMiniPay(); window.location.reload(); }}
          style={{ background: 'none', border: '1px solid var(--card-border)', borderRadius: '100px', padding: '0.35rem 0.85rem', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-celo)', display: 'inline-block' }} />
          @{creator?.handle}
        </button>
      </nav>

      {/* Your page link */}
      <div className="glass" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem', background: 'rgba(53,208,127,0.05)', border: '1px solid rgba(53,208,127,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.25rem' }}>YOUR PAGE</p>
            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>pico.app/@{creator?.handle}</p>
          </div>
          <button onClick={copyPageLink} className="btn btn-primary"
            style={{ padding: '0.45rem 1rem', fontSize: '0.78rem', borderRadius: '10px', flexShrink: 0 }}>
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div className="glass" style={{ padding: '1.25rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.4rem' }}>TOTAL EARNED</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-celo)' }}>{earnings.total} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>USDm</span></p>
        </div>
        <div className="glass" style={{ padding: '1.25rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.4rem' }}>SUPPORTERS</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{earnings.sales}</p>
        </div>
      </div>

      {/* Items */}
      <div className="glass" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Your Support Items</h2>
          <Link href="/dashboard/new" className="btn btn-primary"
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem', textDecoration: 'none', borderRadius: '10px' }}>
            + Add Item
          </Link>
        </div>

        {links.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🍵</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Add your first item — a tip, a PDF, a call. Your fans will see it on your page.
            </p>
            <Link href="/dashboard/new" className="btn btn-secondary" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>
              Add your first item
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {links.map(link => (
              <div key={link.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '14px', padding: '0.9rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{TYPE_EMOJI[link.type] ?? '🎁'}</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{link.title}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                        ${link.price} {TOKENS[link.token as TokenSymbol]?.label ?? link.token} · {link.salesCount} supporter{link.salesCount !== 1 ? 's' : ''} · {link.totalEarnings} earned
                      </p>
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--accent-celo)', fontSize: '0.95rem' }}>${link.price}</span>
                </div>
                <button onClick={() => copyItemLink(link.id)}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem' }}>
                  Copy Link
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit bio */}
      <div style={{ marginTop: '1rem' }}>
        <Link href="/dashboard/profile" className="btn btn-secondary"
          style={{ display: 'block', textDecoration: 'none', textAlign: 'center', width: '100%', fontSize: '0.88rem' }}>
          ✏️ Edit bio &amp; profile
        </Link>
      </div>

      <footer style={{ marginTop: '2.5rem', paddingBottom: '3rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Celo Network · USDm · x402 Protocol</p>
      </footer>
    </div>
  );
}
