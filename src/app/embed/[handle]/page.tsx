import { notFound } from 'next/navigation';
import { getCreatorByHandle, getCreatorLinks } from '@/app/actions/creator';
import type { PicoLink } from '@/db/schema';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const TYPE_EMOJI: Record<string, string> = {
  tip: '🍵', coffee: '🍵', pdf: '📄', guide: '📘',
  call: '🎯', audio: '🎙️', video: '🎬', other: '🎁',
};

const TOKEN_LABELS: Record<string, string> = {
  USDC: 'USDC', cUSD: 'USDm', cEUR: 'EURm', cREAL: 'BRLm',
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pico-celo-bio-link.vercel.app';

export default async function EmbedPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const creator = await getCreatorByHandle(handle);
  if (!creator) notFound();

  const links = await getCreatorLinks(creator.id);
  const initial = creator.handle[0].toUpperCase();

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: '#0a0a0c',
      color: 'white',
      padding: '1.25rem',
      minHeight: '100%',
    }}>
      {/* Creator header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #35d07f, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', fontWeight: 800, color: '#0a1a12',
        }}>
          {initial}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1rem' }}>@{creator.handle}</div>
          {creator.bio && (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', marginTop: '0.1rem' }}>
              {creator.bio}
            </div>
          )}
        </div>
      </div>

      {/* Payment items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
        {links.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
            Nothing here yet.
          </div>
        ) : links.map((link: PicoLink) => (
          <a
            key={link.id}
            href={`${APP_URL}/c/${link.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', color: 'white' }}
          >
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              padding: '0.9rem 1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{TYPE_EMOJI[link.type] ?? '🎁'}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {link.title}
                  </div>
                  {link.description && (
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {link.description}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.75rem' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#35d07f' }}>${link.price}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem' }}>{TOKEN_LABELS[link.token] ?? link.token}</div>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <a
        href={`${APP_URL}/?p=${creator.handle}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}
      >
        <span>🍵</span>
        <span>Powered by <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Pico</strong></span>
      </a>
    </div>
  );
}
