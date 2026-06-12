'use client';

import { useState } from 'react';

import {
  useUpdateObservation,
  ObservationsApiError,
  OBSERVATION_CATEGORY_LABELS,
  type Observation,
  type ObservationCategory,
} from '@/lib/api/observations';
import { useToast } from '@/lib/ui/use-toast';
import { OBSERVATION_CATEGORIES } from '@/lib/validation/observations.schemas';

interface Props {
  observation: Observation;
  onClose: () => void;
}

const INPUT =
  'h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';
const TEXTAREA =
  'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';

export function EditObservationModal({ observation, onClose }: Props) {
  const toast = useToast();
  const mutation = useUpdateObservation();

  const [category, setCategory] = useState<ObservationCategory>(observation.category);
  const [title, setTitle] = useState(observation.title);
  const [content, setContent] = useState(observation.content);
  const [visibleToParent, setVisibleToParent] = useState(observation.visibleToParent);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!title.trim()) {
      setError('Titre requis');
      return;
    }
    if (!content.trim()) {
      setError('Contenu requis');
      return;
    }
    setError(null);
    mutation.mutate(
      {
        id: observation.id,
        data: {
          category,
          title: title.trim(),
          content: content.trim(),
          visibleToParent,
        },
      },
      {
        onSuccess: () => {
          toast.success('Observation mise à jour.');
          onClose();
        },
        onError: (err) =>
          toast.error(err instanceof ObservationsApiError ? err.message : 'Mise à jour impossible.'),
      },
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-obs-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-navy-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
          <h2 id="edit-obs-title" className="text-lg font-semibold">
            Modifier l&apos;observation
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la modale"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-6" style={{ maxHeight: '75vh' }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-obs-category" className="mb-1 block text-sm font-medium">
                Catégorie <span aria-hidden="true">*</span>
              </label>
              <select
                id="edit-obs-category"
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
              <label htmlFor="edit-obs-title" className="mb-1 block text-sm font-medium">
                Titre <span aria-hidden="true">*</span>
              </label>
              <input
                id="edit-obs-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={INPUT}
              />
            </div>

            <div>
              <label htmlFor="edit-obs-content" className="mb-1 block text-sm font-medium">
                Observation <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="edit-obs-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className={TEXTAREA}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={visibleToParent}
                onChange={(e) => setVisibleToParent(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Visible par les parents
            </label>

            {error && (
              <p role="alert" className="text-sm text-rose-600">
                {error}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-md border px-4 text-sm hover:bg-gray-50 dark:hover:bg-white/5"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="h-10 rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
            >
              {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
