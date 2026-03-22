/** 프로젝트 동기화 상태 응답. */
export interface ProjectSyncResponse {
  id: string;
  clickupSpaceId: string;
  name: string;
  lastSyncAt: string | null;
  status: string;
}

/** 일정 응답. */
export interface ScheduleResponse {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  clickupTaskId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** 문서 응답. */
export interface DocumentResponse {
  id: string;
  userId: string;
  title: string;
  content: string | null;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** 지식 검색 결과 응답. */
export interface KnowledgeSearchResponse {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
}

/** RAG 답변의 출처 청크 정보. */
export interface SourceChunk {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
}

/** RAG 질의응답 응답. */
export interface KnowledgeAskResponse {
  answer: string;
  sources: SourceChunk[];
}

/** 파일 레코드 응답. */
export interface FileRecordResponse {
  id: string;
  fileName: string;
  mimeType: string;
  size: string;
  uploadedAt: string;
}
