import type { Metadata } from 'next';
import '../styles/globals.css';

import { DrawEvolveProvider } from '../context/DrawEvolveProvider';
import LayoutClient from './layout-client';

export const metadata: Metadata = {
  title: 'DrawEvolve',
  description: 'DrawEvolve is your AI drawing coach.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DrawEvolveProvider>
          <LayoutClient>{children}</LayoutClient>
        </DrawEvolveProvider>
      </body>
    </html>
  );
}
