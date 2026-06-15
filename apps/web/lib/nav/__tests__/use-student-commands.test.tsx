import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/lib/api/students', () => ({
  listStudents: vi.fn(async () => ({
    items: [{ id: 's1', firstName: 'Lina', lastName: 'Ben Ali' }],
    total: 1,
    page: 1,
    pageSize: 5,
  })),
}));
vi.mock('@/lib/auth/use-auth-store', () => ({
  useAuthStore: (sel: (s: { accessToken: string | null }) => unknown) =>
    sel({ accessToken: 'tok' }),
}));

import { useStudentCommands } from '@/lib/nav/use-student-commands';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useStudentCommands', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ne cherche pas en dessous de 2 caractères', () => {
    const { result } = renderHook(() => useStudentCommands('l'), { wrapper });
    expect(result.current.results).toEqual([]);
  });

  it('mappe les élèves en commandes goto après debounce', async () => {
    const { result } = renderHook(() => useStudentCommands('lina'), { wrapper });
    await waitFor(() => expect(result.current.results.length).toBe(1));
    expect(result.current.results[0]).toMatchObject({
      kind: 'goto',
      label: 'Lina Ben Ali',
      href: '/students/s1',
      group: 'Élèves',
    });
  });
});
