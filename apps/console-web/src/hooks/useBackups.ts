import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backupApi } from '../api/backup.api';

/** 백업 목록 조회 훅. */
export function useBackups(tenantId: string) {
  return useQuery({
    queryKey: ['backups', tenantId],
    queryFn: () => backupApi.findAll(tenantId),
    enabled: !!tenantId,
  });
}

/** 백업 생성 mutation. */
export function useCreateBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tenantId: string) => backupApi.create(tenantId),
    onSuccess: (_data, tenantId) => {
      queryClient.invalidateQueries({ queryKey: ['backups', tenantId] });
    },
  });
}

/** 백업 다운로드 URL 조회 mutation. */
export function useBackupDownload() {
  return useMutation({
    mutationFn: ({ tenantId, backupId }: { tenantId: string; backupId: string }) =>
      backupApi.getDownloadUrl(tenantId, backupId),
  });
}

/** 데이터 내보내기 mutation. */
export function useExportData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tenantId: string) => backupApi.exportData(tenantId),
    onSuccess: (_data, tenantId) => {
      queryClient.invalidateQueries({ queryKey: ['backups', tenantId] });
    },
  });
}
