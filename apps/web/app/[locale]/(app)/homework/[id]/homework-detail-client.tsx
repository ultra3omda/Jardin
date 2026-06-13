'use client';

import { useState } from 'react';

import { Link } from '@/i18n/routing';
import {
  useHomeworkDetail,
  useUpsertSubmission,
  formatDueDate,
  SUBMISSION_STATUS_LABELS,
  type HomeworkSubmission,
  type SubmissionStatus,
} from '@/lib/api/homework';
import { useToast } from '@/lib/ui/use-toast';

const STATUSES: SubmissionStatus[] = ['PENDING', 'SUBMITTED', 'LATE'];

interface SaveInput {
  studentId: string;
  status: SubmissionStatus;
  feedback?: string;
}

function SubmissionRow({
  submission,
  onSave,
  saving,
}: {
  submission: HomeworkSubmission;
  onSave: (v: SaveInput) => void;
  saving: boolean;
}) {
  const [status, setStatus] = useState<SubmissionStatus>(submission.status);
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const dirty = status !== submission.status || feedback !== (submission.feedback ?? '');

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3 text-sm font-medium">{submission.studentName}</td>
      <td className="px-4 py-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as SubmissionStatus)}
          aria-label={`Statut de ${submission.studentName}`}
          className="h-9 rounded-md border px-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {SUBMISSION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Retour (optionnel)"
          aria-label={`Retour pour ${submission.studentName}`}
          className="h-9 w-full rounded-md border px-2 text-sm"
        />
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => onSave({ studentId: submission.studentId, status, feedback: feedback.trim() || undefined })}
          className="h-9 rounded-md bg-navy-700 px-3 text-xs font-semibold text-white hover:bg-navy-600 disabled:opacity-40"
        >
          Enregistrer
        </button>
      </td>
    </tr>
  );
}

export function HomeworkDetailClient({ id }: { id: string }) {
  const toast = useToast();
  const { data, isLoading, isError, refetch } = useHomeworkDetail(id);
  const upsert = useUpsertSubmission(id);

  function handleSave(v: SaveInput) {
    upsert.mutate(v, {
      onSuccess: () => toast.success('Suivi mis à jour.'),
      onError: () => toast.error('Mise à jour impossible.'),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-2" role="status" aria-label="Chargement du devoir">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-10 text-center dark:border-rose-900/40 dark:bg-rose-900/10">
        <p className="text-sm text-rose-700 dark:text-rose-300">Impossible de charger ce devoir.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const { homework, submissions } = data;

  return (
    <div className="space-y-6">
      <Link href="/homework" className="text-sm font-medium text-navy-700 hover:underline dark:text-sky-300">
        ← Tous les devoirs
      </Link>

      <header className="rounded-xl border bg-card p-5">
        <h1 className="text-xl font-bold tracking-tight">{homework.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {homework.className} · à rendre le {formatDueDate(homework.dueDate)}
          {homework.subjectName ? ` · ${homework.subjectName}` : ''}
        </p>
        <p className="mt-3 whitespace-pre-wrap text-sm">{homework.instructions}</p>
        {homework.attachmentUrl && (
          <a
            href={homework.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-medium text-navy-700 hover:underline dark:text-sky-300"
          >
            📎 Pièce jointe
          </a>
        )}
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Suivi des rendus ({homework.submittedCount}/{homework.submissionCount})
        </h2>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                {['Élève', 'Statut', 'Retour', ''].map((c, i) => (
                  <th
                    key={c || i}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {submissions.map((s) => (
                <SubmissionRow
                  key={s.studentId}
                  submission={s}
                  onSave={handleSave}
                  saving={upsert.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
