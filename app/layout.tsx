import type { Metadata } from 'next';
import '../styles/globals.css';

import { DrawlyProvider } from '../context/DrawlyProvider';
import LayoutClient from './layout-client';

export const metadata: Metadata = {
  title: 'Drawly',
  description: 'Drawly is your AI drawing coach.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DrawlyProvider>
          <LayoutClient>{children}</LayoutClient>
        </DrawlyProvider>
      </body>
    </html>
  );
}
