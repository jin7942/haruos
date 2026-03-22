import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantApi, type CreateTenantParams, type UpdateTenantParams } from '../api/tenant.api';

const TENANTS_KEY = ['tenants'] as const;

/** 테넌트 목록 조회 훅. */
export function useTenants() {
  return useQuery({
    queryKey: TENANTS_KEY,
    queryFn: tenantApi.findAll,
  });
}

/** 테넌트 상세 조회 훅. */
export function useTenant(id: string) {
  return useQuery({
    queryKey: [...TENANTS_KEY, id],
    queryFn: () => tenantApi.findOne(id),
    enabled: !!id,
  });
}

/** 테넌트 생성 mutation. */
export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateTenantParams) => tenantApi.create(params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TENANTS_KEY }),
  });
}

/** 테넌트 수정 mutation. */
export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, params }: { id: string; params: UpdateTenantParams }) =>
      tenantApi.update(id, params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TENANTS_KEY }),
  });
}

/** 테넌트 삭제 mutation. */
export function useDeleteTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tenantApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TENANTS_KEY }),
  });
}

/** 테넌트 일시 중지 mutation. */
export function useSuspendTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tenantApi.suspend(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TENANTS_KEY }),
  });
}

/** 테넌트 재개 mutation. */
export function useResumeTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tenantApi.resume(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TENANTS_KEY }),
  });
}

/** 테넌트 사양 변경 mutation. */
export function useScaleTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, planType }: { id: string; planType: string }) =>
      tenantApi.scale(id, planType),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TENANTS_KEY }),
  });
}

/** 앱 버전 업데이트 mutation. */
export function useTriggerUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tenantApi.triggerUpdate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TENANTS_KEY }),
  });
}
