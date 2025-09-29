import type { Metadata } from 'next';
import '../styles/globals.css';

import { DrawlyProvider } from '../context/DrawlyProvider';
import AppShell from '../components/AppShell';
import FloatingBuddy from '../components/FloatingBuddy';

export const metadata: Metadata = {
  title: 'Drawly',
  description: 'Drawly is your AI drawing coach.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DrawlyProvider>
          <AppShell>{children}</AppShell>
          {/* Floating draggable pencil buddy, rendered on every page */}
          <FloatingBuddy />
        </DrawlyProvider>
      </body>
    </html>
  );
}
