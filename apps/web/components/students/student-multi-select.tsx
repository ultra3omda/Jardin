'use client';

import {
  clearSelection,
  isAllSelected,
  selectAllStudents,
  selectionToArray,
  toggleStudent,
} from '@ecole-saas/shared';

interface StudentLite {
  id: string;
  firstName: string;
  lastName: string;
}

interface StudentMultiSelectProps {
  /** Roster to choose from (typically the students of the selected class). */
  students: StudentLite[];
  /** Currently selected student ids (controlled). */
  value: string[];
  /** Called with the new selection on every change. */
  onChange: (ids: string[]) => void;
  label?: string;
  emptyHint?: string;
  /** Tailwind max-height for the scrollable list. */
  maxHeightClass?: string;
}

/**
 * Reusable "pick students" control. Pair it with a parent that initialises
 * `value` to the whole roster (all checked by default) — see
 * `@ecole-saas/shared` selection helpers. Provides Tout / Aucun shortcuts,
 * a live counter and per-student toggles.
 */
export function StudentMultiSelect({
  students,
  value,
  onChange,
  label = 'Élèves',
  emptyHint = 'Aucun élève.',
  maxHeightClass = 'max-h-48',
}: StudentMultiSelectProps) {
  const allIds = students.map((s) => s.id);
  const selected = new Set(value);
  const allChecked = isAllSelected(selected, allIds);

  return (
    <fieldset className="rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">
        {label} ({value.length}/{students.length} sélectionné{value.length > 1 ? 's' : ''})
      </legend>

      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      ) : (
        <>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => onChange(selectionToArray(selectAllStudents(allIds)))}
              disabled={allChecked}
              className="rounded border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-40"
            >
              Tout sélectionner
            </button>
            <button
              type="button"
              onClick={() => onChange(selectionToArray(clearSelection()))}
              disabled={value.length === 0}
              className="rounded border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-40"
            >
              Tout décocher
            </button>
          </div>

          <div className={`${maxHeightClass} space-y-1 overflow-y-auto`}>
            {students.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => onChange(selectionToArray(toggleStudent(selected, s.id)))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                {s.firstName} {s.lastName}
              </label>
            ))}
          </div>
        </>
      )}
    </fieldset>
  );
}
