'use client';

import { useMemo, useState } from 'react';

import {
  useCreateObservation,
  useBulkObservation,
  useMediaUploadUrl,
  ObservationsApiError,
  OBSERVATION_CATEGORY_LABELS,
  type ObservationCategory,
  type ObservationMediaInput,
} from '@/lib/api/observations';
import type { SchoolClass } from '@/lib/api/classes';
import type { StudentSummary } from '@/lib/api/students';
import { useToast } from '@/lib/ui/use-toast';
import { OBSERVATION_CATEGORIES } from '@/lib/validation/observations.schemas';

interface Props {
  open: boolean;
  onClose: () => void;
  classes: SchoolClass[];
  students: StudentSummary[];
}

type Mode = 'single' | 'bulk';

const INPUT =
  'h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';
const TEXTAREA =
  'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';

function nowLocalInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateObservationModal({ open, onClose, classes, students }: Props) {
  const toast = useToast();
  const createMutation = useCreateObservation();
  const bulkMutation = useBulkObservation();
  const uploadUrlMutation = useMediaUploadUrl();

  const [mode, setMode] = useState<Mode>('single');
  const [studentId, setStudentId] = useState('');
  const [classId, setClassId] = useState('');
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [category, setCategory] = useState<ObservationCategory>('LANGAGE');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [observedAt, setObservedAt] = useState(nowLocalInput());
  const [visibleToParent, setVisibleToParent] = useState(false);
  const [media, setMedia] = useState<ObservationMediaInput[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classStudents = useMemo(
    () => students.filter((s) => (classId ? s.classId === classId : false)),
    [students, classId],
  );

  function resetState() {
    setMode('single');
    setStudentId('');
    setClassId('');
    setStudentIds([]);
    setCategory('LANGAGE');
    setTitle('');
    setContent('');
    setObservedAt(nowLocalInput());
    setVisibleToParent(false);
    setMedia([]);
    setUploading(false);
    setError(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function toggleStudent(id: string) {
    setStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleFileSelected(file: File) {
    setError(null);
    setUploading(true);
    try {
      const signed = await uploadUrlMutation.mutateAsync(file.type);
      const putRes = await fetch(signed.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`Échec du téléversement (${putRes.status})`);
      }
      setMedia((prev) => [...prev, { kind: signed.kind, url: signed.finalUrl }]);
      toast.success('Média ajouté.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Téléversement impossible.';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  function removeMedia(index: number) {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): string | null {
    if (!title.trim()) return 'Titre requis';
    if (!content.trim()) return 'Contenu requis';
    if (!observedAt) return 'Date requise';
    if (mode === 'single' && !studentId) return 'Élève requis';
    if (mode === 'bulk' && !classId) return 'Classe requise';
    if (mode === 'bulk' && studentIds.length === 0) return 'Sélectionnez au moins un élève';
    return null;
  }

  function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    const observedAtIso = new Date(observedAt).toISOString();

    if (mode === 'bulk') {
      bulkMutation.mutate(
        {
          studentIds,
          category,
          title: title.trim(),
          content: content.trim(),
          observedAt: observedAtIso,
          visibleToParent,
        },
        {
          onSuccess: (res) => {
            toast.success(`${res.created} observation(s) créée(s).`);
            handleClose();
          },
          onError: (err) =>
            toast.error(err instanceof ObservationsApiError ? err.message : 'Création impossible.'),
        },
      );
      return;
    }

    createMutation.mutate(
      {
        studentId,
        category,
        title: title.trim(),
        content: content.trim(),
        observedAt: observedAtIso,
        visibleToParent,
        media: media.length > 0 ? media : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Observation créée.');
          handleClose();
        },
        onError: (err) =>
          toast.error(err instanceof ObservationsApiError ? err.message : 'Création impossible.'),
      },
    );
  }

  if (!open) return null;

  const isPending = createMutation.isPending || bulkMutation.isPending;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-obs-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-navy-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
          <h2 id="create-obs-title" className="text-lg font-semibold">
            Nouvelle observation
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fermer la modale"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-6" style={{ maxHeight: '75vh' }}>
          {/* Mode toggle */}
          <div
            role="group"
            aria-label="Mode de saisie"
            className="mb-4 inline-flex rounded-md border p-0.5 text-sm"
          >
            <button
              type="button"
              onClick={() => setMode('single')}
              aria-pressed={mode === 'single'}
              className={`rounded px-3 py-1.5 font-medium ${
                mode === 'single' ? 'bg-navy-700 text-white' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Un élève
            </button>
            <button
              type="button"
              onClick={() => setMode('bulk')}
              aria-pressed={mode === 'bulk'}
              className={`rounded px-3 py-1.5 font-medium ${
                mode === 'bulk' ? 'bg-navy-700 text-white' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Plusieurs élèves
            </button>
          </div>

          <div className="space-y-4">
            {/* Target: single student */}
            {mode === 'single' ? (
              <div>
                <label htmlFor="obs-student" className="mb-1 block text-sm font-medium">
                  Élève <span aria-hidden="true">*</span>
                </label>
                <select
                  id="obs-student"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className={INPUT}
                >
                  <option value="">Sélectionner un élève…</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="obs-class" className="mb-1 block text-sm font-medium">
                    Classe <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="obs-class"
                    value={classId}
                    onChange={(e) => {
                      setClassId(e.target.value);
                      setStudentIds([]);
                    }}
                    className={INPUT}
                  >
                    <option value="">Sélectionner une classe…</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                {classId && (
                  <fieldset className="rounded-md border p-3">
                    <legend className="px-1 text-sm font-medium">
                      Élèves ({studentIds.length} sélectionné(s))
                    </legend>
                    {classStudents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun élève dans cette classe.</p>
                    ) : (
                      <div className="max-h-40 space-y-1 overflow-y-auto">
                        {classStudents.map((s) => (
                          <label
                            key={s.id}
                            className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted"
                          >
                            <input
                              type="checkbox"
                              checked={studentIds.includes(s.id)}
                              onChange={() => toggleStudent(s.id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            {s.firstName} {s.lastName}
                          </label>
                        ))}
                      </div>
                    )}
                  </fieldset>
                )}
              </>
            )}

            {/* Category + observedAt */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="obs-category" className="mb-1 block text-sm font-medium">
                  Catégorie <span aria-hidden="true">*</span>
                </label>
                <select
                  id="obs-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ObservationCategory)}
                  className={INPUT}
                >
                  {OBSERVATION_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {OBSERVATION_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="obs-date" className="mb-1 block text-sm font-medium">
                  Observé le <span aria-hidden="true">*</span>
                </label>
                <input
                  id="obs-date"
                  type="datetime-local"
                  value={observedAt}
                  onChange={(e) => setObservedAt(e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="obs-title" className="mb-1 block text-sm font-medium">
                Titre <span aria-hidden="true">*</span>
              </label>
              <input
                id="obs-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex. Progrès en expression orale"
                className={INPUT}
              />
            </div>

            {/* Content */}
            <div>
              <label htmlFor="obs-content" className="mb-1 block text-sm font-medium">
                Observation <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="obs-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="Décrivez ce qui a été observé…"
                className={TEXTAREA}
              />
            </div>

            {/* Visible to parent */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={visibleToParent}
                onChange={(e) => setVisibleToParent(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Visible par les parents
            </label>

            {/* Media (single mode only) */}
            {mode === 'single' && (
              <div>
                <span className="mb-1 block text-sm font-medium">
                  Médias{' '}
                  <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
                </span>
                {media.length > 0 && (
                  <ul className="mb-2 space-y-1">
                    {media.map((m, i) => (
                      <li
                        key={`${m.url}-${i}`}
                        className="flex items-center justify-between rounded border px-2 py-1 text-xs"
                      >
                        <span className="truncate">
                          {m.kind === 'PHOTO' ? '🖼️' : '🎬'} {m.url}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMedia(i)}
                          aria-label="Retirer ce média"
                          className="ml-2 shrink-0 text-rose-600 hover:underline"
                        >
                          Retirer
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <input
                  id="obs-media"
                  type="file"
                  accept="image/*,video/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFileSelected(file);
                    e.target.value = '';
                  }}
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
                />
                {uploading && (
                  <p className="mt-1 text-xs text-muted-foreground">Téléversement en cours…</p>
                )}
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-rose-600">
                {error}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="h-10 rounded-md border px-4 text-sm hover:bg-gray-50 dark:hover:bg-white/5"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || uploading}
              className="h-10 rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
            >
              {isPending ? 'Enregistrement…' : "Créer l'observation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
