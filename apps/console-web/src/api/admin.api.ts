import { apiClient } from './client';

export interface AdminDashboard {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  verifiedUsers: number;
  activeSubscriptions: number;
}

export interface AdminTenant {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  plan: string;
  region: string;
  trialEndsAt: string | null;
  suspendedAt: string | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export const adminApi = {
  getDashboard: () =>
    apiClient.get<AdminDashboard>('/admin/dashboard').then((r) => r.data),

  getTenants: () =>
    apiClient.get<AdminTenant[]>('/admin/tenants').then((r) => r.data),

  suspendTenant: (id: string) =>
    apiClient.post<AdminTenant>(`/admin/tenants/${id}/suspend`).then((r) => r.data),

  resumeTenant: (id: string) =>
    apiClient.post<AdminTenant>(`/admin/tenants/${id}/resume`).then((r) => r.data),

  getUsers: () =>
    apiClient.get<AdminUser[]>('/admin/users').then((r) => r.data),
};
