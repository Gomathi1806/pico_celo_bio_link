import type { ReactNode } from 'react';
import '../../globals.css';

export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          body {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }
        `}</style>
      </head>
      <body style={{ background: 'transparent' }}>{children}</body>
    </html>
  );
}
