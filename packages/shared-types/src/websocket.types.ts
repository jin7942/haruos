/** WebSocket 알림 메시지. */
export interface WsNotification {
  /** 알림 유형 (예: batch_completed, file_processed, provisioning_status, cost_alert) */
  type: string;
  /** 알림 데이터 */
  data: Record<string, unknown>;
  /** 타임스탬프 (ISO 8601) */
  timestamp: string;
}

/** WebSocket 연결 상태. */
export type WsConnectionState = 'connected' | 'disconnected' | 'reconnecting';
