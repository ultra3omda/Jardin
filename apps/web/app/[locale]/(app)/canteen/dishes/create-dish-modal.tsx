'use client';

import { useState } from 'react';

import { useCreateDish, CanteenApiError } from '@/lib/api/canteen-reservation';
import { useToast } from '@/lib/ui/use-toast';
import { createDishSchema } from '@/lib/validation/canteen-reservation.schemas';

interface Props {
  open: boolean;
  onClose: () => void;
}

const INPUT =
  'h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500';

/** Parse a comma-separated string into a trimmed, de-duplicated list of tags. */
function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(',')) {
    const v = part.trim();
    if (v) seen.add(v);
  }
  return [...seen];
}

export function CreateDishModal({ open, onClose }: Props) {
  const toast = useToast();
  const createMutation = useCreateDish();

  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [allergens, setAllergens] = useState('');
  const [error, setError] = useState<string | null>(null);

  function resetState() {
    setName('');
    setIngredients('');
    setAllergens('');
    setError(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function handleSubmit() {
    const ingredientList = parseTags(ingredients);
    const allergenList = parseTags(allergens);
    const parsed = createDishSchema.safeParse({
      name,
      ingredients: ingredientList,
      allergens: allergenList,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Formulaire invalide');
      return;
    }
    setError(null);

    createMutation.mutate(
      {
        name: parsed.data.name,
        ingredients: ingredientList.length > 0 ? ingredientList : undefined,
        allergens: allergenList.length > 0 ? allergenList : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Plat créé.');
          handleClose();
        },
        onError: (err) =>
          toast.error(err instanceof CanteenApiError ? err.message : 'Création impossible.'),
      },
    );
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-dish-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-navy-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
          <h2 id="create-dish-title" className="text-lg font-semibold">
            Nouveau plat
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

        <div className="space-y-4 p-6">
          <div>
            <label htmlFor="dish-name" className="mb-1 block text-sm font-medium">
              Nom du plat <span aria-hidden="true">*</span>
            </label>
            <input
              id="dish-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Couscous au poulet"
              className={INPUT}
            />
          </div>

          <div>
            <label htmlFor="dish-ingredients" className="mb-1 block text-sm font-medium">
              Ingrédients{' '}
              <span className="text-xs font-normal text-muted-foreground">
                (séparés par des virgules)
              </span>
            </label>
            <input
              id="dish-ingredients"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="semoule, poulet, carottes, pois chiches"
              className={INPUT}
            />
          </div>

          <div>
            <label htmlFor="dish-allergens" className="mb-1 block text-sm font-medium">
              Allergènes{' '}
              <span className="text-xs font-normal text-muted-foreground">
                (séparés par des virgules)
              </span>
            </label>
            <input
              id="dish-allergens"
              value={allergens}
              onChange={(e) => setAllergens(e.target.value)}
              placeholder="gluten, fruits à coque"
              className={INPUT}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-rose-600">
              {error}
            </p>
          )}

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
              disabled={createMutation.isPending}
              className="h-10 rounded-md bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Enregistrement…' : 'Créer le plat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
