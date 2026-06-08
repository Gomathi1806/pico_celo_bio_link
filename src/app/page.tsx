'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { detectMiniPay, connectMiniPay } from '@/lib/minipay';
import { createCreatorWithLink, getCreatorByWallet, getCreatorLinks } from '@/app/actions/creator';
import type { Creator, PicoLink } from '@/db/schema';

type Stage =
  | 'detecting'
  | 'no-minipay'       // not inside MiniPay — show info only
  | 'new-creator'      // in MiniPay, no account yet — show creation form
  | 'creating'         // submitting form
  | 'returning'        // existing creator
  | 'done';            // just created — show link

const PRICE_PRESETS = ['1', '2', '5', '10'];
const TYPE_EMOJI: Record<string, string> = {
  tip: '🍵', pdf: '📄', guide: '📘', call: '🎯', other: '🎁',
};

export default function HomePage() {
  const [stage, setStage]       = useState<Stage>('detecting');
  const [creator, setCreator]   = useState<Creator | null>(null);
  const [links, setLinks]       = useState<PicoLink[]>([]);
  const [newLinkId, setNewLinkId] = useState('');
  const [walletAddr, setWalletAddr] = useState('');

  // Form state
  const [name, setName]         = useState('');
  const [purpose, setPurpose]   = useState('');
  const [price, setPrice]       = useState('2');
  const [customPrice, setCustomPrice] = useState('');
  const [error, setError]       = useState('');
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    detectMiniPay().then(async (found) => {
      if (!found) { setStage('no-minipay'); return; }
      try {
        const { address } = await connectMiniPay();
        setWalletAddr(address);
        const existing = await getCreatorByWallet(address);
        if (existing) {
          setCreator(existing);
          const ls = await getCreatorLinks(existing.id);
          setLinks(ls);
          setStage('returning');
        } else {
          setStage('new-creator');
        }
      } catch {
        setStage('new-creator'); // still let them try
      }
    });
  }, []);

  const handleCreate = async () => {
    const finalPrice = customPrice || price;
    if (!name.trim() || !purpose.trim() || !finalPrice) return;
    setError('');
    setStage('creating');
    try {
      // Re-connect to get latest address (or reuse already-known one)
      let address = walletAddr;
      try {
        const wallet = await connectMiniPay();
        address = wallet.address;
      } catch { /* use walletAddr from initial detection */ }

      if (!address) {
        setError('Could not get wallet address. Please try again.');
        setStage('new-creator');
        return;
      }

      const res = await createCreatorWithLink({
        walletAddress: address,
        displayName: name.trim(),
        purpose: purpose.trim(),
        price: finalPrice,
      });
      if (res.success && res.linkId) {
        setNewLinkId(res.linkId);
        setStage('done');
      } else {
        setError(res.error ?? 'Something went wrong. Try again.');
        setStage('new-creator');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed. Try again.');
      setStage('new-creator');
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // ── Detecting ──
  if (stage === 'detecting') {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 0' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</p>
      </div>
    );
  }

  // ── Not in MiniPay ── (no external links — they break MiniPay navigation)
  if (stage === 'no-minipay') {
    return (
      <div className="animate-fade" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>🍵</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>Pico</h1>
        <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Get paid by your fans
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, maxWidth: '280px', margin: '0 auto 2.5rem' }}>
          Like "Buy Me a Tea" — but payments go straight to your MiniPay wallet in cUSD. No bank. No Stripe.
        </p>

        <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
          {[
            { n: '1', t: 'Open Pico inside the MiniPay app' },
            { n: '2', t: 'Set your name, purpose and price' },
            { n: '3', t: 'Share your link. Fans pay in cUSD.' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(53,208,127,0.15)', border: '1px solid rgba(53,208,127,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-celo)',
              }}>{s.n}</div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>{s.t}</p>
            </div>
          ))}
        </div>

        {/* NO external links here — they cause MiniPay to navigate home */}
        <div className="glass" style={{ padding: '1.25rem', background: 'rgba(53,208,127,0.05)', border: '1px solid rgba(53,208,127,0.2)' }}>
          <p style={{ fontWeight: 700, marginBottom: '0.3rem' }}>Open this page in MiniPay</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Download MiniPay from the Opera Mini app, then open this URL inside it.
          </p>
        </div>
      </div>
    );
  }

  // ── Done — just created ──
  if (stage === 'done' && newLinkId) {
    const shareUrl = `${origin}/c/${newLinkId}`;
    return (
      <div className="animate-fade" style={{ textAlign: 'center', paddingTop: '3rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🎉</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.4rem' }}>
          Your link is ready!
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          Share it anywhere — fans tap it, pay you in cUSD, and you receive it instantly.
        </p>

        <div className="glass" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            YOUR PAYMENT LINK
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)',
            borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1rem',
            wordBreak: 'break-all', fontSize: '0.82rem', textAlign: 'left',
          }}>
            {shareUrl}
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => copyLink(shareUrl)}
          >
            {copied ? '✓ Copied!' : '📋 Copy Link'}
          </button>
        </div>

        <Link
          href="/dashboard"
          className="btn btn-secondary"
          style={{ textDecoration: 'none', display: 'block', width: '100%', marginBottom: '0.75rem' }}
        >
          📊 Go to Dashboard
        </Link>
        <button
          className="btn btn-secondary"
          style={{ width: '100%' }}
          onClick={() => { setStage('new-creator'); setName(''); setPurpose(''); setPrice('2'); setCustomPrice(''); }}
        >
          + Create Another Link
        </button>
      </div>
    );
  }

  // ── Returning creator ──
  if (stage === 'returning' && creator) {
    return (
      <div className="animate-fade">
        <header style={{ textAlign: 'center', marginBottom: '2rem', paddingTop: '1.5rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', margin: '0 auto 0.75rem',
            background: 'linear-gradient(135deg, #35d07f, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.3rem', fontWeight: 800, color: '#0a1a12',
          }}>
            {creator.handle[0].toUpperCase()}
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Welcome back 👋</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>@{creator.handle}</p>
        </header>

        {/* Quick action: add new link */}
        <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.25rem', background: 'rgba(53,208,127,0.04)', border: '1px solid rgba(53,208,127,0.2)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>➕ Create a new payment link</h3>
          <input
            type="text"
            placeholder="What are you offering? e.g. Buy me a tea"
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            style={{ width: '100%', marginBottom: '0.75rem', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'transparent', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {PRICE_PRESETS.map(p => (
              <button key={p} onClick={() => { setPrice(p); setCustomPrice(''); }}
                style={{
                  flex: 1, padding: '0.6rem 0', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                  background: price === p && !customPrice ? 'var(--accent-celo)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${price === p && !customPrice ? 'var(--accent-celo)' : 'var(--card-border)'}`,
                  color: price === p && !customPrice ? '#0a1a12' : 'white',
                }}>
                ${p}
              </button>
            ))}
            <input
              type="number"
              placeholder="$?"
              value={customPrice}
              onChange={e => { setCustomPrice(e.target.value); setPrice(''); }}
              style={{ width: 60, padding: '0.6rem', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'transparent', textAlign: 'center', fontSize: '0.85rem' }}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={!purpose.trim()}
            onClick={async () => {
              const finalPrice = customPrice || price;
              if (!purpose.trim() || !finalPrice) return;
              setStage('creating');
              const { address } = await connectMiniPay();
              const res = await createCreatorWithLink({
                walletAddress: address,
                displayName: creator.handle,
                purpose: purpose.trim(),
                price: finalPrice,
              });
              if (res.success && res.linkId) { setNewLinkId(res.linkId); setStage('done'); }
              else { setStage('returning'); }
            }}
          >
            Create Link
          </button>
        </div>

        {/* Existing links */}
        {links.length > 0 && (
          <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>Your Links</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {links.map(link => (
                <div key={link.id} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)',
                  borderRadius: '12px', padding: '0.9rem 1rem',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {TYPE_EMOJI[link.type] ?? '🎁'} {link.title}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                      ${link.price} · {link.salesCount} supporter{link.salesCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => copyLink(`${origin}/c/${link.id}`)}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem' }}
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link href="/dashboard" className="btn btn-secondary"
          style={{ textDecoration: 'none', display: 'block', textAlign: 'center', width: '100%' }}>
          Full Dashboard →
        </Link>
      </div>
    );
  }

  // ── Creating (spinner) ──
  if (stage === 'creating') {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 0' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Creating your link…</p>
      </div>
    );
  }

  // ── New creator — inline form ──
  const finalPrice = customPrice || price;
  return (
    <div className="animate-fade">
      <header style={{ textAlign: 'center', marginBottom: '2rem', paddingTop: '1.5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🍵</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.4rem' }}>Create Your Page</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
          Set up once. Share your link. Get paid in cUSD.
        </p>
      </header>

      <div className="glass" style={{ padding: '1.75rem' }}>

        {/* Name */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            YOUR NAME
          </label>
          <input
            type="text"
            placeholder="e.g. Amara, Celo Dev 🇳🇬"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'transparent', fontSize: '0.95rem', boxSizing: 'border-box' }}
          />
        </div>

        {/* Purpose */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            WHAT ARE YOU OFFERING?
          </label>
          <input
            type="text"
            placeholder="e.g. Buy me a tea 🍵"
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'transparent', fontSize: '0.95rem', boxSizing: 'border-box' }}
          />
          {/* Quick suggestions */}
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {['Buy me a tea 🍵', 'Support my work 💚', 'My Celo guide 📄', 'Quick call 🎯'].map(s => (
              <button key={s} onClick={() => setPurpose(s)}
                style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem', borderRadius: '100px', border: '1px solid var(--card-border)', background: purpose === s ? 'rgba(53,208,127,0.15)' : 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            PRICE (cUSD)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {PRICE_PRESETS.map(p => (
              <button key={p} onClick={() => { setPrice(p); setCustomPrice(''); }}
                style={{
                  flex: 1, padding: '0.75rem 0', borderRadius: '12px', fontSize: '1rem', fontWeight: 800, cursor: 'pointer',
                  background: price === p && !customPrice ? 'var(--accent-celo)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${price === p && !customPrice ? 'var(--accent-celo)' : 'var(--card-border)'}`,
                  color: price === p && !customPrice ? '#0a1a12' : 'white',
                }}>
                ${p}
              </button>
            ))}
          </div>
          <input
            type="number"
            placeholder="Custom amount"
            value={customPrice}
            onChange={e => { setCustomPrice(e.target.value); setPrice(''); }}
            style={{ width: '100%', marginTop: '0.6rem', padding: '0.7rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'transparent', textAlign: 'center', fontSize: '0.95rem', boxSizing: 'border-box' }}
          />
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

        <button
          className="btn btn-primary"
          style={{ width: '100%', fontSize: '1rem', padding: '1rem' }}
          disabled={!name.trim() || !purpose.trim() || !finalPrice}
          onClick={handleCreate}
        >
          ✨ Create My Payment Link
        </button>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textAlign: 'center', marginTop: '1rem', lineHeight: 1.6 }}>
          Free forever · Payments go direct to your MiniPay wallet
        </p>
      </div>
    </div>
  );
}
