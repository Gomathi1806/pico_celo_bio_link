import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pico — Sell Your Knowledge on Celo',
  description: 'The creator paywall built for MiniPay. Sell PDFs, articles, and guides — get paid in cUSD instantly.',
  other: {
    'talentapp:project_verification': '85c061cd73e2dc76462bfbfb4386b694f8ed1ffcd32f18860988ae5e159f99903b2bf27cd8f737cfb12f5e66a9fa68c7c6bc59885f477ef35c9946983f690d6d',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
