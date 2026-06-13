/**
 * Tests for the meal-plan helpers (régimes alimentaires, 1/élève).
 * joinStudentsWithPlans pairs each student with its plan (or null) so the
 * régimes screen can render the whole roster, including students with no plan.
 */

import { joinStudentsWithPlans, MEAL_REGIME_LABELS, type MealPlan } from '../meal-plans';

const students = [
  { id: 's1', firstName: 'Amine', lastName: 'B' },
  { id: 's2', firstName: 'Lina', lastName: 'C' },
];

const plan = (studentId: string): MealPlan => ({
  id: `mp-${studentId}`,
  studentId,
  studentName: 'x',
  regime: 'HALAL',
  allergies: null,
  active: true,
  notes: null,
  createdAt: '',
  updatedAt: '',
});

describe('joinStudentsWithPlans', () => {
  it('pairs each student with its plan, null when none', () => {
    const rows = joinStudentsWithPlans(students, [plan('s2')]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ student: students[0], plan: null });
    expect(rows[1]!.plan?.studentId).toBe('s2');
  });

  it('returns one row per student even with no plans', () => {
    const rows = joinStudentsWithPlans(students, []);
    expect(rows.map((r) => r.plan)).toEqual([null, null]);
  });
});

describe('MEAL_REGIME_LABELS', () => {
  it('has a label for every regime', () => {
    expect(Object.keys(MEAL_REGIME_LABELS).sort()).toEqual([
      'HALAL',
      'NO_PORK',
      'OTHER',
      'STANDARD',
      'VEGETARIAN',
    ]);
  });
});
