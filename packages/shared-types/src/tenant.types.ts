/** 테넌트 응답. */
export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  plan: string;
  region: string;
  trialEndsAt: string | null;
  createdAt: string;
}
