'use client';

import { useDrawly } from '../context/DrawlyProvider';
import AppShell from '../components/AppShell';
import FloatingBuddy from '../components/floatingbuddy';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const { feedback, setFeedback } = useDrawly();

  return (
    <>
      <AppShell>{children}</AppShell>
      <FloatingBuddy feedback={feedback} onCloseFeedback={() => setFeedback(null)} />
    </>
  );
}