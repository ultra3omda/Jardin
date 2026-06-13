import { fetchApi } from './client';

/**
 * Régimes alimentaires (1 MealPlan / élève) — admin / personnel.
 * Miroir de apps/api/src/canteen/meal-plans.controller.ts.
 */
export type MealRegime = 'STANDARD' | 'VEGETARIAN' | 'HALAL' | 'NO_PORK' | 'OTHER';

export const MEAL_REGIME_LABELS: Record<MealRegime, string> = {
  STANDARD: 'Standard',
  VEGETARIAN: 'Végétarien',
  HALAL: 'Halal',
  NO_PORK: 'Sans porc',
  OTHER: 'Autre',
};

export const MEAL_REGIMES: MealRegime[] = ['STANDARD', 'VEGETARIAN', 'HALAL', 'NO_PORK', 'OTHER'];

export interface MealPlan {
  id: string;
  studentId: string;
  studentName: string;
  regime: MealRegime;
  allergies?: string | null;
  active: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ListMealPlansResponse {
  items: MealPlan[];
  total: number;
}

export interface MealPlanInput {
  regime?: MealRegime;
  allergies?: string;
  notes?: string;
}

export const MEAL_PLANS_KEY = ['meal-plans'] as const;

export function listMealPlans(): Promise<ListMealPlansResponse> {
  return fetchApi<ListMealPlansResponse>('/api/meal-plans');
}

export function createMealPlan(
  input: MealPlanInput & { studentId: string },
): Promise<MealPlan> {
  return fetchApi<MealPlan>('/api/meal-plans', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateMealPlan(id: string, input: MealPlanInput): Promise<MealPlan> {
  return fetchApi<MealPlan>(`/api/meal-plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteMealPlan(id: string): Promise<void> {
  return fetchApi<void>(`/api/meal-plans/${id}`, { method: 'DELETE' });
}

interface StudentLite {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Pair every student with its meal plan (or null). Lets the régimes screen show
 * the whole roster — including students who have no plan yet.
 */
export function joinStudentsWithPlans<T extends StudentLite>(
  students: T[],
  plans: MealPlan[],
): Array<{ student: T; plan: MealPlan | null }> {
  const byStudent = new Map(plans.map((p) => [p.studentId, p]));
  return students.map((student) => ({ student, plan: byStudent.get(student.id) ?? null }));
}
