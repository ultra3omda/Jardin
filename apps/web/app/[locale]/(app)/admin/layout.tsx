'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuthStore } from '@/lib/auth/use-auth-store';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user || user.role !== 'SUPER_ADMIN') {
      router.replace('/dashboard');
    }
  }, [isHydrated, user, router]);

  if (!isHydrated || !user || user.role !== 'SUPER_ADMIN') {
    return null;
  }
  return <>{children}</>;
}
