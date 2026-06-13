'use client';

import { useState } from 'react';

import { Link } from '@/i18n/routing';
import {
  useHomeworkList,
  useCreateHomework,
  useUpdateHomework,
  useDeleteHomework,
  formatDueDate,
  type Homework,
} from '@/lib/api/homework';
import { useResource } from '@/lib/hooks/use-resource';
import { listClasses, type SchoolClass } from '@/lib/api/classes';
import { useToast } from '@/lib/ui/use-toast';

const INPUT =
  'h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';
const TEXTAREA =
  'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';

interface FormState {
  classId: string;
  title: string;
  instructions: string;
  dueDate: string;
}

const EMPTY: FormState = { classId: '', title: '', instructions: '', dueDate: '' };

export function HomeworkClient() {
  const toast = useToast();
  const [classFilter, setClassFilter] = useState('');
  const { data, isLoading, isError, refetch } = useHomeworkList(classFilter || undefined);
  const classesQuery = useResource(['classes'], (token) => listClasses(token));

  const createMutation = useCreateHomework();
  const updateMutation = useUpdateHomework();
  const deleteMutation = useDeleteHomework();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleting, setDeleting] = useState<Homework | null>(null);

  const classes: SchoolClass[] = classesQuery.data?.items ?? [];
  const items = data?.items ?? [];

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setFormOpen(true);
  }

  function openEdit(h: Homework) {
    setEditing(h);
    setForm({
      classId: h.classId,
      title: h.title,
      instructions: h.instructions,
      dueDate: h.dueDate.slice(0, 10),
    });
    setFormOpen(true);
  }

  function submitForm() {
    if (!form.title.trim() || !form.instructions.trim() || !form.dueDate) {
      toast.error('Titre, consignes et échéance sont requis.');
      return;
    }
    const dueIso = new Date(form.dueDate).toISOString();

    if (editing) {
      updateMutation.mutate(
        {
          id: editing.id,
          data: {
            title: form.title.trim(),
            instructions: form.instructions.trim(),
            dueDate: dueIso,
          },
        },
        {
          onSuccess: () => {
            toast.success('Devoir mis à jour.');
            setFormOpen(false);
          },
          onError: () => toast.error('Mise à jour impossible.'),
        },
      );
      return;
    }

    if (!form.classId) {
      toast.error('Sélectionnez une classe.');
      return;
    }
    createMutation.mutate(
      {
        classId: form.classId,
        title: form.title.trim(),
        instructions: form.instructions.trim(),
        dueDate: dueIso,
      },
      {
        onSuccess: () => {
          toast.success('Devoir créé.');
          setFormOpen(false);
        },
        onError: () => toast.error('Création impossible.'),
      },
    );
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Devoir supprimé.');
        setDeleting(null);
      },
      onError: () => toast.error('Suppression impossible.'),
    });
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="h-10 rounded-md border px-3 text-sm"
          aria-label="Filtrer par classe"
        >
          <option value="">Toutes les classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-10 items-center rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600"
        >
          + Nouveau devoir
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2" role="status" aria-label="Chargement des devoirs">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-10 text-center dark:border-rose-900/40 dark:bg-rose-900/10">
          <p className="text-sm text-rose-700 dark:text-rose-300">Impossible de charger les devoirs.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
          >
            Réessayer
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Aucun devoir pour l&apos;instant.</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Créer le premier devoir →
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                {['Titre', 'Classe', 'Échéance', 'Rendus', 'Actions'].map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
                      c === 'Actions' || c === 'Rendus' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((h) => (
                <tr key={h.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium">{h.title}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{h.className}</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                    {formatDueDate(h.dueDate)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">
                    {h.submittedCount}/{h.submissionCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/homework/${h.id}`}
                        className="text-xs font-medium text-navy-700 hover:underline dark:text-sky-300"
                      >
                        Suivi
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(h)}
                        aria-label={`Modifier ${h.title}`}
                        title="Modifier"
                        className="rounded p-1 text-base hover:bg-muted"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(h)}
                        aria-label={`Supprimer ${h.title}`}
                        title="Supprimer"
                        className="rounded p-1 text-base hover:bg-muted"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / edit modal */}
      {formOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hw-form-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-navy-800">
            <h2 id="hw-form-title" className="text-lg font-semibold">
              {editing ? 'Modifier le devoir' : 'Nouveau devoir'}
            </h2>

            <div className="mt-4 space-y-4">
              {!editing && (
                <div>
                  <label htmlFor="hw-class" className="mb-1 block text-sm font-medium">
                    Classe <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="hw-class"
                    value={form.classId}
                    onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                    className={INPUT}
                  >
                    <option value="">Sélectionner…</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="hw-title" className="mb-1 block text-sm font-medium">
                  Titre <span aria-hidden="true">*</span>
                </label>
                <input
                  id="hw-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={INPUT}
                  placeholder="ex. Exercices p.42"
                />
              </div>

              <div>
                <label htmlFor="hw-instructions" className="mb-1 block text-sm font-medium">
                  Consignes <span aria-hidden="true">*</span>
                </label>
                <textarea
                  id="hw-instructions"
                  value={form.instructions}
                  onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                  rows={4}
                  className={TEXTAREA}
                />
              </div>

              <div>
                <label htmlFor="hw-due" className="mb-1 block text-sm font-medium">
                  Échéance <span aria-hidden="true">*</span>
                </label>
                <input
                  id="hw-due"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className={INPUT}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="h-10 rounded-md border px-4 text-sm hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitForm}
                disabled={saving}
                className="h-10 rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hw-del-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-navy-800">
            <h2 id="hw-del-title" className="text-lg font-semibold">
              Supprimer ce devoir ?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              «&nbsp;{deleting.title}&nbsp;» sera retiré. Cette action est irréversible.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="h-10 rounded-md border px-4 text-sm hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="h-10 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
