/**
 * Tests for the shared student-selection helpers (@ecole-saas/shared).
 *
 * Behaviour requested: when picking students (activity, photo/journal, …) the
 * WHOLE class is checked by default, and the user can uncheck individuals.
 * Logic is pure + immutable so web and mobile share the exact same rules.
 */

import {
  initSelection,
  toggleStudent,
  selectAllStudents,
  clearSelection,
  isStudentSelected,
  isAllSelected,
  selectionToArray,
  selectionCount,
} from '@ecole-saas/shared';

const ROSTER = ['s1', 's2', 's3'];

describe('initSelection', () => {
  it('selects the whole roster by default (all checked)', () => {
    const sel = initSelection(ROSTER);
    expect(selectionToArray(sel).sort()).toEqual(['s1', 's2', 's3']);
    expect(isAllSelected(sel, ROSTER)).toBe(true);
  });

  it("starts empty when mode is 'none'", () => {
    const sel = initSelection(ROSTER, 'none');
    expect(selectionCount(sel)).toBe(0);
    expect(isAllSelected(sel, ROSTER)).toBe(false);
  });
});

describe('toggleStudent', () => {
  it('unchecks a selected student and rechecks it (immutably)', () => {
    const sel = initSelection(ROSTER);
    const without = toggleStudent(sel, 's2');
    expect(isStudentSelected(without, 's2')).toBe(false);
    expect(isStudentSelected(sel, 's2')).toBe(true); // original untouched
    expect(isAllSelected(without, ROSTER)).toBe(false);

    const back = toggleStudent(without, 's2');
    expect(isStudentSelected(back, 's2')).toBe(true);
    expect(isAllSelected(back, ROSTER)).toBe(true);
  });
});

describe('selectAllStudents / clearSelection', () => {
  it('selectAll checks every student', () => {
    const sel = selectAllStudents(ROSTER);
    expect(isAllSelected(sel, ROSTER)).toBe(true);
  });

  it('clear removes every student', () => {
    const sel = clearSelection();
    expect(selectionCount(sel)).toBe(0);
  });
});

describe('isAllSelected', () => {
  it('is false for an empty roster (nothing to select)', () => {
    expect(isAllSelected(initSelection([]), [])).toBe(false);
  });
});
