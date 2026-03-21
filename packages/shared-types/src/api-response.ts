/**
 * 모든 REST API의 공통 응답 형식.
 * 성공/실패 모두 동일한 구조로 응답한다.
 */
export interface ApiResponse<T = unknown> {
  /** 요청 성공 여부 */
  success: boolean;
  /** 결과 코드 ("OK" 또는 에러코드) */
  code: string;
  /** 사람이 읽을 수 있는 메시지 */
  message: string;
  /** 실제 응답 데이터 */
  data: T;
  /** ISO 8601 응답 시각 */
  timestamp: string;
}
