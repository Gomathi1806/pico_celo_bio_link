export default function TermsPage() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Terms of Service</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '2rem' }}>Last updated: July 2026</p>

      {[
        ['1. Service', 'Pico is a creator payment tool that lets creators share payment links and receive stablecoin payments directly to their wallets on the Celo network. Pico does not hold, custody, or intermediate funds.'],
        ['2. Payments', 'All payments are peer-to-peer on the Celo blockchain. Once a transaction is confirmed on-chain it is final and cannot be reversed. Pico collects a 1% platform fee on each transaction.'],
        ['3. Eligibility', 'You must be at least 18 years old to use Pico. You are responsible for complying with all laws applicable to your use of the service.'],
        ['4. Prohibited Use', 'You may not use Pico for illegal activity, fraud, money laundering, or any purpose that violates applicable law.'],
        ['5. No Warranty', 'Pico is provided "as is" without warranty of any kind. We do not guarantee uptime, transaction success, or accuracy of on-chain data.'],
        ['6. Limitation of Liability', 'To the maximum extent permitted by law, Pico is not liable for any indirect, incidental, or consequential damages arising from your use of the service.'],
        ['7. Changes', 'We may update these terms at any time. Continued use of Pico after changes constitutes acceptance.'],
        ['8. Contact', 'Questions? Email tgomathi1806@gmail.com'],
      ].map(([title, body]) => (
        <div key={title} style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>{title}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.7 }}>{body}</p>
        </div>
      ))}
    </div>
  );
}
