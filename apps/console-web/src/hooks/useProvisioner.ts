import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProvisioningJobResponse, ProvisioningLogResponse } from '@haruos/shared-types';
import * as provisionerApi from '../api/provisioner.api';

/** 프로비저닝 상태 조회 훅. */
export function useProvisioningStatus(tenantId: string) {
  return useQuery({
    queryKey: ['provisioning-status', tenantId],
    queryFn: () => provisionerApi.getProvisioningStatus(tenantId),
    enabled: !!tenantId,
    retry: false,
  });
}

/** 프로비저닝 로그 조회 훅. */
export function useProvisioningLogs(tenantId: string) {
  return useQuery({
    queryKey: ['provisioning-logs', tenantId],
    queryFn: () => provisionerApi.getProvisioningLogs(tenantId),
    enabled: !!tenantId,
  });
}

/** 프로비저닝 시작 훅. */
export function useStartProvisioning() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tenantId: string) => provisionerApi.startProvisioning(tenantId),
    onSuccess: (_, tenantId) => {
      queryClient.invalidateQueries({ queryKey: ['provisioning-status', tenantId] });
    },
  });
}

/** 프로비저닝 롤백 훅. */
export function useRollbackProvisioning() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tenantId: string) => provisionerApi.rollbackProvisioning(tenantId),
    onSuccess: (_, tenantId) => {
      queryClient.invalidateQueries({ queryKey: ['provisioning-status', tenantId] });
    },
  });
}

/**
 * 프로비저닝 상태를 SSE 스트리밍으로 수신하는 훅.
 * 실시간 상태 업데이트와 로그를 제공한다.
 */
export function useProvisioningStream(tenantId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ProvisioningJobResponse | null>(null);
  const [logs, setLogs] = useState<ProvisioningLogResponse[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!tenantId || !enabled) return;

    esRef.current = provisionerApi.streamProvisioningStatus(tenantId, {
      onStatus: (job) => {
        setStatus(job);
        setIsConnected(true);
      },
      onLog: (log) => {
        setLogs((prev) => [...prev, log]);
      },
      onDone: () => {
        setIsConnected(false);
        queryClient.invalidateQueries({ queryKey: ['provisioning-status', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['provisioning-logs', tenantId] });
      },
      onError: () => {
        setIsConnected(false);
      },
    });
  }, [tenantId, enabled, queryClient]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
    };
  }, [connect]);

  return { status, logs, isConnected };
}
