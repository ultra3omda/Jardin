/**
 * Tests for diffStudentAssignments — the pure reconciliation used when saving
 * the "assign students to a bus route" sheet. The API only exposes single
 * create/delete, so we compute which students to add and which to remove from
 * the currently-assigned set vs. the new selection.
 */

import { diffStudentAssignments } from '../transport';

describe('diffStudentAssignments', () => {
  it('adds newly-checked and removes unchecked students', () => {
    const result = diffStudentAssignments(['a', 'b', 'c'], ['b', 'c', 'd']);
    expect(result.toAdd.sort()).toEqual(['d']);
    expect(result.toRemove.sort()).toEqual(['a']);
  });

  it('is a no-op when the selection is unchanged', () => {
    expect(diffStudentAssignments(['a', 'b'], ['b', 'a'])).toEqual({ toAdd: [], toRemove: [] });
  });

  it('adds all when nothing was assigned before', () => {
    expect(diffStudentAssignments([], ['a', 'b'])).toEqual({ toAdd: ['a', 'b'], toRemove: [] });
  });

  it('removes all when the selection is cleared', () => {
    const result = diffStudentAssignments(['a', 'b'], []);
    expect(result.toAdd).toEqual([]);
    expect(result.toRemove.sort()).toEqual(['a', 'b']);
  });
});
