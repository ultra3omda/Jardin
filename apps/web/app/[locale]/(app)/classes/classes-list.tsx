'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { Link } from '@/i18n/routing';
import {
  createClass,
  deleteClass,
  listClasses,
  updateClass,
  type SchoolClass,
} from '@/lib/api/classes';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/lib/ui/use-toast';
import { CrudModal } from '@/components/crud/crud-modal';
import { ResourceListPage } from '@/components/crud/resource-list-page';

const CLASSES_KEY = ['classes', 'list'] as const;
const CURRENT_YEAR = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
const YEAR_PATTERN = /^\d{4}-\d{4}$/;
const INPUT = 'mt-1 h-10 w-full rounded-md border px-3 text-sm';

export function ClassesList() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(CLASSES_KEY, (token) => listClasses(token));

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', level: '', schoolYear: CURRENT_YEAR });
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [editForm, setEditForm] = useState({ name: '', level: '' });
  const [deleting, setDeleting] = useState<SchoolClass | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: CLASSES_KEY });

  const createMutation = useMutation({
    mutationFn: () => createClass(accessToken as string, createForm),
    onSuccess: () => {
      setShowCreate(false);
      setCreateForm({ name: '', level: '', schoolYear: CURRENT_YEAR });
      setFormError(null);
      invalidate();
      toast.success('Classe créée.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec de la création.'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateClass(accessToken as string, editing!.id, { name: editForm.name.trim(), level: editForm.level.trim() }),
    onSuccess: () => {
      setEditing(null);
      invalidate();
      toast.success('Classe mise à jour.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec de la mise à jour.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteClass(accessToken as string, deleting!.id),
    onSuccess: () => {
      setDeleting(null);
      invalidate();
      toast.success('Classe supprimée.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec de la suppression.'),
  });

  const items = data?.items ?? [];

  function submitCreate(e: FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.level.trim() || !YEAR_PATTERN.test(createForm.schoolYear)) {
      setFormError('Renseignez un nom, un niveau et une année au format AAAA-AAAA.');
      return;
    }
    createMutation.mutate();
  }

  function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.level.trim()) {
      setFormError('Le nom et le niveau sont requis.');
      return;
    }
    setFormError(null);
    updateMutation.mutate();
  }

  function openEdit(c: SchoolClass) {
    setEditForm({ name: c.name, level: c.level });
    setFormError(null);
    setEditing(c);
  }

  return (
    <>
      <ResourceListPage
        title="Classes"
        description="Gérez les classes de l'établissement."
        action={
          isAdmin ? (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setShowCreate(true);
              }}
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              + Nouvelle classe
            </button>
          ) : undefined
        }
        isLoading={isLoading}
        isError={isError}
        isEmpty={items.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les classes."
        emptyTitle="Aucune classe enregistrée"
        emptyDescription="Créez votre première classe pour commencer."
        emptyAction={
          isAdmin ? { label: '+ Nouvelle classe', onClick: () => setShowCreate(true) } : undefined
        }
      >
        <ul className="divide-y divide-border overflow-hidden rounded-lg border bg-card">
          {items.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-4 px-4 py-4 transition hover:bg-muted/40"
            >
              <Link href={`/classes/${c.id}` as never} className="min-w-0 flex-1">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Niveau {c.level} · Année {c.schoolYear}
                </p>
              </Link>
              {isAdmin && (
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(c)}
                    className="text-xs font-medium text-rose-600 hover:underline"
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </ResourceListPage>

      <CrudModal open={showCreate} title="Nouvelle classe" onClose={() => setShowCreate(false)}>
        <form onSubmit={submitCreate} className="space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="cls-name">Nom *</label>
            <input id="cls-name" value={createForm.name} placeholder="CP-A" className={INPUT}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="cls-level">Niveau *</label>
            <input id="cls-level" value={createForm.level} placeholder="CP" className={INPUT}
              onChange={(e) => setCreateForm({ ...createForm, level: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="cls-year">Année scolaire *</label>
            <input id="cls-year" value={createForm.schoolYear} pattern="^\d{4}-\d{4}$" className={INPUT}
              onChange={(e) => setCreateForm({ ...createForm, schoolYear: e.target.value })} />
          </div>
          {formError && <p className="text-sm text-rose-600">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="h-10 rounded-md border px-4 text-sm hover:bg-muted/50">Annuler</button>
            <button type="submit" disabled={createMutation.isPending}
              className="h-10 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
              {createMutation.isPending ? 'Création…' : 'Créer la classe'}
            </button>
          </div>
        </form>
      </CrudModal>

      <CrudModal open={editing !== null} title="Modifier la classe" onClose={() => setEditing(null)}>
        <form onSubmit={submitEdit} className="space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="edit-name">Nom *</label>
            <input id="edit-name" value={editForm.name} className={INPUT}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="edit-level">Niveau *</label>
            <input id="edit-level" value={editForm.level} className={INPUT}
              onChange={(e) => setEditForm({ ...editForm, level: e.target.value })} />
          </div>
          <p className="text-xs text-muted-foreground">L&apos;année scolaire n&apos;est pas modifiable.</p>
          {formError && <p className="text-sm text-rose-600">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="h-10 rounded-md border px-4 text-sm hover:bg-muted/50">Annuler</button>
            <button type="submit" disabled={updateMutation.isPending}
              className="h-10 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
              {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </CrudModal>

      <CrudModal open={deleting !== null} title="Supprimer la classe" onClose={() => setDeleting(null)}>
        <p className="text-sm text-muted-foreground">
          Voulez-vous vraiment supprimer <strong>{deleting?.name}</strong> ? Cette action est définitive.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setDeleting(null)} className="h-10 rounded-md border px-4 text-sm hover:bg-muted/50">Annuler</button>
          <button type="button" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}
            className="h-10 rounded-md bg-rose-600 px-6 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50">
            {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </CrudModal>
    </>
  );
}
