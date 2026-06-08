'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { detectMiniPay, connectMiniPay } from '@/lib/minipay';
import { getCreatorByWallet, createPicoLink } from '@/app/actions/creator';

const ITEM_TYPES = [
  { value: 'tip',   emoji: '🍵', label: 'Tip / Tea',   hint: 'Simple support, no reward' },
  { value: 'pdf',   emoji: '📄', label: 'PDF / eBook',    hint: 'Share a file link after payment' },
  { value: 'guide', emoji: '📘', label: 'Guide / Course', hint: 'Tutorial, notes, video link' },
  { value: 'call',  emoji: '🎯', label: 'Booking / Call', hint: 'Calendly or WhatsApp link' },
  { value: 'other', emoji: '🎁', label: 'Other',          hint: 'Anything else' },
];

export default function NewItemPage() {
  const router = useRouter();
  const [creatorId, setCreatorId] = useState('');
  const [type, setType] = useState('tip');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('1');
  const [contentUrl, setContentUrl] = useState('');
  const [thankYouMessage, setThankYouMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isTip = type === 'tip';

  useEffect(() => {
    detectMiniPay().then(async (found) => {
      if (!found) { router.replace('/dashboard'); return; }
      const { address } = await connectMiniPay();
      const creator = await getCreatorByWallet(address);
      if (!creator) { router.replace('/dashboard'); return; }
      setCreatorId(creator.id);
    });
  }, [router]);

  // Pre-fill title when type changes
  useEffect(() => {
    const defaults: Record<string, string> = {
      tip: 'Buy me a tea 🍵',
      pdf: '',
      guide: '',
      call: 'Book a 15-min call',
      other: '',
    };
    if (defaults[type] !== undefined && !title) setTitle(defaults[type]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const handleSubmit = async () => {
    if (!title || !price || !creatorId) { setError('Please fill in a title and price.'); return; }
    const p = parseFloat(price);
    if (isNaN(p) || p < 0.01) { setError('Minimum price is $0.01 cUSD.'); return; }
    if (!isTip && !contentUrl) { setError('Please add a content URL (the link you\'ll share after payment).'); return; }

    setSaving(true);
    setError('');
    const res = await createPicoLink({
      creatorId,
      title,
      description,
      price: p.toFixed(2),
      contentUrl: contentUrl || '',
      type,
      thankYouMessage,
    } as Parameters<typeof createPicoLink>[0]);

    if (res.success) {
      router.push('/dashboard');
    } else {
      setError(res.error ?? 'Failed to save.');
      setSaving(false);
    }
  };

  const selected = ITEM_TYPES.find(t => t.value === type)!;

  return (
    <div className="animate-fade">
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', paddingTop: '0.5rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '1.3rem' }}>←</Link>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 800 }}>New Support Item</h1>
      </header>

      {/* Type picker */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          WHAT ARE YOU OFFERING?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {ITEM_TYPES.map(t => (
            <button key={t.value} onClick={() => setType(t.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.9rem 1rem',
                borderRadius: '14px', cursor: 'pointer', textAlign: 'left',
                background: type === t.value ? 'rgba(53,208,127,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${type === t.value ? 'rgba(53,208,127,0.4)' : 'var(--card-border)'}`,
                color: 'white', transition: 'all 0.15s',
              }}>
              <span style={{ fontSize: '1.2rem' }}>{t.emoji}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.label}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{t.hint}</p>
              </div>
              {type === t.value && <span style={{ marginLeft: 'auto', color: 'var(--accent-celo)', fontWeight: 700 }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Title */}
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            {selected.emoji} TITLE
          </label>
          <input type="text" placeholder={`e.g. ${selected.label}`} value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ width: '100%', padding: '0.9rem' }} />
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            DESCRIPTION <span style={{ fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea rows={2} placeholder="Shown to fans before they pay…"
            value={description} onChange={e => setDescription(e.target.value)}
            style={{ width: '100%', padding: '0.9rem', resize: 'none' }} />
        </div>

        {/* Price */}
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            PRICE (cUSD)
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>$</span>
            <input type="number" step="0.5" min="0.01" value={price}
              onChange={e => setPrice(e.target.value)}
              style={{ width: '100%', padding: '0.9rem 0.9rem 0.9rem 2.2rem' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            {['1', '2', '5', '10'].map(v => (
              <button key={v} onClick={() => setPrice(v)}
                style={{ flex: 1, padding: '0.35rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  background: price === v ? 'rgba(53,208,127,0.15)' : 'transparent',
                  border: `1px solid ${price === v ? 'rgba(53,208,127,0.4)' : 'var(--card-border)'}`,
                  color: price === v ? 'var(--accent-celo)' : 'var(--text-muted)' }}>
                ${v}
              </button>
            ))}
          </div>
        </div>

        {/* Content URL — only if not a tip */}
        {!isTip && (
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              🔒 CONTENT URL (revealed after payment)
            </label>
            <input type="url" placeholder="Google Drive, Dropbox, Calendly, YouTube…"
              value={contentUrl} onChange={e => setContentUrl(e.target.value)}
              style={{ width: '100%', padding: '0.9rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.4rem' }}>
              This link is hidden until the fan pays.
            </p>
          </div>
        )}

        {/* Thank you message */}
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            💌 THANK YOU MESSAGE <span style={{ fontWeight: 400 }}>(optional)</span>
          </label>
          <input type="text" placeholder="e.g. Thank you so much! It means the world 🙏"
            value={thankYouMessage} onChange={e => setThankYouMessage(e.target.value)}
            style={{ width: '100%', padding: '0.9rem' }} />
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}

        <button className="btn btn-primary" style={{ width: '100%', fontSize: '1rem' }}
          onClick={handleSubmit} disabled={saving || !creatorId}>
          {saving ? <><div className="spinner" />Saving…</> : `Add ${selected.emoji} ${selected.label}`}
        </button>
      </div>
    </div>
  );
}
