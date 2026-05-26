'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useAuthStore } from '@/lib/auth/use-auth-store';

interface SubjectDto {
  id: string;
  name: string;
  code?: string | null;
}
interface GradePeriodDto {
  id: string;
  name: string;
  schoolYear: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
}
interface EvaluationDto {
  id: string;
  classId: string;
  subjectId: string;
  gradePeriodId: string;
  title: string;
  date: string;
  maxScore: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
interface GradeDto {
  id: string;
  evaluationId: string;
  studentId: string;
  score: number;
}
interface StudentDto {
  id: string;
  firstName: string;
  lastName: string;
  classroom: string;
}
interface ClassDto {
  id: string;
  name: string;
  level: string;
  schoolYear: string;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function jsonOk<T>(r: Response): Promise<T> {
  if (!r.ok) {
    let code = 'REQUEST_FAILED';
    try {
      const j = (await r.json()) as { code?: string };
      code = j.code ?? code;
    } catch {
      /* keep default */
    }
    throw new Error(code);
  }
  return r.json() as Promise<T>;
}

interface Props {
  classId: string;
}

export function GradesClient({ classId }: Props): JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ subjectId: '', title: '', date: '', maxScore: 20 });
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const classQ = useQuery<ClassDto>({
    queryKey: ['v6-class', classId],
    enabled: !!accessToken,
    queryFn: () => fetch(`/api/classes/${classId}`, { headers: authHeaders(accessToken!) }).then(jsonOk<ClassDto>),
  });

  const subjectsQ = useQuery<{ items: SubjectDto[] }>({
    queryKey: ['v6-subjects'],
    enabled: !!accessToken,
    queryFn: () => fetch('/api/subjects', { headers: authHeaders(accessToken!) }).then(jsonOk<{ items: SubjectDto[] }>),
  });

  const periodsQ = useQuery<{ items: GradePeriodDto[] }>({
    queryKey: ['v6-grade-periods', classQ.data?.schoolYear],
    enabled: !!accessToken && !!classQ.data?.schoolYear,
    queryFn: () =>
      fetch(`/api/grade-periods?schoolYear=${classQ.data!.schoolYear}`, {
        headers: authHeaders(accessToken!),
      }).then(jsonOk<{ items: GradePeriodDto[] }>),
  });

  const studentsQ = useQuery<{ items: StudentDto[] }>({
    queryKey: ['v6-students-by-classroom', classQ.data?.name],
    enabled: !!accessToken && !!classQ.data?.name,
    queryFn: () =>
      fetch(`/api/students?classroom=${encodeURIComponent(classQ.data!.name)}`, {
        headers: authHeaders(accessToken!),
      }).then(jsonOk<{ items: StudentDto[] }>),
  });

  const evaluationsQ = useQuery<{ items: EvaluationDto[] }>({
    queryKey: ['v6-evaluations', classId, selectedPeriodId],
    enabled: !!accessToken && !!classId && !!selectedPeriodId,
    queryFn: () =>
      fetch(`/api/evaluations?classId=${classId}&gradePeriodId=${selectedPeriodId}`, {
        headers: authHeaders(accessToken!),
      }).then(jsonOk<{ items: EvaluationDto[] }>),
  });

  useEffect(() => {
    if (!selectedPeriodId && periodsQ.data?.items?.length) {
      const today = new Date().toISOString().slice(0, 10);
      const current = periodsQ.data.items.find(
        (p) => p.startDate.slice(0, 10) <= today && p.endDate.slice(0, 10) >= today,
      );
      setSelectedPeriodId(current?.id ?? periodsQ.data.items[0].id);
    }
  }, [periodsQ.data, selectedPeriodId]);

  const selectedPeriod = periodsQ.data?.items.find((p) => p.id === selectedPeriodId);
  const isClosed = selectedPeriod?.isClosed ?? false;

  const createEval = useMutation({
    mutationFn: async () => {
      setErrorCode(null);
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: authHeaders(accessToken!),
        body: JSON.stringify({
          classId,
          subjectId: createForm.subjectId,
          gradePeriodId: selectedPeriodId,
          title: createForm.title,
          date: createForm.date,
          maxScore: Number(createForm.maxScore),
        }),
      });
      return jsonOk<EvaluationDto>(res);
    },
    onSuccess: () => {
      setCreateOpen(false);
      setCreateForm({ subjectId: '', title: '', date: '', maxScore: 20 });
      qc.invalidateQueries({ queryKey: ['v6-evaluations', classId, selectedPeriodId] });
    },
    onError: (e: Error) => setErrorCode(e.message),
  });

  const upsertGrade = useMutation({
    mutationFn: async (args: { evaluationId: string; studentId: string; score: number }) => {
      setErrorCode(null);
      const res = await fetch(`/api/evaluations/${args.evaluationId}/grades`, {
        method: 'PUT',
        headers: authHeaders(accessToken!),
        body: JSON.stringify({ studentId: args.studentId, score: args.score }),
      });
      return jsonOk<GradeDto>(res);
    },
    onSuccess: (_d, args) =>
      qc.invalidateQueries({ queryKey: ['v6-eval-detail', args.evaluationId] }),
    onError: (e: Error) => setErrorCode(e.message),
  });

  if (!accessToken) {
    return <p className="p-8 text-sm text-muted-foreground">Authentification requise.</p>;
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">
        Notes — {classQ.data?.name}{' '}
        {classQ.data && (
          <span className="text-sm font-normal text-muted-foreground">
            ({classQ.data.level} {classQ.data.schoolYear})
          </span>
        )}
      </h1>

      <div className="flex flex-wrap gap-3 items-center">
        <label htmlFor="period" className="font-medium">
          Période :
        </label>
        <select
          id="period"
          value={selectedPeriodId ?? ''}
          onChange={(e) => setSelectedPeriodId(e.target.value)}
          className="border rounded px-3 py-1.5"
        >
          {periodsQ.data?.items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.schoolYear}) {p.isClosed ? '— clôturée' : ''}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={!selectedPeriodId || isClosed}
          onClick={() => setCreateOpen((v) => !v)}
          className="ml-auto px-3 py-1.5 rounded bg-black text-white disabled:opacity-50"
        >
          + Nouvelle évaluation
        </button>
      </div>

      {isClosed && (
        <div role="alert" className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">
          Cette période est clôturée — les notes ne sont plus modifiables.
        </div>
      )}

      {errorCode && (
        <div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-900">
          Erreur : {errorCode}
        </div>
      )}

      {createOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createEval.mutate();
          }}
          className="border rounded p-4 space-y-3 bg-gray-50"
        >
          <h2 className="font-semibold">Nouvelle évaluation</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              required
              value={createForm.subjectId}
              onChange={(e) => setCreateForm((f) => ({ ...f, subjectId: e.target.value }))}
              className="border rounded px-3 py-1.5"
              aria-label="Matière"
            >
              <option value="">— Matière —</option>
              {subjectsQ.data?.items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              required
              type="text"
              placeholder="Titre (ex: Contrôle chap 3)"
              value={createForm.title}
              onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
              className="border rounded px-3 py-1.5"
              aria-label="Titre"
            />
            <input
              required
              type="date"
              value={createForm.date}
              onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))}
              className="border rounded px-3 py-1.5"
              aria-label="Date"
            />
            <input
              required
              type="number"
              min={0.01}
              step={0.5}
              max={1000}
              value={createForm.maxScore}
              onChange={(e) => setCreateForm((f) => ({ ...f, maxScore: Number(e.target.value) }))}
              className="border rounded px-3 py-1.5"
              aria-label="Barème"
            />
          </div>
          <button
            type="submit"
            disabled={createEval.isPending}
            className="px-3 py-1.5 rounded bg-black text-white disabled:opacity-50"
          >
            {createEval.isPending ? 'Création…' : 'Créer'}
          </button>
        </form>
      )}

      <div className="space-y-6">
        {evaluationsQ.data?.items.length === 0 && (
          <p className="text-gray-500">Aucune évaluation pour cette période.</p>
        )}
        {evaluationsQ.data?.items.map((evaluation) => (
          <EvaluationCard
            key={evaluation.id}
            evaluation={evaluation}
            students={studentsQ.data?.items ?? []}
            subjects={subjectsQ.data?.items ?? []}
            isClosed={isClosed}
            accessToken={accessToken}
            onScoreChange={(studentId, score) =>
              upsertGrade.mutate({ evaluationId: evaluation.id, studentId, score })
            }
          />
        ))}
      </div>
    </div>
  );
}

