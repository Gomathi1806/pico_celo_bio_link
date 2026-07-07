export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '2rem' }}>Last updated: July 2026</p>

      {[
        ['Information We Collect', 'We store your wallet address, display name, payment link details, and transaction hashes. We do not collect email addresses, phone numbers, or any personal identity information unless you contact us directly.'],
        ['How We Use It', 'Your wallet address is used to route payments and identify your account. Transaction hashes are stored to verify payments on-chain. We do not sell or share your data with third parties.'],
        ['On-Chain Data', 'Payments made through Pico are recorded on the Celo blockchain and are publicly visible. This is inherent to how blockchain technology works and is outside our control.'],
        ['Cookies & Analytics', 'Pico does not use tracking cookies. We may use anonymous page-view analytics to understand usage.'],
        ['Data Retention', 'We retain your account data for as long as your account is active. You may request deletion by emailing us.'],
        ['Security', 'We use industry-standard security practices. We never store private keys or seed phrases.'],
        ['Contact', 'Privacy questions? Email tgomathi1806@gmail.com'],
      ].map(([title, body]) => (
        <div key={title} style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>{title}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.7 }}>{body}</p>
        </div>
      ))}
    </div>
  );
}
