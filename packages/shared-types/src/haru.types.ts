/** 에이전트가 수행한 액션. */
export interface ActionVo {
  type: string;
  data: Record<string, unknown>;
}

/** 대화 응답 (Haru 채팅). */
export interface ChatResponse {
  response: string;
  agent: string;
  conversationId: string;
  actions: ActionVo[];
}

/** 대화(Conversation) 응답. */
export interface ConversationResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/** 메시지 응답. */
export interface MessageResponse {
  id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/** 파싱된 인텐트. */
export interface ParsedIntent {
  intent: string;
  agent: string;
  entities: Record<string, string>;
  confidence: number;
}

/** SSE 스트리밍 메타 이벤트 데이터. */
export interface ChatStreamMeta {
  conversationId: string;
  agent: string;
}

/** SSE 스트리밍 완료 이벤트 데이터. */
export interface ChatStreamDone {
  conversationId: string;
}

/** 배치 작업 응답. */
export interface BatchJobResponse {
  id: string;
  name: string;
  cronExpression: string;
  status: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}
