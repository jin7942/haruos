import type { TenantResponse } from '@haruos/shared-types';
import { apiClient } from './client';

/** 테넌트 생성 파라미터. */
export interface CreateTenantParams {
  name: string;
  slug: string;
  description: string;
  region: string;
}

/** 테넌트 수정 파라미터. */
export interface UpdateTenantParams {
  name?: string;
  description?: string;
}

export const tenantApi = {
  /** 테넌트 목록 조회. */
  findAll: () =>
    apiClient.get<TenantResponse[]>('/tenants').then((r) => r.data),

  /** 테넌트 상세 조회. */
  findOne: (id: string) =>
    apiClient.get<TenantResponse>(`/tenants/${id}`).then((r) => r.data),

  /** 테넌트 생성. */
  create: (params: CreateTenantParams) =>
    apiClient.post<TenantResponse>('/tenants', params).then((r) => r.data),

  /** 테넌트 수정. */
  update: (id: string, params: UpdateTenantParams) =>
    apiClient.patch<TenantResponse>(`/tenants/${id}`, params).then((r) => r.data),

  /** 테넌트 삭제. */
  remove: (id: string) =>
    apiClient.delete<void>(`/tenants/${id}`).then((r) => r.data),

  /** 테넌트 일시 중지. */
  suspend: (id: string) =>
    apiClient.post<TenantResponse>(`/tenants/${id}/suspend`).then((r) => r.data),

  /** 테넌트 재개. */
  resume: (id: string) =>
    apiClient.post<TenantResponse>(`/tenants/${id}/resume`).then((r) => r.data),

  /** 테넌트 사양 변경 (플랜 타입 변경). */
  scale: (id: string, planType: string) =>
    apiClient.post<TenantResponse>(`/tenants/${id}/scale`, { planType }).then((r) => r.data),

  /** 앱 버전 업데이트 (롤링 업데이트 트리거). */
  triggerUpdate: (id: string) =>
    apiClient.post<TenantResponse>(`/tenants/${id}/update`).then((r) => r.data),
};
