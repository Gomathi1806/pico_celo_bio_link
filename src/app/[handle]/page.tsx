import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCreatorByHandle, getCreatorLinks } from '@/app/actions/creator';
import type { PicoLink } from '@/db/schema';

export const dynamic = 'force-dynamic';

const TYPE_EMOJI: Record<string, string> = {
  tip: '🍵', coffee: '🍵', pdf: '📄', guide: '📘',
  call: '🎯', audio: '🎙️', video: '🎬', other: '🎁',
};

const TOKEN_LABELS: Record<string, string> = {
  USDC: 'USDC',
  cUSD: 'USDm',
  cEUR: 'EURm',
  cREAL: 'BRLm',
};

export default async function CreatorBioPage(props: { params: Promise<{ handle: string }> }) {
  const { handle } = await props.params;
  const creator = await getCreatorByHandle(handle);
  if (!creator) notFound();

  const links = await getCreatorLinks(creator.id);
  const initial = creator.handle[0].toUpperCase();

  return (
    <div className="animate-fade">

      {/* Creator card */}
      <header style={{ textAlign: 'center', padding: '2.5rem 0 2rem' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #35d07f, #3b82f6)',
          margin: '0 auto 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 800, color: '#0a1a12',
        }}>
          {initial}
        </div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>@{creator.handle}</h1>
        {creator.bio && (
          <p style={{
            color: 'var(--text-muted)', fontSize: '0.9rem',
            marginTop: '0.5rem', lineHeight: 1.6,
            maxWidth: '260px', margin: '0.6rem auto 0',
          }}>
            {creator.bio}
          </p>
        )}
      </header>

      {/* Support items */}
      {links.length === 0 ? (
        <div className="glass" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>🌱</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Nothing here yet — check back soon!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {links.map((link: PicoLink) => {
            const emoji = TYPE_EMOJI[link.type] ?? '🎁';
            return (
              <Link
                key={link.id}
                href={`/c/${link.id}`}
                style={{ textDecoration: 'none', color: 'white' }}
              >
                <div className="glass" style={{
                  padding: '1.1rem 1.25rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{emoji}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {link.title}
                      </div>
                      {link.description && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {link.description}
                        </div>
                      )}
                      {link.salesCount > 0 && (
                        <div style={{ color: 'var(--accent-celo)', fontSize: '0.68rem', fontWeight: 700, marginTop: '0.2rem' }}>
                          {link.salesCount} supporter{link.salesCount !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-celo)' }}>
                      ${link.price}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{TOKEN_LABELS[link.token] ?? link.token}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <footer style={{ marginTop: '3rem', textAlign: 'center', paddingBottom: '3rem' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            color: 'var(--text-muted)', fontSize: '0.78rem',
          }}>
            <span style={{ fontSize: '0.9rem' }}>🍵</span>
            <span>Powered by <strong style={{ color: 'white' }}>Pico</strong></span>
            <span>· Get your free page</span>
          </div>
        </Link>
      </footer>
    </div>
  );
}
