'use client';

import React, { useState, useCallback } from 'react';
import { checkGDEntitlement, claimGD, sendGD, type ClaimStatus } from '@/lib/gooddollar';
import { connectMiniPay } from '@/lib/minipay';

interface ClaimGDProps {
  creatorWallet: `0x${string}`;
  creatorHandle: string;
}

export default function ClaimGD({ creatorWallet, creatorHandle }: ClaimGDProps) {
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>({ status: 'not_connected' });
  const [tipSent, setTipSent] = useState(false);
  const [tipTxHash, setTipTxHash] = useState('');
  const [sending, setSending] = useState(false);

  const handleCheckClaim = useCallback(async () => {
    try {
      setClaimStatus({ status: 'loading' });
      const { address } = await connectMiniPay();
      const result = await checkGDEntitlement(address);
      setClaimStatus(result);
    } catch (err) {
      setClaimStatus({
        status: 'error',
        message: err instanceof Error ? err.message : 'Connection failed',
      });
    }
  }, []);

  const handleClaim = useCallback(async () => {
    try {
      setClaimStatus({ status: 'claiming' });
      const { address } = await connectMiniPay();
      const result = await claimGD(address);
      if (result.success) {
        setClaimStatus({
          status: 'claimed',
          amount: result.amount ?? '0',
          txHash: result.txHash ?? '',
        });
      } else {
        setClaimStatus({ status: 'error', message: result.error ?? 'Claim failed' });
      }
    } catch (err) {
      setClaimStatus({
        status: 'error',
        message: err instanceof Error ? err.message : 'Claim failed',
      });
    }
  }, []);

  const handleTip = useCallback(async () => {
    if (claimStatus.status !== 'claimed') return;
    try {
      setSending(true);
      const { address } = await connectMiniPay();
      const txHash = await sendGD(address, creatorWallet, claimStatus.amount);
      setTipTxHash(txHash);
      setTipSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('denied')) {
        setClaimStatus({ status: 'error', message: msg || 'Tip failed' });
      }
    } finally {
      setSending(false);
    }
  }, [claimStatus, creatorWallet]);

  if (tipSent) {
    return (
      <div className="glass" style={{ padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💚</div>
        <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.3rem' }}>
          G$ tip sent to @{creatorHandle}!
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          You supported this creator for free using your daily UBI.
        </p>
        {tipTxHash && (
          <a
            href={`https://celoscan.io/tx/${tipTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent-celo)', fontSize: '0.72rem', marginTop: '0.5rem', display: 'block' }}
          >
            View on Celoscan →
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="glass" style={{ padding: '1.25rem', textAlign: 'center' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        justifyContent: 'center', marginBottom: '0.75rem',
      }}>
        <span style={{ fontSize: '1.2rem' }}>🌍</span>
        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Free G$ Tip</span>
      </div>

      {claimStatus.status === 'not_connected' && (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
            Claim your free daily G$ (GoodDollar UBI) and tip @{creatorHandle} — costs you nothing.
          </p>
          <button
            className="btn btn-secondary"
            onClick={handleCheckClaim}
            style={{ width: '100%', fontSize: '0.9rem' }}
          >
            🌍 Check G$ Claim
          </button>
        </>
      )}

      {claimStatus.status === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem' }}>
          <div className="spinner" />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Checking eligibility…</span>
        </div>
      )}

      {claimStatus.status === 'not_whitelisted' && (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
            Your wallet isn't verified with GoodDollar yet. Verify once to claim free G$ daily.
          </p>
          <a
            href="https://wallet.gooddollar.org"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ width: '100%', textDecoration: 'none', fontSize: '0.9rem' }}
          >
            Verify at GoodDollar →
          </a>
        </>
      )}

      {claimStatus.status === 'can_claim' && (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
            You can claim <strong style={{ color: 'var(--accent-celo)' }}>{claimStatus.amount} G$</strong> today.
            Claim it and tip @{creatorHandle} for free!
          </p>
          <button
            className="btn btn-primary"
            onClick={handleClaim}
            style={{ width: '100%', fontSize: '0.9rem' }}
          >
            🌍 Claim {claimStatus.amount} G$ & Tip
          </button>
        </>
      )}

      {claimStatus.status === 'claiming' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem' }}>
          <div className="spinner" />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Claiming G$ UBI…</span>
        </div>
      )}

      {claimStatus.status === 'claimed' && (
        <>
          <p style={{ fontSize: '0.78rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
            ✅ Claimed <strong style={{ color: 'var(--accent-celo)' }}>{claimStatus.amount} G$</strong>!
            Now tip @{creatorHandle}?
          </p>
          <button
            className="btn btn-primary"
            onClick={handleTip}
            disabled={sending}
            style={{ width: '100%', fontSize: '0.9rem' }}
          >
            {sending ? (
              <><div className="spinner" /> Sending G$ tip…</>
            ) : (
              `💚 Tip ${claimStatus.amount} G$ to @${creatorHandle}`
            )}
          </button>
        </>
      )}

      {claimStatus.status === 'already_claimed' && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5 }}>
          You already claimed today. Next claim available{' '}
          {claimStatus.nextClaimTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
        </p>
      )}

      {claimStatus.status === 'error' && (
        <>
          <p style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: '0.5rem' }}>{claimStatus.message}</p>
          <button
            className="btn btn-secondary"
            onClick={handleCheckClaim}
            style={{ width: '100%', fontSize: '0.85rem' }}
          >
            Try Again
          </button>
        </>
      )}

      <p style={{ color: 'var(--text-muted)', fontSize: '0.62rem', marginTop: '0.75rem' }}>
        Powered by <a href="https://gooddollar.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-celo)', textDecoration: 'none' }}>GoodDollar</a> · Universal Basic Income on Celo
      </p>
    </div>
  );
}
