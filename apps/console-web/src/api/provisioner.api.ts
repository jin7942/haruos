import type { ProvisioningJobResponse, ProvisioningLogResponse } from '@haruos/shared-types';
import { apiClient } from './client';
import { getAccessToken } from './client';

/** 프로비저닝 시작. */
export function startProvisioning(tenantId: string): Promise<ProvisioningJobResponse> {
  return apiClient.post(`/tenants/${tenantId}/provision`).then((r) => r.data);
}

/** 프로비저닝 상태 조회. */
export function getProvisioningStatus(tenantId: string): Promise<ProvisioningJobResponse> {
  return apiClient.get(`/tenants/${tenantId}/provision/status`).then((r) => r.data);
}

/** 프로비저닝 로그 조회. */
export function getProvisioningLogs(tenantId: string): Promise<ProvisioningLogResponse[]> {
  return apiClient.get(`/tenants/${tenantId}/provision/logs`).then((r) => r.data);
}

/** 프로비저닝 롤백. */
export function rollbackProvisioning(tenantId: string): Promise<ProvisioningJobResponse> {
  return apiClient.post(`/tenants/${tenantId}/provision/rollback`).then((r) => r.data);
}

/** SSE 프로비저닝 상태 스트리밍 콜백. */
export interface ProvisioningStreamCallbacks {
  onStatus?: (job: ProvisioningJobResponse) => void;
  onLog?: (log: ProvisioningLogResponse) => void;
  onDone?: (data: { status: string }) => void;
  onError?: (error: { message: string }) => void;
}

/**
 * 프로비저닝 상태를 SSE 스트리밍으로 수신한다.
 * EventSource를 사용하여 서버로부터 실시간 상태 업데이트를 받는다.
 *
 * @param tenantId - 테넌트 ID
 * @param callbacks - 이벤트별 콜백
 * @returns EventSource 인스턴스 (close()로 연결 종료)
 */
export function streamProvisioningStatus(
  tenantId: string,
  callbacks: ProvisioningStreamCallbacks,
): EventSource {
  const token = getAccessToken();
  const url = `/api/tenants/${tenantId}/provision/status/stream${token ? `?token=${token}` : ''}`;
  const es = new EventSource(url);

  es.addEventListener('status', (e) => {
    callbacks.onStatus?.(JSON.parse(e.data));
  });

  es.addEventListener('log', (e) => {
    callbacks.onLog?.(JSON.parse(e.data));
  });

  es.addEventListener('done', (e) => {
    callbacks.onDone?.(JSON.parse(e.data));
    es.close();
  });

  es.addEventListener('error', (e) => {
    if (e instanceof MessageEvent && e.data) {
      callbacks.onError?.(JSON.parse(e.data));
    }
    es.close();
  });

  return es;
}
