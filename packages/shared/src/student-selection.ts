/**
 * Pure, immutable helpers for "pick students" UIs (activities, photo / daily
 * journal, announcements, homework, …).
 *
 * Product rule: the WHOLE class roster is checked by default, and the user can
 * uncheck individuals. Keeping the logic here (no React) lets web and mobile
 * share identical behaviour and a single set of unit tests.
 */

export type StudentSelection = ReadonlySet<string>;

/** Initial selection — the whole roster by default ('all'), or empty ('none'). */
export function initSelection(
  allIds: readonly string[],
  mode: 'all' | 'none' = 'all',
): StudentSelection {
  return mode === 'all' ? new Set(allIds) : new Set();
}

/** Toggle one student; returns a NEW selection (never mutates the input). */
export function toggleStudent(selection: StudentSelection, id: string): StudentSelection {
  const next = new Set(selection);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

/** Select every student in the roster. */
export function selectAllStudents(allIds: readonly string[]): StudentSelection {
  return new Set(allIds);
}

/** Deselect everyone. */
export function clearSelection(): StudentSelection {
  return new Set();
}

export function isStudentSelected(selection: StudentSelection, id: string): boolean {
  return selection.has(id);
}

/** True only when every roster member is selected (false for an empty roster). */
export function isAllSelected(selection: StudentSelection, allIds: readonly string[]): boolean {
  return allIds.length > 0 && allIds.every((id) => selection.has(id));
}

export function selectionToArray(selection: StudentSelection): string[] {
  return Array.from(selection);
}

export function selectionCount(selection: StudentSelection): number {
  return selection.size;
}
