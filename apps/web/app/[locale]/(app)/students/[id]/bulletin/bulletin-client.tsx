'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useAuthStore } from '@/lib/auth/use-auth-store';

interface StudentDto {
  id: string;
  firstName: string;
  lastName: string;
  classroom: string;
}
interface GradePeriodDto {
  id: string;
  name: string;
  schoolYear: string;
}

interface Props {
  studentId: string;
}

export function BulletinClient({ studentId }: Props): JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const studentQ = useQuery<StudentDto>({
    queryKey: ['v6-bulletin-student', studentId],
    enabled: !!accessToken,
    queryFn: async () => {
      const r = await fetch(`/api/students/${studentId}`, {
        headers: { Authorization: `Bearer ${accessToken!}` },
      });
      if (!r.ok) throw new Error('STUDENT_LOAD_FAILED');
      return (await r.json()) as StudentDto;
    },
  });

  const periodsQ = useQuery<{ items: GradePeriodDto[] }>({
    queryKey: ['v6-bulletin-periods'],
    enabled: !!accessToken,
    queryFn: async () => {
      const r = await fetch('/api/grade-periods', {
        headers: { Authorization: `Bearer ${accessToken!}` },
      });
      if (!r.ok) throw new Error('PERIODS_LOAD_FAILED');
      return (await r.json()) as { items: GradePeriodDto[] };
    },
  });

  const generateMut = useMutation({
    mutationFn: async (gradePeriodId: string) => {
      setErrorCode(null);
      const r = await fetch('/api/bulletins/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken!}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId, gradePeriodId }),
      });
      if (!r.ok) {
        let code = 'BULLETIN_FAILED';
        try {
          const body = (await r.json()) as { code?: string };
          code = body.code ?? code;
        } catch {
          /* keep default */
        }
        throw new Error(code);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const periodName =
        periodsQ.data?.items.find((p) => p.id === gradePeriodId)?.name ?? gradePeriodId;
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulletin_${studentQ.data?.lastName ?? studentId}_${periodName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e: Error) => setErrorCode(e.message),
  });

  if (!accessToken) {
    return <p className="p-8 text-sm text-muted-foreground">Authentification requise.</p>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        Bulletin — {studentQ.data?.lastName?.toUpperCase()} {studentQ.data?.firstName}
      </h1>
      <p className="text-sm text-gray-600">Classe : {studentQ.data?.classroom}</p>

      <div className="space-y-3">
        <label htmlFor="period" className="block font-medium">
          Période à éditer
        </label>
        <select
          id="period"
          value={selectedPeriodId ?? ''}
          onChange={(e) => setSelectedPeriodId(e.target.value || null)}
          className="border rounded px-3 py-2 w-full"
        >
          <option value="">— Choisir une période —</option>
          {periodsQ.data?.items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.schoolYear})
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={!selectedPeriodId || generateMut.isPending}
          onClick={() => selectedPeriodId && generateMut.mutate(selectedPeriodId)}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {generateMut.isPending ? 'Génération…' : 'Générer le bulletin PDF'}
        </button>

        {errorCode && (
          <div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-900">
            Échec : {errorCode}
          </div>
        )}
      </div>
    </div>
  );
}
