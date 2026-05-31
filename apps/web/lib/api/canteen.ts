import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/http';

export type MealRegime = 'STANDARD' | 'VEGETARIAN' | 'HALAL' | 'NO_PORK' | 'OTHER';

// ─── Canteen menus (school-level) ─────────────────────────────────────────────
export interface CanteenMenu {
  id: string;
  date: string;
  starter: string | null;
  main: string | null;
  dessert: string | null;
  vegetarian: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ListCanteenMenusResponse {
  items: CanteenMenu[];
  total: number;
}
export interface CreateCanteenMenuInput {
  date: string;
  starter?: string;
  main?: string;
  dessert?: string;
  vegetarian?: string;
}
export type UpdateCanteenMenuInput = Omit<Partial<CreateCanteenMenuInput>, 'date'>;

const MENUS = '/api/canteen-menus';
export const listCanteenMenus = (token: string) =>
  apiGet<ListCanteenMenusResponse>(MENUS, token);
export const createCanteenMenu = (token: string, input: CreateCanteenMenuInput) =>
  apiPost<CanteenMenu>(MENUS, token, input);
export const updateCanteenMenu = (token: string, id: string, input: UpdateCanteenMenuInput) =>
  apiPatch<CanteenMenu>(`${MENUS}/${id}`, token, input);
export const deleteCanteenMenu = (token: string, id: string) => apiDelete(`${MENUS}/${id}`, token);

// ─── Meal plans (1 per student) ───────────────────────────────────────────────
export interface MealPlan {
  id: string;
  studentId: string;
  studentName: string;
  regime: MealRegime;
  allergies: string | null;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ListMealPlansResponse {
  items: MealPlan[];
  total: number;
}
export interface CreateMealPlanInput {
  studentId: string;
  regime?: MealRegime;
  allergies?: string;
  active?: boolean;
  notes?: string;
}
export type UpdateMealPlanInput = Omit<Partial<CreateMealPlanInput>, 'studentId'>;

const PLANS = '/api/meal-plans';
export const listMealPlans = (token: string) => apiGet<ListMealPlansResponse>(PLANS, token);
export const createMealPlan = (token: string, input: CreateMealPlanInput) =>
  apiPost<MealPlan>(PLANS, token, input);
export const updateMealPlan = (token: string, id: string, input: UpdateMealPlanInput) =>
  apiPatch<MealPlan>(`${PLANS}/${id}`, token, input);
export const deleteMealPlan = (token: string, id: string) => apiDelete(`${PLANS}/${id}`, token);
