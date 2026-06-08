import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="animate-fade">

      {/* Hero */}
      <header style={{ textAlign: 'center', marginTop: '3.5rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '0.75rem' }}>
          🍵 Pico
        </h1>
        <p style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Let your fans support you
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '280px', margin: '0 auto', lineHeight: 1.6 }}>
          Like "Buy Me a Tea" — but payments go straight to your MiniPay wallet in cUSD.
        </p>

        <Link
          href="/dashboard"
          className="btn btn-primary"
          style={{ textDecoration: 'none', fontSize: '1rem', display: 'block', marginTop: '2rem' }}
        >
          Create Your Page — Free
        </Link>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '0.6rem' }}>
          Open inside MiniPay · Takes 2 minutes
        </p>
      </header>

      {/* Mock creator page preview */}
      <section style={{ marginTop: '3.5rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textAlign: 'center', marginBottom: '1rem' }}>
          YOUR PAGE LOOKS LIKE THIS
        </p>

        <div className="glass" style={{ padding: '1.75rem', border: '1px solid rgba(53,208,127,0.2)' }}>
          {/* Mock profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #35d07f, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.3rem', fontWeight: 800, color: '#0a1a12',
            }}>
              A
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>@amara</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Web3 educator from Lagos 🇳🇬
              </div>
            </div>
          </div>

          {/* Mock support items */}
          {[
            { emoji: '🍵', title: 'Buy me a tea', price: '1', tag: 'Most popular' },
            { emoji: '📄', title: 'My Celo Starter Guide', price: '3', tag: 'PDF included' },
            { emoji: '🎯', title: 'Quick 15-min call', price: '10', tag: '' },
          ].map((item) => (
            <div key={item.title} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)',
              borderRadius: '14px', padding: '0.9rem 1rem', marginBottom: '0.6rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{item.emoji}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.title}</div>
                  {item.tag && <div style={{ color: 'var(--accent-celo)', fontSize: '0.68rem', fontWeight: 700 }}>{item.tag}</div>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent-celo)' }}>${item.price}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>cUSD</div>
              </div>
            </div>
          ))}

          <div className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', opacity: 0.6, pointerEvents: 'none' }}>
            Support with MiniPay
          </div>
        </div>
      </section>

      {/* Simple 3-step */}
      <section style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {[
          { n: '1', text: 'Open Pico in MiniPay — claim your @handle' },
          { n: '2', text: 'Add support tiers (tip, PDF, call — your choice)' },
          { n: '3', text: 'Share your link. Fans pay in cUSD. You earn instantly.' },
        ].map((s) => (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem' }} className="glass">
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(53,208,127,0.15)', border: '1px solid rgba(53,208,127,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-celo)',
            }}>
              {s.n}
            </div>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.4 }}>{s.text}</p>
          </div>
        ))}
      </section>

      <footer style={{ marginTop: '3.5rem', textAlign: 'center', paddingBottom: '3rem' }}>
        <Link href="/dashboard" className="btn btn-primary" style={{ textDecoration: 'none', display: 'block', width: '100%', marginBottom: '1rem' }}>
          Get My Free Page
        </Link>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
          Built on Celo · x402 Protocol · cUSD · No bank needed
        </p>
      </footer>
    </div>
  );
}
