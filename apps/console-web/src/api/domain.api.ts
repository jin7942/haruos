import type { DomainResponse } from '@haruos/shared-types';
import { apiClient } from './client';

/** 도메인 생성 파라미터. */
export interface CreateDomainParams {
  domain: string;
  dnsProvider: 'CLOUDFLARE' | 'ROUTE53' | 'MANUAL';
  cloudflareZoneId?: string;
  cloudflareApiToken?: string;
}

export const domainApi = {
  /** 도메인 목록 조회. */
  findAll: (tenantId: string) =>
    apiClient.get<DomainResponse[]>(`/tenants/${tenantId}/domains`).then((r) => r.data),

  /** 도메인 추가. */
  create: (tenantId: string, params: CreateDomainParams) =>
    apiClient.post<DomainResponse>(`/tenants/${tenantId}/domains`, params).then((r) => r.data),

  /** 도메인 삭제. */
  remove: (tenantId: string, domainId: string) =>
    apiClient.delete<void>(`/tenants/${tenantId}/domains/${domainId}`).then((r) => r.data),

  /** 기본 도메인 변경. */
  setPrimary: (tenantId: string, domainId: string) =>
    apiClient.patch<DomainResponse>(`/tenants/${tenantId}/domains/${domainId}/set-primary`).then((r) => r.data),

  /** DNS 검증. */
  verifyDns: (tenantId: string, domainId: string) =>
    apiClient.post<DomainResponse>(`/tenants/${tenantId}/domains/${domainId}/verify-dns`).then((r) => r.data),
};