interface EvalDetail {
  evaluation: EvaluationDto;
  grades: GradeDto[];
}

function EvaluationCard({
  evaluation,
  students,
  subjects,
  isClosed,
  accessToken,
  onScoreChange,
}: {
  evaluation: EvaluationDto;
  students: StudentDto[];
  subjects: SubjectDto[];
  isClosed: boolean;
  accessToken: string;
  onScoreChange: (studentId: string, score: number) => void;
}): JSX.Element {
  const detailQ = useQuery<EvalDetail>({
    queryKey: ['v6-eval-detail', evaluation.id],
    queryFn: () =>
      fetch(`/api/evaluations/${evaluation.id}`, { headers: authHeaders(accessToken) }).then(
        jsonOk<EvalDetail>,
      ),
  });

  const subjectName =
    subjects.find((s) => s.id === evaluation.subjectId)?.name ?? evaluation.subjectId;

  const gradeByStudent = new Map<string, number>();
  detailQ.data?.grades.forEach((g) => gradeByStudent.set(g.studentId, g.score));

  return (
    <div className="border rounded p-4">
      <div className="flex justify-between items-baseline mb-3">
        <h3 className="font-semibold">
          {evaluation.title} — {subjectName}
        </h3>
        <span className="text-sm text-gray-500">
          {new Date(evaluation.date).toLocaleDateString('fr-FR')} · /{evaluation.maxScore}
        </span>
      </div>
      {students.length === 0 ? (
        <p className="text-sm text-gray-500">
          Aucun élève dans cette classe (vérifier que <code>student.classroom</code> correspond au nom
          de la classe).
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="py-1">Élève</th>
              <th className="py-1 w-32 text-right">Note</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st) => {
              const current = gradeByStudent.get(st.id);
              return (
                <tr key={st.id} className="border-t">
                  <td className="py-1.5">
                    {st.lastName.toUpperCase()} {st.firstName}
                  </td>
                  <td className="py-1.5 text-right">
                    <input
                      type="number"
                      min={0}
                      max={evaluation.maxScore}
                      step={0.25}
                      defaultValue={current ?? ''}
                      disabled={isClosed}
                      aria-label={`Note ${st.lastName} ${st.firstName}`}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v === '') return;
                        const n = Number(v);
                        if (Number.isFinite(n) && n !== current) onScoreChange(st.id, n);
                      }}
                      className="border rounded px-2 py-1 w-24 text-right disabled:bg-gray-100"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
