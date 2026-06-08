import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pico — Sell Your Knowledge on Celo',
  description: 'The creator paywall built for MiniPay. Sell PDFs, articles, and guides — get paid in cUSD instantly.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
