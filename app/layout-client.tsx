'use client';

import { useDrawEvolve } from '../context/DrawEvolveProvider';
import AppShell from '../components/AppShell';
import FloatingBuddy from '../components/floatingbuddy';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const { feedback, setFeedback } = useDrawEvolve();

  return (
    <>
      <AppShell>{children}</AppShell>
      <FloatingBuddy feedback={feedback} onCloseFeedback={() => setFeedback(null)} />
    </>
  );
}