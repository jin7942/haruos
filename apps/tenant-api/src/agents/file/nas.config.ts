/**
 * NAS(S3 기반 파일 저장소) 설정.
 * Fargate 환경에서 SMB 마운트가 불가하므로 S3를 NAS 대체로 사용한다.
 */
export const NAS_CONFIG = {
  /** S3 내 파일 정리 대상 프리픽스 */
  scanPrefix: 'files/',

  /** ZIP 파일 자동 해제 활성 여부 */
  autoExtractZip: true,

  /** ZIP 해제 후 원본 ZIP 파일 보존 여부 */
  keepOriginalZip: false,

  /** 파일 정리 규칙: MIME 타입별 카테고리 매핑 */
  categoryRules: {
    'application/pdf': 'DOCUMENT',
    'application/msword': 'DOCUMENT',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCUMENT',
    'application/vnd.ms-excel': 'SPREADSHEET',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'SPREADSHEET',
    'application/vnd.ms-powerpoint': 'PRESENTATION',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PRESENTATION',
    'image/jpeg': 'IMAGE',
    'image/png': 'IMAGE',
    'image/gif': 'IMAGE',
    'image/webp': 'IMAGE',
    'video/mp4': 'VIDEO',
    'video/quicktime': 'VIDEO',
    'audio/mpeg': 'AUDIO',
    'audio/wav': 'AUDIO',
    'application/zip': 'ARCHIVE',
    'application/x-zip-compressed': 'ARCHIVE',
    'text/plain': 'TEXT',
    'text/csv': 'TEXT',
    'application/json': 'TEXT',
  } as Record<string, string>,

  /** 기본 카테고리 (매핑되지 않는 MIME 타입) */
  defaultCategory: 'OTHER',

  /** 워치독 폴링 간격 (ms) */
  watcherIntervalMs: 60_000,

  /** 워치독 활성 여부 */
  watcherEnabled: false,
} as const;

/**
 * MIME 타입에서 카테고리를 결정한다.
 *
 * @param mimeType - MIME 타입
 * @returns 카테고리 문자열
 */
export function getCategoryByMimeType(mimeType: string): string {
  return NAS_CONFIG.categoryRules[mimeType] ?? NAS_CONFIG.defaultCategory;
}
