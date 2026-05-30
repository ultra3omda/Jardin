import { adminRequest } from './admin-client';

export interface Overview {
  tenants: number;
  users: number;
  students: number;
  pendingDemoRequests: number;
}

export interface GrowthPoint {
  month: string;
  newTenants: number;
  cumulativeTenants: number;
}

export interface CategoryCount {
  label: string;
  count: number;
}

export interface Analytics {
  tenantGrowth: GrowthPoint[];
  tenantsByType: CategoryCount[];
  tenantsByLocale: CategoryCount[];
  usersByRole: CategoryCount[];
}

export function getOverview(token: string): Promise<Overview> {
  return adminRequest<Overview>('/overview', token);
}

export function getAnalytics(token: string): Promise<Analytics> {
  return adminRequest<Analytics>('/analytics', token);
}
