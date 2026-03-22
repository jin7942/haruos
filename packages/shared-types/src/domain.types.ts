/** 도메인 응답. */
export interface DomainResponse {
  id: string;
  tenantId: string;
  domain: string;
  type: string;
  dnsProvider: string | null;
  status: string;
  isPrimary: boolean;
  cnameTarget: string | null;
  sslStatus: string | null;
  dnsVerifiedAt: string | null;
  createdAt: string;
}
