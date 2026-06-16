'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { detectWallet, connectMiniPay } from '@/lib/minipay';
import { getCreatorByWallet, updateCreatorBio } from '@/app/actions/creator';

export default function ProfilePage() {
  const router = useRouter();
  const [bio, setBio] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  useEffect(() => {
    detectWallet().then(async (found) => {
      if (!found) { router.replace('/dashboard'); return; }
      const { address } = await connectMiniPay();
      setWalletAddress(address);
      const creator = await getCreatorByWallet(address);
      if (!creator) { router.replace('/dashboard'); return; }
      setBio(creator.bio ?? '');
    });
  }, [router]);

  const handleSave = async () => {
    if (!walletAddress) return;
    setLoading(true);
    await updateCreatorBio(walletAddress, bio);
    setSaved(true);
    setLoading(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="animate-fade">
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '1.2rem' }}>←</Link>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Edit Profile</h1>
      </header>

      <div className="glass" style={{ padding: '1.5rem' }}>
        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '0.08em' }}>
          BIO
        </label>
        <textarea
          rows={4}
          placeholder="Tell your fans who you are and what you create…"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          style={{ width: '100%', padding: '1rem', resize: 'none', marginBottom: '1.5rem' }}
        />
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={handleSave}
          disabled={loading}
        >
          {saved ? '✓ Saved' : loading ? <><div className="spinner" />Saving…</> : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
