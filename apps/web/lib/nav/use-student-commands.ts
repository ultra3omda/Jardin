'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listStudents } from '@/lib/api/students';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import type { Command } from '@/lib/nav/commands';

/** Recherche d'élèves (serveur, debouncée 200ms) → commandes "goto" pour la palette. */
export function useStudentCommands(query: string): { results: Command[]; loading: boolean } {
  const token = useAuthStore((s) => s.accessToken);
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const enabled = !!token && debounced.length >= 2;
  const { data, isFetching } = useQuery({
    queryKey: ['cmdk-students', debounced],
    queryFn: () => listStudents(token as string, { search: debounced, pageSize: 5 }),
    enabled,
  });

  const results: Command[] = (data?.items ?? []).map((s) => ({
    id: `student:${s.id}`,
    kind: 'goto',
    label: `${s.firstName} ${s.lastName}`,
    href: `/students/${s.id}`,
    group: 'Élèves',
  }));

  return { results, loading: enabled && isFetching };
}
