"use client";
import { useIcons } from '@/lib/icons-registry';
import type { IconToken } from '@/lib/icons-registry';

export default function Icon({ name, size = 22 }: { name: IconToken; size?: number }) {
  const icons = useIcons();
  const Cmp = icons[name];
  return <Cmp width={size} height={size} stroke="currentColor" fill="currentColor" />;
}
