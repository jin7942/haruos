/**
 * 페이징 응답 형식.
 * ApiResponse의 data 필드 안에 포함된다.
 */
export interface PaginatedResponse<T> {
  /** 현재 페이지 데이터 */
  items: T[];
  /** 현재 페이지 번호 (0-indexed) */
  page: number;
  /** 페이지 크기 */
  pageSize: number;
  /** 전체 항목 수 */
  totalCount: number;
}
